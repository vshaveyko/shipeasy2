// Self-executing entry for <script src="…/se-devtools.js"> usage.
// loadOnTrigger() sets up the Shift+Alt+S hotkey and ?se-devtools URL param detection.
import { loadOnTrigger } from "./index";
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
  (window as Window & AutoGlobals).__se_devtools_ready = true;
}
