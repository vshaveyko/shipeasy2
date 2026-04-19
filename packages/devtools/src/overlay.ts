import { STYLES } from "./styles";
import { loadSession, clearSession, startDeviceAuth } from "./auth";
import { clearAllOverrides } from "./overrides";
import { DevtoolsApi, isSameOrigin } from "./api";
import { renderGatesPanel } from "./panels/gates";
import { renderConfigsPanel } from "./panels/configs";
import { renderExperimentsPanel } from "./panels/experiments";
import { renderI18nPanel } from "./panels/i18n";
import type { DevtoolsOptions, DevtoolsSession } from "./types";

type PanelKey = "gates" | "configs" | "experiments" | "i18n";
type Edge = "top" | "right" | "bottom" | "left";

interface OverlayState {
  edge: Edge;
  offsetPct: number; // 0–100, position of toolbar center along the edge
  panelWidth: number; // panel cross-axis size (px)
  panelHeight: number; // panel main-axis size (px)
}

const PANELS: Record<PanelKey, { icon: string; label: string }> = {
  gates: { icon: "⛳", label: "Gates" },
  configs: { icon: "⚙", label: "Configs" },
  experiments: { icon: "🧪", label: "Experiments" },
  i18n: { icon: "🌐", label: "i18n" },
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
  // When the admin is on the current origin, the Auth.js session cookie is
  // already sufficient — skip the device-auth flow and use credentials-include
  // requests. The sentinel token is ignored by DevtoolsApi in that case.
  const sameOriginAdmin = isSameOrigin(opts.adminUrl);
  let session: DevtoolsSession | null = sameOriginAdmin
    ? { token: "", projectId: "same-origin" }
    : loadSession();

  // ── Initial layout ────────────────────────────────────────────────────────────
  // Defer one frame so getBoundingClientRect is accurate after first paint
  requestAnimationFrame(() => applyLayout(toolbar, panel, resizeHandle, state));

  // ── Drag handle ───────────────────────────────────────────────────────────────
  const dragHandle = document.createElement("div");
  dragHandle.className = "drag-handle";
  dragHandle.title = "Drag to reposition";
  dragHandle.textContent = "⠿";
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
    btn.textContent = icon;
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
    return `
      <div class="panel-head">
        <span class="panel-title">${icon} ${label}</span>
        <button class="close" id="se-close">✕</button>
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
      <div class="panel-footer">
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

    const body = panelInner.querySelector("#se-body")!;
    const renderers: Record<PanelKey, () => Promise<void>> = {
      gates: () => renderGatesPanel(body, api),
      configs: () => renderConfigsPanel(body, api),
      experiments: () => renderExperimentsPanel(body, api),
      i18n: () => renderI18nPanel(body, api),
    };
    renderers[key]().catch((err) => {
      body.innerHTML = `<div class="err">${String(err)}</div>`;
    });
  }

  function renderAuthPrompt(returnTo: PanelKey) {
    const { icon, label } = PANELS[returnTo];
    panelInner.innerHTML = `
      ${panelHeader(icon, label)}
      <div class="panel-body">
        <div class="auth-box">
          <div class="auth-title">Connect to ShipEasy</div>
          <div class="auth-desc">Sign in with your ShipEasy account to inspect and override feature flags, configs, experiments, and translations.</div>
          <button class="ibtn pri" id="se-connect" style="width:100%">Connect →</button>
          <div class="auth-status" id="se-auth-status"></div>
        </div>
      </div>`;

    panelInner.querySelector("#se-close")!.addEventListener("click", closePanel);
    panelInner.querySelector("#se-connect")!.addEventListener("click", async () => {
      const btn = panelInner.querySelector<HTMLButtonElement>("#se-connect")!;
      const status = panelInner.querySelector<HTMLElement>("#se-auth-status")!;
      btn.disabled = true;
      btn.textContent = "Opening browser…";
      try {
        session = await startDeviceAuth(opts, () => {
          status.textContent = "Waiting for approval in the opened tab…";
          btn.textContent = "Waiting…";
        });
        renderPanelContent(returnTo);
      } catch (err) {
        status.textContent = `Auth failed: ${String(err)}`;
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
