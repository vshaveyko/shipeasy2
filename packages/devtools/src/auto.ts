// Self-executing entry for <script src="…/se-devtools.js"> usage.
// loadOnTrigger() sets up the Shift+Alt+S hotkey and ?se-devtools URL param detection.
import { loadOnTrigger } from "./index";
import type { DevtoolsOptions } from "./types";

interface AutoGlobals {
  __se_devtools_config?: DevtoolsOptions;
  __se_devtools_ready?: boolean;
}

if (typeof window !== "undefined") {
  const cfg = (window as Window & AutoGlobals).__se_devtools_config ?? {};
  // Default to same-origin so the overlay works out-of-the-box on the admin
  // app itself and on local dev. Cross-origin (customer apps) should set
  // window.__se_devtools_config = { adminUrl, edgeUrl } before this script runs.
  loadOnTrigger({
    adminUrl: cfg.adminUrl ?? window.location.origin,
    edgeUrl: cfg.edgeUrl ?? window.location.origin,
  });
  (window as Window & AutoGlobals).__se_devtools_ready = true;
}
