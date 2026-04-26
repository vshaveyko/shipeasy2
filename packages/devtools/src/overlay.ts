import { STYLES } from "./styles";
import { loadSession, clearSession, startDeviceAuth } from "./auth";
import {
  clearAllOverrides,
  applyOverridesToUrlAndReload,
  buildOverrideUrl,
  snapshotOverridesFromStorage,
} from "./overrides";
import { DevtoolsApi } from "./api";
import { renderGatesPanel } from "./panels/gates";
import { renderConfigsPanel } from "./panels/configs";
import { renderExperimentsPanel } from "./panels/experiments";
import { renderI18nPanel } from "./panels/i18n";
import { renderBugsPanel } from "./panels/bugs";
import { renderFeatureRequestsPanel } from "./panels/feature-requests";
import type { DevtoolsOptions, DevtoolsSession } from "./types";

type PanelKey = "gates" | "configs" | "experiments" | "i18n" | "bugs" | "features";
type Edge = "top" | "right" | "bottom" | "left";

interface OverlayState {
  edge: Edge;
  offsetPct: number; // 0–100, position of toolbar center along the edge
  panelWidth: number; // panel cross-axis size (px)
  panelHeight: number; // panel main-axis size (px)
}

// Hand-rolled lucide-style icons (same `currentColor` SVGs the rest of the
// dashboard uses) so the overlay matches the design system without pulling
// the lucide-react runtime into the IIFE bundle.
const ICON_GATES = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2.5" y="6.5" width="19" height="11" rx="5.5"/><circle cx="8" cy="12" r="3"/></svg>`;
const ICON_CONFIGS = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="4" y1="6" x2="20" y2="6"/><circle cx="9" cy="6" r="2.25"/><line x1="4" y1="12" x2="20" y2="12"/><circle cx="15" cy="12" r="2.25"/><line x1="4" y1="18" x2="20" y2="18"/><circle cx="9" cy="18" r="2.25"/></svg>`;
const ICON_EXPERIMENTS = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 3h6"/><path d="M10 3v6.5L4.5 19a2 2 0 0 0 1.7 3h11.6a2 2 0 0 0 1.7-3L14 9.5V3"/><path d="M7.5 14h9"/></svg>`;
const ICON_I18N = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 5h8"/><path d="M8 3v2"/><path d="M5.5 11s2.5-2 4-6"/><path d="M5 11s2 4 5 4"/><path d="M11 21l3.5-9 3.5 9"/><path d="M12.5 18h4"/></svg>`;
const ICON_BUG = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 6V4a4 4 0 0 1 8 0v2"/><rect x="6" y="6" width="12" height="14" rx="6"/><path d="M3 12h3"/><path d="M18 12h3"/><path d="M3 18l3-2"/><path d="M21 18l-3-2"/><path d="M3 6l3 2"/><path d="M21 6l-3 2"/></svg>`;
const ICON_FEATURE = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3l2.4 5 5.6.8-4 3.9.9 5.6L12 16l-4.9 2.3.9-5.6-4-3.9 5.6-.8z"/></svg>`;
const ICON_CLOSE = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="6" y1="6" x2="18" y2="18"/><line x1="18" y1="6" x2="6" y2="18"/></svg>`;
const ICON_DRAG = `<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="9" cy="6" r="1.4"/><circle cx="15" cy="6" r="1.4"/><circle cx="9" cy="12" r="1.4"/><circle cx="15" cy="12" r="1.4"/><circle cx="9" cy="18" r="1.4"/><circle cx="15" cy="18" r="1.4"/></svg>`;

const PANELS: Record<PanelKey, { icon: string; label: string }> = {
  gates: { icon: ICON_GATES, label: "Gates" },
  configs: { icon: ICON_CONFIGS, label: "Configs" },
  experiments: { icon: ICON_EXPERIMENTS, label: "Experiments" },
  i18n: { icon: ICON_I18N, label: "Translations" },
  bugs: { icon: ICON_BUG, label: "Bugs" },
  features: { icon: ICON_FEATURE, label: "Feature requests" },
};

const OVERLAY_KEY = "se_l_overlay";
const PANEL_MIN_W = 240;
const PANEL_MAX_W = 580;
const PANEL_MIN_H = 180;
const PANEL_MAX_H = 700;
const DEFAULT_STATE: OverlayState = {
  edge: "right",
  offsetPct: 50,
  panelWidth: 340,
  panelHeight: 460,
};

// ── State persistence ──────────────────────────────────────────────────────────

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

// ── Geometry helpers ───────────────────────────────────────────────────────────

function nearestEdge(x: number, y: number): Pick<OverlayState, "edge" | "offsetPct"> {
  const W = window.innerWidth,
    H = window.innerHeight;
  const candidates: [number, Edge][] = [
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

// ── Layout application ─────────────────────────────────────────────────────────

function applyLayout(
  toolbar: HTMLElement,
  panel: HTMLElement,
  resizeHandle: HTMLElement,
  state: OverlayState,
): void {
  const { edge, offsetPct, panelWidth, panelHeight } = state;
  const W = window.innerWidth,
    H = window.innerHeight;
  const isVert = edge === "left" || edge === "right";

  const pW = Math.max(PANEL_MIN_W, Math.min(panelWidth, W - 80));
  const pH = Math.max(PANEL_MIN_H, Math.min(panelHeight, H - 40));
  const centerAlong = (offsetPct / 100) * (isVert ? H : W);

  // Toolbar rect (may be zero on first call before layout; fallback to 52)
  const tbRect = toolbar.getBoundingClientRect();
  const tbThick = isVert ? tbRect.width || 52 : tbRect.height || 52;

  // ── Toolbar ────────────────────────────────────────────────────────────────
  const ts = toolbar.style;
  ts.top = ts.bottom = ts.left = ts.right = ts.transform = "";
  ts.borderTop = ts.borderBottom = ts.borderLeft = ts.borderRight = "";
  ts.flexDirection = isVert ? "column" : "row";
  ts.padding = isVert ? "8px 6px" : "6px 8px";

  if (edge === "right") {
    ts.right = "0";
    ts.top = `${offsetPct}%`;
    ts.transform = "translateY(-50%)";
    ts.borderRadius = "10px 0 0 10px";
    ts.borderRight = "none";
    ts.boxShadow = "-3px 0 16px rgba(0,0,0,0.45)";
  } else if (edge === "left") {
    ts.left = "0";
    ts.top = `${offsetPct}%`;
    ts.transform = "translateY(-50%)";
    ts.borderRadius = "0 10px 10px 0";
    ts.borderLeft = "none";
    ts.boxShadow = "3px 0 16px rgba(0,0,0,0.45)";
  } else if (edge === "top") {
    ts.top = "0";
    ts.left = `${offsetPct}%`;
    ts.transform = "translateX(-50%)";
    ts.borderRadius = "0 0 10px 10px";
    ts.borderTop = "none";
    ts.boxShadow = "0 3px 16px rgba(0,0,0,0.45)";
  } else {
    ts.bottom = "0";
    ts.left = `${offsetPct}%`;
    ts.transform = "translateX(-50%)";
    ts.borderRadius = "10px 10px 0 0";
    ts.borderBottom = "none";
    ts.boxShadow = "0 -3px 16px rgba(0,0,0,0.45)";
  }

  // ── Panel ──────────────────────────────────────────────────────────────────
  const ps = panel.style;
  ps.top = ps.bottom = ps.left = ps.right = ps.transform = "";
  ps.borderTop = ps.borderBottom = ps.borderLeft = ps.borderRight = "";
  ps.width = pW + "px";
  ps.height = pH + "px";
  panel.dataset.edge = edge;

  if (edge === "right") {
    const top = Math.max(10, Math.min(H - pH - 10, centerAlong - pH / 2));
    ps.right = tbThick + "px";
    ps.top = top + "px";
    ps.borderRadius = "10px 0 0 10px";
    ps.borderRight = "none";
    ps.boxShadow = "-6px 0 24px rgba(0,0,0,0.4)";
  } else if (edge === "left") {
    const top = Math.max(10, Math.min(H - pH - 10, centerAlong - pH / 2));
    ps.left = tbThick + "px";
    ps.top = top + "px";
    ps.borderRadius = "0 10px 10px 0";
    ps.borderLeft = "none";
    ps.boxShadow = "6px 0 24px rgba(0,0,0,0.4)";
  } else if (edge === "top") {
    const left = Math.max(10, Math.min(W - pW - 10, centerAlong - pW / 2));
    ps.top = tbThick + "px";
    ps.left = left + "px";
    ps.borderRadius = "0 0 10px 10px";
    ps.borderTop = "none";
    ps.boxShadow = "0 6px 24px rgba(0,0,0,0.4)";
  } else {
    const left = Math.max(10, Math.min(W - pW - 10, centerAlong - pW / 2));
    ps.bottom = tbThick + "px";
    ps.left = left + "px";
    ps.borderRadius = "10px 10px 0 0";
    ps.borderBottom = "none";
    ps.boxShadow = "0 -6px 24px rgba(0,0,0,0.4)";
  }

  // ── Resize handle ──────────────────────────────────────────────────────────
  const rs = resizeHandle.style;
  rs.top = rs.bottom = rs.left = rs.right = rs.width = rs.height = "";
  resizeHandle.dataset.dir = isVert ? "ew" : "ns";

  if (isVert) {
    rs.width = "10px";
    rs.top = "0";
    rs.bottom = "0";
    resizeHandle.style.cursor = "ew-resize";
    if (edge === "right") rs.left = "0";
    else rs.right = "0";
  } else {
    rs.height = "10px";
    rs.left = "0";
    rs.right = "0";
    resizeHandle.style.cursor = "ns-resize";
    if (edge === "top") rs.bottom = "0";
    else rs.top = "0";
  }
}

// ── Main export ────────────────────────────────────────────────────────────────

export function createOverlay(opts: Required<DevtoolsOptions>): { destroy: () => void } {
  // DOM skeleton
  const host = document.createElement("div");
  host.setAttribute("id", "shipeasy-devtools");
  const shadow = host.attachShadow({ mode: "open" });
  shadow.innerHTML = `<style>${STYLES}</style><div id="toolbar"></div><div id="panel"></div>`;

  const toolbar = shadow.getElementById("toolbar")!;
  const panel = shadow.getElementById("panel")!;
  toolbar.className = "toolbar";
  panel.className = "panel";

  // Resize handle lives permanently inside panel (not replaced by innerHTML)
  const resizeHandle = document.createElement("div");
  resizeHandle.className = "resize-handle";
  panel.appendChild(resizeHandle);

  // Panel inner — the only part replaced on each render
  const panelInner = document.createElement("div");
  panelInner.className = "panel-inner";
  panel.appendChild(panelInner);

  // ── State ────────────────────────────────────────────────────────────────────
  let state: OverlayState = loadOverlayState();
  let activeKey: PanelKey | null = null;
  let session: DevtoolsSession | null = loadSession();

  // ── Initial layout ────────────────────────────────────────────────────────────
  // Defer one frame so getBoundingClientRect is accurate after first paint
  requestAnimationFrame(() => applyLayout(toolbar, panel, resizeHandle, state));

  // ── Drag handle ───────────────────────────────────────────────────────────────
  const dragHandle = document.createElement("div");
  dragHandle.className = "drag-handle";
  dragHandle.title = "Drag to reposition";
  dragHandle.innerHTML = ICON_DRAG;
  toolbar.appendChild(dragHandle);

  dragHandle.addEventListener("mousedown", (e) => {
    e.preventDefault();
    dragHandle.classList.add("dragging");

    const move = (ev: MouseEvent) => {
      const { edge, offsetPct } = nearestEdge(ev.clientX, ev.clientY);
      state = { ...state, edge, offsetPct };
      applyLayout(toolbar, panel, resizeHandle, state);
    };
    const up = () => {
      dragHandle.classList.remove("dragging");
      document.removeEventListener("mousemove", move);
      document.removeEventListener("mouseup", up);
      saveOverlayState(state);
    };
    document.addEventListener("mousemove", move);
    document.addEventListener("mouseup", up);
  });

  // ── Toolbar buttons ───────────────────────────────────────────────────────────
  const buttons = new Map<PanelKey, HTMLButtonElement>();
  for (const [key, { icon, label }] of Object.entries(PANELS) as [
    PanelKey,
    { icon: string; label: string },
  ][]) {
    const btn = document.createElement("button");
    btn.className = "btn";
    btn.title = label;
    btn.innerHTML = icon;
    btn.addEventListener("click", () => togglePanel(key));
    toolbar.appendChild(btn);
    buttons.set(key, btn);
  }

  // ── Resize handle ─────────────────────────────────────────────────────────────
  resizeHandle.addEventListener("mousedown", (e) => {
    e.preventDefault();
    e.stopPropagation();
    resizeHandle.classList.add("dragging");

    const startX = e.clientX,
      startY = e.clientY;
    const startW = state.panelWidth,
      startH = state.panelHeight;
    const { edge } = state;

    const move = (ev: MouseEvent) => {
      const dx = ev.clientX - startX;
      const dy = ev.clientY - startY;
      const next = { ...state };
      if (edge === "right")
        next.panelWidth = Math.max(PANEL_MIN_W, Math.min(PANEL_MAX_W, startW - dx));
      if (edge === "left")
        next.panelWidth = Math.max(PANEL_MIN_W, Math.min(PANEL_MAX_W, startW + dx));
      if (edge === "top")
        next.panelHeight = Math.max(PANEL_MIN_H, Math.min(PANEL_MAX_H, startH + dy));
      if (edge === "bottom")
        next.panelHeight = Math.max(PANEL_MIN_H, Math.min(PANEL_MAX_H, startH - dy));
      state = next;
      applyLayout(toolbar, panel, resizeHandle, state);
    };
    const up = () => {
      resizeHandle.classList.remove("dragging");
      document.removeEventListener("mousemove", move);
      document.removeEventListener("mouseup", up);
      saveOverlayState(state);
    };
    document.addEventListener("mousemove", move);
    document.addEventListener("mouseup", up);
  });

  // ── Window resize ─────────────────────────────────────────────────────────────
  const onWinResize = () => applyLayout(toolbar, panel, resizeHandle, state);
  window.addEventListener("resize", onWinResize);

  // ── Panel open/close ──────────────────────────────────────────────────────────
  function openPanel(key: PanelKey) {
    activeKey = key;
    buttons.forEach((b, k) => b.classList.toggle("active", k === key));
    panel.classList.add("open");
    applyLayout(toolbar, panel, resizeHandle, state);
    renderPanelContent(key);
  }

  function closePanel() {
    panel.classList.remove("open");
    buttons.forEach((b) => b.classList.remove("active"));
    activeKey = null;
  }

  function togglePanel(key: PanelKey) {
    if (activeKey === key) closePanel();
    else openPanel(key);
  }

  function panelHeader(icon: string, label: string): string {
    const origin = typeof window !== "undefined" && window.location ? window.location.host : "";
    const sub = origin ? `<span class="sub">${origin}</span>` : "";
    return `
      <div class="panel-head">
        <span class="mk"></span>
        <span class="panel-title">
          <span class="panel-title-icon">${icon}</span>
          <span class="panel-title-label">${label}</span>
          ${sub}
        </span>
        <span class="live"><span class="dot"></span>LIVE</span>
        <button class="close" id="se-close" aria-label="Close">${ICON_CLOSE}</button>
      </div>`;
  }

  function renderPanelContent(key: PanelKey) {
    const { icon, label } = PANELS[key];

    if (!session) {
      renderAuthPrompt(key);
      return;
    }

    const api = new DevtoolsApi(opts.adminUrl, session.token);

    panelInner.innerHTML = `
      ${panelHeader(icon, label)}
      <div class="panel-body" id="se-body"></div>
      <div class="panel-subfoot" id="se-subfoot"></div>
      <div class="panel-footer">
        <span class="foot-status"><span class="dot"></span><span>SDK <b>connected</b></span></span>
        <button class="ibtn" id="se-share" title="Build a URL that applies the current overrides for any visitor">Share URL</button>
        <button class="ibtn" id="se-apply-url" title="Persist current overrides to the address bar and reload">Apply via URL</button>
        <button class="ibtn danger" id="se-signout">Sign out</button>
        <button class="ibtn danger" id="se-clearall">Clear overrides</button>
      </div>`;

    panelInner.querySelector("#se-close")!.addEventListener("click", closePanel);
    panelInner.querySelector("#se-signout")!.addEventListener("click", () => {
      clearSession();
      session = null;
      renderAuthPrompt(key);
    });
    panelInner.querySelector("#se-clearall")!.addEventListener("click", () => {
      clearAllOverrides();
      renderPanelContent(key);
    });
    panelInner.querySelector("#se-apply-url")!.addEventListener("click", () => {
      applyOverridesToUrlAndReload();
    });
    panelInner.querySelector("#se-share")!.addEventListener("click", async () => {
      const url = buildOverrideUrl({ ...snapshotOverridesFromStorage(), openDevtools: true });
      try {
        await navigator.clipboard.writeText(url);
        const btn = panelInner.querySelector("#se-share") as HTMLButtonElement;
        const prev = btn.textContent;
        btn.textContent = "Copied ✓";
        setTimeout(() => (btn.textContent = prev), 1500);
      } catch {
        prompt("Copy this URL:", url);
      }
    });

    const body = panelInner.querySelector("#se-body")!;
    const subfoot = panelInner.querySelector("#se-subfoot")! as HTMLElement;
    const renderers: Record<PanelKey, () => Promise<void>> = {
      gates: () => renderGatesPanel(body, api),
      configs: () => renderConfigsPanel(body, api),
      experiments: () => renderExperimentsPanel(body, api),
      i18n: () => renderI18nPanel(body, api, subfoot, shadow),
      bugs: () => renderBugsPanel(body, api, shadow),
      features: () => renderFeatureRequestsPanel(body, api, shadow),
    };
    renderers[key]().catch((err) => {
      body.innerHTML = `<div class="err">${String(err)}</div>`;
    });
  }

  function renderAuthPrompt(returnTo: PanelKey) {
    const { icon, label } = PANELS[returnTo];
    // Centred layout, no footer — Sign out / Clear overrides are signed-in only.
    panelInner.innerHTML = `
      ${panelHeader(icon, label)}
      <div class="panel-body auth-mode">
        <div class="auth-box">
          <div class="auth-icon">🔐</div>
          <div class="auth-title">Connect to ShipEasy</div>
          <div class="auth-desc">Sign in to inspect and override flags, configs, experiments, and translations.</div>
          <button class="ibtn pri" id="se-connect">Connect →</button>
          <div class="auth-status" id="se-auth-status"></div>
          <div class="auth-err" id="se-auth-err"></div>
        </div>
      </div>`;

    panelInner.querySelector("#se-close")!.addEventListener("click", closePanel);
    panelInner.querySelector("#se-connect")!.addEventListener("click", async () => {
      const btn = panelInner.querySelector<HTMLButtonElement>("#se-connect")!;
      const status = panelInner.querySelector<HTMLElement>("#se-auth-status")!;
      const errEl = panelInner.querySelector<HTMLElement>("#se-auth-err")!;
      btn.disabled = true;
      btn.textContent = "Opening…";
      status.textContent = "";
      errEl.textContent = "";
      try {
        session = await startDeviceAuth(opts, () => {
          status.textContent = "Waiting for approval in the opened tab…";
          btn.textContent = "Waiting…";
        });
        renderPanelContent(returnTo);
      } catch (err) {
        errEl.textContent = err instanceof Error ? err.message : String(err);
        status.textContent = "";
        btn.disabled = false;
        btn.textContent = "Retry";
      }
    });
  }

  document.body.appendChild(host);

  return {
    destroy() {
      window.removeEventListener("resize", onWinResize);
      host.remove();
    },
  };
}
