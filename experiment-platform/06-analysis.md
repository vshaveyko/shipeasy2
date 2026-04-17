# Analysis — Metrics, Cron, Statistics

## Metric Aggregation Types

Each aggregation produces one numeric value per user that goes into the t-test.

| Aggregation    | Per-user value                                 | Use for                          |
| -------------- | ---------------------------------------------- | -------------------------------- |
| `count_users`  | 1 if ≥1 event, else 0                          | Conversion rate (did user do X?) |
| `count_events` | Total events for this user                     | Volume (how many times?)         |
| `sum`          | Sum of `value` across all events               | Revenue, points, bytes           |
| `avg`          | Mean of `value` per event                      | Session duration, load time      |
| `retention_Nd` | 1 if any event in [N, N+1) days after exposure | D7/D30 retention                 |

For `retention_Nd`, `N` is stored in `value_path` (e.g. `"7"` → D7 retention).

```typescript
function computeAggregate(
  agg: string,
  events: { value: number; ts: number }[],
  firstTs: number,
): number {
  // CRITICAL: Filter to post-exposure events only.
  // The AE metric SQL uses a global minExposureTs (earliest exposure across ALL users in the
  // experiment), not each user's own first exposure timestamp. Any metric event with
  // ts >= global_min but ts < this user's firstTs is a pre-exposure event — the user
  // interacted with the product before the SDK evaluated their experiment assignment.
  // Without this filter, such events are incorrectly counted as conversions, inflating
  // conversion rates in whichever arm has more users who interact before SDK initialization.
  const postExposure = events.filter((e) => e.ts >= firstTs);

  if (agg === "count_users") return postExposure.length > 0 ? 1 : 0;
  if (agg === "count_events") return postExposure.length;
  if (agg === "sum") return postExposure.reduce((s, e) => s + e.value, 0);
  if (agg === "avg")
    return postExposure.length > 0
      ? postExposure.reduce((s, e) => s + e.value, 0) / postExposure.length
      : 0;
  if (agg.startsWith("retention_")) {
    const N = parseInt(agg.split("_")[1]);
    // Uses elapsed-ms semantics: [N×86400s, (N+1)×86400s) after exact exposure timestamp.
    // This is NOT calendar-day semantics. A user exposed at 23:00 has their "day 7" window
    // starting at 23:00 on day 7. Document this to users creating retention metrics.
    const lo = firstTs + N * 86_400_000;
    const hi = firstTs + (N + 1) * 86_400_000;
    return postExposure.some((e) => e.ts >= lo && e.ts < hi) ? 1 : 0;
  }
  return 0;
}
```

## lib/stats.ts — correct implementations

### chi2CDF

```typescript
// ── Chi-squared CDF (required for SRM detection) ─────────────────────────────
// Implements P(X ≤ x) where X ~ chi²(df) via the regularized incomplete gamma function.
// No external math library needed. Verified against standard chi-squared tables.
//
// Test vectors (verify before deploying):
//   chi2CDF(3.841, 1) ≈ 0.9500  (α=0.05 critical value for df=1)
//   chi2CDF(6.635, 1) ≈ 0.9900  (α=0.01)
//   chi2CDF(9.210, 1) ≈ 0.9990  (α=0.001)
//   chi2CDF(5.991, 2) ≈ 0.9500  (α=0.05 for df=2)

function lnGamma(z: number): number {
  // Lanczos approximation (g=7, accurate to ~15 significant digits)
  const C = [
    0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313,
    -176.61502916214059, 12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6,
    1.5056327351493116e-7,
  ];
  if (z < 0.5) return Math.log(Math.PI / Math.sin(Math.PI * z)) - lnGamma(1 - z);
  z -= 1;
  let x = C[0];
  for (let i = 1; i < C.length; i++) x += C[i] / (z + i);
  const t = z + C.length - 1.5;
  return 0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(x);
}

function regularizedGammaP(a: number, x: number): number {
  // Series expansion: converges for all a > 0, x ≥ 0
  if (x <= 0) return 0;
  let term = 1.0 / a,
    sum = term;
  for (let n = 1; n < 300; n++) {
    term *= x / (a + n);
    sum += term;
    if (Math.abs(term) < 1e-12 * Math.abs(sum)) break;
  }
  return Math.exp(-x + a * Math.log(x) - lnGamma(a)) * sum;
}

export function chi2CDF(chi2: number, df: number): number {
  if (chi2 <= 0) return 0;
  return regularizedGammaP(df / 2, chi2 / 2);
}
// Usage in SRM detection: pValue = 1 - chi2CDF(chi2Statistic, df)
```

## Analysis Architecture — Queue-based Fan-out

The single daily cron cannot process all projects within Cloudflare's 30-second CPU limit.
At 10 projects × 10 experiments × 5 metrics = 500 AE SQL calls × 100ms = 50 seconds.

**Architecture:** One cron trigger enqueues one message per project. Each Queue Consumer
Worker processes one project with its own CPU budget (15 minutes for queue consumers).

```
wrangler.toml additions:
  [[queues.producers]]
  binding = "ANALYSIS_QUEUE"
  queue   = "experiment-analysis"

  [[queues.consumers]]
  queue             = "experiment-analysis"
  max_batch_size    = 1      ← one project per invocation
  max_retries       = 3
  dead_letter_queue = "experiment-analysis-dlq"

  # DLQ consumer: acks DLQ messages and writes analysis_failures to D1.
  # max_retries MUST be ≥ 1 — if the D1 write for analysis_failures fails (e.g. D1
  # contention at 02:00 UTC), a retry gives the write a second chance. With max_retries=0
  # (the prior bug), a failed D1 write silently drops the failure record and the operator
  # gets no alert. The retry costs one extra Queue op per failure — negligible.
  [[queues.consumers]]
  queue          = "experiment-analysis-dlq"
  max_batch_size = 10
  max_retries    = 1      ← was 0; must be ≥1 so D1 write failures get a retry
```

**Cron trigger (02:00 UTC) — just enqueues:**
Scheduled daily at **02:00 UTC** (not 04:00 — the 2-hour buffer ensures AE eventual
consistency (~1 min) has settled well before queries run).

```typescript
export async function runAnalysisCron(env: Env): Promise<void> {
  const db = getDb(env.DB);
  const runningProjects = await db
    .selectDistinct({ id: projects.id })
    .from(projects)
    .innerJoin(experiments, eq(experiments.projectId, projects.id))
    .where(eq(experiments.status, "running"));

  await env.ANALYSIS_QUEUE.sendBatch(runningProjects.map((p) => ({ body: { project_id: p.id } })));

  // Heartbeat — write to D1 system_health so Dashboard can read it via Worker API
  // (AE heartbeats require a Worker context to query; D1 is readable from any endpoint)
  await db
    .insert(systemHealth)
    .values({
      key: "analysis_cron",
      lastFiredAt: new Date().toISOString(),
      projectsEnqueued: runningProjects.length,
    })
    .onConflictDoUpdate({
      target: [systemHealth.key],
      set: { lastFiredAt: new Date().toISOString(), projectsEnqueued: runningProjects.length },
    });
  if (env.CRONITOR_HEARTBEAT_URL) {
    await fetch(env.CRONITOR_HEARTBEAT_URL).catch(() => {});
  }
  console.log(
    JSON.stringify({
      event: "analysis_cron_completed",
      projects_enqueued: runningProjects.length,
      ts: new Date().toISOString(),
    }),
  );
}
```

**Queue consumer — processes one project:**

Three trigger types drive different experiment-selection logic:

| Trigger              | Sent by            | Experiments processed                                           | `is_final`       |
| -------------------- | ------------------ | --------------------------------------------------------------- | ---------------- |
| `daily` (default)    | Analysis cron      | All `status='running'`                                          | 0                |
| `experiment_stopped` | Stop endpoint      | One named experiment (`status='stopped'`)                       | 1                |
| `reanalyze`          | Reanalyze endpoint | All experiments with any `is_final=0` row, regardless of status | 1 on final write |

**Critical:** `experiment_stopped` sets `status='stopped'` in D1 **before** enqueueing. The consumer must not filter on `status='running'` for this trigger — the stopped experiment would be silently skipped and `is_final=1` would never be written.

```typescript
type AnalysisMessage = {
  project_id: string;
  trigger: "daily" | "experiment_stopped" | "reanalyze";
  experiment?: string; // set for experiment_stopped and optionally for reanalyze
};

export async function consumeAnalysis(batch: MessageBatch<AnalysisMessage>, env: Env) {
  const msg = batch.messages[0].body;

  try {
    await analyzeProject(msg, env);
    batch.messages[0].ack();
  } catch (err) {
    console.error(
      JSON.stringify({
        event: "analysis_failed",
        project_id: msg.project_id,
        trigger: msg.trigger,
        error: String(err),
      }),
    );
    batch.messages[0].retry();
  }
}

async function analyzeProject(msg: AnalysisMessage, env: Env): Promise<void> {
  const db = getDb(env.DB);

  // Select experiments to analyze based on trigger
  let expsToAnalyze: Experiment[];

  if (msg.trigger === "experiment_stopped" && msg.experiment) {
    // Process exactly one stopped experiment — do NOT filter on status='running'
    expsToAnalyze = await db
      .select()
      .from(experiments)
      .where(
        and(
          eq(experiments.projectId, msg.project_id),
          eq(experiments.name, msg.experiment),
          // Accept both 'stopped' and 'running' — race between stop and queue delivery
          inArray(experiments.status, ["stopped", "running"]),
        ),
      );
  } else if (msg.trigger === "reanalyze") {
    // Process all experiments for this project regardless of status
    // (is_final was reset to 0 by the reanalyze endpoint)
    expsToAnalyze = await db
      .select()
      .from(experiments)
      .where(
        and(
          eq(experiments.projectId, msg.project_id),
          inArray(experiments.status, ["running", "stopped"]),
        ),
      );
  } else {
    // Daily cron — running experiments only
    expsToAnalyze = await db
      .select()
      .from(experiments)
      .where(and(eq(experiments.projectId, msg.project_id), eq(experiments.status, "running")));
  }

  // isFinal: only set for experiment_stopped trigger, OR for reanalyze when the experiment
  // is actually stopped. Running experiments must NEVER receive is_final=1 — that flag
  // prevents future daily cron updates and causes the retention cron to preserve the row
  // permanently, freezing results at an arbitrary mid-run snapshot.
  // Bug: previous code set isFinal=true for ALL experiments under 'reanalyze' trigger,
  // including still-running ones. Fixed: compute per-experiment below.

  for (const exp of expsToAnalyze) {
    const isFinal =
      msg.trigger === "experiment_stopped" ||
      (msg.trigger === "reanalyze" && exp.status === "stopped");
    try {
      await analyzeExperiment(exp, msg.project_id, env, isFinal);
    } catch (err) {
      console.error(
        JSON.stringify({
          event: "experiment_analysis_failed",
          project_id: msg.project_id,
          experiment: exp.name,
          trigger: msg.trigger,
          error: String(err),
        }),
      );
    }
  }

  await db
    .update(analysisFailures)
    .set({ resolvedAt: new Date().toISOString() })
    .where(eq(analysisFailures.projectId, msg.project_id));
}
```

### AE Query Helper — Cursor-based Pagination

AE SQL API returns max 10,000 rows per response. Without pagination, any experiment
with >10,000 allocated users is silently truncated — analysis runs on a biased subset
and verdicts are invalid. The helper must loop until no cursor is returned.

```typescript
// analysis/ae.ts — replace any single-shot queryAE() with this
export async function queryAE(sql: string, env: Env): Promise<any[]> {
  const rows: any[] = [];
  let cursor: string | undefined;

  do {
    const body: Record<string, unknown> = { query: sql };
    if (cursor) body.cursor = cursor;

    const res = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${env.CF_ACCOUNT_ID}/analytics_engine/sql`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${env.CF_API_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      },
    );

    if (!res.ok) {
      const text = await res.text();
      // AE rate limiting — back off and retry
      if (res.status === 429) {
        await new Promise((r) => setTimeout(r, 5_000));
        continue;
      }
      throw new Error(`AE SQL error ${res.status}: ${text}`);
    }

    const data = (await res.json()) as { data: any[]; meta?: { pagination?: { cursor?: string } } };
    rows.push(...(data.data ?? []));
    cursor = data.meta?.pagination?.cursor;

    // Safety guard: log if returning very large result sets
    if (rows.length > 50_000) {
      console.warn(
        JSON.stringify({
          event: "ae_large_result",
          row_count: rows.length,
          sql: sql.slice(0, 200),
        }),
      );
    }
  } while (cursor);

  return rows;
}
```

Note: `CF_ACCOUNT_ID` must be added to wrangler.toml `[vars]`.

Also trigger analysis immediately on experiment stop (not just nightly):

```typescript
// In actions/experiments.ts (Next.js Server Action) when status → 'stopped':
// stoppedAt is the immutable stop timestamp — set it atomically with status.
// The CUPED contamination guard uses stoppedAt (not updatedAt) as the prior-run end time.
// updatedAt is NOT reliable: subsequent edits (e.g. rename) advance it without reflecting stop.
//
// Race guard: UPDATE WHERE status='running' prevents a concurrent start/stop race from
// leaving the experiment in an inconsistent state. If start hasn't committed yet, this
// UPDATE affects 0 rows and the stop is rejected with a clear error.
const result = await db
  .update(experiments)
  .set({
    status: "stopped",
    stoppedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  })
  .where(
    and(
      eq(experiments.id, id),
      eq(experiments.projectId, projectId),
      eq(experiments.status, "running"),
    ),
  );
if (result.rowsAffected === 0) {
  throw new ApiError("Experiment is not running — cannot stop.", 409);
}
await env.ANALYSIS_QUEUE.send({ project_id, trigger: "experiment_stopped", experiment: name });
```

The consumer checks `trigger` and sets `is_final: true` on results written from this run.

### Plan-gating CUPED and SRM in analyzeProject

After loading the project, gate features on plan entitlements before running per-experiment analysis:

```typescript
// In analyzeProject (or analyzeExperiment) — after loading the project:
const plan = getPlan(project.plan);

// Gate features on plan entitlements
const useCuped = plan.cuped_enabled && experiment.cuped_frozen_at !== null;
const useSrm = plan.srm_detection;
```

Per-experiment loop with error isolation — one failed experiment must not abort the rest:

```typescript
// In the Queue consumer — wrap per-experiment analysis
for (const exp of experiments.results) {
  try {
    await analyzeExperiment(exp as Experiment, projectId, env, plan);
  } catch (err) {
    // Log but continue — one failed experiment shouldn't abort the other 9
    console.error(
      JSON.stringify({
        event: "experiment_analysis_failed",
        project_id: projectId,
        experiment: (exp as any).name,
        error: String(err),
      }),
    );
    // Note: DLQ consumer will log the project_id; include experiment name for debugging
  }
}

// Clear any previous DLQ failure once the project successfully completes
await db
  .update(analysisFailures)
  .set({ resolvedAt: new Date().toISOString() })
  .where(eq(analysisFailures.projectId, projectId));
```

For each running experiment × each attached metric:

1. Pull first exposures from AE (MIN timestamp, dedup per user)
2. Pull metric events post-exposure from AE (aggregated in SQL)
3. Compute per-user aggregate value
4. Winsorize (cap at `winsorize_pct` percentile, control group only)
5. Apply CUPED using frozen `user_metric_baseline` table
6. Run Welch t-test (control vs each test group)
7. Write to `experiment_results`

### Step 1 — First Exposures (AE SQL)

```typescript
// AE SQL field names are 1-indexed: blob1, blob2, ..., double1, double2, ..., index1, index2
// EXPOSURES layout: blobs=[group, user_id, anon_id], doubles=[ts], indexes=[project_id, experiment, row_type]
//   blob1=group  blob2=user_id  blob3=anon_id  double1=ts  index1=project_id  index2=experiment  index3=row_type("exposure")
// Runtime validation — defense in depth against AE SQL injection.
// Zod validates at creation, but if a value bypasses Zod (migration, direct D1 edit),
// this assertion prevents injection at query construction time.
const SAFE_AE_VALUE = /^[a-zA-Z0-9_-]+$/;
function assertSafeAEValue(value: string, label: string): void {
  if (!SAFE_AE_VALUE.test(value)) {
    throw new Error(`Unsafe AE SQL value for ${label}: ${JSON.stringify(value)}`);
  }
}

assertSafeAEValue(projectId, "projectId");
assertSafeAEValue(experimentName, "experimentName");

const sql = `
  SELECT blob2 AS user_id, blob1 AS grp, MIN(double1) AS first_ts
  FROM EXPOSURES
  WHERE index1 = '${projectId}'
    AND index2 = '${experimentName}'
    AND index3 = 'exposure'
  GROUP BY blob2, blob1
`;
// Result: Map<user_id, { group, first_ts }>
// Anomaly: if user appears in both groups, keep earliest
```

### Step 1.5 — Alias Resolution (multi-device identity stitching)

Before aggregating, resolve all anonymous_ids to their canonical user_id via the
`user_aliases` D1 table. Without this, a user who logged in on two devices (each
with a different anonymous_id) can appear in multiple experiment groups simultaneously,
violating Welch t-test's independent-samples assumption.

```typescript
// Load all aliases for this project (one D1 query per project, not per experiment)
const aliases = await db.select().from(userAliases).where(eq(userAliases.projectId, projectId));
const aliasMap = new Map(aliases.map((a) => [a.anonymousId, a.userId]));

// Resolve and re-deduplicate: canonical user_id, earliest exposure wins for group assignment
const canonicalExposures = new Map<string, { grp: string; first_ts: number }>();
for (const row of exposureRows) {
  const canonicalId = aliasMap.get(row.user_id) ?? row.user_id;
  const existing = canonicalExposures.get(canonicalId);
  if (!existing || row.first_ts < existing.first_ts) {
    canonicalExposures.set(canonicalId, { grp: row.grp, first_ts: row.first_ts });
  }
}
// canonicalExposures: Map<canonical_user_id, { grp, first_ts }> — one entry per user, one group
```

The alias map is loaded once per project and reused across all experiments in that project's
queue consumer invocation. Users who appear in multiple groups after resolution are assigned
to the group of their earliest exposure — they are not counted twice.

**Alias collision exclusion:** A user who was exposed as two different identities in different groups (e.g., anonymous in control, authenticated in test) is assigned to the earliest group by the dedup above. However, their post-experiment metric events reflect both experiences — contamination the dedup does not fix. Detect and exclude these users:

```typescript
// After building canonicalExposures — detect multi-group contamination
const groupsByUser = new Map<string, Set<string>>();
for (const row of exposureRows) {
  const uid = aliasMap.get(row.user_id) ?? row.user_id;
  if (!groupsByUser.has(uid)) groupsByUser.set(uid, new Set());
  groupsByUser.get(uid)!.add(row.grp);
}
let excludedCount = 0;
for (const [uid, groups] of groupsByUser) {
  if (groups.size > 1) {
    canonicalExposures.delete(uid); // exclude contaminated user
    excludedCount++;
  }
}
if (excludedCount > 0) {
  console.warn(
    JSON.stringify({
      event: "alias_collision_exclusion",
      experiment: experimentName,
      excluded: excludedCount,
      pct: ((excludedCount / (canonicalExposures.size + excludedCount)) * 100).toFixed(2) + "%",
    }),
  );
  // >1% exclusion rate = alias() reliability issue — check SDK integration
}
```

### AE Aggregation Strategy — Server-side SQL (not in-memory join)

NEVER fetch raw AE rows and join in-memory. At 1M DAU / 10% allocation:

- 100K exposure rows × ~150 bytes = 15MB
- 500K metric events × ~200 bytes = 100MB
- Total: 115MB against a 128MB Worker limit → OOM

Instead, push aggregation into AE SQL. Issue two aggregated queries, join the small results:

```typescript
// AE SQL is 1-indexed. Field layout:
//   EXPOSURES:     blob1=group  blob2=user_id  blob3=anon_id  double1=ts  index1=project_id  index2=experiment  index3="exposure"
//   METRIC_EVENTS: blob1=user_id  blob2=anon_id  double1=value  double2=ts  index1=project_id  index2=event_name  index3="metric"

// Capture a stable read horizon once — prevents new events written mid-pagination from double-counting.
// Use a 2-minute buffer to account for AE ingestion delay (~60s documented worst case plus headroom).
// Events from [fence, now] are deferred to tomorrow's analysis run — this is a known, bounded tradeoff.
// For is_final runs (experiment stop), use a 5-minute buffer to capture nearly all last-minute events.
const analysisStartTs = Date.now();
const analysisFence = analysisStartTs - 2 * 60_000; // 2-min AE ingestion lag buffer

// Step 1: Get group sizes + first exposure time per user (aggregated)
const exposureSql = `
  SELECT
    blob2                AS user_id,
    blob1                AS grp,
    MIN(double1)         AS first_ts,
    COUNT(*)             AS exposure_count
  FROM EXPOSURES
  WHERE index1 = '${projectId}'
    AND index2 = '${experimentName}'
  GROUP BY blob2, blob1
`;
// Returns O(users) rows but only 4 fields each — manageable

// Step 2: Get per-user metric aggregates (aggregated in AE SQL)
const metricSql = `
  SELECT
    blob1                AS user_id,
    SUM(double1)         AS total_value,
    COUNT(*)             AS event_count,
    MIN(double2)         AS first_event_ts
  FROM METRIC_EVENTS
  WHERE index1 = '${projectId}'
    AND index2 = '${metric.event_name}'
    AND index3 = 'metric'
    AND double2 >= ${minExposureTs}
    AND double2 <  ${analysisFence}
  GROUP BY blob1
`;
// Returns O(users who had events) rows — typically << total exposed users

// Merge AE metric rows with R2 archive rows for the same metric (C4 fix).
// r2MetricRowsByMetric is populated by the R2 fetch block above when needsR2=true.
// R2 rows have the same shape as AE rows (from archiveProjectDay's metricSql).
// Merge strategy: sum/count aggregation is additive across AE+R2 result sets, but
// we cannot add pre-aggregated AE rows directly — each source was aggregated independently.
// Solution: for experiments needing R2, skip AE-side SQL aggregation and use raw R2 rows
// combined with AE raw rows, then aggregate in-memory. For most experiments (within AE
// window) the AE-aggregated path is used as before (no performance regression).
if (needsR2) {
  // Build per-user event lists from R2 rows (raw NDJSON) + AE raw rows (re-fetched without GROUP BY)
  const aeRawSql = `
    SELECT blob1 AS user_id, double1 AS value, double2 AS ts
    FROM METRIC_EVENTS
    WHERE index1 = '${projectId}'
      AND index2 = '${metric.event_name}'
      AND index3 = 'metric'
      AND double2 >= ${Math.max(expStartMs, aeWindowStart)}
      AND double2 <  ${analysisFence}
  `;
  const aeRawRows = await queryAE(aeRawSql, env);
  const r2Rows = r2MetricRowsByMetric.get(metric.event_name) ?? [];
  const allRaw = [...r2Rows, ...aeRawRows];
  metricMap = new Map();
  for (const r of allRaw) {
    if (!metricMap.has(r.user_id)) metricMap.set(r.user_id, []);
    metricMap.get(r.user_id)!.push({ value: Number(r.value ?? 0), ts: Number(r.ts) });
  }
} else {
  // Normal path: AE-aggregated rows. DO NOT feed these through computeAggregate's raw-event
  // loop — the AE SQL collapses all events into one row per user (total_value, event_count,
  // first_event_ts). Wrapping that in a synthetic single-element array would return
  // count_events=1 (array length) instead of actual event count, and avg=total_value
  // instead of total_value/event_count. Compute user values directly from aggregate fields.
  //
  // Per-user post-exposure filter: if first_event_ts < exposure.first_ts, the earliest
  // recorded event predates the user's exposure — some events are pre-exposure. We
  // conservatively return 0 rather than attempt to split the aggregate (exact splitting
  // requires raw event rows, which the needsR2 path provides for long-running experiments).
  //
  // Note: retention_Nd requires per-event timestamps and cannot be computed from AE-aggregated
  // rows. Experiments using retention metrics on data older than ae_retention_days will
  // automatically use the needsR2 raw-events path, where retention is correctly computed.
  const aggMap = new Map(metricRows.map((r) => [r.user_id, r])); // { total_value, event_count, first_event_ts }

  for (const exposure of canonicalExposures) {
    const agg = aggMap.get(exposure.user_id);
    let userValue: number;
    if (!agg) {
      userValue = 0; // no metric events for this user — count as 0 (not excluded)
    } else if (agg.first_event_ts < exposure.first_ts) {
      // All metric events predate this user's exposure — exclude from analysis.
      // Zero-filling biases results: if treatment causes faster exposure (exposure bias),
      // control users are exposed later, have more pre-exposure events, get more zero-fills,
      // and appear to have lower metrics. Exclusion avoids this bias.
      continue; // skip this user — do not add to byGroup
    } else {
      switch (metric.aggregation) {
        case "count_users":
          userValue = 1;
          break;
        case "count_events":
          userValue = agg.event_count;
          break;
        case "sum":
          userValue = agg.total_value;
          break;
        case "avg":
          userValue = agg.event_count > 0 ? agg.total_value / agg.event_count : 0;
          break;
        default:
          userValue = 0; // retention_Nd: handled by needsR2 path above
      }
    }
    byGroup[exposure.grp].push(userValue);
  }
  // Skip the generic loop below — already consumed canonicalExposures above
  // (The for loop after this block only runs in the needsR2 path)
}
```

Note: AE SQL does not support cross-dataset JOINs natively (as of mid-2025).
Issue separate queries and join the aggregated result sets in the Worker.

### Step 3.5 — Sample Ratio Mismatch (SRM) Detection

Runs if `plan.srm_detection === true` (all plans by default).

Run BEFORE writing results. An SRM invalidates the entire experiment — t-test results
are meaningless if randomization failed.

```typescript
function detectSRM(
  groupCounts: Record<string, number>, // { control: 5000, test: 5012 }
  experiment: Experiment,
): { srm_detected: boolean; srm_p_value: number } {
  const totalExposed = Object.values(groupCounts).reduce((a, b) => a + b, 0);
  const groups = experiment.groups;

  // Chi-squared goodness-of-fit test
  // group.weight is integer 0–10000; divide by 10000 to get proportion for expected count
  let chi2 = 0;
  for (const group of groups) {
    const observed = groupCounts[group.name] ?? 0;
    const expected = totalExposed * (group.weight / 10000);
    if (expected > 0) chi2 += Math.pow(observed - expected, 2) / expected;
  }

  const df = groups.length - 1;
  const p = 1 - chi2CDF(chi2, df); // chi-squared CDF with df degrees of freedom

  // p < 0.01 = SRM detected (tighter threshold than experiment significance)
  return { srm_detected: p < 0.01, srm_p_value: p };
}

// In the cron — before writing any results for this experiment:
const { srm_detected, srm_p_value } = detectSRM(actualGroupCounts, exp);
if (srm_detected) {
  console.error(
    JSON.stringify({
      event: "srm_detected",
      experiment: exp.name,
      project_id: projectId,
      actual: actualGroupCounts,
      expected: exp.groups.map((g) => ({ name: g.name, weight: g.weight })),
      p_value: srm_p_value,
    }),
  );
  // Still write results but mark them invalid — don't suppress, surface to UI
}
// Write srm_detected and srm_p_value into every experiment_results row for this run
```

SRM causes: SDK not initialized in all code paths, bot traffic in one group,
floating-point weight gap (null bucketing), SDK version mismatch between groups.

### Step 4 — Winsorize

Cap computed on the **control group only**, then applied to all groups.
This prevents the treatment's heavy tail from inflating the cap and biasing the delta.
(Combined-group cap inflates lift estimates when treatment has a heavier right tail.)

**Reverse-risk caveat:** if control has the heavier tail (e.g. a paywall treatment removes
high-revenue users from the test arm), the control-derived cap is higher than a combined
cap would be, potentially over-winsorizing treatment values that would otherwise not be
clipped. Log the cap value and per-group clip rate per run — if any non-control group's
clip rate differs from control's by > 5 percentage points, emit a warning.

> **Option (Statsig / Eppo):** Symmetric winsorization — derive the cap from the pooled distribution (all arms combined) and apply the same cap to all arms. This eliminates the reverse-risk asymmetry but loses the "control as baseline" framing. Eppo additionally winsorizes at both tails (1st and 99th percentile), capping both extreme low and extreme high values. Trade-off: symmetric is marginally more conservative for the common case (control has thinner tail than treatment) but removes the potential bias when control has the heavier tail. If you change to symmetric, update `stats-decisions.md` § 12 accordingly.

```typescript
function winsorize(byGroup: Record<string, number[]>, pctile: number): Record<string, number[]> {
  const controlValues = byGroup["control"] ?? [];
  if (controlValues.length === 0) return byGroup;

  // Compute cap from control group only
  const sorted = [...controlValues].sort((a, b) => a - b);
  const cap = sorted[Math.floor((sorted.length * pctile) / 100) - 1] ?? sorted[sorted.length - 1];

  // Apply same cap to all groups
  const result: Record<string, number[]> = {};
  for (const [group, values] of Object.entries(byGroup)) {
    result[group] = values.map((v) => Math.min(v, cap));
  }
  return result;
}
```

Log the winsorization cap per experiment run for auditability.

### Step 5 — CUPED (Variance Reduction)

Runs if `plan.cuped_enabled === true` AND `cuped_frozen_at IS NOT NULL`.

CUPED (Controlled-experiment Using Pre-Experiment Data) reduces variance by
regressing out pre-experiment user behavior. Increases statistical power by 20–60%.

Formula: `adjusted = post - θ × (baseline - mean_baseline)`
where `θ = Cov(post, baseline) / Var(baseline)`

**CRITICAL:** The baseline must be measured from BEFORE the experiment started.
A rolling 14-day window that overlaps the experiment period violates CUPED's
independence assumption and causes attenuation bias (real effects shrink toward zero).

**Correct implementation — freeze-then-start ordering:**

The admin handler for `draft→running` must follow this order: freeze baselines first, commit `started_at` only after baselines complete. If baseline freeze throws, the experiment stays in `draft` with no partial state visible to users.

```typescript
// actions/experiments.ts (Next.js Server Action) — draft→running transition
async function startExperiment(projectId: string, experimentName: string, env: Env, plan: Plan) {
  const startedAt = new Date().toISOString();

  // CUPED contamination guard: if this is a restart (experiment was previously stopped),
  // check whether the new 14-day baseline window overlaps the prior run period.
  // If it does, the "pre-experiment" baselines are contaminated by the prior treatment effect —
  // CUPED would over-correct (attenuate) the measured effect toward zero. Disable CUPED for
  // this restart to avoid introducing attenuation bias.
  //
  // Prior run period: [originalStartedAt, stoppedAt]. New baseline window: [startedAt - 14d, startedAt].
  // Overlap exists if: priorStartedAt < startedAt AND priorStoppedAt > startedAt - 14d.
  let cupedEligible = plan.cuped_enabled;
  const existingExp = await db
    .select({
      status: experiments.status,
      startedAt: experiments.startedAt,
      stoppedAt: experiments.stoppedAt,
    })
    .from(experiments)
    .where(and(eq(experiments.projectId, projectId), eq(experiments.name, experimentName)))
    .get();

  if (
    cupedEligible &&
    existingExp?.status === "stopped" &&
    existingExp.startedAt &&
    existingExp.stoppedAt
  ) {
    const priorStartMs = new Date(existingExp.startedAt).getTime();
    const newStartMs = new Date(startedAt).getTime();
    const baselineStart = newStartMs - 14 * 86_400_000;
    // Use stoppedAt (immutable, set once at stop time) — not updatedAt which advances on any mutation.
    const priorStopMs = new Date(existingExp.stoppedAt).getTime();
    if (priorStartMs < newStartMs && priorStopMs > baselineStart) {
      cupedEligible = false;
      console.warn(
        JSON.stringify({
          event: "cuped_disabled_contaminated_baseline",
          project_id: projectId,
          experiment: experimentName,
          reason:
            "Restart baseline window overlaps prior run period — CUPED would attenuate effect",
          prior_started_at: existingExp.startedAt,
          prior_stopped_at: existingExp.updatedAt,
          new_baseline_start: new Date(baselineStart).toISOString(),
          new_started_at: startedAt,
        }),
      );
    }
  }

  // Step 1: freeze CUPED baselines BEFORE setting started_at.
  // freezeCupedBaselines() throws on any D1 or AE error — caught here, experiment stays draft.
  if (cupedEligible) {
    await freezeCupedBaselines(env, projectId, experimentName, startedAt);
  }

  // Step 2: only after baselines are fully written, mark the experiment running.
  // started_at and cuped_frozen_at are set atomically in one UPDATE.
  await db
    .update(experiments)
    .set({
      status: "running",
      startedAt,
      cupedFrozenAt: cupedEligible ? new Date().toISOString() : null,
    })
    .where(and(eq(experiments.projectId, projectId), eq(experiments.name, experimentName)));

  // Step 3: rebuild KV + purge CDN
  await rebuildExperiments(env, projectId);
}

async function freezeCupedBaselines(
  env: Env,
  projectId: string,
  experimentName: string,
  startedAt: string,
): Promise<void> {
  const windowEnd = new Date(startedAt).getTime();
  const windowStart = windowEnd - 14 * 86_400_000; // 14 days before start

  for (const metric of attachedMetrics) {
    // METRIC_EVENTS: blob1=user_id  double1=value  double2=ts
    const baselineSql = `
      SELECT blob1 AS user_id, AVG(double1) AS avg_value
      FROM METRIC_EVENTS
      WHERE index1 = '${projectId}'
        AND index2 = '${metric.event_name}'
        AND index3 = 'metric'
        AND double2 >= ${windowStart}
        AND double2 <  ${windowEnd}
      GROUP BY blob1
    `;
    const rows = await queryAE(baselineSql, env);
    if (rows.length === 0) {
      console.warn(
        JSON.stringify({ event: "cuped_no_baseline_data", projectId, metric: metric.name }),
      );
      continue;
    }

    // Winsorize baseline avg_values at 99th percentile before writing to D1.
    // A user with a 1000× pre-experiment spike (e.g. a tracking bug) would otherwise
    // inflate Cov(post, baseline), driving θ toward 1 and overcorrecting every user's
    // CUPED-adjusted value — a bias that is completely undetectable post-hoc.
    // The cap is derived from the baseline distribution itself (same approach as
    // post-experiment winsorization but applied to the covariate, not the outcome).
    const sortedVals = rows.map((r: any) => r.avg_value as number).sort((a, b) => a - b);
    const cap =
      sortedVals[Math.floor(sortedVals.length * 0.99) - 1] ?? sortedVals[sortedVals.length - 1];
    const clipped = rows.filter((r: any) => r.avg_value > cap).length;
    if (clipped > 0) {
      console.log(
        JSON.stringify({
          event: "cuped_baseline_winsorized",
          projectId,
          metric: metric.name,
          cap,
          clipped_users: clipped,
          total_users: rows.length,
          clip_rate_pct: ((clipped / rows.length) * 100).toFixed(2),
        }),
      );
    }
    const winsorizedRows = rows.map((r: any) => ({ ...r, avg_value: Math.min(r.avg_value, cap) }));

    // Chunk into batches of 100 — D1 batch limit is 100 statements per call.
    // Any chunk failure throws — partial baseline rows are cleaned up by the
    // retention cron (userMetricBaseline rows for non-running experiments are purged daily).
    for (let i = 0; i < winsorizedRows.length; i += 100) {
      await db.batch(
        winsorizedRows.slice(i, i + 100).map((r: any) =>
          db
            .insert(userMetricBaseline)
            .values({
              projectId,
              userId: r.user_id,
              metricName: metric.name,
              avgValue: r.avg_value,
              updatedDs: startedAt,
            })
            .onConflictDoUpdate({
              target: [
                userMetricBaseline.projectId,
                userMetricBaseline.userId,
                userMetricBaseline.metricName,
              ],
              set: { avgValue: r.avg_value, updatedDs: startedAt },
            }),
        ),
      );
    }
  }
  // Do NOT set cuped_frozen_at here — set it together with started_at in startExperiment()
}
```

**In the daily cron:** only use baselines where `cuped_frozen_at IS NOT NULL`.
Skip CUPED entirely for experiments where baselines haven't been frozen yet.

```typescript
function applyCuped(
  values: Map<string, number>,
  baselines: Map<string, number>,
): { result: Map<string, number>; overlap_pct: number } {
  const users = [...values.keys()].filter((u) => baselines.has(u));
  const overlap_pct = values.size > 0 ? users.length / values.size : 0;

  // Fallback if overlap too low — CUPED on <50% of users introduces selection bias
  if (users.length < 100 || overlap_pct < 0.5) {
    console.warn(
      JSON.stringify({
        event: "cuped_low_overlap",
        overlap_pct,
        users_with_baseline: users.length,
        total_users: values.size,
      }),
    );
    return { result: values, overlap_pct };
  }

  const vArr = users.map((u) => values.get(u)!);
  const bArr = users.map((u) => baselines.get(u)!);
  const varB = sampleVariance(bArr);

  if (varB < 1e-10) {
    // Zero variance: all baseline values identical — CUPED provides no benefit
    // Do not divide by zero; skip silently and log
    console.warn(JSON.stringify({ event: "cuped_zero_variance", user_count: users.length }));
    return { result: values, overlap_pct };
  }

  const meanB = mean(bArr);
  const theta = covariance(vArr, bArr) / varB;
  const result = new Map(values);
  for (const u of users) result.set(u, values.get(u)! - theta * (baselines.get(u)! - meanB));
  return { result, overlap_pct };
}
```

Baselines come from `user_metric_baseline` D1 table (frozen at experiment start, never rolling).

### Step 6 — Welch t-test

Welch's t-test (does not assume equal variance — more robust than Student's t-test).
`sampleVariance` uses Bessel's correction (÷n-1, not ÷n).

```typescript
function welchTTest(control: number[], test: number[]) {
  const [n1, n2] = [control.length, test.length];
  const [m1, m2] = [mean(control), mean(test)];
  const [v1, v2] = [sampleVariance(control), sampleVariance(test)];

  const se = Math.sqrt(v1 / n1 + v2 / n2);
  const t = se > 0 ? (m2 - m1) / se : 0;

  // Welch-Satterthwaite degrees of freedom
  const df =
    Math.pow(v1 / n1 + v2 / n2, 2) /
    (Math.pow(v1 / n1, 2) / (n1 - 1) + Math.pow(v2 / n2, 2) / (n2 - 1));

  const p = 2 * tDistCDF(-Math.abs(t), df);
  const t95 = tCritical(0.025, df);
  const t99 = tCritical(0.005, df);

  return {
    delta: m2 - m1,
    delta_pct: m1 !== 0 ? ((m2 - m1) / Math.abs(m1)) * 100 : 0,
    p_value: p,
    ci_95_low: m2 - m1 - t95 * se,
    ci_95_high: m2 - m1 + t95 * se,
    ci_99_low: m2 - m1 - t99 * se,
    ci_99_high: m2 - m1 + t99 * se,
  };
}
```

`tDistCDF` and `tCritical` can be implemented using the regularized incomplete
beta function (Abramowitz approximation). No external math library needed.

**Note on binary metrics:** `count_users` and `retention_Nd` produce 0/1 values. Welch's t-test
is asymptotically valid for binary outcomes via the Central Limit Theorem, but the power
calculator in `07-dashboard.md` uses binomial variance for sample size estimation — this is
internally inconsistent. At N < 200 per arm, use results for binary metrics with caution.
For revenue (`sum`) metrics, winsorization reduces skew but does not normalize the distribution;
p-values at N < 500 may be anti-conservative.

### Step 6.5 — mSPRT (Sequential Testing, Premium/Enterprise)

Runs after Welch t-test when `plan.sequential_testing === true` AND `experiment.sequential_testing === true`.

**What mSPRT is:** The mixture Sequential Probability Ratio Test (Johari et al., 2017, "Peeking at A/B Tests: Why It Matters, and What to Do About It"). Unlike Welch's fixed-horizon t-test, mSPRT maintains a valid false positive rate at any stopping time — you can look at results daily and stop when the statistic crosses the threshold without inflating Type I error.

**The statistic:** For two Gaussian samples with mixing prior δ ~ N(0, τ²):

```
Lambda = sqrt(V / (V + τ²)) × exp(τ² × δ̂² / (2 × V × (V + τ²)))
```

where:

- δ̂ = mean(test) − mean(control) — the estimated effect
- V = s₁²/n₁ + s₂²/n₂ — the squared standard error of δ̂
- τ² — the prior variance over effect sizes; set from the metric's `min_detectable_effect`

**Reject H₀ (declare significance) when Lambda > 1/α.** At α=0.05, threshold = 20.

This is valid at any stopping time — Lambda > 1/α at any daily check has the same Type I error guarantee as a single fixed-horizon test at that α. No multiple testing penalty for checking daily.

**Setting τ:** τ is the standard deviation of the mixing prior — how spread out your prior on the effect is. Larger τ = detects larger effects sooner, slower for small effects.

```typescript
function msprtTau(
  metric: { min_detectable_effect: number | null },
  controlValues: number[],
): number {
  if (metric.min_detectable_effect != null && metric.min_detectable_effect > 0) {
    return metric.min_detectable_effect * 0.5; // τ = MDE/2: optimal power at 2× MDE runtime
  }
  // No MDE: default to 20% of control SD — conservative prior suitable for unknown effect sizes
  const sd = Math.sqrt(sampleVariance(controlValues));
  return sd * 0.2;
}
```

**Full implementation:**

```typescript
export function computeMSPRT(
  control: { n: number; mean: number; variance: number },
  test: { n: number; mean: number; variance: number },
  tau: number,
  alpha: number, // experiment significance threshold (default 0.05)
): { msprt_lambda: number; msprt_significant: number } {
  if (control.n < 10 || test.n < 10 || tau <= 0) {
    return { msprt_lambda: 0, msprt_significant: 0 };
  }

  const delta = test.mean - control.mean;
  const V = control.variance / control.n + test.variance / test.n;

  if (V <= 0) return { msprt_lambda: 0, msprt_significant: 0 };

  const tau2 = tau * tau;
  const lambda =
    Math.sqrt(V / (V + tau2)) * Math.exp((tau2 * delta * delta) / (2 * V * (V + tau2)));
  const threshold = 1 / alpha; // α=0.05 → threshold=20; α=0.01 → threshold=100

  return {
    msprt_lambda: lambda,
    msprt_significant: lambda > threshold ? 1 : 0,
  };
}
```

**In analyzeExperiment — call after Welch:**

```typescript
let msprtResult: { msprt_lambda: number | null; msprt_significant: number | null } = {
  msprt_lambda: null,
  msprt_significant: null,
};

if (useMSPRT) {
  const tau = msprtTau(metric, byGroup["control"] ?? []);
  msprtResult = computeMSPRT(
    { n: result.n_control, mean: result.mean_control, variance: result.variance_control },
    { n: result.n_test, mean: result.mean_test, variance: result.variance_test },
    tau,
    experiment.significance_threshold,
  );
}
```

**In computeVerdict — when `sequential_testing === true`, use mSPRT significance instead of p_value:**

```typescript
// mSPRT-aware significance check — replaces p_value comparison when sequential_testing=true
const sig = (m: MetricResult) =>
  experiment.sequential_testing && m.msprt_significant != null
    ? m.msprt_significant === 1
    : m.p_value < alpha;
```

The verdict structure (ship/hold/wait/invalid) is unchanged — mSPRT simply provides a stronger significance signal that is valid even before `min_runtime_days`. The peeking suppression is bypassed for mSPRT — it is always valid to look.

> **Option (Bayesian):** Eppo and Statsig offer optional Bayesian credible intervals. Bayesian methods with an informative prior can reach a conclusion with 20–40% fewer samples in simulation. However, Bayesian credible intervals do not control frequentist Type I error rate — repeated testing under a Bayesian model does not provide the same always-valid guarantee as mSPRT. Bayesian is appropriate when you have strong priors and care about posterior probability, not when you need a frequentist false-positive guarantee. mSPRT is the better fit for this platform's guarantees-driven design.

### Step 7 — Write Results

```typescript
// All schema columns must be included — omitting is_final/srm_detected causes them to default 0,
// which (a) marks final results as non-final (purged by retention cron) and (b) loses SRM evidence.
await db
  .insert(experimentResults)
  .values({
    projectId,
    experiment: expName,
    metric: metricName,
    groupName,
    ds,
    n: result.n_test,
    mean: result.mean_test,
    variance: result.variance_test,
    delta: result.delta,
    deltaPct: result.delta_pct,
    ci95Low: result.ci_95_low,
    ci95High: result.ci_95_high,
    ci99Low: result.ci_99_low,
    ci99High: result.ci_99_high,
    pValue: result.p_value,
    expectedN: srmResult.expected_n,
    srmPValue: srmResult.srm_p_value,
    srmDetected: srmResult.srm_detected ? 1 : 0,
    msprtLambda: msprtResult.msprt_lambda,
    msprtSignificant: msprtResult.msprt_significant,
    isFinal: isFinal ? 1 : 0,
    peekWarning: peekWarning ? 1 : 0,
  })
  .onConflictDoUpdate({
    target: [
      experimentResults.projectId,
      experimentResults.experiment,
      experimentResults.metric,
      experimentResults.groupName,
      experimentResults.ds,
    ],
    set: {
      n: result.n_test,
      mean: result.mean_test /* ... all fields ... */,
      srmDetected: srmResult.srm_detected ? 1 : 0,
      msprtLambda: msprtResult.msprt_lambda,
      msprtSignificant: msprtResult.msprt_significant,
      // NEVER downgrade is_final from 1 to 0 — the stop-triggered final analysis
      // must not be overwritten by a concurrent daily cron run.
      // SQLite equivalent of MAX(existing, new): if existing is_final=1, keep it.
      isFinal: sql`MAX(${experimentResults.isFinal}, ${isFinal ? 1 : 0})`,
      peekWarning: peekWarning ? 1 : 0,
    },
  });
```

## Verdict Logic — computeVerdict()

Deterministic, no LLM. Reads metric results → produces ship/hold/wait/invalid.

Guards before emitting 'ship':

1. SRM detected → suppress verdict entirely (experiment may be invalid)
2. Min runtime not reached → emit 'wait' with peek_warning flag
3. Min sample size not reached → emit 'wait'
4. Per-experiment significance threshold (not hardcoded 0.05)

```typescript
// MetricResult — built from experiment_results joined with metrics table in analyzeProject()
// Required fields for computeVerdict: role, metric, p_value, delta, delta_pct, n_test,
//   min_detectable_effect (from metrics.min_detectable_effect — may be null)

export function computeVerdict(
  metrics: MetricResult[],
  experiment: {
    min_runtime_days: number;
    min_sample_size: number;
    significance_threshold: number;
    started_at: string;
    sequential_testing: boolean;
  },
  analysisDate: string,
  srmDetected: boolean,
): VerdictOutput {
  // Guard 1: SRM invalidates the experiment
  if (srmDetected)
    return {
      verdict: "invalid",
      title: "Experiment invalid — Sample Ratio Mismatch detected",
      narrative:
        "The actual ratio of users per group differs significantly from the expected ratio. " +
        "This indicates a logging bug, bot traffic, or SDK initialization issue. " +
        "Results are not trustworthy. Fix the root cause and restart the experiment.",
    };

  // Immediate guardrail hold — fires before min_runtime check for all plans.
  // A 3× MDE regression at p < 0.001 has false positive rate < 0.1% even before min_runtime.
  // Waiting causes real harm; stopping immediately is correct.
  // MDE thresholds: auto-collected metrics use hardcoded values; operator metrics use min_detectable_effect.
  const AUTO_MDE: Record<string, number> = {
    __auto_js_error: 0.005, // 0.5pp absolute
    __auto_network_error: 0.01, // 1pp absolute
    __auto_lcp: 150, // 150ms
    __auto_inp: 100, // 100ms
    __auto_cls_binary: 0.02, // 2pp proportion
    __auto_abandoned: 0.02, // 2pp proportion
  };
  const immediatelyBroken = metrics.filter((m) => {
    if (m.role !== "guardrail" || m.delta >= 0) return false;
    const mde = AUTO_MDE[m.metric] ?? m.min_detectable_effect ?? 0;
    return m.p_value < 0.001 && Math.abs(m.delta) > 3 * mde;
  });
  if (immediatelyBroken.length > 0)
    return {
      verdict: "hold",
      title: "Stop — critical guardrail regression",
      narrative:
        `${immediatelyBroken.map((m) => `${m.metric} (${m.delta_pct.toFixed(1)}%)`).join(", ")} ` +
        `regressed severely. Stopping immediately regardless of minimum runtime.`,
      peek_warning: false,
    };

  // Guard 2: Minimum runtime + peeking suppression
  const daysSinceStart = Math.floor(
    (new Date(analysisDate).getTime() - new Date(experiment.started_at).getTime()) / 86_400_000,
  );
  const peekWarning = daysSinceStart < experiment.min_runtime_days;

  // Sequential testing (Premium/Enterprise): when sequential_testing=true, mSPRT lambda values
  // have been computed (see Step 6.5). mSPRT is always valid to peek — no peeking suppression.
  // Standard Welch p-values are still computed and stored for reference; the verdict uses
  // mSPRT significance when sequential_testing=true.
  if (peekWarning && !experiment.sequential_testing)
    return {
      verdict: "wait",
      title: "Too early to conclude — minimum runtime not reached",
      narrative:
        `Experiment has run ${daysSinceStart}d of required ${experiment.min_runtime_days}d. ` +
        `Results are suppressed to prevent false positives from early stopping. ` +
        `Upgrade to Premium for sequential testing with always-valid p-values.`,
      peek_warning: true,
    };

  // Guard 3: Minimum sample size
  const minN = Math.min(...metrics.map((m) => m.n_test).filter((n) => n > 0));
  if (minN < experiment.min_sample_size)
    return {
      verdict: "wait",
      title: "Inconclusive — not enough users yet",
      narrative: `Minimum ${experiment.min_sample_size} users per group required. Currently ${minN}.`,
      peek_warning: false,
    };

  const alpha = experiment.significance_threshold; // per-experiment, default 0.05
  const goal = metrics.filter((m) => m.role === "goal");
  const guard = metrics.filter((m) => m.role === "guardrail");
  // mSPRT-aware significance: use lambda threshold when sequential_testing=true and lambda is available.
  // Falls back to Welch p_value when mSPRT was not computed (plan not eligible, or n<10).
  const sig = (m: MetricResult) =>
    experiment.sequential_testing && m.msprt_significant != null
      ? m.msprt_significant === 1
      : m.p_value < alpha;
  const regr = (m: MetricResult) => sig(m) && m.delta < 0;
  const wins = (m: MetricResult) => sig(m) && m.delta > 0;

  // Standard guardrail check — enforces MDE threshold and uses α=0.01 (tighter than goals).
  // 2-of-3 rule for the performance cluster (LCP/INP/CLS): positive correlation between these
  // metrics inflates false-hold rate; require ≥2 of 3 to be significant before any count.
  const PERF_CLUSTER = new Set(["__auto_lcp", "__auto_inp", "__auto_cls_binary"]);
  const perfClusterBroken = guard.filter(
    (m) =>
      PERF_CLUSTER.has(m.metric) &&
      m.p_value < 0.01 &&
      m.delta < 0 &&
      Math.abs(m.delta) > (AUTO_MDE[m.metric] ?? m.min_detectable_effect ?? 0),
  );
  // Apply 2-of-3 rule: only count performance cluster metrics if ≥2 of 3 regressed
  const perfClusterCounts = perfClusterBroken.length >= 2 ? perfClusterBroken : [];

  const guardrailsBroken = [
    ...guard.filter(
      (m) =>
        !PERF_CLUSTER.has(m.metric) &&
        m.p_value < 0.01 &&
        m.delta < 0 &&
        Math.abs(m.delta) > (AUTO_MDE[m.metric] ?? m.min_detectable_effect ?? 0),
    ),
    ...perfClusterCounts,
  ];
  if (guardrailsBroken.length > 0)
    return {
      verdict: "hold",
      title: "Do not ship — guardrail regression",
      narrative: `${guardrailsBroken.map((m) => `${m.metric} (${m.delta_pct.toFixed(1)}%)`).join(", ")} regressed significantly.`,
      peek_warning: peekWarning,
    };

  // Intersection test: ALL goal metrics must be significant to ship.
  // Union test (ANY goal wins) inflates Type I error: 3 goals at α=0.05 → 14.3% false positive rate.
  const allGoalsWin = goal.length > 0 && goal.every(wins);
  const someGoalWins = goal.some(wins);

  if (!allGoalsWin) {
    const partialDesc = someGoalWins
      ? `${goal.filter(wins).length}/${goal.length} goal metrics significant — all must win to ship.`
      : "No goal metrics have reached significance.";
    return {
      verdict: "wait",
      title: "Inconclusive — continue running",
      narrative: partialDesc,
      peek_warning: peekWarning,
    };
  }

  const goalDesc = goal
    .map((m) => `${m.metric} +${m.delta_pct.toFixed(1)}% (p=${m.p_value.toFixed(3)})`)
    .join("; ");
  return {
    verdict: "ship",
    title: "Ship it",
    narrative: `${goalDesc}. Guardrails: ${guard.map((m) => `${m.metric} ${regr(m) ? "✗" : "✓"}`).join(", ")}.`,
    peek_warning: peekWarning,
  };
}
```

## Multiple Testing Warning

With N guardrail metrics at α=0.01, the family-wise error rate inflates. The standard guardrail filter applies Holm-Bonferroni ordering implicitly via the 2-of-3 performance cluster rule and the MDE threshold requirement. See `stats-decisions.md` §§ 7 and 20 for the full rationale and real-world examples of why union tests on multiple goals and correlated guardrails inflate false positive rates.

## R2 Archival Cron (04:00 UTC daily)

Exports yesterday's AE events to R2 before they approach the `ae_retention_days` window.
Runs after analysis (02:00) and retention purge (03:00) so the analysis pipeline always
reads from AE for recent data and from R2 only for older dates.

**R2 key format:**

```
events/{project_id}/{YYYY-MM-DD}/exposures.ndjson
events/{project_id}/{YYYY-MM-DD}/metrics.ndjson
```

Each file is newline-delimited JSON, one AE row per line, written atomically via a single
`R2.put()`. If the file already exists (cron re-runs after failure), overwrite it —
the AE data for a past date is immutable so re-runs are idempotent.

```typescript
// analysis/archive.ts — runs at 04:00 UTC via cron trigger
export async function runArchivalCron(env: Env): Promise<void> {
  const db = getDb(env.DB);
  const allProjs = await db.selectDistinct({ id: projects.id }).from(projects);

  // Archive yesterday — AE data is consistent after ~1 min; by 04:00 UTC it is stable
  const yesterday = new Date(Date.now() - 86_400_000);
  const ds = yesterday.toISOString().slice(0, 10); // 'YYYY-MM-DD'
  const dayStart = new Date(ds + "T00:00:00.000Z").getTime();
  const dayEnd = dayStart + 86_400_000;

  const archiveFailedProjects: string[] = [];
  for (const proj of allProjs) {
    try {
      await archiveProjectDay(env, proj.id, ds, dayStart, dayEnd);
    } catch (err) {
      // Log but continue — one failed project must not abort the rest
      archiveFailedProjects.push(proj.id);
      console.error(
        JSON.stringify({ event: "archive_failed", project_id: proj.id, ds, error: String(err) }),
      );
    }
  }

  await getDb(env.DB)
    .insert(systemHealth)
    .values({
      key: "archival_cron",
      lastFiredAt: new Date().toISOString(),
      projectsEnqueued: allProjs.length,
    })
    .onConflictDoUpdate({
      target: [systemHealth.key],
      set: { lastFiredAt: new Date().toISOString(), projectsEnqueued: allProjs.length },
    });

  // Alert on archival failures — previously only logged, never alerted.
  // A multi-day archival outage means AE data permanently lost when retention expires.
  // Use the same Resend email path as analysis failures.
  if (archiveFailedProjects.length > 0 && env.ALERT_EMAIL) {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "alerts@flaglab.yourdomain.com",
        to: [env.ALERT_EMAIL],
        subject: `[FlagLab] R2 archival failed for ${archiveFailedProjects.length} project(s) on ${ds}`,
        text:
          `Projects that failed R2 archival for ${ds}:\n\n${archiveFailedProjects.join("\n")}\n\n` +
          `If this persists, AE events for these projects will be permanently lost when ` +
          `ae_retention_days expires. Check Worker logs for the root cause and re-run ` +
          `archival via: wrangler tail --format pretty | grep archive_failed`,
      }),
    }).catch(() => {});
  }
}

async function archiveProjectDay(
  env: Env,
  projectId: string,
  ds: string,
  dayStart: number,
  dayEnd: number,
): Promise<void> {
  // Query AE for all exposures and metric events for this project and day
  const exposureSql = `
    SELECT blob1 AS grp, blob2 AS user_id, blob3 AS anon_id, double1 AS ts,
           index2 AS experiment, index3 AS row_type
    FROM EXPOSURES
    WHERE index1 = '${projectId}'
      AND index3 = 'exposure'
      AND double1 >= ${dayStart}
      AND double1 <  ${dayEnd}
  `;
  const metricSql = `
    SELECT blob1 AS user_id, blob2 AS anon_id, double1 AS value, double2 AS ts,
           index2 AS event_name, index3 AS row_type
    FROM METRIC_EVENTS
    WHERE index1 = '${projectId}'
      AND index3 = 'metric'
      AND double2 >= ${dayStart}
      AND double2 <  ${dayEnd}
  `;

  const [exposures, metrics] = await Promise.all([
    queryAE(exposureSql, env),
    queryAE(metricSql, env),
  ]);

  // Write NDJSON files to R2 — one put() per file, atomic and idempotent
  if (exposures.length > 0) {
    const ndjson = exposures.map((r) => JSON.stringify(r)).join("\n");
    await env.EVENTS_R2.put(`events/${projectId}/${ds}/exposures.ndjson`, ndjson, {
      httpMetadata: { contentType: "application/x-ndjson" },
    });
  }
  if (metrics.length > 0) {
    const ndjson = metrics.map((r) => JSON.stringify(r)).join("\n");
    await env.EVENTS_R2.put(`events/${projectId}/${ds}/metrics.ndjson`, ndjson, {
      httpMetadata: { contentType: "application/x-ndjson" },
    });
  }

  console.log(
    JSON.stringify({
      event: "archive_day_complete",
      project_id: projectId,
      ds,
      exposures: exposures.length,
      metrics: metrics.length,
    }),
  );
}
```

### R2 fallback in the analysis pipeline

When `experiment.started_at` predates the AE retention window, the exposure and metric
queries are split: AE handles recent data, R2 handles old data. The results are merged
in memory before winsorization.

```typescript
// In analyzeExperiment — replaces the single AE exposure query when needed

const plan = getPlan(project.plan);
const aeRetentionMs = plan.ae_retention_days * 86_400_000;
const aeWindowStart = analysisStartTs - aeRetentionMs; // oldest date AE can answer

const expStartMs = new Date(experiment.startedAt!).getTime();
const needsR2 = expStartMs < aeWindowStart; // experiment predates AE window

// Fetch from AE (recent data — always)
const aeExposureRows = await queryAE(
  exposureSqlBounded(
    projectId,
    experiment.name,
    Math.max(expStartMs, aeWindowStart),
    analysisFence,
  ),
  env,
);

// Fetch from R2 (old data — only when needed)
// CRITICAL: must fetch BOTH exposures AND metric events from R2. Fetching only exposures
// (prior bug) caused users exposed during the R2-era period to appear in canonicalExposures
// with no matching metric events, silently deflating both group means for the historical cohort.
let r2ExposureRows: any[] = [];
let r2MetricRowsByMetric: Map<string, any[]> = new Map(); // keyed by metric.event_name

if (needsR2) {
  // Read exposures and ALL metric events from R2 in one pass each (O(days), not O(metrics×days)).
  // Prior bug: called readR2Archive for 'metrics' once per attached metric, reading the full
  // NDJSON file N times. At 5 metrics × 30-day window = 150 R2 gets, each loading the full file.
  const [exposureArchive, allR2MetricRows] = await Promise.all([
    readR2Archive(env, projectId, new Date(expStartMs), new Date(aeWindowStart), "exposures"),
    readR2Archive(env, projectId, new Date(expStartMs), new Date(aeWindowStart), "metrics"),
  ]);
  r2ExposureRows = exposureArchive;
  // Partition all R2 metric rows by event_name in one in-memory pass
  for (const row of allR2MetricRows) {
    const key = row.event_name as string;
    if (!r2MetricRowsByMetric.has(key)) r2MetricRowsByMetric.set(key, []);
    r2MetricRowsByMetric.get(key)!.push(row);
  }
  console.log(
    JSON.stringify({
      event: "r2_archive_read",
      project_id: projectId,
      experiment: experiment.name,
      r2_exposure_rows: r2ExposureRows.length,
      r2_metric_events: Object.fromEntries(
        [...r2MetricRowsByMetric.entries()].map(([k, v]) => [k, v.length]),
      ),
    }),
  );
}

const allExposureRows = [...r2ExposureRows, ...aeExposureRows];
// r2MetricRowsByMetric is passed to the per-metric analysis step — merge with AE metric rows before computeAggregate
// Continue with alias resolution and analysis on allExposureRows as before

// ── R2 read helper ───────────────────────────────────────────────────────────
async function readR2Archive(
  env: Env,
  projectId: string,
  startDate: Date,
  endDate: Date,
  dataset: "exposures" | "metrics",
): Promise<any[]> {
  const rows: any[] = [];
  const current = new Date(startDate);
  current.setUTCHours(0, 0, 0, 0);

  while (current < endDate) {
    const ds = current.toISOString().slice(0, 10);
    const obj = await env.EVENTS_R2.get(`events/${projectId}/${ds}/${dataset}.ndjson`);
    if (obj) {
      const text = await obj.text();
      for (const line of text.split("\n")) {
        if (line.trim()) rows.push(JSON.parse(line));
      }
    }
    current.setUTCDate(current.getUTCDate() + 1);
  }
  return rows;
}
```

**Experiment creation warning:** When creating an experiment, if `min_runtime_days` exceeds
`plan.ae_retention_days × 0.9`, the API response includes:

```json
{
  "warning": "Planned duration approaches AE retention window. R2 archival will activate automatically — no action needed."
}
```

This is advisory only — R2 archival handles it transparently.

## Retention Purge Cron (03:00 UTC daily)

Enforces `results_retention_days` from plans.yaml. Also purges stale CLI sessions
and CUPED baselines for stopped experiments.

```typescript
// analysis/retention.ts — second cron trigger at 0 3 * * *
export async function runRetentionPurge(env: Env): Promise<void> {
  const db = getDb(env.DB);
  const allProjs = await db.select({ id: projects.id, plan: projects.plan }).from(projects);

  for (const proj of allProjs) {
    const plan = getPlan(proj.plan);
    const cutoff = new Date(Date.now() - plan.results_retention_days * 86_400_000)
      .toISOString()
      .slice(0, 10); // 'YYYY-MM-DD'

    // D1 STORAGE CEILING GUARD: is_final=1 rows are kept forever by default, accumulating
    // at ~200 bytes/row × (experiments × metrics × groups). At moderate scale, this hits
    // D1's 2GB hard limit within months. Fix: archive is_final=1 rows older than
    // `results_final_archive_days` to R2, then delete from D1. The dashboard reads from
    // R2 for archived experiments via GET /api/admin/experiments/:id/results?archived=true.
    //
    // R2 key: results/{project_id}/{experiment}/{group}/{metric}.ndjson
    // One append per ds row, written atomically on archive day. Idempotent on re-run.
    const archiveCutoff = new Date(Date.now() - plan.results_final_archive_days * 86_400_000)
      .toISOString()
      .slice(0, 10);
    const rowsToArchive = await db
      .select()
      .from(experimentResults)
      .where(
        and(
          eq(experimentResults.projectId, proj.id),
          eq(experimentResults.isFinal, 1),
          lt(experimentResults.ds, archiveCutoff),
        ),
      );
    if (rowsToArchive.length > 0) {
      // Group by experiment+group+metric for efficient R2 writes
      const grouped = new Map<string, typeof rowsToArchive>();
      for (const row of rowsToArchive) {
        const key = `${row.experiment}/${row.groupName}/${row.metric}`;
        if (!grouped.has(key)) grouped.set(key, []);
        grouped.get(key)!.push(row);
      }
      let archiveErrors = 0;
      for (const [key, rows] of grouped) {
        try {
          const ndjson = rows.map((r) => JSON.stringify(r)).join("\n");
          await env.EVENTS_R2.put(`results/${proj.id}/${key}.ndjson`, ndjson, {
            httpMetadata: { contentType: "application/x-ndjson" },
          });
        } catch (err) {
          archiveErrors++;
          console.error(
            JSON.stringify({
              event: "result_archive_failed",
              project_id: proj.id,
              key,
              error: String(err),
            }),
          );
        }
      }
      // Only delete from D1 if all R2 writes succeeded — prevents data loss on partial failure
      if (archiveErrors === 0) {
        await db
          .delete(experimentResults)
          .where(
            and(
              eq(experimentResults.projectId, proj.id),
              eq(experimentResults.isFinal, 1),
              lt(experimentResults.ds, archiveCutoff),
            ),
          );
        console.log(
          JSON.stringify({
            event: "result_archive_complete",
            project_id: proj.id,
            rows: rowsToArchive.length,
          }),
        );
      }
    }

    // Delete old daily result rows — preserve is_final=1 (terminal experiment records, handled above)
    const deleted = await db
      .delete(experimentResults)
      .where(
        and(
          eq(experimentResults.projectId, proj.id),
          lt(experimentResults.ds, cutoff),
          eq(experimentResults.isFinal, 0),
        ),
      );

    if ((deleted.rowsAffected ?? 0) > 0) {
      console.log(
        JSON.stringify({
          event: "retention_purge",
          project_id: proj.id,
          cutoff,
          rows_deleted: deleted.rowsAffected,
        }),
      );
    }
  }

  // Purge CUPED baselines for projects with no running experiments.
  // NOTE: if a project temporarily pauses all experiments and restarts one later,
  // baselines are deleted here and must be re-frozen at the next experiment start.
  // The first analysis run after re-freeze will skip CUPED (cuped_frozen_at set at start,
  // but baselines take one analysis cycle to populate). This is acceptable degradation.
  const runningProjectIds = db
    .selectDistinct({ projectId: experiments.projectId })
    .from(experiments)
    .where(eq(experiments.status, "running"));

  await db
    .delete(userMetricBaseline)
    .where(notInArray(userMetricBaseline.projectId, runningProjectIds));

  // Purge audit log entries older than plan retention
  const auditCutoff = new Date(
    Date.now() - plan.audit_log_retention_days * 86_400_000,
  ).toISOString();
  await db
    .delete(auditLog)
    .where(and(eq(auditLog.projectId, proj.id), lt(auditLog.createdAt, auditCutoff)));

  // Purge expired/completed CLI auth sessions older than 7 days
  const sessionCutoff = new Date(Date.now() - 7 * 86_400_000).toISOString();
  await db
    .delete(cliAuthSessions)
    .where(
      and(
        lt(cliAuthSessions.expiresAt, sessionCutoff),
        inArray(cliAuthSessions.status, ["expired", "complete"]),
      ),
    );

  // Alert on unresolved analysis failures — query analysis_failures and send
  // email via Resend if any project has had a failure in the last 26 hours.
  // 26h threshold: if the 02:00 UTC cron ran but a project failed, this fires
  // at 03:00 UTC the same day. If the failure persists the next day, it fires again.
  // Resend is already wired in for magic-link auth — zero new infrastructure.
  const failureCutoff = new Date(Date.now() - 26 * 3_600_000).toISOString();
  const unresolved = await db
    .select({
      projectId: analysisFailures.projectId,
      failedAt: analysisFailures.failedAt,
      messageBody: analysisFailures.messageBody,
    })
    .from(analysisFailures)
    .where(and(isNull(analysisFailures.resolvedAt), gt(analysisFailures.failedAt, failureCutoff)));

  if (unresolved.length > 0 && env.ALERT_EMAIL) {
    const body = unresolved
      .map(
        (f) =>
          `Project: ${f.projectId}\nFailed at: ${f.failedAt}\nError: ${f.messageBody ?? "unknown"}`,
      )
      .join("\n\n");

    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "alerts@flaglab.yourdomain.com",
        to: [env.ALERT_EMAIL],
        subject: `[FlagLab] ${unresolved.length} analysis failure(s) — action required`,
        text:
          `The following projects failed analysis in the last 26 hours:\n\n${body}\n\n` +
          `To requeue: POST /api/admin/experiments/:id/reanalyze\n` +
          `To inspect: wrangler d1 execute flags-db --command "SELECT * FROM analysis_failures WHERE resolved_at IS NULL"`,
      }),
    }).catch((err) => {
      console.error(JSON.stringify({ event: "alert_email_failed", error: String(err) }));
    });

    console.error(
      JSON.stringify({
        event: "analysis_failures_alerted",
        failed_projects: unresolved.map((f) => f.projectId),
        count: unresolved.length,
      }),
    );
  }

  // Cron heartbeat for dead man's switch monitoring
  if (env.CRONITOR_HEARTBEAT_URL) {
    await fetch(env.CRONITOR_HEARTBEAT_URL).catch(() => {});
  }
}
```
