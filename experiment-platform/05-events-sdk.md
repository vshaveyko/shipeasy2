# Events, SDK Instrumentation & Analytics Engine

## Three-Layer Architecture

```
Events (catalog)       →  Metrics (library)       →  Experiments
────────────────          ─────────────────           ───────────
purchase_completed        conversion_rate             goal metric
  value: number      →    count_users             →   in exp A
                          on purchase_completed
```

- **Events**: raw signals the app emits. Registered with property schemas.
- **Metrics**: analytical definitions (aggregation over an event).
- **Experiments**: attach metrics with roles (goal/guardrail/secondary).

## Event Catalog

Events must be registered (or auto-discovered) before they can be used in metrics.

### Registration flow

1. Developer creates event in admin UI: name, description, properties
2. System generates the tracking snippet
3. Developer copies snippet into their codebase
4. Developer creates a metric referencing this event + aggregation type
5. Developer attaches the metric to an experiment with a role

### Auto-discovery

When `/collect` receives an event name not in the `events` table:

- Insert `pending=1` row with inferred property schema from the payload
- Admin UI surfaces these as "unregistered events — review and confirm"
- Allows developers to start tracking immediately without upfront catalog setup

### Generated tracking snippet

For event `purchase_completed` with property `value: number (required)`:

```typescript
client.track('purchase_completed', {
  value: number,        // required — order total in USD
  currency?: string,    // optional — ISO currency code
})
```

## SDK Instrumentation

Two paths, zero boilerplate for exposures:

```
getExperiment(name)          → auto-logs exposure     → EventBuffer → POST /collect
client.track(event, {value}) → logs metric event      → EventBuffer → POST /collect
```

### EventBuffer (packages/sdk/src/buffer.ts)

```typescript
const FLUSH_INTERVAL_MS = 5_000;
const MAX_BUFFER = 100;

export class EventBuffer {
  private queue = new Array<RawEvent>();
  private exposureSeen = new Set<string>(); // `${user_id}:${experiment}`
  private timer: ReturnType<typeof setInterval> | null = null;

  constructor(
    private collectUrl: string,
    private sdkKey: string,
    private projectId: string,
  ) {
    if (typeof window !== "undefined") {
      this.timer = setInterval(() => this.flush(), FLUSH_INTERVAL_MS);
      window.addEventListener("beforeunload", () => this.flush());
      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "hidden") this.flush(true); // beacon on hide
      });
    }
  }

  // Called automatically by getExperiment() — developer does nothing
  pushExposure(experiment: string, group: string, userId: string, anonId: string) {
    const key = `${userId}:${experiment}`;
    if (this.exposureSeen.has(key)) return; // deduplicate within session
    this.exposureSeen.add(key);
    this.enqueue({
      type: "exposure",
      experiment,
      group,
      user_id: userId,
      anonymous_id: anonId,
      ts: Date.now(),
    });
  }

  // Called by developer for success/metric events
  pushMetric(eventName: string, value: number | undefined, userId: string, anonId: string) {
    this.enqueue({
      type: "metric",
      event_name: eventName,
      value,
      user_id: userId,
      anonymous_id: anonId,
      ts: Date.now(),
    });
  }

  // Identity stitching — call immediately after authentication.
  // Persists the alias intent to localStorage before sending so it can be retried
  // on the next page load if the network request fails. A missed alias() call
  // means the user appears in multiple experiment groups after analysis, triggering
  // either incorrect de-duplication (silent bias) or exclusion (lost sample).
  async alias(anonymousId: string, userId: string): Promise<void> {
    const record = { anonymousId, userId, ts: Date.now() };
    // Persist before sending — if the send fails the record survives a page reload
    try {
      localStorage.setItem("__flaglab_pending_alias", JSON.stringify(record));
    } catch {}

    await this.flush(); // flush pending events first — ensures exposure is recorded before alias
    await this._sendAlias(anonymousId, userId);
    try {
      localStorage.removeItem("__flaglab_pending_alias");
    } catch {}
  }

  private async _sendAlias(anonymousId: string, userId: string): Promise<void> {
    this.enqueue({ type: "identify", anonymous_id: anonymousId, user_id: userId, ts: Date.now() });
    await this.flush();
  }

  // Call at SDK init (before identify()) — retries any alias that failed in a previous session.
  // Mount this in the app shell, not inside a component, so it runs on every page load.
  async flushPendingAlias(): Promise<void> {
    try {
      const raw = localStorage.getItem("__flaglab_pending_alias");
      if (!raw) return;
      const record = JSON.parse(raw) as { anonymousId: string; userId: string; ts: number };
      // Abandon alias attempts older than 7 days — the experiment window has likely closed
      if (Date.now() - record.ts > 7 * 86_400_000) {
        localStorage.removeItem("__flaglab_pending_alias");
        return;
      }
      await this._sendAlias(record.anonymousId, record.userId);
      localStorage.removeItem("__flaglab_pending_alias");
    } catch {} // never throw from init path
  }

  private enqueue(ev: RawEvent) {
    this.queue.push(ev);
    if (this.queue.length >= MAX_BUFFER) this.flush();
  }

  flush(useBeacon = false) {
    if (!this.queue.length) return;
    const batch = this.queue.splice(0);
    const body = JSON.stringify({ project_id: this.projectId, events: batch });
    if (useBeacon && navigator?.sendBeacon) {
      // Use text/plain to avoid CORS preflight — application/json triggers a preflight
      // that sendBeacon cannot complete on mobile Safari, causing silent event loss.
      // The Worker parses JSON from request.text() regardless of Content-Type.
      navigator.sendBeacon(this.collectUrl, new Blob([body], { type: "text/plain" }));
      return;
    }
    fetch(this.collectUrl, {
      method: "POST",
      headers: { Authorization: `Bearer ${this.sdkKey}`, "Content-Type": "application/json" },
      body,
      keepalive: true,
    }).catch(() => {}); // fire and forget
  }
}
```

### EventBuffer and React StrictMode

React 18 StrictMode double-invokes effects (mount → unmount → mount) in development.
If EventBuffer is instantiated inside a useEffect, the first instance is torn down
before the second is created — any buffered events are lost and the dedup set resets,
causing double-sent exposures.

**Fix: use a module-level singleton, not a React effect.**

```typescript
// packages/sdk-client/src/singleton.ts
// Created once per page load, shared across all React components
let _client: FlagsClientBrowser | null = null;

export function getClient(config: ClientSDKConfig): FlagsClientBrowser {
  if (!_client) _client = new FlagsClientBrowser(config);
  return _client;
}
```

```typescript
// In components — never new FlagsClientBrowser() inside useEffect
import { getClient } from "@flaglab/sdk/client";
const client = getClient({ sdkKey: "..." }); // always returns the same instance
```

The dedup set should also be persisted to sessionStorage so it survives React
lifecycle teardowns and short page refreshes within the same browser session:

```typescript
// In pushExposure() — persist dedup to sessionStorage
private getSeenKey(): Set<string> {
  if (typeof sessionStorage === 'undefined') return this.exposureSeen
  try {
    const stored = sessionStorage.getItem('__elab_seen')
    if (stored) this.exposureSeen = new Set(JSON.parse(stored))
  } catch {}
  return this.exposureSeen
}

private markSeen(key: string): void {
  this.exposureSeen.add(key)
  try { sessionStorage.setItem('__elab_seen', JSON.stringify([...this.exposureSeen])) } catch {}
}
```

### Correct alias() usage pattern

```typescript
// App shell (runs on every page load — before any components mount)
await client.flushPendingAlias(); // retry any alias from a previous failed session

// After authentication completes
await client.alias(client.anonymousId, authenticatedUser.id);
// alias() persists intent to localStorage, flushes pending events, sends identify,
// clears localStorage on success. If the network fails, flushPendingAlias() retries
// on the next page load automatically.
```

**Alias rate monitoring:** The `/collect` handler logs a structured event for each
`identify` event received. Monitor the ratio of `identify` events to authenticated
sessions via the analysis cron's AE query — if it drops below 95%, alias calls are
being missed and SRM risk is elevated. Alert threshold: alias rate < 90% for 3
consecutive days on any project with running experiments.

```typescript
// In the analysis cron — before running per-experiment analysis, log alias coverage:
const totalIdentified = await queryAE(
  `
  SELECT COUNT(DISTINCT blob1) AS cnt FROM METRIC_EVENTS
  WHERE index1='${projectId}' AND index2='$identify' AND index3='metric'
    AND double2 >= ${experiment.startedAt}
`,
  env,
);
// Compare against total unique user_ids in exposures — if ratio < 0.9, warn.
```

### Minimal developer code

```typescript
// Server SDK: getExperiment auto-logs exposure
const exp = await client.getExperiment("checkout_button_color");
renderButton(exp.params.color);

// Client SDK: track success event
client.track("purchase_completed", { value: order.total });
client.track("cart_abandoned");
```

## Analytics Engine Field Layout

Two AE datasets. `indexes` are the only accelerated filter path (low-cardinality).

### EXPOSURES dataset

| AE field     | Content                                                              |
| ------------ | -------------------------------------------------------------------- |
| `indexes[0]` | `project_id` — on every query                                        |
| `indexes[1]` | `experiment_name` — filters to one experiment                        |
| `indexes[2]` | `row_type` — always `"exposure"` (reserved; never customer-supplied) |
| `blobs[0]`   | `group` (e.g. "control" / "test")                                    |
| `blobs[1]`   | `user_id`                                                            |
| `blobs[2]`   | `anonymous_id`                                                       |
| `doubles[0]` | `timestamp_ms` — used for `MIN()` dedup                              |

### METRIC_EVENTS dataset

| AE field     | Content                                                            |
| ------------ | ------------------------------------------------------------------ |
| `indexes[0]` | `project_id`                                                       |
| `indexes[1]` | `event_name`                                                       |
| `indexes[2]` | `row_type` — always `"metric"` (reserved; never customer-supplied) |
| `blobs[0]`   | `user_id`                                                          |
| `blobs[1]`   | `anonymous_id`                                                     |
| `doubles[0]` | `value` (0 if absent)                                              |
| `doubles[1]` | `timestamp_ms` — post-exposure filter                              |

`indexes[2]` is set by the Worker's `/collect` handler — it is never accepted from the SDK payload. This prevents a customer who names a metric event `"exposure"` from corrupting exposure counts, and allows AE SQL queries to assert the row type defensively (`WHERE index3 = 'exposure'`). Existing AE queries in `06-analysis.md` should add `AND index3 = 'exposure'` / `AND index3 = 'metric'` as defensive filters.

## Scale Progression for Events

```
All scales:         AE (hot path, ae_retention_days per plan) + R2 (daily archive, unlimited retention)
> 100M events/day:  AE → R2 → BigQuery/Snowflake connectors (enterprise data_export)
```

R2 archival runs daily at 04:00 UTC for every project at every plan tier. The archival
cron exports yesterday's AE data to `flaglab-events` R2 bucket before it ages out of
the AE retention window. The analysis pipeline reads R2 transparently when an experiment's
`started_at` predates the AE window — no operator intervention required.

Key formats:

```
events/{project_id}/{YYYY-MM-DD}/exposures.ndjson   ← group, user_id, anon_id, ts, experiment
events/{project_id}/{YYYY-MM-DD}/metrics.ndjson     ← user_id, anon_id, value, ts, event_name
```

Cost: ~$0 at Starter (10K DAU), ~$2.50/month at Scale (1M DAU). See `cost.md` for full breakdown.
