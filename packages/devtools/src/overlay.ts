import { STYLES } from "./styles";
import { loadSession, clearSession, startDeviceAuth } from "./auth";
import {
  clearAllOverrides,
  applyOverridesToUrlAndReload,
  buildOverrideUrl,
  snapshotOverridesFromStorage,
  isEditLabelsModeActive,
} from "./overrides";
import { DevtoolsApi } from "./api";
import { renderUserPanel, type UserPanelState } from "./panels/user";
import { renderGatesPanel } from "./panels/gates";
import { renderExperimentsPanel } from "./panels/experiments";
import { renderConfigsPanel } from "./panels/configs";
import { renderLabelsPanel, toggleEditLabels, scanAndReplaceMarkers } from "./panels/i18n";
import { renderFeedbackPanel } from "./panels/feedback";
import { renderEventsPanel } from "./panels/events";
import type { DevtoolsOptions, DevtoolsSession, ProjectRecord } from "./types";
import { projectOwnsHost } from "./types";
import { getControlsState, refreshControls, subscribeControls } from "./controls";
import { I } from "./icons";

type PanelKey = "user" | "gates" | "experiments" | "configs" | "labels" | "feedback" | "events";
type Edge = "top" | "right" | "bottom" | "left";

interface OverlayState {
  edge: Edge;
  offsetPct: number; // 0–100
  railIconSize: number; // collapsed rail icon px (24–56)
  collapsed: boolean;
}

const PANEL_MODULE: Partial<Record<PanelKey, keyof ProjectRecord["modules"]>> = {
  gates: "gates",
  configs: "configs",
  experiments: "experiments",
  labels: "translations",
  feedback: "feedback",
  user: "user",
  events: "events",
};

const TABS: Array<{ k: PanelKey; label: string; icon: string; description: string }> = [
  { k: "user", label: "User", icon: I.users, description: "props · impersonate" },
  { k: "gates", label: "Gates", icon: I.shield, description: "flags & killswitches" },
  { k: "experiments", label: "Experiments", icon: I.flask, description: "A/B variants" },
  { k: "configs", label: "Configs", icon: I.sliders, description: "remote values" },
  { k: "labels", label: "Translations", icon: I.book, description: "i18n strings" },
  { k: "feedback", label: "Feedback", icon: I.bug, description: "bugs + requests" },
  { k: "events", label: "Events", icon: I.activity, description: "live stream" },
];

const PROJECT_CACHE_KEY = "se_dt_project";
const OVERLAY_KEY = "se_l_overlay";
const ACTIVE_PANEL_KEY = "se_l_active_panel";

const RAIL_MIN = 24;
const RAIL_MAX = 56;

const DEFAULT_STATE: OverlayState = {
  edge: "right",
  offsetPct: 50,
  railIconSize: 32,
  collapsed: false,
};

function loadCachedProject(): ProjectRecord | null {
  try {
    const raw = sessionStorage.getItem(PROJECT_CACHE_KEY);
    if (raw) return JSON.parse(raw) as ProjectRecord;
  } catch {
    /* ignore */
  }
  return null;
}

function saveCachedProject(p: ProjectRecord | null): void {
  try {
    if (p === null) sessionStorage.removeItem(PROJECT_CACHE_KEY);
    else sessionStorage.setItem(PROJECT_CACHE_KEY, JSON.stringify(p));
  } catch {
    /* ignore */
  }
}

function loadOverlayState(): OverlayState {
  try {
    const raw = localStorage.getItem(OVERLAY_KEY);
    if (raw) return { ...DEFAULT_STATE, ...JSON.parse(raw) };
  } catch {
    /* ignore */
  }
  return { ...DEFAULT_STATE };
}

function saveOverlayState(s: OverlayState): void {
  try {
    localStorage.setItem(OVERLAY_KEY, JSON.stringify(s));
  } catch {
    /* ignore */
  }
}

const VALID_PANEL_KEYS: ReadonlySet<string> = new Set([
  "user",
  "gates",
  "experiments",
  "configs",
  "labels",
  "feedback",
  "events",
]);

function loadActivePanel(): PanelKey | null {
  try {
    const raw = sessionStorage.getItem(ACTIVE_PANEL_KEY);
    if (raw && VALID_PANEL_KEYS.has(raw)) return raw as PanelKey;
  } catch {
    /* ignore */
  }
  return null;
}

function saveActivePanel(key: PanelKey | null): void {
  try {
    if (key === null) sessionStorage.removeItem(ACTIVE_PANEL_KEY);
    else sessionStorage.setItem(ACTIVE_PANEL_KEY, key);
  } catch {
    /* ignore */
  }
}

/**
 * Read the customer SDK client key that the host SDK injects into
 * `window.__SE_BOOTSTRAP.apiKey`. Its presence is proof the page is a real
 * ShipEasy customer page (not just any origin claiming to be one) — used
 * to skip the origin-lock check that would otherwise sign out a localhost
 * dev whose project's configured domain is the prod hostname.
 */
function readBridgeApiKey(): string | null {
  if (typeof window === "undefined") return null;
  const bs = (window as unknown as { __SE_BOOTSTRAP?: { apiKey?: string } }).__SE_BOOTSTRAP;
  return typeof bs?.apiKey === "string" && bs.apiKey ? bs.apiKey : null;
}

function sameModules(a: ProjectRecord["modules"], b: ProjectRecord["modules"]): boolean {
  return (
    a.translations === b.translations &&
    a.configs === b.configs &&
    a.gates === b.gates &&
    a.experiments === b.experiments &&
    a.feedback === b.feedback
  );
}

function resolveHideAdminLinks(opts: Required<DevtoolsOptions>): boolean {
  // Caller-supplied option wins, then the ShipEasy-owned controls project
  // (refreshed by controls.ts via the central /sdk/evaluate endpoint).
  // We deliberately do NOT fall back to the customer's __shipeasy bridge —
  // this is a ShipEasy-internal kill switch, not a customer-controlled flag.
  if (opts.hideAdminLinks) return true;
  if (getControlsState().hideAdminLinks) return true;
  return false;
}

interface ViewState {
  view: "page" | "all";
  search: string;
}

export function createOverlay(opts: Required<DevtoolsOptions>): { destroy: () => void } {
  // Shadow host
  const host = document.createElement("div");
  host.setAttribute("id", "shipeasy-devtools");
  const shadow = host.attachShadow({ mode: "open" });
  const styleEl = document.createElement("style");
  styleEl.textContent = STYLES;
  shadow.appendChild(styleEl);
  const root = document.createElement("div");
  shadow.appendChild(root);

  // State
  let state: OverlayState = loadOverlayState();
  let activeKey: PanelKey | null = loadActivePanel();
  let session: DevtoolsSession | null = loadSession();
  let project: ProjectRecord | null = loadCachedProject();
  if (project && session && project.id !== session.projectId) {
    project = null;
    saveCachedProject(null);
  }

  // Single DevtoolsApi instance per session — reused across renders so its
  // in-memory response cache survives tab switches. Reset on signout / when
  // the session swaps to a different project.
  let api: DevtoolsApi | null = null;
  function getApi(): DevtoolsApi | null {
    if (!session) return null;
    if (!api || api.token !== session.token || api.projectId !== session.projectId) {
      api = new DevtoolsApi(
        opts.adminUrl,
        session.token,
        session.projectId,
        resolveHideAdminLinks(opts),
      );
    } else {
      // Kill-switch state can flip while the overlay is open — keep the cached
      // api instance but refresh the boolean, since it gates empty-state CTAs.
      api.hideAdminLinks = resolveHideAdminLinks(opts);
    }
    return api;
  }

  // Per-tab view state (search + page/all)
  const tabView: Record<PanelKey, ViewState> = {
    user: { view: "all", search: "" },
    gates: { view: "page", search: "" },
    experiments: { view: "page", search: "" },
    configs: { view: "page", search: "" },
    labels: { view: "page", search: "" },
    feedback: { view: "all", search: "" },
    events: { view: "all", search: "" },
  };
  // Labels-tab locale
  let labelLocale = "en-US";
  // Feedback subtab
  let feedbackSub: "bugs" | "features" = "bugs";
  // One-shot signal from the rail hovercard's quick-actions ("File a bug" /
  // "Request a feature"). Read once by renderFeedbackPanel, then cleared.
  let feedbackPendingForm: "bug" | "feature" | null = null;
  // User-tab editable state lives across re-renders
  const userState: UserPanelState = { props: {}, dirty: {} };

  // Gates rendered into the overrides count so the overbar / footer can react.
  // Computed by the gates panel each render and stored on `globals` for the
  // shell to use.
  const overridesByTab: Record<PanelKey, number> = {
    user: 0,
    gates: 0,
    experiments: 0,
    configs: 0,
    labels: 0,
    feedback: 0,
    events: 0,
  };

  function totalOverrides(): number {
    return Object.values(overridesByTab).reduce((a, b) => a + b, 0);
  }

  function isPanelEnabled(key: PanelKey): boolean {
    const mod = PANEL_MODULE[key];
    if (!mod) return true; // user / events have no module gate
    if (!project) return !session; // unauthed: show all
    return project.modules[mod];
  }

  // ── Layout ──────────────────────────────────────────────────────────────
  function applyPanelStyle(panel: HTMLElement): void {
    const W = window.innerWidth;
    const H = window.innerHeight;
    const { edge, offsetPct, collapsed } = state;
    const ps = panel.style;
    ps.top = ps.bottom = ps.left = ps.right = ps.transform = "";
    panel.dataset.edge = edge;
    if (collapsed) {
      // Floating rail anchored to edge, centred along it.
      if (edge === "right") {
        ps.right = "10px";
        ps.top = `${offsetPct}%`;
        ps.transform = "translateY(-50%)";
      } else if (edge === "left") {
        ps.left = "10px";
        ps.top = `${offsetPct}%`;
        ps.transform = "translateY(-50%)";
      } else if (edge === "top") {
        ps.top = "10px";
        ps.left = `${offsetPct}%`;
        ps.transform = "translateX(-50%)";
      } else {
        ps.bottom = "10px";
        ps.left = `${offsetPct}%`;
        ps.transform = "translateX(-50%)";
      }
    } else {
      // Expanded panel docked to one edge.
      const pW = 420;
      const maxH = H - 36;
      void pW;
      void maxH;
      if (edge === "right") {
        ps.right = "12px";
        ps.top = "18px";
      } else if (edge === "left") {
        ps.left = "12px";
        ps.top = "18px";
      } else if (edge === "top") {
        ps.top = "12px";
        ps.right = "18px";
      } else {
        ps.bottom = "12px";
        ps.right = "18px";
      }
    }
  }

  function nearestEdge(x: number, y: number): { edge: Edge; offsetPct: number } {
    const W = window.innerWidth;
    const H = window.innerHeight;
    const candidates: Array<[number, Edge]> = [
      [W - x, "right"],
      [x, "left"],
      [y, "top"],
      [H - y, "bottom"],
    ];
    candidates.sort((a, b) => a[0] - b[0]);
    const edge = candidates[0][1];
    const isVert = edge === "left" || edge === "right";
    const offsetPct = Math.max(5, Math.min(95, isVert ? (y / H) * 100 : (x / W) * 100));
    return { edge, offsetPct };
  }

  // ── Render ──────────────────────────────────────────────────────────────
  function render(): void {
    const panel = document.createElement("div");
    panel.className = state.collapsed ? "dtf-panel collapsed" : "dtf-panel";
    panel.setAttribute("data-edge", state.edge);
    // Mount before populating: renderExpanded → renderTabBody looks up
    // `#dtf-body` via root.querySelector. Calling it on a detached panel
    // either returns null (first render) or the previous body that's about
    // to be torn down, so the new body never receives its loading skeleton.
    while (root.firstChild) root.removeChild(root.firstChild);
    root.appendChild(panel);
    applyPanelStyle(panel);
    if (state.collapsed) {
      renderCollapsed(panel);
    } else {
      renderExpanded(panel);
    }
  }

  // Mounts a quick-actions hovercard on the feedback rail icon. Shown on
  // hover, click jumps the panel directly into the corresponding inline form
  // ("File a bug" / "Request a feature") via feedbackPendingForm. Card is
  // appended to the shadow root with position:fixed and removed on hide so
  // re-renders don't leak DOM.
  function attachFeedbackQuickActions(btn: HTMLElement): void {
    let card: HTMLElement | null = null;
    let hideTimer: number | null = null;

    const openForm = (form: "bug" | "feature") => {
      hide(true);
      feedbackPendingForm = form;
      feedbackSub = form === "bug" ? "bugs" : "features";
      activeKey = "feedback";
      saveActivePanel(activeKey);
      state = { ...state, collapsed: false };
      saveOverlayState(state);
      render();
    };

    const position = () => {
      if (!card) return;
      const r = btn.getBoundingClientRect();
      const cw = card.offsetWidth;
      const ch = card.offsetHeight;
      const margin = 8;
      // Pick a side based on which edge the panel is anchored to. Keeps the
      // card on the "outside" so it doesn't overlap the panel body.
      let left: number;
      let top: number;
      if (state.edge === "right") {
        left = r.left - cw - margin;
        top = r.top + r.height / 2 - ch / 2;
      } else if (state.edge === "left") {
        left = r.right + margin;
        top = r.top + r.height / 2 - ch / 2;
      } else if (state.edge === "top") {
        left = r.left + r.width / 2 - cw / 2;
        top = r.bottom + margin;
      } else {
        left = r.left + r.width / 2 - cw / 2;
        top = r.top - ch - margin;
      }
      // Clamp to viewport.
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      left = Math.max(8, Math.min(vw - cw - 8, left));
      top = Math.max(8, Math.min(vh - ch - 8, top));
      card.style.left = `${left}px`;
      card.style.top = `${top}px`;
    };

    const show = () => {
      if (hideTimer) {
        window.clearTimeout(hideTimer);
        hideTimer = null;
      }
      if (card) return;
      card = document.createElement("div");
      card.className = "se-qa";
      card.innerHTML =
        `<span class="qa-hd">Quick actions</span>` +
        `<button data-qa="bug">${I.bug}<span>File a bug</span><span class="sub">screenshot · video</span></button>` +
        `<button data-qa="feature">${I.sparkles}<span>Request a feature</span></button>`;
      shadow.appendChild(card);
      position();
      // Two RAFs so the browser commits the initial transform before the
      // .show class swaps it — avoids a janky pop-in on first hover.
      requestAnimationFrame(() => {
        requestAnimationFrame(() => card?.classList.add("show"));
      });
      card.addEventListener("mouseenter", show);
      card.addEventListener("mouseleave", () => hide());
      card.querySelectorAll<HTMLButtonElement>("[data-qa]").forEach((b) => {
        b.addEventListener("click", (e) => {
          e.stopPropagation();
          openForm(b.dataset.qa as "bug" | "feature");
        });
      });
    };
    const hide = (immediate = false) => {
      if (hideTimer) {
        window.clearTimeout(hideTimer);
        hideTimer = null;
      }
      const drop = () => {
        if (card) {
          card.remove();
          card = null;
        }
      };
      if (immediate) {
        drop();
      } else {
        hideTimer = window.setTimeout(drop, 160);
      }
    };
    btn.addEventListener("mouseenter", show);
    btn.addEventListener("mouseleave", () => hide());
    // The card lives on the shadow root, not inside the panel, so it survives
    // the render() that the rail-icon click handler triggers — without this
    // the card is left orphaned with no listeners to dismiss it.
    btn.addEventListener("click", () => hide(true));
  }

  function renderCollapsed(panel: HTMLElement): void {
    const sz = state.railIconSize;
    // Unauthed: collapse all tab icons into one lock icon. The user can't do
    // anything until they connect, so don't tease tabs they can't open. The
    // tooltip is a multi-line explainer instead of the usual one-word label.
    const icons = !session
      ? `<button class="ri lock-only" data-tab="__lock__" ` +
        `style="width:${sz}px;height:${sz}px" title="">` +
        I.lock.replace(
          `<svg `,
          `<svg width="${Math.round(sz * 0.5)}" height="${Math.round(sz * 0.5)}" `,
        ) +
        `<span class="tip tip-multi">` +
        `<b>Devtools locked</b>` +
        `Sign in to ShipEasy to inspect and override gates, configs, experiments, and translations on this page.` +
        `<span class="hint">Click to connect →</span>` +
        `</span>` +
        `</button>`
      : TABS.filter((t) => isPanelEnabled(t.k))
          .map((t) => {
            const ov = overridesByTab[t.k] > 0;
            return (
              `<button class="ri" data-tab="${t.k}" ` +
              `style="width:${sz}px;height:${sz}px">` +
              t.icon.replace(
                `<svg `,
                `<svg width="${Math.round(sz * 0.5)}" height="${Math.round(sz * 0.5)}" `,
              ) +
              (ov ? `<span class="dotw"></span>` : "") +
              `<span class="tip">${t.label}</span>` +
              `</button>`
            );
          })
          .join("");
    const railHtml =
      `<div class="dtf-panel-rail">` +
      `<div class="mk" title="Drag to reposition · click to expand" ` +
      `style="width:${sz * 0.7}px;height:${sz * 0.7}px"></div>` +
      icons +
      `<div class="dtf-rail-resize" ` +
      `style="width:${state.edge === "right" || state.edge === "left" ? sz : 12}px;` +
      `height:${state.edge === "right" || state.edge === "left" ? 12 : sz}px" ` +
      `title="Drag to resize"></div>` +
      `</div>`;
    panel.innerHTML = railHtml;

    // Drag the brand mark to reposition; click to expand.
    const mk = panel.querySelector<HTMLElement>(".mk")!;
    let dragged = false;
    mk.addEventListener("mousedown", (e) => {
      e.preventDefault();
      dragged = false;
      const startX = e.clientX;
      const startY = e.clientY;
      // Record the offset between the cursor and the panel's centerline so the
      // panel doesn't pop to put its center under the cursor on first move.
      // applyPanelStyle anchors via translate(-50%) along the parallel axis,
      // so we adjust the synthetic cursor position by these deltas.
      const r0 = panel.getBoundingClientRect();
      const grabDx = e.clientX - (r0.left + r0.width / 2);
      const grabDy = e.clientY - (r0.top + r0.height / 2);
      mk.classList.add("dragging");
      let lastEdge: Edge = state.edge;
      const move = (ev: MouseEvent) => {
        if (Math.hypot(ev.clientX - startX, ev.clientY - startY) > 4) dragged = true;
        // Subtract grab deltas: edge picks from the cursor (so it still snaps
        // to the closest edge to the pointer), but the parallel-axis position
        // tracks where the panel center *would* be if we kept it pinned to
        // the original grab point on the mark.
        const { edge } = nearestEdge(ev.clientX, ev.clientY);
        const isVert = edge === "left" || edge === "right";
        const cx = ev.clientX - grabDx;
        const cy = ev.clientY - grabDy;
        const W = window.innerWidth;
        const H = window.innerHeight;
        const offsetPct = Math.max(5, Math.min(95, isVert ? (cy / H) * 100 : (cx / W) * 100));
        state = { ...state, edge, offsetPct };
        applyPanelStyle(panel);
        panel.setAttribute("data-edge", edge);
        lastEdge = edge;
      };
      const up = () => {
        mk.classList.remove("dragging");
        document.removeEventListener("mousemove", move);
        document.removeEventListener("mouseup", up);
        saveOverlayState(state);
        // The rail-resize handle's width/height are inline styles set at
        // render time per edge. Re-render after a drag so the handle reorients
        // to match the new edge (flex-direction itself is CSS-driven).
        if (dragged) render();
        void lastEdge;
      };
      document.addEventListener("mousemove", move);
      document.addEventListener("mouseup", up);
    });
    mk.addEventListener("click", () => {
      if (dragged) return;
      state = { ...state, collapsed: false };
      saveOverlayState(state);
      render();
    });

    panel.querySelectorAll<HTMLButtonElement>(".ri").forEach((btn) => {
      btn.addEventListener("click", () => {
        const k = btn.dataset.tab!;
        // The synthetic "__lock__" key on the unauthed rail just expands the
        // panel into the auth modal — there is no real tab to activate.
        if (k !== "__lock__") {
          activeKey = k as PanelKey;
          saveActivePanel(activeKey);
        }
        state = { ...state, collapsed: false };
        saveOverlayState(state);
        render();
      });
      if (btn.dataset.tab === "feedback") attachFeedbackQuickActions(btn);
    });

    const resize = panel.querySelector<HTMLElement>(".dtf-rail-resize")!;
    resize.addEventListener("mousedown", (e) => {
      e.preventDefault();
      e.stopPropagation();
      const isVert = state.edge === "right" || state.edge === "left";
      const startX = e.clientX;
      const startY = e.clientY;
      const startSize = state.railIconSize;
      resize.classList.add("dragging");
      const move = (ev: MouseEvent) => {
        const delta = isVert ? ev.clientY - startY : ev.clientX - startX;
        const next = Math.max(RAIL_MIN, Math.min(RAIL_MAX, Math.round(startSize + delta)));
        state = { ...state, railIconSize: next };
        render();
      };
      const up = () => {
        resize.classList.remove("dragging");
        document.removeEventListener("mousemove", move);
        document.removeEventListener("mouseup", up);
        saveOverlayState(state);
      };
      document.addEventListener("mousemove", move);
      document.addEventListener("mouseup", up);
    });
  }

  function renderExpandedUnauthed(panel: HTMLElement): void {
    const origin = window.location.host;
    panel.innerHTML = `
      <div class="dtf-head">
        <div class="mk" title="Drag to reposition"></div>
        <div class="ti">
          <span class="title">Locked</span>
          <span class="sub">${escapeHtml(origin)}</span>
        </div>
        <div class="actions">
          <button class="ib" data-action="collapse" title="Collapse">${I.x}</button>
        </div>
      </div>
      <div class="dtf-split">
        <div class="dtf-rail">
          <button class="t lock-only active" title="">
            ${I.lock}
            <span class="tip tip-multi">
              <b>Devtools locked</b>
              Sign in to ShipEasy to inspect and override flags, configs, experiments, and translations on this page.
              <span class="hint">Click <em>Connect</em> to start →</span>
            </span>
          </button>
        </div>
        <div class="dtf-pane" style="position:relative">
          <div class="dtf-body" id="dtf-body" aria-hidden="true" inert></div>
          <div class="auth-locked" role="dialog" aria-modal="true">
            <div class="auth-locked-card">
              <div class="ic-big">${I.lock}</div>
              <h2>Connect to <em>ShipEasy</em></h2>
              <p>Sign in to inspect and override flags, configs, experiments, and translations live on this page.</p>
              <div class="features">
                <div class="row"><span class="ic">${I.shield}</span><span class="k">Toggle gates &amp; killswitches</span></div>
                <div class="row"><span class="ic">${I.flask}</span><span class="k">Force experiment variants</span></div>
                <div class="row"><span class="ic">${I.sliders}</span><span class="k">Override config values</span></div>
                <div class="row"><span class="ic">${I.book}</span><span class="k">Edit translations in-place</span></div>
              </div>
              <button class="cta" data-action="connect" autofocus>Connect →</button>
              <div class="meta">A new tab will open for you to approve this device.</div>
              <div class="status" data-status></div>
              <div class="err" data-err style="display:none"></div>
            </div>
          </div>
        </div>
      </div>
      <div class="dtf-foot">
        <div class="stat-line">
          <span style="width:5px;height:5px;border-radius:50%;background:var(--fg-4);display:inline-block"></span>
          <span class="stat" style="color:var(--fg-3)">Not connected</span>
        </div>
      </div>`;

    // Header drag
    const headMk = panel.querySelector<HTMLElement>(".dtf-head .mk")!;
    headMk.addEventListener("mousedown", (e) => {
      e.preventDefault();
      headMk.classList.add("dragging");
      const move = (ev: MouseEvent) => {
        const { edge, offsetPct } = nearestEdge(ev.clientX, ev.clientY);
        state = { ...state, edge, offsetPct };
        applyPanelStyle(panel);
      };
      const up = () => {
        headMk.classList.remove("dragging");
        document.removeEventListener("mousemove", move);
        document.removeEventListener("mouseup", up);
        saveOverlayState(state);
      };
      document.addEventListener("mousemove", move);
      document.addEventListener("mouseup", up);
    });

    panel.querySelector('[data-action="collapse"]')!.addEventListener("click", () => {
      state = { ...state, collapsed: true };
      saveOverlayState(state);
      render();
    });

    const cta = panel.querySelector<HTMLButtonElement>('[data-action="connect"]')!;
    const statusEl = panel.querySelector<HTMLElement>("[data-status]")!;
    const errEl = panel.querySelector<HTMLElement>("[data-err]")!;
    cta.addEventListener("click", async () => {
      cta.disabled = true;
      cta.innerHTML = `<span class="spin"></span> Opening…`;
      statusEl.textContent = "";
      errEl.style.display = "none";
      errEl.textContent = "";
      try {
        session = await startDeviceAuth(opts, () => {
          statusEl.textContent = "Waiting for approval in the opened tab…";
          cta.innerHTML = `<span class="spin"></span> Waiting for approval`;
        });
        // Successful auth — re-render the panel with real content. Pick the
        // first enabled tab so the user lands somewhere useful.
        activeKey = TABS.find((t) => isPanelEnabled(t.k))?.k ?? "gates";
        saveActivePanel(activeKey);
        render();
      } catch (err) {
        errEl.textContent = err instanceof Error ? err.message : String(err);
        errEl.style.display = "block";
        statusEl.textContent = "";
        cta.disabled = false;
        cta.textContent = "Retry connect →";
      }
    });
  }

  function renderExpanded(panel: HTMLElement): void {
    if (!session) {
      renderExpandedUnauthed(panel);
      return;
    }
    const tab = (
      activeKey && activeKey !== ("__lock__" as PanelKey)
        ? activeKey
        : (TABS.find((t) => isPanelEnabled(t.k))?.k ?? "gates")
    ) as PanelKey;
    if (activeKey !== tab) {
      activeKey = tab;
      saveActivePanel(tab);
    }
    const tabDef = TABS.find((t) => t.k === tab)!;
    const projectName = project?.name ?? "";
    const origin = window.location.host;
    const sub = projectName || origin;

    const railIcons = TABS.filter((t) => isPanelEnabled(t.k))
      .map((t) => {
        const active = t.k === tab;
        const ov = overridesByTab[t.k] > 0;
        return (
          `<button class="t${active ? " active" : ""}" data-tab="${t.k}" title="${t.label}">` +
          t.icon +
          (ov ? `<span class="dotw"></span>` : "") +
          `<span class="tip">${t.label}</span>` +
          `</button>`
        );
      })
      .join("");

    const showSearch = tabHasSearch(tab);

    const overbar =
      totalOverrides() > 0
        ? `<div class="dtf-overbar">` +
          I.alert +
          `<span><b>${totalOverrides()} session override${totalOverrides() > 1 ? "s" : ""}</b> · cleared on refresh</span>` +
          `<button data-action="clear-overrides">Clear all</button>` +
          `</div>`
        : "";

    const searchBar = showSearch ? searchBarHtml(tab) : "";

    panel.innerHTML = `
      <div class="dtf-head">
        <div class="mk" title="Drag to reposition"></div>
        <div class="ti">
          <span class="title">${escapeHtml(tabDef.label)}</span>
          <span class="sub">${escapeHtml(sub)}</span>
        </div>
        <div class="actions">
          <button class="ib" data-action="refresh" title="Refresh">${I.refresh}</button>
          <button class="ib" data-action="collapse" title="Collapse">${I.x}</button>
        </div>
      </div>
      <div class="dtf-split">
        <div class="dtf-rail">${railIcons}</div>
        <div class="dtf-pane">
          ${overbar}
          ${searchBar}
          <div class="dtf-body" id="dtf-body"></div>
        </div>
      </div>
      <div class="dtf-foot">
        <div class="stat-line">
          <span class="ok"></span>
          <span class="stat">SDK <b>connected</b></span>
          ${session ? "" : `<span class="sk">unauthed</span>`}
        </div>
        <div class="actions">
          <button class="ibtn" data-action="share" title="Build a URL that applies the current overrides">Copy share URL</button>
          <button class="ibtn" data-action="apply-url" title="Persist current overrides to the URL and reload">Pin to URL</button>
          <span class="grow"></span>
          ${
            totalOverrides() > 0
              ? `<button class="ibtn danger" data-action="clear-overrides" title="Drop all session overrides">Clear overrides</button>`
              : ""
          }
          ${
            session
              ? `<button class="ibtn" data-action="signout" title="Sign out of this project">Sign out</button>`
              : ""
          }
        </div>
      </div>
    `;

    // Drag handle on header mk
    const headMk = panel.querySelector<HTMLElement>(".dtf-head .mk")!;
    headMk.addEventListener("mousedown", (e) => {
      e.preventDefault();
      headMk.classList.add("dragging");
      const move = (ev: MouseEvent) => {
        const { edge, offsetPct } = nearestEdge(ev.clientX, ev.clientY);
        state = { ...state, edge, offsetPct };
        applyPanelStyle(panel);
      };
      const up = () => {
        headMk.classList.remove("dragging");
        document.removeEventListener("mousemove", move);
        document.removeEventListener("mouseup", up);
        saveOverlayState(state);
      };
      document.addEventListener("mousemove", move);
      document.addEventListener("mouseup", up);
    });

    // Header actions
    panel.querySelector('[data-action="refresh"]')!.addEventListener("click", () => {
      // Drop the in-memory api cache so the next render fetches fresh data
      // for every panel. Cheap — panel modules call api.<list>() directly.
      getApi()?.invalidate();
      render();
    });
    panel.querySelector('[data-action="collapse"]')!.addEventListener("click", () => {
      state = { ...state, collapsed: true };
      saveOverlayState(state);
      render();
    });

    // Tab rail
    panel.querySelectorAll<HTMLButtonElement>(".dtf-rail .t").forEach((btn) => {
      btn.addEventListener("click", () => {
        switchTab(btn.dataset.tab as PanelKey);
      });
      if (btn.dataset.tab === "feedback") attachFeedbackQuickActions(btn);
    });

    // Search + view
    if (showSearch) wireSearch(panel, tab);

    // Footer actions
    panel.querySelector('[data-action="clear-overrides"]')?.addEventListener("click", () => {
      clearAllOverrides();
    });
    panel.querySelector('[data-action="apply-url"]')?.addEventListener("click", () => {
      applyOverridesToUrlAndReload();
    });
    panel.querySelector('[data-action="share"]')?.addEventListener("click", async () => {
      const url = buildOverrideUrl({ ...snapshotOverridesFromStorage(), openDevtools: true });
      const btn = panel.querySelector<HTMLButtonElement>('[data-action="share"]')!;
      try {
        await navigator.clipboard.writeText(url);
        const prev = btn.textContent;
        btn.textContent = "Copied ✓";
        setTimeout(() => (btn.textContent = prev), 1500);
      } catch {
        prompt("Copy this URL:", url);
      }
    });
    panel.querySelector('[data-action="signout"]')?.addEventListener("click", () => {
      clearSession();
      saveCachedProject(null);
      session = null;
      project = null;
      api = null;
      render();
    });

    renderTabBody();
  }

  // Tab swap without tearing down the whole panel. Mutates only the surfaces
  // that change between tabs — rail .active state, header title, the optional
  // .dtf-search bar, and the body — so nothing else flickers. Falls back to a
  // full render() in the unauthed/collapsed cases that need the shell to
  // recompose.
  function switchTab(next: PanelKey): void {
    if (!session || state.collapsed) {
      activeKey = next;
      saveActivePanel(next);
      render();
      return;
    }
    if (next === activeKey) return;
    const panel = root.querySelector<HTMLElement>(".dtf-panel");
    if (!panel) {
      activeKey = next;
      saveActivePanel(next);
      render();
      return;
    }
    activeKey = next;
    saveActivePanel(next);

    // Rail active class — flip in place.
    panel.querySelectorAll<HTMLButtonElement>(".dtf-rail .t").forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.tab === next);
    });

    // Header title.
    const tabDef = TABS.find((t) => t.k === next);
    const titleEl = panel.querySelector<HTMLElement>(".dtf-head .ti .title");
    if (tabDef && titleEl) titleEl.textContent = tabDef.label;

    // Search bar — drop the existing one (if any) and insert one for the new
    // tab if the new tab uses search. Cheaper to rebuild than to reconcile
    // placeholder/value/locale-select across tab kinds.
    const pane = panel.querySelector<HTMLElement>(".dtf-pane");
    pane?.querySelector(".dtf-search")?.remove();
    if (pane && tabHasSearch(next)) {
      const body = pane.querySelector<HTMLElement>("#dtf-body");
      body?.insertAdjacentHTML("beforebegin", searchBarHtml(next));
      wireSearch(panel, next);
    }

    // Body content.
    renderTabBody();
  }

  function tabHasSearch(tab: PanelKey): boolean {
    return tab === "gates" || tab === "experiments" || tab === "configs" || tab === "labels";
  }

  function searchBarHtml(tab: PanelKey): string {
    const view = tabView[tab];
    return `<div class="dtf-search">
        <div class="input">
          ${I.search}
          <input placeholder="Filter ${tab}…" value="${escapeAttr(view.search)}" />
          ${view.search ? `<span class="kbd" data-action="clear-search">esc</span>` : `<span class="kbd">⌘K</span>`}
        </div>
        <div class="seg">
          <button class="${view.view === "page" ? "active" : ""}" data-view="page">page</button>
          <button class="${view.view === "all" ? "active" : ""}" data-view="all">all</button>
        </div>
        ${tab === "labels" ? `<select class="dtf-locale-sel" data-locale></select>` : ""}
      </div>`;
  }

  function wireSearch(panel: HTMLElement, tab: PanelKey): void {
    const input = panel.querySelector<HTMLInputElement>(".dtf-search input");
    if (!input) return;
    input.addEventListener("input", () => {
      tabView[tab].search = input.value;
      renderTabBody();
    });
    panel.querySelectorAll<HTMLButtonElement>(".dtf-search .seg button").forEach((b) => {
      b.addEventListener("click", () => {
        tabView[tab].view = b.dataset.view as "page" | "all";
        render();
      });
    });
    panel.querySelector('[data-action="clear-search"]')?.addEventListener("click", () => {
      tabView[tab].search = "";
      render();
    });
  }

  function renderTabBody(): void {
    const body = root.querySelector<HTMLElement>("#dtf-body");
    if (!body) return;
    if (!session) return; // unauthed is handled at the shell level (renderExpandedUnauthed)

    const api = getApi();
    if (!api) return;

    // Trigger a project refresh in the background so module gating reflects
    // dashboard state without forcing the user to reopen the panel.
    void ensureProjectLoaded(api);

    const tab = activeKey!;
    const view = tabView[tab];

    // Each panel gets a callback to update overrides count for the shell
    // to render badges + footer state.
    const setOverrideCount = (n: number) => {
      const prev = overridesByTab[tab];
      overridesByTab[tab] = n;
      // Re-render shell only when count change crosses thresholds (0 ↔ >0,
      // or affects overbar text). Easiest: re-render header bits in place.
      if ((prev === 0) !== (n === 0) || prev !== n) {
        // Keep the body intact but refresh overbar/footer + tab rail dots.
        updateOverbarFooter();
      }
    };

    switch (tab) {
      case "user":
        renderUserPanel(body, api, userState, () => render());
        break;
      case "gates":
        void renderGatesPanel(body, api, view, setOverrideCount);
        break;
      case "experiments":
        void renderExperimentsPanel(body, api, view, setOverrideCount);
        break;
      case "configs":
        void renderConfigsPanel(body, api, view, setOverrideCount, root);
        break;
      case "labels":
        void renderLabelsPanel(body, api, view, shadow, {
          locale: labelLocale,
          setLocale: (l) => {
            labelLocale = l;
            renderTabBody();
          },
        });
        break;
      case "feedback":
        void renderFeedbackPanel(body, api, root, {
          sub: feedbackSub,
          setSub: (s) => {
            feedbackSub = s;
            renderTabBody();
          },
          pendingForm: feedbackPendingForm,
          consumePendingForm: () => {
            feedbackPendingForm = null;
          },
        });
        break;
      case "events":
        renderEventsPanel(body);
        break;
    }
  }

  function updateOverbarFooter(): void {
    // Cheap re-render — only the shell pieces. We re-render the whole panel
    // for now, since most of the body state is fetched-and-cached inside the
    // panel module itself; re-running is a no-op for the user's perception.
    render();
  }

  async function ensureProjectLoaded(api: DevtoolsApi): Promise<void> {
    try {
      const p = await api.project();
      const host = window.location.host;
      // Origin-lock: if the project's configured domain doesn't cover this
      // host, the cached session probably belongs to a different customer
      // and we should sign out. EXCEPT when the page exposes a valid SDK
      // key in `__SE_BOOTSTRAP` — that key is proof the page is legitimately
      // wired to this project (the server-side approve flow already verified
      // it), so localhost dev pointing at a prod project is fine.
      const hasBridgeKey = readBridgeApiKey() !== null;
      if (!hasBridgeKey && p.domain && !projectOwnsHost(host, p.domain)) {
        clearSession();
        saveCachedProject(null);
        session = null;
        project = null;
        // Don't touch the outer `api` cache here — `api` is shadowed by the
        // function parameter. getApi() returns null while session is null,
        // and rebuilds a fresh instance once a new session is established.
        render();
        return;
      }
      const prev = project;
      project = p;
      saveCachedProject(p);
      // If the just-active panel was disabled, fall back to the first enabled
      // tab. Re-render only when something visibly changed.
      if (activeKey && !isPanelEnabled(activeKey)) {
        const next = TABS.find((t) => isPanelEnabled(t.k))?.k ?? null;
        activeKey = next;
        saveActivePanel(next);
        render();
        return;
      }
      if (!prev || !sameModules(prev.modules, p.modules)) render();
    } catch {
      /* best-effort */
    }
  }

  // ── Mount ───────────────────────────────────────────────────────────────
  document.documentElement.appendChild(host);
  const reattach = () => {
    if (!document.getElementById("shipeasy-devtools")) {
      document.documentElement.appendChild(host);
    }
  };
  const mo = new MutationObserver(reattach);
  mo.observe(document.documentElement, { childList: true });

  if (isEditLabelsModeActive()) {
    scanAndReplaceMarkers();
    toggleEditLabels(true, shadow, () => {
      /* re-render hook */
    });
  }

  // Default to collapsed unless user previously expanded a panel.
  if (!loadActivePanel()) {
    state = { ...state, collapsed: true };
  }
  render();

  // Refresh project meta for module gating.
  if (session) {
    const api = getApi();
    if (api) void ensureProjectLoaded(api);
  }

  // ShipEasy controls (kill-switch flags hosted in the controls project) —
  // re-render to flip admin-link visibility on changes.
  void refreshControls();
  const unsubControls = subscribeControls(() => render());

  const onWinResize = () => {
    const panel = root.querySelector<HTMLElement>(".dtf-panel");
    if (panel) applyPanelStyle(panel);
  };
  window.addEventListener("resize", onWinResize);

  // Live SDK state updates → rerender the active body
  const onStateUpdate = () => renderTabBody();
  window.addEventListener("se:state:update", onStateUpdate);

  return {
    destroy() {
      window.removeEventListener("resize", onWinResize);
      window.removeEventListener("se:state:update", onStateUpdate);
      unsubControls();
      mo.disconnect();
      host.remove();
    },
  };
}

function escapeHtml(s: string): string {
  return s.replace(
    /[&<>"']/g,
    (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch]!,
  );
}
function escapeAttr(s: string): string {
  return escapeHtml(s);
}
