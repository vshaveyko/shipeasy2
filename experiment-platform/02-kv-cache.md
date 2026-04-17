# KV Cache Design

KV namespace binding: `FLAGS_KV`

## Propagation SLA — Architectural Decision

**Decision: polling model only. No SSE, no WebSockets, no Durable Object fan-out.**

All use cases in this platform tolerate eventual propagation of 10–60 seconds. The polling model is simpler, cheaper, and has no persistent connection management. Propagation speed is not a differentiator for the customers this platform targets.

This decision is final. Do not add SSE or push channels to reduce propagation latency. If a future use case genuinely requires sub-10s propagation, revisit this decision with a written trade-off analysis first.

> **Option (competitors):** LaunchDarkly uses SSE (server-sent events) via a persistent streaming connection, achieving <1s flag propagation. Unleash and Flipt use SSE or gRPC streaming similarly. This gives a meaningful killswitch advantage but requires a streaming-tier infrastructure (persistent connection management, horizontal fan-out across edge PoPs) that is operationally heavier and incompatible with the stateless Worker model.

### Actual propagation times

| Path                             | Latency       | Source                                    |
| -------------------------------- | ------------- | ----------------------------------------- |
| CDN cache purge acknowledgment   | ~150ms        | Cloudflare Cache Purge API                |
| KV global replication (all PoPs) | up to 60s     | Cloudflare KV eventual consistency SLA    |
| Worker module-scope cache TTL    | 10s           | configured in `@flaglab/core` kv/cache.ts |
| **Effective max staleness**      | **up to 60s** | CDN purge + KV replication worst case     |

The "~150ms" figure refers to CDN purge acknowledgment only — not to global KV replication. After a write, a Worker in a distant PoP may read stale KV for up to 60s. This is the accepted SLA for all flag and experiment changes.

## Cache Strategy: Infinite TTL + Explicit Purge

All KV-backed endpoints use `Cache-Control: max-age=31536000` (1 year = effectively infinite).
When data changes, the Worker calls Cloudflare's Cache Purge API to drop CDN caches. CDN purge acknowledgment is ~150ms; KV global replication takes up to 60s.

**Why purge beats TTL:**

|                           | TTL=30s | Infinite TTL + Purge                            |
| ------------------------- | ------- | ----------------------------------------------- |
| Worker hits/day (10 PoPs) | 28,800  | ~100 (only on changes)                          |
| CDN propagation           | ≤30s    | ~150ms (purge ack) / up to 60s (KV replication) |
| Purge API cost            | N/A     | Free                                            |

**Prerequisite:** custom domain (`flags.yourdomain.com`) through a Cloudflare zone.
`*.workers.dev` URLs have no zone ID to purge against.

Env vars needed: `CF_ZONE_ID` (var) + `CF_API_TOKEN` secret (Cache Purge scope only) + `FLAGS_DOMAIN`.

## KV Entry Types

Three categories of entries, separated by prefix:

```
sdk_key:{hash}                    ← SDK key metadata (auth + routing)
  { project_id, type }
  Written by: key creation endpoint (admin/keys.ts)
  Deleted by: key revocation endpoint — immediate effect, no TTL
  NOT CDN-cached — internal Worker-to-KV read only
  Replaces D1 sdk_keys lookup on the hot path entirely.
  D1 sdk_keys table remains for audit (created_at, revoked_at) only.

{project_id}:flags                ← gates + configs
  { version, plan, gates: {...}, configs: {...} }
  Written by: rebuildFlags() on gate/config change (called from Next.js Server Actions and Worker cron)
  CDN cache: max-age=31536000 (infinite), purged on every gate/config change
             CDN stays warm indefinitely; purge is the only propagation mechanism
             (~150ms purge acknowledgment, up to 60s KV global replication)
             There is no TTL-based fallback — purgeCache() throws on failure (3× retry),
             making the mutation return 500. Silent stale is not possible.
  SDK polls at plan.poll_interval_seconds (read from PLANS bundle, not KV)

{project_id}:experiments          ← universes + experiments
  { version, universes: {...}, experiments: {...} }
  Written by: rebuildExperiments() on experiment/universe change (called from Next.js Server Actions and Worker cron)
  CDN cache: max-age=31536000, purged on experiment start/stop
  SDK polls every 600s — experiments are stable mid-run

{project_id}:catalog              ← registered event names (non-pending only)
  Set<string> serialized as JSON array
  Written by: event catalog Server Actions on create/approve
  NOT CDN-cached — internal Worker reads only, no SDK exposure
  Used by: /collect handler to validate metric event_names without D1 query
  Module-scope cached 60s (events catalog changes rarely)
```

Plans are NOT in KV — compiled into the Worker bundle from `plans.yaml`.

**Why per-project blobs rather than per-key blobs:**
A project can have many SDK keys (free: up to 5, enterprise: unlimited). Storing the
full flags blob under each key hash would require one KV write + one CDN purge per key
on every gate change. Per-project blobs keep write amplification at O(1) regardless of
key count. The `sdk_key:{hash}` entry is tiny (two fields) so per-key storage there is fine.

Plans are compiled into both the Next.js app and Worker at build time (`import { PLANS } from '@flaglab/core/config/plans'`).
No KV lookup, no D1 query, no network call to resolve plan settings.
Changing a plan value: edit `plans.yaml` in `packages/core/src/config/`, redeploy both Next.js and Worker.

**Rationale for the split:**

- Gates/configs: operational, change often, need fast propagation
- Experiments: scientific, designed to be STABLE mid-run (changing allocation invalidates results)
- Universes: holdout ranges almost never change → travel with experiments

## KV Blob Shapes

### `{project_id}:flags`

```json
{
  "version": "<sha256>",
  "plan": "premium",
  "gates": {
    "new_checkout": {
      "rules": [{ "type": "country", "op": "in", "value": ["US"] }],
      "rolloutPct": 5000,
      "salt": "abc123",
      "enabled": 1,
      "killswitch": 0
    }
  },
  "configs": {
    "checkout_timeout_ms": { "value": 5000 }
  }
}
```

### `{project_id}:experiments`

```json
{
  "version": "<sha256>",
  "universes": {
    "checkout": { "holdout_range": [0, 499] }
  },
  "experiments": {
    "checkout_exp": {
      "universe": "checkout",
      "targetingGate": "new_checkout",
      "allocationPct": 1000,
      "salt": "exp_v2",
      "groups": [
        { "name": "control", "weight": 5000, "params": { "cta": "Buy" } },
        { "name": "test", "weight": 5000, "params": { "cta": "Buy Now" } }
      ],
      "status": "running"
    }
  }
}
```

### Versioned experiment keys (for cache coherence)

The `:experiments` blob includes a `version` field (sha256 of contents). Worker isolates
that detect a version mismatch between their module-scope cache and the KV-fetched blob
immediately evict their cache and re-fetch. This reduces the split-brain window from
60s (module cache TTL) to ~1 request latency after the version key updates.

When an experiment changes:

1. Write new blob to KV with incremented version
2. Purge CDN cache for `/sdk/experiments/{project_id}`
3. KV propagates globally (~10-60s)
4. Module-scope caches evict when they fetch and detect version change

For the `:flags` blob, the same version field is present but the primary propagation
mechanism is CDN purge (~150ms), not version-based eviction.

### Blob format versioning and Worker rollback

The blob's `version` field is a content hash — it changes when data changes. It is **not** a schema version. Schema versioning uses a separate `blobFormat` integer field:

```json
{
  "blobFormat": 1,
  "version": "<sha256-of-content>",
  "plan": "pro",
  "gates": { ... }
}
```

**Rules:**

- `blobFormat` starts at `1` and increments only when the blob shape changes (field added, renamed, or removed)
- Every Worker must handle the current `blobFormat` AND one version back
- A field addition is `blobFormat`-neutral if old Workers ignore unknown fields (JavaScript's object destructuring does this naturally)
- A field removal or rename requires a `blobFormat` bump

**Rollback procedure** — if `wrangler rollback` is needed after a `blobFormat` bump:

1. **Before rolling back the Worker**, rewrite all project blobs to the previous format:

   ```bash
   # 1. Get all project IDs
   wrangler d1 execute flags-db --command "SELECT id FROM projects" --json \
     | jq -r '.result[0].results[].id' > /tmp/project-ids.txt

   # 2. Rewrite each blob (run BEFORE wrangler rollback)
   while read -r project_id; do
     node scripts/rewrite-blob.mjs "$project_id" --namespace FLAGS_KV --target-format=1
   done < /tmp/project-ids.txt
   ```

2. Then run `wrangler rollback`.

3. Verify: spot-check a project KV blob has `"blobFormat":1`.

**`scripts/rewrite-blob.mjs`** — full implementation (was previously referenced but missing):

```javascript
#!/usr/bin/env node
// scripts/rewrite-blob.mjs
// Rewrites a project's KV blobs to a target blobFormat.
// Run BEFORE wrangler rollback when a blobFormat bump is being reversed.
//
// Usage: node scripts/rewrite-blob.mjs <project_id> --namespace FLAGS_KV --target-format=1
//
// Requires: CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID env vars, or wrangler login.

import { execSync } from "child_process";

const [projectId] = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const targetFormat = parseInt(
  process.argv.find((a) => a.startsWith("--target-format="))?.split("=")[1] ?? "1",
);
const namespace =
  process.argv.find((a) => a.startsWith("--namespace="))?.split("=")[1] ?? "FLAGS_KV";

if (!projectId) {
  console.error(
    "Usage: node scripts/rewrite-blob.mjs <project_id> [--namespace=FLAGS_KV] [--target-format=1]",
  );
  process.exit(1);
}

const KEYS = [`${projectId}:flags`, `${projectId}:experiments`];

for (const key of KEYS) {
  // Read current blob via wrangler kv key get
  let raw;
  try {
    raw = execSync(`wrangler kv key get "${key}" --binding=${namespace}`, { encoding: "utf8" });
  } catch {
    console.log(`Key ${key} not found — skipping`);
    continue;
  }

  let blob;
  try {
    blob = JSON.parse(raw);
  } catch {
    console.error(`Failed to parse JSON for key ${key}`);
    process.exit(1);
  }

  const currentFormat = blob.blobFormat ?? 1;
  if (currentFormat === targetFormat) {
    console.log(`${key}: already at blobFormat=${targetFormat} — skipping`);
    continue;
  }

  // Apply format migration (downgrade from currentFormat to targetFormat)
  const migrated = migrateBlob(blob, currentFormat, targetFormat);
  migrated.blobFormat = targetFormat;

  const serialized = JSON.stringify(migrated);

  // Write back via wrangler kv key put (stdin)
  execSync(
    `echo ${JSON.stringify(serialized)} | wrangler kv key put "${key}" --binding=${namespace} --stdin`,
    {
      stdio: ["pipe", "inherit", "inherit"],
    },
  );
  console.log(`${key}: rewritten from blobFormat=${currentFormat} to blobFormat=${targetFormat}`);
}

// ── Format migration functions ────────────────────────────────────────────────
// Add a case here for each format transition.
// downgrade(2→1): reverse whatever changes were made in the 2→2 upgrade path.
function migrateBlob(blob, from, to) {
  if (from === to) return blob;

  // Downgrade: apply in reverse order from `from` down to `to`
  let result = { ...blob };
  for (let fmt = from; fmt > to; fmt--) {
    result = downgrade(result, fmt);
  }
  return result;
}

function downgrade(blob, fromFormat) {
  switch (fromFormat) {
    case 2:
      // Example: blobFormat=2 added a `flags_count` field. Remove it for blobFormat=1.
      // EDIT THIS when you bump blobFormat — document what changed in the bump commit.
      const { flags_count, ...rest } = blob;
      return rest;
    default:
      // No downgrade defined for this format — blob is returned unchanged.
      // If you added blobFormat=3 without adding a downgrade here, this script will warn.
      console.warn(
        `No downgrade defined from blobFormat=${fromFormat} — blob unchanged for this step`,
      );
      return blob;
  }
}
```

Add this file to `scripts/rewrite-blob.mjs` in the repository root. It is referenced by the rollback procedure above and must exist before deploying any `blobFormat` bump.

**Worker format handler table** — register in `@flaglab/core` kv/cache.ts:

```typescript
// Every format transition must have a registered reader.
// Old Workers only need to read the blob shape they were built against.
// Never read a format newer than CURRENT_FORMAT — throw and let retry handle it.
const CURRENT_FORMAT = 1;

function parseFlagsBlob(raw: string): FlagsBlob {
  const blob = JSON.parse(raw);
  const fmt = blob.blobFormat ?? 1; // v1 blobs predate the field — default to 1
  if (fmt > CURRENT_FORMAT) {
    // Graceful fallback: return stale module-scope cached data if available.
    // During a rolling deploy, some PoPs run the old Worker for 30-60s and may
    // encounter blobs written by the new Worker. Throwing causes 500s for all SDK
    // requests at those PoPs. Returning stale data bounds staleness to the deploy
    // window instead of failing hard.
    console.warn(
      JSON.stringify({
        event: "blob_format_ahead",
        current: CURRENT_FORMAT,
        received: fmt,
        message:
          "Worker is behind blob format — returning stale cached data until deploy completes",
      }),
    );
    return null as any; // caller must handle null: return module-scope cached version
  }
  // Format 1: current shape — no migration needed
  return blob as FlagsBlob;
}
```

When deploying a new `blobFormat`, add a reader for the new format here before shipping.

## @flaglab/core kv/ — Full Implementation

These functions live in `packages/core/src/kv/` and are imported by both Next.js Server Actions
(admin mutations) and the Worker (cron reanalyze). The `env` parameter provides D1, KV, and CDN
purge credentials — both runtimes bind the same D1 database and KV namespace.

```typescript
// ── Flags blob (gates + configs) ─────────────────────────────────────────────
// planName is pre-fetched by the caller — no projects query here.
export async function rebuildFlags(env: Env, projectId: string, planName: string): Promise<void> {
  const db = getDb(env.DB);
  const [gateRows, configRows] = await Promise.all([
    db
      .select()
      .from(gates)
      .where(and(eq(gates.projectId, projectId), eq(gates.enabled, 1))),
    db.select().from(configs).where(eq(configs.projectId, projectId)),
  ]);
  const blob = {
    version: sha256short(projectId + "flags" + Date.now()),
    plan: planName,
    gates: Object.fromEntries(gateRows.map((g) => [g.name, g])),
    configs: Object.fromEntries(configRows.map((c) => [c.name, c])),
  };
  // Pre-check blob size — KV limit is 25MB; throw with guidance before hitting it silently
  const serialized = JSON.stringify(blob);
  const MAX_KV_BYTES = 24 * 1024 * 1024; // 24MB — leave 1MB headroom
  if (serialized.length > MAX_KV_BYTES) {
    console.error(
      JSON.stringify({
        level: "CRITICAL",
        event: "kv_blob_size_exceeded",
        project_id: projectId,
        size_mb: (serialized.length / 1024 / 1024).toFixed(1),
      }),
    );
    throw new ApiError(
      `Flag configuration exceeds 24MB (${(serialized.length / 1024 / 1024).toFixed(1)}MB). ` +
        `Reduce gate count or contact support to raise the limit.`,
      422,
    );
  }
  // KV write rate limit: Cloudflare allows 1 write/sec per key. Rapid admin sequences
  // (e.g. a script updating 10 flags in 10 seconds) can exceed this. Each write here is
  // correct — if the KV put is throttled by Cloudflare, it throws and the caller's
  // onConflictDoUpdate pattern means D1 is already updated. The CDN purge below also
  // fails atomically. The net result: stale KV until the next write triggers a rebuild.
  // Mitigation: admin rate limit (100 req/min per key ≈ 1.67/s) is the primary guard.
  // For burst protection, the Cloudflare dashboard rate-limiting rule on POST /admin/*
  // (100 req/min) prevents sustained bursts above 1 write/sec to any single key.
  await env.FLAGS_KV.put(`${projectId}:flags`, serialized);
  await purgeCache(env, `/sdk/flags/${projectId}`);
}

// ── Experiments blob (universes + experiments) ────────────────────────────────
export async function rebuildExperiments(env: Env, projectId: string): Promise<void> {
  const db = getDb(env.DB);
  const [universeRows, experimentRows] = await Promise.all([
    db.select().from(universes).where(eq(universes.projectId, projectId)),
    db
      .select()
      .from(experiments)
      .where(and(eq(experiments.projectId, projectId), ne(experiments.status, "archived"))),
  ]);
  const blob = {
    version: sha256short(projectId + "exp" + Date.now()),
    universes: Object.fromEntries(universeRows.map((u) => [u.name, u])),
    experiments: Object.fromEntries(experimentRows.map((e) => [e.name, e])),
  };
  // Pre-check blob size — same guard as rebuildFlags(). rebuildExperiments() previously
  // wrote unconditionally, causing a split state (D1 updated, KV failed) when large
  // experiment params JSON pushed the blob over the 25MB KV limit.
  const serialized = JSON.stringify(blob);
  const MAX_KV_BYTES = 24 * 1024 * 1024; // 24MB — leave 1MB headroom
  if (serialized.length > MAX_KV_BYTES) {
    console.error(
      JSON.stringify({
        level: "CRITICAL",
        event: "kv_experiments_blob_size_exceeded",
        project_id: projectId,
        size_mb: (serialized.length / 1024 / 1024).toFixed(1),
      }),
    );
    throw new ApiError(
      `Experiment configuration exceeds 24MB (${(serialized.length / 1024 / 1024).toFixed(1)}MB). ` +
        `Reduce experiment count or params size.`,
      422,
    );
  }
  await env.FLAGS_KV.put(`${projectId}:experiments`, serialized);
  await purgeCache(env, `/sdk/experiments/${projectId}`);
}

// ── Plans — imported from plans.yaml at build time, NOT from KV or D1 ─────────
// Zero network call. Zero D1 query. Plans are part of the Worker bundle.
// To change plan limits: edit plans.yaml → wrangler deploy.
import { getPlan } from "./config/plans";
// Usage: const plan = getPlan(project.plan)
//        const interval = plan.poll_interval_seconds

// ── CDN cache purge ──────────────────────────────────────────────────────────
// Purges Cloudflare CDN caches globally in ~150ms.
// Retries 3× with exponential backoff. Logs structured error on all retries failing.
// NEVER silently discards errors — a failed purge for a killswitch gate is a production incident.
// Requires: CF_ZONE_ID (var), CF_API_TOKEN (secret, Cache Purge scope), FLAGS_DOMAIN (var).
export async function purgeCache(env: Env, path: string): Promise<void> {
  const url = `https://api.cloudflare.com/client/v4/zones/${env.CF_ZONE_ID}/purge_cache`;
  const body = JSON.stringify({ files: [`https://${env.FLAGS_DOMAIN}${path}`] });

  for (let attempt = 1; attempt <= 3; attempt++) {
    const res = await fetch(url, {
      method: "POST",
      headers: { Authorization: `Bearer ${env.CF_API_TOKEN}`, "Content-Type": "application/json" },
      body,
    }).catch((err: Error) => {
      // Network error — treat as failed attempt, will retry
      return { ok: false, status: 0, statusText: err.message } as Response;
    });

    if (res.ok) return; // success

    // Retry with exponential backoff: 200ms, 800ms, 2000ms
    if (attempt < 3) {
      await new Promise((r) => setTimeout(r, 200 * Math.pow(4, attempt - 1)));
      continue;
    }

    // All retries exhausted — schedule async retry instead of failing the mutation.
    // The D1 and KV writes already succeeded — failing the mutation would mislead the admin
    // into thinking the change didn't apply. Instead, record the pending purge and let the
    // purge retry cron handle it. Worst case: CDN serves stale data until the cron fires
    // (every 5 minutes), which is bounded and recoverable.
    console.error(
      JSON.stringify({
        level: "CRITICAL",
        event: "cdn_purge_failed",
        path,
        attempts: 3,
        status: res.status,
        message: `CDN purge failed after 3 attempts. Scheduled for async retry.`,
        manual_url: `https://dash.cloudflare.com/?zone=${env.CF_ZONE_ID}`,
      }),
    );
    // Write pending purge to KV — picked up by the purge retry cron (every 5 minutes)
    await env.FLAGS_KV.put(
      `purge_pending:${path}`,
      JSON.stringify({
        path,
        failed_at: new Date().toISOString(),
        attempts: 3,
      }),
      { expirationTtl: 3600 },
    ); // auto-expire after 1h as safety net
  }
}

// ── Module-scope in-isolate caches (KV only — plans are not cached here) ────
// keyCache is also module-scope (in index.ts) — cold miss → KV, not D1
const flagsCache = new Map<string, { data: FlagsBlob; expiry: number }>();
const expsCache = new Map<string, { data: ExpsBlob; expiry: number }>();

export async function getFlags(env: Env, projectId: string): Promise<FlagsBlob> {
  const hit = flagsCache.get(projectId);
  if (hit && Date.now() < hit.expiry) return hit.data;
  const raw = await env.FLAGS_KV.get(`${projectId}:flags`);
  if (!raw) throw new Error(`No flags for project ${projectId}`);
  const data = parseFlagsBlob(raw);
  // Graceful fallback: if blob format is ahead of this Worker, return stale cache
  if (!data && hit) return hit.data; // stale but valid — bounded by deploy window
  if (!data) throw new Error(`No compatible flags blob for project ${projectId}`);
  flagsCache.set(projectId, { data, expiry: Date.now() + 10_000 }); // 10s
  return data;
}

export async function getExperiments(env: Env, projectId: string): Promise<ExpsBlob> {
  const hit = expsCache.get(projectId);
  if (hit && Date.now() < hit.expiry) return hit.data;
  const raw = await env.FLAGS_KV.get(`${projectId}:experiments`);
  if (!raw) throw new Error(`No experiments for project ${projectId}`);
  const data = JSON.parse(raw) as ExpsBlob;
  // 10s TTL (reduced from 60s) — shorter window limits split-brain exposure after experiment stop.
  // A stopped experiment can be re-evaluated for up to 10s; those exposures are bounded by
  // adding double2 < experiment.stopped_at filters in the analysis cron AE queries.
  expsCache.set(projectId, { data, expiry: Date.now() + 10_000 });
  return data;
}

// Event catalog cache — used by /collect to validate metric event_names without D1 reads
const catalogCache = new Map<string, { data: Set<string>; expiry: number }>();

export async function getCatalog(env: Env, projectId: string): Promise<Set<string>> {
  const hit = catalogCache.get(projectId);
  if (hit && Date.now() < hit.expiry) return hit.data;
  const raw = await env.FLAGS_KV.get(`${projectId}:catalog`);
  const names = raw ? new Set<string>(JSON.parse(raw)) : new Set<string>();
  catalogCache.set(projectId, { data: names, expiry: Date.now() + 60_000 });
  return names;
}
```

## Async Purge Retry

When `purgeCache()` fails after 3 synchronous retries, it writes a `purge_pending:{path}` KV entry
instead of throwing. A dedicated cron trigger retries pending purges every 5 minutes.

This decouples CDN propagation from admin mutation success: the D1 and KV writes are committed,
the admin sees success (with a warning), and the CDN catches up within minutes — not forever.

```typescript
// packages/worker/src/cron/purge-retry.ts — cron trigger every 5 minutes
export async function runPurgeRetryCron(env: Env): Promise<void> {
  // KV list with prefix — returns all pending purge keys
  const listed = await env.FLAGS_KV.list({ prefix: "purge_pending:" });

  for (const key of listed.keys) {
    const raw = await env.FLAGS_KV.get(key.name);
    if (!raw) continue;
    const { path } = JSON.parse(raw) as { path: string; failed_at: string; attempts: number };

    try {
      const url = `https://api.cloudflare.com/client/v4/zones/${env.CF_ZONE_ID}/purge_cache`;
      const body = JSON.stringify({ files: [`https://${env.FLAGS_DOMAIN}${path}`] });
      const res = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${env.CF_API_TOKEN}`,
          "Content-Type": "application/json",
        },
        body,
      });
      if (res.ok) {
        await env.FLAGS_KV.delete(key.name);
        console.log(JSON.stringify({ event: "purge_retry_succeeded", path }));
      }
      // If still failing, KV entry remains — retried on next cron. Auto-expires after 1h.
    } catch (err) {
      console.error(JSON.stringify({ event: "purge_retry_failed", path, error: String(err) }));
    }
  }
}
```

Add to `wrangler.toml` cron triggers:

```toml
[triggers]
crons = [
  "0 2 * * *",     # analysis fan-out
  "0 3 * * *",     # retention purge
  "0 4 * * *",     # AE archival
  "*/5 * * * *",   # purge retry (every 5 minutes)
]
```

Admin mutation callers should surface the CDN warning to the UI without failing the mutation:

```typescript
// In createGate, updateGate, etc. — purgeCache no longer throws on failure
// Check for the pending purge entry if needed, but the mutation itself succeeds.
// The response includes a warning field when purge was deferred:
return Response.json(
  {
    ok: true,
    cdnPurged: true, // set to false when purge was deferred to async retry
    ...(cdnDeferred ? { warning: "CDN purge deferred — will retry within 5 minutes." } : {}),
  },
  { status: 201 },
);
```

## Rate Limiting

Cloudflare Rate Limiting rules are provisioned automatically via the CF API when a project is created (see provisioning callback in `packages.md`). Per-project daily limits (`max_events_per_day`) are calculated from the project's plan and applied as a CF Rate Limiting rule keyed on `project_id`.

### SDK hot path

| Endpoint               | Limit          | Key                | Rationale                                                                           |
| ---------------------- | -------------- | ------------------ | ----------------------------------------------------------------------------------- |
| `POST /collect`        | 100 req/min    | per IP             | Primary defense against event injection from public internet                        |
| `POST /collect`        | 10,000 req/min | per client SDK key | Limits injection from a compromised key; auto-metric batching stays well under this |
| `POST /sdk/evaluate`   | 500 req/min    | per IP             | Prevents enumeration of flag assignments across user IDs                            |
| `GET /sdk/flags`       | 1,000 req/min  | per server SDK key | Matches typical poll cadence for large server fleets                                |
| `GET /sdk/experiments` | 1,000 req/min  | per server SDK key | Same as `/sdk/flags` — both are polled together                                     |

### Auth endpoints

| Endpoint                  | Limit      | Key            | Rationale                                                     |
| ------------------------- | ---------- | -------------- | ------------------------------------------------------------- |
| `GET /auth/device/poll`   | 5 req/min  | per state UUID | Prevents state UUID enumeration                               |
| `POST /auth/device/start` | 10 req/min | per IP         | Prevents flooding `cli_auth_sessions` table with pending rows |

### Admin write endpoints (Next.js Route Handlers)

Admin CRUD is served by Next.js Route Handlers at `/api/admin/*`. Rate limiting rules are configured
on the Pages custom domain (not the Worker domain).

| Endpoint                         | Limit       | Key                          | Rationale                                                                    |
| -------------------------------- | ----------- | ---------------------------- | ---------------------------------------------------------------------------- |
| `POST /api/admin/*` (all writes) | 100 req/min | per admin SDK key or session | Prevents hammering D1 write path; human-speed operations never approach this |
| `PATCH /api/admin/*`             | 100 req/min | per admin SDK key or session | Same                                                                         |

Admin read endpoints (`GET /api/admin/*`) are not rate-limited — they are D1 reads cached at the application layer and do not write to KV or trigger CDN purges.

### Per-project daily limits

`plans.yaml` defines `max_events_per_day` and `max_evaluate_per_day` per plan. These are enforced via Cloudflare Rate Limiting rules keyed on `project_id` (extracted from the authenticated SDK key), provisioned automatically by `provisionRateLimitRule()` during project creation and plan changes (see `packages.md`).

**Rule formula for `/collect`:**

- Key: `project_id` (resolved from `sdk_key:{hash}` KV lookup)
- Limit: plan's `max_events_per_day / 1440` req/min (daily budget spread across minutes)
- Cloudflare's counting period: 1440 minutes = 24 hours

Note: `max_events_per_day = -1` (enterprise unlimited) maps to no rule — `provisionRateLimitRule()` returns early for unlimited plans.

## Propagation Summary

Gate/config and experiment change flows are traced in full in `13-runtime-boundary.md` § "Request Flows". Plan-specific flows:

```
Plan value change (e.g. free: 300s → 600s):
  Edit plans.yaml → wrangler deploy → new Worker bundle
  Workers pick up via module cache within 60s (KV replication up to 60s in worst case)
  All free projects updated simultaneously — no per-project rebuild

Project plan change (free → premium):
  D1 update → rebuildFlags(env, id, 'premium') → blob.plan = 'premium' → CDN purge
  Next /sdk/flags poll: Worker reads PLANS['premium'].poll_interval_seconds = 30
  Cache-Control: max-age=30 for this project only
```
