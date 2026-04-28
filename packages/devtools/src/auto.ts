// Self-executing entry for <script src="…/se-devtools.js"> usage.
// loadOnTrigger() sets up the Shift+Alt+S hotkey and ?se-devtools URL param detection.
import { loadOnTrigger, isDevtoolsRequested } from "./index";
import { isEditLabelsModeActive } from "./overrides";
import { scanAndReplaceMarkers } from "./panels/i18n";
import type { DevtoolsOptions } from "./types";

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

  // When ?se_edit_labels=1 is present, scan the DOM and replace Unicode
  // markers with <span data-label="key"> elements — even if the overlay is
  // not open.  We need to run AFTER:
  //   1. React has hydrated and rendered all tEl() / t() call sites, AND
  //   2. The i18n CDN loader has fetched translations and installed window.i18n
  //
  // The safest trigger is window.i18n.on("update") which fires when the CDN
  // loader completes its fetch. At that point React has re-rendered with real
  // translated values (and marker strings), so the DOM is ready to scan.
  // We also fire once immediately on a rAF as a fallback for cases where
  // window.i18n is already available before this script runs.
  if (isEditLabelsModeActive()) {
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
        observer.observe(document.body, { childList: true, subtree: true }); // resume
      });
    };

    // First pass: run now (translations may already be present) and again when
    // the CDN loader fires se:i18n:ready (in case it fires before this script).
    scheduleScan();
    window.addEventListener("se:i18n:ready", () => scheduleScan(), { once: true });

    // Also subscribe via window.i18n.on("update") if the loader is already installed.
    const w = window as Window & { i18n?: { on?: (ev: string, cb: () => void) => () => void } };
    if (w.i18n?.on) w.i18n.on("update", () => scheduleScan());
  }

  (window as Window & AutoGlobals).__se_devtools_ready = true;
}
