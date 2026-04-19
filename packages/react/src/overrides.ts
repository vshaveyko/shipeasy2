/**
 * Read-only view of the override storage written by @shipeasy/devtools.
 * Storage key format MUST stay in sync with packages/devtools/src/overrides.ts.
 */

const S = "se_"; // sessionStorage prefix
const L = "se_l_"; // localStorage prefix

function read(key: string): string | null {
  for (const store of [sessionStorage, localStorage]) {
    try {
      const v = store.getItem(key);
      if (v !== null) return v;
    } catch {}
  }
  return null;
}

/** Capture ?se-gate-X, ?se-config-X, ?se-exp-X URL params into sessionStorage. */
export function initFromUrl(): void {
  if (typeof window === "undefined") return;
  const params = new URLSearchParams(window.location.search);
  for (const [k, v] of params) {
    try {
      if (k.startsWith("se-gate-")) sessionStorage.setItem(`${S}gate_${k.slice(8)}`, v);
      else if (k.startsWith("se-config-")) sessionStorage.setItem(`${S}config_${k.slice(10)}`, v);
      else if (k.startsWith("se-exp-")) sessionStorage.setItem(`${S}exp_${k.slice(7)}`, v);
    } catch {}
  }
}

export function isDevtoolsRequested(): boolean {
  if (typeof window === "undefined") return false;
  return new URLSearchParams(window.location.search).has("se-devtools");
}

export function getGateOverride(name: string): boolean | null {
  const v = read(`${S}gate_${name}`) ?? read(`${L}gate_${name}`);
  return v === null ? null : v === "true";
}

export function getConfigOverride(name: string): unknown {
  const v = read(`${S}config_${name}`) ?? read(`${L}config_${name}`);
  if (v === null) return undefined;
  try {
    return JSON.parse(v);
  } catch {
    return v;
  }
}

export function getExpOverride(name: string): string | null {
  return read(`${S}exp_${name}`) ?? read(`${L}exp_${name}`);
}
