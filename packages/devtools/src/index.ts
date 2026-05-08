import { createOverlay } from "./overlay";
import { initFromUrl, installNavGuard, isDevtoolsRequested } from "./overrides";
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
  buildOverrideUrl,
  snapshotOverridesFromStorage,
  applyOverridesToUrlAndReload,
  isEditLabelsModeActive,
  setEditLabelsMode,
} from "./overrides";
export type { OverrideUrlInput } from "./overrides";

/** Production admin endpoint. Used as the default when no adminUrl is passed
 * and when the script tag origin would resolve to localhost / 127.0.0.1 /
 * file: — devs running the customer app locally still need a real ShipEasy
 * endpoint to authenticate against, so we always fall back to prod.
 */
const PROD_ADMIN_URL = "https://shipeasy.ai";

function isLocalOrigin(origin: string): boolean {
  return (
    /^https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\])(:|$)/i.test(origin) ||
    origin === "file://" ||
    origin === "null"
  );
}

/**
 * Resolve the default admin URL.
 *
 * Order:
 *   1. The <script src="…/se-devtools.js"> tag origin, when it points at a
 *      non-local host (i.e. the customer is loading from shipeasy.ai or some
 *      other production deployment).
 *   2. Otherwise — including when the bundle is loaded from localhost or as
 *      `<script src="/se-devtools.js">` on a dev server — fall through to the
 *      hardcoded production endpoint so device-auth + admin API calls always
 *      hit a real ShipEasy backend.
 */
function scriptTagOrigin(): string {
  if (typeof document !== "undefined") {
    const cur = document.currentScript as HTMLScriptElement | null;
    if (cur?.src) {
      try {
        const o = new URL(cur.src).origin;
        if (!isLocalOrigin(o)) return o;
      } catch {
        /* fall through */
      }
    }
    const scripts = document.querySelectorAll<HTMLScriptElement>("script[src]");
    for (const s of Array.from(scripts)) {
      if (s.src.includes("se-devtools.js")) {
        try {
          const o = new URL(s.src).origin;
          if (!isLocalOrigin(o)) return o;
        } catch {
          /* fall through */
        }
      }
    }
  }
  return PROD_ADMIN_URL;
}

let destroyFn: (() => void) | null = null;
let navGuardCleanup: (() => void) | null = null;

/** Mount the devtools overlay. Safe to call multiple times — idempotent. */
export function init(opts: DevtoolsOptions = {}): void {
  if (typeof window === "undefined" || typeof document === "undefined") return;
  // If a prior mount happened but the host got detached (e.g. React #418
  // tore down the documentElement subtree before the reattach observer
  // could catch it), reset the destroy handle and re-mount fresh.
  if (destroyFn) {
    if (document.getElementById("shipeasy-devtools")) return;
    destroyFn = null;
  }

  initFromUrl();
  if (!navGuardCleanup) navGuardCleanup = installNavGuard();

  const resolved: Required<DevtoolsOptions> = {
    adminUrl: opts.adminUrl ?? scriptTagOrigin(),
    hideAdminLinks: opts.hideAdminLinks ?? false,
  };

  const { destroy } = createOverlay(resolved);
  destroyFn = destroy;
}

/** Unmount the devtools overlay. */
export function destroy(): void {
  destroyFn?.();
  destroyFn = null;
  navGuardCleanup?.();
  navGuardCleanup = null;
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
