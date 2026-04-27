// ShipEasy browser SDK — calls /sdk/evaluate on identify(), logs exposures + events via /collect.

export const version = "1.0.0";

// ---- Types ----

export interface User {
  user_id?: string;
  [attr: string]: unknown;
}

export interface ExperimentResult<P> {
  inExperiment: boolean;
  group: string;
  params: P;
}

interface EvalExpResult {
  inExperiment: boolean;
  group: string;
  params: Record<string, unknown>;
}

interface EvalResponse {
  flags: Record<string, boolean>;
  configs: Record<string, unknown>;
  experiments: Record<string, EvalExpResult>;
}

// ---- EventBuffer ----

const FLUSH_INTERVAL_MS = 5_000;
const MAX_BUFFER = 100;
const ANON_ID_KEY = "__se_anon_id";
const SEEN_KEY = "__se_seen";
const PENDING_ALIAS_KEY = "__se_pending_alias";

interface RawEvent {
  type: "exposure" | "metric" | "identify";
  experiment?: string;
  group?: string;
  user_id?: string;
  anonymous_id?: string;
  event_name?: string;
  value?: number;
  properties?: Record<string, unknown>;
  ts: number;
}

class EventBuffer {
  private queue: RawEvent[] = [];
  private exposureSeen = new Set<string>();
  private timer: ReturnType<typeof setInterval> | null = null;

  constructor(
    private readonly collectUrl: string,
    private readonly sdkKey: string,
  ) {
    if (typeof window !== "undefined") {
      this.timer = setInterval(() => this.flush(), FLUSH_INTERVAL_MS);
      window.addEventListener("beforeunload", () => this.flush());
      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "hidden") this.flush(true);
      });
      // Reload dedup set from sessionStorage on init
      try {
        const stored = sessionStorage.getItem(SEEN_KEY);
        if (stored) this.exposureSeen = new Set(JSON.parse(stored) as string[]);
      } catch {}
    }
  }

  destroy(): void {
    if (this.timer !== null) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  pushExposure(experiment: string, group: string, userId: string, anonId: string): void {
    const key = `${userId || anonId}:${experiment}`;
    if (this.exposureSeen.has(key)) return;
    this.exposureSeen.add(key);
    try {
      sessionStorage.setItem(SEEN_KEY, JSON.stringify([...this.exposureSeen]));
    } catch {}
    this.enqueue({
      type: "exposure",
      experiment,
      group,
      user_id: userId,
      anonymous_id: anonId,
      ts: Date.now(),
    });
  }

  pushMetric(
    eventName: string,
    userId: string,
    anonId: string,
    props?: Record<string, unknown>,
  ): void {
    this.enqueue({
      type: "metric",
      event_name: eventName,
      user_id: userId,
      anonymous_id: anonId,
      ts: Date.now(),
      ...(props ? { properties: props } : {}),
    });
  }

  async alias(anonymousId: string, userId: string): Promise<void> {
    const record = { anonymousId, userId, ts: Date.now() };
    try {
      localStorage.setItem(PENDING_ALIAS_KEY, JSON.stringify(record));
    } catch {}
    await this.flushAsync();
    await this._sendAlias(anonymousId, userId);
    try {
      localStorage.removeItem(PENDING_ALIAS_KEY);
    } catch {}
  }

  async flushPendingAlias(): Promise<void> {
    try {
      const raw = localStorage.getItem(PENDING_ALIAS_KEY);
      if (!raw) return;
      const record = JSON.parse(raw) as { anonymousId: string; userId: string; ts: number };
      if (Date.now() - record.ts > 7 * 86_400_000) {
        localStorage.removeItem(PENDING_ALIAS_KEY);
        return;
      }
      await this._sendAlias(record.anonymousId, record.userId);
      localStorage.removeItem(PENDING_ALIAS_KEY);
    } catch {}
  }

  private async _sendAlias(anonymousId: string, userId: string): Promise<void> {
    this.enqueue({ type: "identify", anonymous_id: anonymousId, user_id: userId, ts: Date.now() });
    await this.flushAsync();
  }

  private enqueue(ev: RawEvent): void {
    this.queue.push(ev);
    if (this.queue.length >= MAX_BUFFER) this.flush();
  }

  flush(useBeacon = false): void {
    if (!this.queue.length) return;
    const batch = this.queue.splice(0);
    const body = JSON.stringify({ events: batch });
    if (useBeacon && typeof navigator !== "undefined" && navigator.sendBeacon) {
      // text/plain avoids CORS preflight on mobile Safari
      navigator.sendBeacon(this.collectUrl, new Blob([body], { type: "text/plain" }));
      return;
    }
    fetch(this.collectUrl, {
      method: "POST",
      headers: { "X-SDK-Key": this.sdkKey, "Content-Type": "application/json" },
      body,
      keepalive: true,
    }).catch(() => {});
  }

  async flushAsync(): Promise<void> {
    if (!this.queue.length) return;
    const batch = this.queue.splice(0);
    const body = JSON.stringify({ events: batch });
    await fetch(this.collectUrl, {
      method: "POST",
      headers: { "X-SDK-Key": this.sdkKey, "Content-Type": "application/json" },
      body,
    }).catch(() => {});
  }
}

// ---- Auto-guardrails ----

function installAutoGuardrails(buffer: EventBuffer, userId: string, anonId: string): void {
  if (typeof window === "undefined" || typeof PerformanceObserver === "undefined") return;

  let lcp: number | null = null;
  let inp: number | null = null;
  let clsBad = false;
  let jsError = false;
  let netError = false;

  try {
    const lcpObs = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      if (entries.length)
        lcp = (entries[entries.length - 1] as PerformanceEntry & { startTime: number }).startTime;
    });
    lcpObs.observe({ type: "largest-contentful-paint", buffered: true });
  } catch {}

  try {
    const inpObs = new PerformanceObserver((list) => {
      for (const e of list.getEntries()) {
        const dur = (e as PerformanceEntry & { duration: number }).duration ?? 0;
        if (inp === null || dur > inp) inp = dur;
      }
    });
    inpObs.observe({
      type: "event",
      buffered: true,
      durationThreshold: 16,
    } as PerformanceObserverInit);
  } catch {}

  try {
    const clsObs = new PerformanceObserver((list) => {
      for (const e of list.getEntries()) {
        if ((e as PerformanceEntry & { value: number }).value > 0.1) clsBad = true;
      }
    });
    clsObs.observe({ type: "layout-shift", buffered: true });
  } catch {}

  const origOnError = window.onerror;
  window.onerror = (...args) => {
    if (!jsError) {
      jsError = true;
      buffer.pushMetric("__auto_js_error", userId, anonId, { value: 1 });
    }
    if (typeof origOnError === "function") return origOnError(...args);
    return false;
  };

  window.addEventListener("unhandledrejection", () => {
    if (!jsError) {
      jsError = true;
      buffer.pushMetric("__auto_js_error", userId, anonId, { value: 1 });
    }
  });

  const origFetch = window.fetch;
  window.fetch = async function (...args) {
    const res = await origFetch.apply(this, args);
    if (!netError && res.status >= 500) {
      netError = true;
      buffer.pushMetric("__auto_network_error", userId, anonId, { value: 1 });
    }
    return res;
  };

  const flush = () => {
    if (lcp !== null) buffer.pushMetric("__auto_lcp", userId, anonId, { value: lcp });
    if (inp !== null) buffer.pushMetric("__auto_inp", userId, anonId, { value: inp });
    if (clsBad) buffer.pushMetric("__auto_cls_binary", userId, anonId, { value: 1 });
    const abandoned = lcp === null ? 1 : 0;
    buffer.pushMetric("__auto_abandoned", userId, anonId, { value: abandoned });
    buffer.flush(true);
  };

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") flush();
  });
}

// ---- Anonymous ID ----

function getOrCreateAnonId(): string {
  try {
    const stored = localStorage.getItem(ANON_ID_KEY);
    if (stored) return stored;
  } catch {}
  const id =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `anon_${Math.random().toString(36).slice(2)}`;
  try {
    localStorage.setItem(ANON_ID_KEY, id);
  } catch {}
  return id;
}

// ---- FlagsClientBrowser ----

export type FlagsClientBrowserEnv = "dev" | "staging" | "prod";

export interface FlagsClientBrowserOptions {
  sdkKey: string;
  baseUrl?: string;
  autoGuardrails?: boolean;
  /** Which published env to read values from. Defaults to "prod". */
  env?: FlagsClientBrowserEnv;
}

/**
 * Browser context auto-collected on every identify() so gate rules can
 * target by locale, timezone, path, etc. without callers having to wire
 * each attribute manually. Caller-supplied attrs always win — these are
 * spread first.
 */
function collectBrowserAttrs(): Record<string, unknown> {
  if (typeof window === "undefined") return {};
  const attrs: Record<string, unknown> = {};
  try {
    if (typeof navigator !== "undefined" && navigator.language) attrs.locale = navigator.language;
  } catch {}
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (tz) attrs.timezone = tz;
  } catch {}
  try {
    if (document.referrer) attrs.referrer = document.referrer;
  } catch {}
  try {
    attrs.path = window.location.pathname;
  } catch {}
  try {
    if (window.screen) {
      attrs.screen_width = window.screen.width;
      attrs.screen_height = window.screen.height;
    }
  } catch {}
  try {
    if (typeof navigator !== "undefined" && typeof navigator.userAgent === "string") {
      attrs.user_agent = navigator.userAgent;
    }
  } catch {}
  return attrs;
}

/**
 * Read `?se_exp_<name>=<group>` (and legacy `?se-exp-<name>=…`) URL params
 * and project them into the wire shape `/sdk/evaluate` expects. The worker
 * trusts these and bypasses normal allocation for the named experiments.
 */
function readExperimentOverridesFromUrl(): Record<string, string> {
  if (typeof window === "undefined") return {};
  const out: Record<string, string> = {};
  try {
    const params = new URLSearchParams(window.location.search);
    for (const [k, v] of params) {
      if (!v || v === "default" || v === "none") continue;
      if (k.startsWith("se_exp_")) out[k.slice("se_exp_".length)] = v;
      else if (k.startsWith("se-exp-")) out[k.slice("se-exp-".length)] = v;
    }
  } catch {}
  return out;
}

export class FlagsClientBrowser {
  private readonly sdkKey: string;
  private readonly baseUrl: string;
  private readonly autoGuardrails: boolean;
  private readonly env: FlagsClientBrowserEnv;
  private evalResult: EvalResponse | null = null;
  private anonId: string;
  private userId = "";
  private buffer: EventBuffer;
  private guardrailsInstalled = false;
  private listeners = new Set<() => void>();
  private overrideListenerInstalled = false;
  private onOverrideChange = () => {
    this.installBridge();
    this.notify();
  };

  constructor(opts: FlagsClientBrowserOptions) {
    this.sdkKey = opts.sdkKey;
    this.baseUrl = (opts.baseUrl ?? "https://edge.shipeasy.dev").replace(/\/$/, "");
    this.env = opts.env ?? "prod";
    this.autoGuardrails = opts.autoGuardrails !== false;
    this.anonId = getOrCreateAnonId();
    this.buffer = new EventBuffer(`${this.baseUrl}/collect`, this.sdkKey);
    void this.buffer.flushPendingAlias();
  }

  async identify(user: User): Promise<void> {
    const prevUserId = this.userId;
    this.userId = user.user_id ?? "";

    // Stitch anonymous → identified user in analysis
    if (this.anonId && this.userId && this.userId !== prevUserId) {
      await this.buffer.alias(this.anonId, this.userId);
    }

    // Always include anonymous_id so the worker can hash users into rollouts /
    // universes even when the caller hasn't identified yet. Auto-collected
    // browser attrs (locale, timezone, path, screen, referrer, user_agent)
    // populate before caller-supplied fields, so callers always win.
    const userPayload: User = {
      ...collectBrowserAttrs(),
      anonymous_id: this.anonId,
      ...user,
    };
    const res = await fetch(`${this.baseUrl}/sdk/evaluate?env=${this.env}`, {
      method: "POST",
      headers: { "X-SDK-Key": this.sdkKey, "Content-Type": "application/json" },
      body: JSON.stringify({
        user: userPayload,
        experiment_overrides: readExperimentOverridesFromUrl(),
      }),
    });
    if (!res.ok) throw new Error(`/sdk/evaluate returned ${res.status}`);
    this.evalResult = (await res.json()) as EvalResponse;

    if (this.autoGuardrails && !this.guardrailsInstalled) {
      this.guardrailsInstalled = true;
      installAutoGuardrails(this.buffer, this.userId, this.anonId);
    }
    this.notify();
  }

  private notify(): void {
    for (const l of this.listeners) {
      try {
        l();
      } catch (err) {
        console.warn("[shipeasy] subscriber threw:", String(err));
      }
    }
  }

  initFromBootstrap(data: EvalResponse): void {
    this.evalResult = data;
  }

  getFlag(name: string): boolean {
    const ov = readGateOverride(name);
    if (ov !== null) return ov;
    return this.evalResult?.flags[name] ?? false;
  }

  getConfig<T = unknown>(name: string, decode?: (raw: unknown) => T): T | undefined {
    const ov = readConfigOverride(name);
    const raw = ov !== undefined ? ov : this.evalResult?.configs?.[name];
    if (raw === undefined) return undefined;
    if (!decode) return raw as T;
    try {
      return decode(raw);
    } catch (err) {
      console.warn(`[shipeasy] getConfig('${name}') decode failed:`, String(err));
      return undefined;
    }
  }

  getExperiment<P extends Record<string, unknown>>(
    name: string,
    defaultParams: P,
    decode?: (raw: unknown) => P,
    variants?: Record<string, Partial<P>>,
  ): ExperimentResult<P> {
    const notIn: ExperimentResult<P> = {
      inExperiment: false,
      group: "control",
      params: defaultParams,
    };

    // URL-forced variant short-circuits the server response so the demo
    // works synchronously before identify() resolves. Caller can supply a
    // `variants` map to merge variant-specific params on top of defaults.
    const ov = readExpOverride(name);
    if (ov !== null) {
      const variantParams = variants?.[ov];
      const params = variantParams ? { ...defaultParams, ...variantParams } : defaultParams;
      return { inExperiment: true, group: ov, params };
    }

    const entry = this.evalResult?.experiments[name];
    if (!entry || !entry.inExperiment) return notIn;
    // Auto-log exposure (deduped within session)
    this.buffer.pushExposure(name, entry.group, this.userId, this.anonId);
    if (!decode) return { inExperiment: true, group: entry.group, params: entry.params as P };
    try {
      return { inExperiment: true, group: entry.group, params: decode(entry.params) };
    } catch (err) {
      console.warn(`[shipeasy] getExperiment('${name}') decode failed:`, String(err));
      return notIn;
    }
  }

  /**
   * Subscribe to state changes — fires after identify() completes and on
   * `se:override:change` events from the devtools overlay. Returns an
   * unsubscribe function. Used by framework adapters to trigger re-renders.
   */
  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    if (!this.overrideListenerInstalled && typeof window !== "undefined") {
      this.overrideListenerInstalled = true;
      window.addEventListener("se:override:change", this.onOverrideChange);
    }
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Publishes the SDK to `window.__shipeasy` so the devtools overlay can read
   * current values. Idempotent. Returns the bridge object for tests.
   */
  installBridge(): ShipeasySdkBridge | null {
    if (typeof window === "undefined") return null;
    const bridge: ShipeasySdkBridge = {
      getFlag: (n) => this.getFlag(n),
      getExperiment: (n) => {
        const r = this.getExperiment(n, {});
        return { inExperiment: r.inExperiment, group: r.group };
      },
      getConfig: (n) => this.getConfig(n),
    };
    (window as unknown as { __shipeasy?: ShipeasySdkBridge }).__shipeasy = bridge;
    window.dispatchEvent(new CustomEvent("se:state:update"));
    return bridge;
  }

  track(eventName: string, props?: Record<string, unknown>): void {
    this.buffer.pushMetric(eventName, this.userId, this.anonId, props);
  }

  async flush(): Promise<void> {
    await this.buffer.flushAsync();
  }

  destroy(): void {
    this.buffer.flush();
    this.buffer.destroy();
    this.listeners.clear();
    if (this.overrideListenerInstalled && typeof window !== "undefined") {
      window.removeEventListener("se:override:change", this.onOverrideChange);
      this.overrideListenerInstalled = false;
    }
  }
}

// ---- URL overrides ----
//
// Single source of truth for ?se_ks_, ?se_config_, ?se_exp_ params. Mirrored
// (but not duplicated) by packages/devtools/src/overrides.ts which writes them.

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
  if (typeof window === "undefined" || !window.location) return null;
  const params = new URLSearchParams(window.location.search);
  const direct = params.get(canonical);
  if (direct !== null) return direct;
  if (legacy) {
    const legacyVal = params.get(legacy);
    if (legacyVal !== null) return legacyVal;
  }
  return null;
}

export function readGateOverride(name: string): boolean | null {
  const v =
    readParam(`se_ks_${name}`) ?? readParam(`se_gate_${name}`) ?? readParam(`se-gate-${name}`);
  return v === null ? null : parseBool(v);
}

export function readConfigOverride(name: string): unknown {
  const v = readParam(`se_config_${name}`, `se-config-${name}`);
  if (v === null) return undefined;
  return decodeConfigValue(v);
}

export function readExpOverride(name: string): string | null {
  const v = readParam(`se_exp_${name}`, `se-exp-${name}`);
  if (v === null || v === "" || v === "default" || v === "none") return null;
  return v;
}

export function isDevtoolsRequested(): boolean {
  if (typeof window === "undefined" || !window.location) return false;
  const p = new URLSearchParams(window.location.search);
  return p.has("se") || p.has("se_devtools") || p.has("se-devtools");
}

// ---- Devtools bridge + loader ----

/** Bridge written to window.__shipeasy — mirrors @shipeasy/devtools' contract. */
export interface ShipeasySdkBridge {
  getFlag(name: string): boolean;
  getExperiment(name: string): { inExperiment: boolean; group: string } | undefined;
  getConfig(name: string): unknown;
}

interface DevtoolsMod {
  init(opts: { adminUrl?: string; edgeUrl?: string }): void;
  destroy(): void;
}

/**
 * If the host page already mounted the standalone devtools IIFE bundle (which
 * exposes `window.__shipeasy_devtools_global`), call its init() and wire up a
 * toggle handle at `window.__shipeasy_devtools`. No-op when the bundle is
 * absent — the customer is responsible for mounting it themselves.
 */
export function loadDevtools(opts: { adminUrl?: string; edgeUrl?: string } = {}): void {
  if (typeof window === "undefined") return;
  const wGlobal = window as unknown as { __shipeasy_devtools_global?: DevtoolsMod };
  const mod = wGlobal.__shipeasy_devtools_global;
  if (!mod) return;
  mod.init(opts);

  const w = window as unknown as { __shipeasy_devtools?: { toggle: () => void } };
  if (!w.__shipeasy_devtools) {
    let visible = true;
    w.__shipeasy_devtools = {
      toggle() {
        if (visible) {
          mod.destroy();
          visible = false;
        } else {
          mod.init(opts);
          visible = true;
        }
      },
    };
  }
}

interface AttachDevtoolsOptions {
  /** Hotkey string in the form "Shift+Alt+S". */
  hotkey?: string;
  adminUrl?: string;
  edgeUrl?: string;
}

/**
 * One-call bootstrap for the devtools overlay. Installs the bridge, optionally
 * auto-loads the overlay if the page was opened with `?se`, registers a hotkey
 * listener for opening/toggling the overlay, and re-publishes the bridge after
 * each `identify()`/override change. Returns an unsubscribe function for
 * cleanup (e.g. React effect teardown).
 */
export function attachDevtools(
  client: FlagsClientBrowser,
  opts: AttachDevtoolsOptions = {},
): () => void {
  if (typeof window === "undefined") return () => {};

  const hotkey = opts.hotkey ?? "Shift+Alt+S";
  const parts = hotkey.split("+");
  const key = parts[parts.length - 1];
  const shift = parts.includes("Shift");
  const alt = parts.includes("Alt");
  const ctrl = parts.includes("Ctrl") || parts.includes("Control");
  const meta = parts.includes("Meta") || parts.includes("Cmd");

  client.installBridge();
  if (isDevtoolsRequested()) loadDevtools({ adminUrl: opts.adminUrl, edgeUrl: opts.edgeUrl });

  let loaded = isDevtoolsRequested();
  function onKeyDown(e: KeyboardEvent) {
    if (
      e.key === key &&
      e.shiftKey === shift &&
      e.altKey === alt &&
      e.ctrlKey === ctrl &&
      e.metaKey === meta
    ) {
      if (!loaded) {
        loaded = true;
        loadDevtools({ adminUrl: opts.adminUrl, edgeUrl: opts.edgeUrl });
      } else {
        (
          window as unknown as { __shipeasy_devtools?: { toggle: () => void } }
        ).__shipeasy_devtools?.toggle();
      }
    }
  }
  window.addEventListener("keydown", onKeyDown);
  const unsubBridge = client.subscribe(() => client.installBridge());

  return () => {
    window.removeEventListener("keydown", onKeyDown);
    unsubBridge();
  };
}
