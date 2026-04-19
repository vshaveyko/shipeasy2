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

/** True when the current URL contains ?se-devtools */
export { isDevtoolsRequested };
