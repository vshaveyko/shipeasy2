// Self-executing entry for <script src="…/se-devtools.js"> usage.
// loadOnTrigger() sets up the Shift+Alt+S hotkey and ?se-devtools URL param detection.
import { loadOnTrigger, isDevtoolsRequested } from "./index";
import { isEditLabelsModeActive, setEditLabelsMode } from "./overrides";
import { scanAndReplaceMarkers, toggleEditLabels } from "./panels/i18n";
import type { DevtoolsOptions } from "./types";

// Floating "Stop editing labels" exit button.
//
// When ?se_edit_labels=1 is active the devtools sidebar is often invisible —
// the user navigated, the overlay was dismissed, or the panel hadn't mounted
// yet. Without an exit affordance the user is stuck in edit mode (every t()
// call still emits markers) and has to know to strip the URL param by hand.
// The button lives directly on document.body (not inside the shadow root) so
// it's guaranteed to render even when the overlay isn't mounted.
function mountEditLabelsExitButton(): void {
  if (document.getElementById("se-edit-labels-exit")) return;
  const btn = document.createElement("button");
  btn.id = "se-edit-labels-exit";
  btn.type = "button";
  btn.textContent = "✕ Stop editing labels";
  btn.title = "Exit in-page label editing";
  Object.assign(btn.style, {
    position: "fixed",
    right: "16px",
    bottom: "16px",
    zIndex: "2147483646",
    padding: "8px 12px",
    background: "#0f172a",
    color: "#f8fafc",
    border: "1px solid rgba(248, 250, 252, 0.18)",
    borderRadius: "999px",
    font: "600 12px ui-sans-serif, system-ui, -apple-system, sans-serif",
    cursor: "pointer",
    boxShadow: "0 8px 24px rgba(0, 0, 0, 0.35)",
  } satisfies Partial<CSSStyleDeclaration>);
  btn.addEventListener("mouseenter", () => {
    btn.style.background = "#1e293b";
  });
  btn.addEventListener("mouseleave", () => {
    btn.style.background = "#0f172a";
  });
  btn.addEventListener("click", () => setEditLabelsMode(false));
  const attach = () => {
    if (document.body) document.body.appendChild(btn);
    else
      document.addEventListener("DOMContentLoaded", () => document.body.appendChild(btn), {
        once: true,
      });
  };
  attach();
}

interface AutoGlobals {
  __se_devtools_config?: DevtoolsOptions;
  __se_devtools_ready?: boolean;
}

if (typeof window !== "undefined") {
  // Config override for non-production deployments (local dev, staging).
  // Set `window.__se_devtools_config = { adminUrl }` before this script
  // runs to point the overlay at a different admin deployment. When unset
  // we default to the origin of the se-devtools.js <script> tag, so the
  // popup opens on the admin app that served the script.
  const cfg = (window as Window & AutoGlobals).__se_devtools_config ?? {};
  loadOnTrigger(cfg);
  void isDevtoolsRequested;

  // When ?se_edit_labels=1 is present, scan the DOM and replace Unicode
  // markers with <span data-label="key"> elements — even if the overlay is
  // not open.  We need to run AFTER:
  //   1. React has hydrated and rendered all t() call sites, AND
  //   2. The i18n CDN loader has fetched translations and installed window.i18n
  //
  // The safest trigger is window.i18n.on("update") which fires when the CDN
  // loader completes its fetch. At that point React has re-rendered with real
  // translated values (and marker strings), so the DOM is ready to scan.
  // We also fire once immediately on a rAF as a fallback for cases where
  // window.i18n is already available before this script runs.
  if (isEditLabelsModeActive()) {
    mountEditLabelsExitButton();
    // Run one scan pass.  After the scan, install a childList-only observer so
    // newly-mounted components that render [data-label] spans also get cleaned.
    // We intentionally avoid characterData observation — it fires on every React
    // text update and creates a feedback loop with our own DOM writes.
    //
    // The observer is disconnected BEFORE each scan and reconnected AFTER so
    // that our own el.textContent = … mutations don't re-trigger the scan.
    let scanScheduled = false;

    const observer = new MutationObserver(() => scheduleScan());

    const scheduleScan = () => {
      if (scanScheduled) return;
      scanScheduled = true;
      // rAF lets React finish the current render cycle before we read the DOM.
      requestAnimationFrame(() => {
        scanScheduled = false;
        observer.disconnect(); // pause — don't react to our own writes
        scanAndReplaceMarkers();
        observer.observe(document.body, {
          childList: true,
          subtree: true,
          attributes: true,
        }); // resume
      });
    };

    // First pass: run now (translations may already be present) and again when
    // the CDN loader fires se:i18n:ready (in case it fires before this script).
    scheduleScan();

    // Auto-activate the click-to-edit handler for ?se_edit_labels=1, so the
    // tabbed popper opens on click without requiring the user to manually flip
    // the toggle in the i18n panel (which gates behind dashboard auth).  Wait
    // for the overlay shadow root to mount, then arm the handler.
    const armEditMode = () => {
      const host = document.getElementById("shipeasy-devtools");
      if (!host?.shadowRoot) {
        setTimeout(armEditMode, 100);
        return;
      }
      toggleEditLabels(true, host.shadowRoot, () => scheduleScan());
    };
    armEditMode();
    window.addEventListener("se:i18n:ready", () => scheduleScan(), { once: true });

    // Also subscribe via window.i18n.on("update") if the loader is already installed.
    const w = window as Window & { i18n?: { on?: (ev: string, cb: () => void) => () => void } };
    if (w.i18n?.on) w.i18n.on("update", () => scheduleScan());
  }

  (window as Window & AutoGlobals).__se_devtools_ready = true;
}
