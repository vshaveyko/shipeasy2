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

interface EvalFlagResult {
  enabled: boolean;
}

interface EvalExpResult {
  in_experiment: boolean;
  group: string;
  params: Record<string, unknown>;
}

interface EvalResponse {
  flags: Record<string, EvalFlagResult>;
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

export interface FlagsClientBrowserOptions {
  sdkKey: string;
  baseUrl?: string;
  autoGuardrails?: boolean;
}

export class FlagsClientBrowser {
  private readonly sdkKey: string;
  private readonly baseUrl: string;
  private readonly autoGuardrails: boolean;
  private evalResult: EvalResponse | null = null;
  private anonId: string;
  private userId = "";
  private buffer: EventBuffer;
  private guardrailsInstalled = false;

  constructor(opts: FlagsClientBrowserOptions) {
    this.sdkKey = opts.sdkKey;
    this.baseUrl = (opts.baseUrl ?? "https://edge.shipeasy.dev").replace(/\/$/, "");
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

    const res = await fetch(`${this.baseUrl}/sdk/evaluate`, {
      method: "POST",
      headers: { "X-SDK-Key": this.sdkKey, "Content-Type": "application/json" },
      body: JSON.stringify({ user }),
    });
    if (!res.ok) throw new Error(`/sdk/evaluate returned ${res.status}`);
    this.evalResult = (await res.json()) as EvalResponse;

    if (this.autoGuardrails && !this.guardrailsInstalled) {
      this.guardrailsInstalled = true;
      installAutoGuardrails(this.buffer, this.userId, this.anonId);
    }
  }

  initFromBootstrap(data: EvalResponse): void {
    this.evalResult = data;
  }

  getFlag(name: string): boolean {
    return this.evalResult?.flags[name]?.enabled ?? false;
  }

  getConfig<T = unknown>(name: string, decode?: (raw: unknown) => T): T | undefined {
    // Client SDK does not receive configs directly from /sdk/evaluate.
    // Configs require server-side evaluation or a dedicated endpoint.
    void name;
    void decode;
    return undefined;
  }

  getExperiment<P extends Record<string, unknown>>(
    name: string,
    defaultParams: P,
    decode?: (raw: unknown) => P,
  ): ExperimentResult<P> {
    const notIn: ExperimentResult<P> = {
      inExperiment: false,
      group: "control",
      params: defaultParams,
    };
    const entry = this.evalResult?.experiments[name];
    if (!entry || !entry.in_experiment) return notIn;
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

  track(eventName: string, props?: Record<string, unknown>): void {
    this.buffer.pushMetric(eventName, this.userId, this.anonId, props);
  }

  async flush(): Promise<void> {
    await this.buffer.flushAsync();
  }

  destroy(): void {
    this.buffer.flush();
    this.buffer.destroy();
  }
}
