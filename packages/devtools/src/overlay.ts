import { STYLES } from "./styles";
import { loadSession, saveSession, clearSession, startDeviceAuth } from "./auth";
import { clearAllOverrides } from "./overrides";
import { DevtoolsApi } from "./api";
import { renderGatesPanel } from "./panels/gates";
import { renderConfigsPanel } from "./panels/configs";
import { renderExperimentsPanel } from "./panels/experiments";
import { renderI18nPanel } from "./panels/i18n";
import type { DevtoolsOptions, DevtoolsSession } from "./types";

type PanelKey = "gates" | "configs" | "experiments" | "i18n";

const PANELS: Record<PanelKey, { icon: string; label: string }> = {
  gates: { icon: "⛳", label: "Gates" },
  configs: { icon: "⚙", label: "Configs" },
  experiments: { icon: "🧪", label: "Experiments" },
  i18n: { icon: "🌐", label: "i18n" },
};

export function createOverlay(opts: Required<DevtoolsOptions>): { destroy: () => void } {
  // --- DOM skeleton ---
  const host = document.createElement("div");
  host.setAttribute("id", "shipeasy-devtools");
  const shadow = host.attachShadow({ mode: "open" });

  shadow.innerHTML = `
    <style>${STYLES}</style>
    <div class="toolbar" id="toolbar"></div>
    <div class="panel"   id="panel"></div>
  `;

  const toolbar = shadow.getElementById("toolbar")!;
  const panel = shadow.getElementById("panel")!;

  // --- Toolbar buttons ---
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

  // --- State ---
  let activeKey: PanelKey | null = null;
  let session: DevtoolsSession | null = loadSession();

  // --- Panel rendering ---
  function openPanel(key: PanelKey) {
    activeKey = key;
    buttons.forEach((b, k) => b.classList.toggle("active", k === key));
    panel.classList.add("open");
    renderPanelContent(key);
  }

  function closePanel() {
    panel.classList.remove("open");
    buttons.forEach((b) => b.classList.remove("active"));
    activeKey = null;
  }

  function togglePanel(key: PanelKey) {
    if (activeKey === key) {
      closePanel();
    } else {
      openPanel(key);
    }
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

    panel.innerHTML = `
      ${panelHeader(icon, label)}
      <div class="panel-body" id="se-body"></div>
      <div class="panel-footer">
        <button class="ibtn danger" id="se-signout">Sign out</button>
        <button class="ibtn danger" id="se-clearall">Clear overrides</button>
      </div>`;

    panel.querySelector("#se-close")!.addEventListener("click", closePanel);
    panel.querySelector("#se-signout")!.addEventListener("click", () => {
      clearSession();
      session = null;
      renderAuthPrompt(key);
    });
    panel.querySelector("#se-clearall")!.addEventListener("click", () => {
      clearAllOverrides();
      renderPanelContent(key);
    });

    const body = panel.querySelector("#se-body")!;

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
    panel.innerHTML = `
      ${panelHeader(icon, label)}
      <div class="panel-body">
        <div class="auth-box">
          <div class="auth-title">Connect to ShipEasy</div>
          <div class="auth-desc">Sign in with your ShipEasy account to inspect and override feature flags, configs, experiments, and translations.</div>
          <button class="ibtn pri" id="se-connect" style="width:100%">Connect →</button>
          <div class="auth-status" id="se-auth-status"></div>
        </div>
      </div>`;

    panel.querySelector("#se-close")!.addEventListener("click", closePanel);
    panel.querySelector("#se-connect")!.addEventListener("click", async () => {
      const connectBtn = panel.querySelector<HTMLButtonElement>("#se-connect")!;
      const statusEl = panel.querySelector<HTMLElement>("#se-auth-status")!;
      connectBtn.disabled = true;
      connectBtn.textContent = "Opening browser…";
      try {
        session = await startDeviceAuth(opts, () => {
          statusEl.textContent = "Waiting for approval in the opened tab…";
          connectBtn.textContent = "Waiting…";
        });
        renderPanelContent(returnTo);
      } catch (err) {
        statusEl.textContent = `Auth failed: ${String(err)}`;
        connectBtn.disabled = false;
        connectBtn.textContent = "Retry";
      }
    });
  }

  document.body.appendChild(host);

  return {
    destroy() {
      host.remove();
    },
  };
}
