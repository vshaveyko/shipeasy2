/**
 * URL-only override reader, consumed by the React provider's
 * useFlag / useConfig / useExperiment hooks. No storage layer — the
 * single source of truth is `window.location.search`. This must stay in
 * sync with packages/devtools/src/overrides.ts.
 */

const TRUE_RX = /^(true|on|1|yes)$/i;
const FALSE_RX = /^(false|off|0|no)$/i;

function parseBool(raw: string): boolean | null {
  if (TRUE_RX.test(raw)) return true;
  if (FALSE_RX.test(raw)) return false;
  return null;
}

function decodeConfigValue(raw: string): unknown {
  if (raw.startsWith("b64:")) {
    try {
      const json = atob(raw.slice(4).replace(/-/g, "+").replace(/_/g, "/"));
      return JSON.parse(json);
    } catch {
      return raw;
    }
  }
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}

function readParam(canonical: string, legacy?: string): string | null {
  if (typeof window === "undefined") return null;
  const params = new URLSearchParams(window.location.search);
  const direct = params.get(canonical);
  if (direct !== null) return direct;
  if (legacy) {
    const legacyVal = params.get(legacy);
    if (legacyVal !== null) return legacyVal;
  }
  return null;
}

/** No-op kept for API compatibility — URL is the source of truth. */
export function initFromUrl(): void {}

export function isDevtoolsRequested(): boolean {
  if (typeof window === "undefined") return false;
  const p = new URLSearchParams(window.location.search);
  return p.has("se") || p.has("se_devtools") || p.has("se-devtools");
}

export function getGateOverride(name: string): boolean | null {
  const v =
    readParam(`se_ks_${name}`) ?? readParam(`se_gate_${name}`) ?? readParam(`se-gate-${name}`);
  return v === null ? null : parseBool(v);
}

export function getConfigOverride(name: string): unknown {
  const v = readParam(`se_config_${name}`, `se-config-${name}`);
  if (v === null) return undefined;
  return decodeConfigValue(v);
}

export function getExpOverride(name: string): string | null {
  const v = readParam(`se_exp_${name}`, `se-exp-${name}`);
  if (v === null || v === "" || v === "default" || v === "none") return null;
  return v;
}
