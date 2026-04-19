// Self-executing entry for <script src="…/se-devtools.js"> usage.
// loadOnTrigger() sets up the Shift+Alt+S hotkey and ?se-devtools URL param detection.
import { loadOnTrigger } from "./index";

if (typeof window !== "undefined") {
  loadOnTrigger();
  // Signal to tests (and any other code) that the script has executed.
  (window as Window & { __se_devtools_ready?: boolean }).__se_devtools_ready = true;
}
