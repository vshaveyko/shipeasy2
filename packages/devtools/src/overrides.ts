import type { OverridePersistence } from "./types";

// Storage key prefixes — must match packages/react/src/overrides.ts
const S = "se_"; // sessionStorage
const L = "se_l_"; // localStorage

function read(key: string): string | null {
  for (const store of [sessionStorage, localStorage]) {
    try {
      const v = store.getItem(key);
      if (v !== null) return v;
    } catch {}
  }
  return null;
}

function write(key: string, value: string, p: OverridePersistence): void {
  try {
    (p === "local" ? localStorage : sessionStorage).setItem(key, value);
  } catch {}
}

function remove(key: string): void {
  for (const store of [sessionStorage, localStorage]) {
    try {
      store.removeItem(key);
    } catch {}
  }
}

function emit(): void {
  window.dispatchEvent(new CustomEvent("se:override:change"));
}

// ── URL param bootstrap ──────────────────────────────────────────────────────

/** Call once on page load to capture ?se-gate-X, ?se-config-X, ?se-exp-X params. */
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

// ── Gate overrides ───────────────────────────────────────────────────────────

export function getGateOverride(name: string): boolean | null {
  const v = read(`${S}gate_${name}`) ?? read(`${L}gate_${name}`);
  return v === null ? null : v === "true";
}

export function setGateOverride(
  name: string,
  value: boolean | null,
  p: OverridePersistence = "session",
): void {
  const key = `${p === "local" ? L : S}gate_${name}`;
  if (value === null) {
    remove(key);
  } else {
    write(key, String(value), p);
  }
  emit();
}

// ── Config overrides ─────────────────────────────────────────────────────────

export function getConfigOverride(name: string): unknown {
  const v = read(`${S}config_${name}`) ?? read(`${L}config_${name}`);
  if (v === null) return undefined;
  try {
    return JSON.parse(v);
  } catch {
    return v;
  }
}

export function setConfigOverride(
  name: string,
  value: unknown,
  p: OverridePersistence = "session",
): void {
  const key = `${p === "local" ? L : S}config_${name}`;
  if (value == null) {
    remove(key);
  } else {
    write(key, JSON.stringify(value), p);
  }
  emit();
}

// ── Experiment overrides ─────────────────────────────────────────────────────

export function getExpOverride(name: string): string | null {
  return read(`${S}exp_${name}`) ?? read(`${L}exp_${name}`);
}

export function setExpOverride(
  name: string,
  variant: string | null,
  p: OverridePersistence = "session",
): void {
  const key = `${p === "local" ? L : S}exp_${name}`;
  if (variant === null) {
    remove(key);
  } else {
    write(key, variant, p);
  }
  emit();
}

// ── Active i18n profile override ─────────────────────────────────────────────

export function getI18nProfileOverride(): string | null {
  return read(`${S}i18n_profile`) ?? read(`${L}i18n_profile`);
}

export function setI18nProfileOverride(
  profileId: string | null,
  p: OverridePersistence = "session",
): void {
  const key = `${p === "local" ? L : S}i18n_profile`;
  if (profileId === null) {
    remove(key);
  } else {
    write(key, profileId, p);
  }
  emit();
}

// ── Clear all ────────────────────────────────────────────────────────────────

export function clearAllOverrides(): void {
  for (const store of [sessionStorage, localStorage]) {
    try {
      [...Object.keys(store)]
        .filter((k) => k.startsWith(S) || k.startsWith(L))
        .forEach((k) => store.removeItem(k));
    } catch {}
  }
  emit();
}
