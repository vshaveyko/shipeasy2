import { createOverlay } from "./overlay";
import { initFromUrl, isDevtoolsRequested } from "./overrides";
import type { DevtoolsOptions } from "./types";

export type { DevtoolsOptions } from "./types";
export {
  getGateOverride,
  setGateOverride,
  getConfigOverride,
  setConfigOverride,
  getExpOverride,
  setExpOverride,
  getI18nProfileOverride,
  setI18nProfileOverride,
  clearAllOverrides,
} from "./overrides";

const DEFAULTS = {
  adminUrl: "https://app.shipeasy.dev",
  edgeUrl: "https://edge.shipeasy.dev",
} satisfies Required<DevtoolsOptions>;

let destroyFn: (() => void) | null = null;

/** Mount the devtools overlay. Safe to call multiple times — idempotent. */
export function init(opts: DevtoolsOptions = {}): void {
  if (destroyFn) return; // already mounted
  if (typeof window === "undefined" || typeof document === "undefined") return;

  initFromUrl();

  const resolved: Required<DevtoolsOptions> = {
    adminUrl: opts.adminUrl ?? DEFAULTS.adminUrl,
    edgeUrl: opts.edgeUrl ?? DEFAULTS.edgeUrl,
  };

  const { destroy } = createOverlay(resolved);
  destroyFn = destroy;
}

/** Unmount the devtools overlay. */
export function destroy(): void {
  destroyFn?.();
  destroyFn = null;
}

/**
 * Framework-agnostic entry point.
 *
 * - Captures ?se-* URL params into sessionStorage.
 * - Opens the overlay immediately if ?se-devtools is present.
 * - Installs a keyboard listener for the hotkey (default: Shift+Alt+S).
 *   Subsequent presses toggle the overlay.
 *
 * Returns a cleanup function (remove the listener) — call it in a
 * useEffect cleanup, componentWillUnmount, or an AbortController callback.
 *
 * Works in any environment (vanilla JS, React, Vue, Svelte, …).
 */
export function loadOnTrigger(opts: DevtoolsOptions = {}, hotkey = "Shift+Alt+S"): () => void {
  if (typeof window === "undefined") return () => {};

  initFromUrl();

  if (isDevtoolsRequested()) {
    init(opts);
  }

  const parts = hotkey.split("+");
  const triggerKey = parts[parts.length - 1];
  const needShift = parts.includes("Shift");
  const needAlt = parts.includes("Alt") || parts.includes("Option");
  const needCtrl = parts.includes("Ctrl") || parts.includes("Control");
  const needMeta = parts.includes("Meta") || parts.includes("Cmd");
  // Match against e.code so Mac Option+letter (which mutates e.key to a
  // special character like ß/Í) still triggers. Fall back to e.key for
  // non-letter keys or when only modifier-free combos are used.
  const triggerCode = /^[a-zA-Z]$/.test(triggerKey) ? `Key${triggerKey.toUpperCase()}` : null;

  function onKeyDown(e: KeyboardEvent) {
    const keyMatches = triggerCode
      ? e.code === triggerCode
      : e.key.toLowerCase() === triggerKey.toLowerCase();
    if (
      keyMatches &&
      e.shiftKey === needShift &&
      e.altKey === needAlt &&
      e.ctrlKey === needCtrl &&
      e.metaKey === needMeta
    ) {
      if (destroyFn) destroy();
      else init(opts);
    }
  }

  window.addEventListener("keydown", onKeyDown);
  return () => window.removeEventListener("keydown", onKeyDown);
}

/** True when the current URL contains ?se-devtools */
export { isDevtoolsRequested };
