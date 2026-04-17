# Deployment, Cost & Limitations

## wrangler.toml

```toml
name = "flags-worker"
main = "src/index.ts"
compatibility_date = "2025-01-01"

[vars]
CF_ZONE_ID   = "your-zone-id"       # Cloudflare zone for flags.yourdomain.com
FLAGS_DOMAIN = "flags.yourdomain.com"
CRONITOR_HEARTBEAT_URL = ""  # optional: set to Cronitor/BetterUptime check-in URL for dead-man's switch
# Secrets (set via wrangler secret put):
#   CF_API_TOKEN  — Cache Purge scope only, no other permissions needed

[[d1_databases]]
binding = "DB"
database_name = "flags-db"
database_id   = "<id>"

[[kv_namespaces]]
binding = "FLAGS_KV"
id      = "<id>"

[[analytics_engine_datasets]]
binding = "EXPOSURES"
dataset = "flags_exposures"

[[analytics_engine_datasets]]
binding = "METRIC_EVENTS"
dataset = "flags_metric_events"

[[queues.producers]]
binding  = "ANALYSIS_QUEUE"
queue    = "experiment-analysis"

[[queues.consumers]]
queue              = "experiment-analysis"
max_batch_size     = 1
max_batch_timeout  = 0
max_retries        = 3
dead_letter_queue  = "experiment-analysis-dlq"

[[queues.consumers]]
queue           = "experiment-analysis-dlq"
max_batch_size  = 10
max_retries     = 1      # One retry for D1 write failures before ack

[[kv_namespaces]]
binding = "CLI_TOKEN_KV"
id      = "<id>"
# This namespace stores CLI auth tokens temporarily (5-minute TTL).
# defaultTtl enforced at write time via expirationTtl: 300 on KV.put().
# Separate from FLAGS_KV — different security boundary.

[[r2_buckets]]
binding       = "EVENTS_R2"
bucket_name   = "flaglab-events"
# Stores daily NDJSON archives of AE exposure + metric events.
# Key format: events/{project_id}/{YYYY-MM-DD}/exposures.ndjson
#             events/{project_id}/{YYYY-MM-DD}/metrics.ndjson
# Written by the archival cron (04:00 UTC). Read by the analysis pipeline
# when experiment.started_at is older than the AE retention window.
# No egress fees. Storage: ~$0.015/GB/month.

[triggers]
crons = [
  "0 2 * * *",   # analysis fan-out
  "0 3 * * *",   # retention purge: experiment_results, cli_auth_sessions, CUPED baselines
  "0 4 * * *",   # AE archival: export yesterday's events to R2
  "*/5 * * * *", # purge retry: re-attempt failed CDN purges (see 02-kv-cache.md § Async Purge Retry)
]
```

No `[[durable_objects]]`.

The Pages project must declare bindings for D1, KV, and a Service Binding to `flags-worker`
(retained only for CLI auth relay — `/cli-auth/complete` calls Worker's `/auth/device/complete`).

Configure in the Cloudflare Pages project settings:

- **D1 Database**: binding `DB`, database `flags-db`
- **KV Namespace**: binding `FLAGS_KV`
- **Service Binding**: name `FLAGS_WORKER`, service `flags-worker` (CLI auth relay only)

Admin CRUD runs directly in Next.js Server Actions and Route Handlers — no proxy to Worker.

## Schema Migration Rules

D1 is SQLite. `ALTER TABLE ADD COLUMN` requires either a DEFAULT value or nullable. Violations of these rules cause `wrangler d1 migrations apply` to abort:

1. **New columns on existing tables must have a DEFAULT.** If a column must be NOT NULL long-term, add it nullable first, backfill, then add a CHECK constraint in a separate migration.
2. **Never rename or drop a column while the old Worker is live.** Add the new column, dual-write, redeploy to remove old reads, then drop in a third migration.
3. **Run migration before Worker deploy**, never after. Old Worker code reading new additive schema is safe; new Worker code reading old schema is not.
4. **Verify current migration state before deploying:**
   ```bash
   wrangler d1 execute flags-db --command "SELECT * FROM __drizzle_migrations ORDER BY id DESC LIMIT 5"
   ```

## CF_API_TOKEN Rotation Procedure

Rotating the CDN purge token without causing a stale-cache window:

1. Create the new token in Cloudflare dashboard (Cache Purge scope on the zone).
2. `wrangler secret put CF_API_TOKEN` with the new value.
3. **Wait 60 seconds** — warm isolates recycle within ~30s; this ensures all are using the new token before the old one is revoked.
4. Revoke the old token in the Cloudflare dashboard.
5. Trigger one gate change to confirm CDN purge succeeds with the new token.

Do NOT revoke the old token before waiting 60s — the `purgeCache()` retry budget is ~3s total, shorter than the isolate recycling window.

## KV Binding Validation

Bad namespace IDs in `wrangler.toml` succeed at deploy time but fail silently at runtime. Validate before deploying:

```bash
wrangler kv:namespace list  # confirm FLAGS_KV and CLI_TOKEN_KV IDs match wrangler.toml
```

## Rate Limiting Setup

**Global rules** (per-IP, per-SDK-key) must be configured in the Cloudflare dashboard before going to production. **Per-project rules** are provisioned automatically via the CF API during project creation (see `packages.md` § `provisionRateLimitRule()`). Critical global rules that must exist on day 1:

| Priority | Rule                                                  | Why                            |
| -------- | ----------------------------------------------------- | ------------------------------ |
| 1        | `POST /collect` — 100 req/min per IP                  | Event injection defense        |
| 2        | `POST /collect` — 10,000 req/min per client SDK key   | Compromised-key containment    |
| 3        | `GET /auth/device/poll` — 5 req/min per state UUID    | State enumeration prevention   |
| 4        | `POST /admin/*` — 100 req/min per admin SDK key       | D1 write protection            |
| 5        | `GET /sdk/experiments` — 1,000 req/min per server key | Same as `/sdk/flags`           |
| 6        | `POST /auth/device/start` — 10 req/min per IP         | Session table flood prevention |

Per-project daily limits (`max_events_per_day`) are provisioned automatically by `provisionRateLimitRule()` in the Auth.js provisioning callback (see `packages.md`). Rules are also updated on plan changes via the billing flow.

## Deployment Order

1. `wrangler d1 create flags-db` → run schema migration (`01-schema.md`)
2. `wrangler kv:namespace create FLAGS_KV`
3. `wrangler kv:namespace create CLI_TOKEN_KV`
4. `wrangler queues create experiment-analysis`
5. `wrangler queues create experiment-analysis-dlq`
   5a. `wrangler r2 bucket create flaglab-events`
6. Add custom domain `flags.yourdomain.com` to the Worker (required for CDN purge)
7. `wrangler secret put CF_API_TOKEN` (Cache Purge scope on the zone)
8. Configure rate limiting rules in Cloudflare dashboard (see Rate Limiting Setup above)
9. `wrangler deploy`
10. Deploy Next.js UI to CF Pages with D1, KV, Service Binding, and env vars (see below)
11. First project is created automatically on first sign-in (Auth.js jwt callback provisions inline)
12. Verify rate limiting rules are active: attempt >100 req/min to `/collect` from a single IP and confirm 429 responses
13. Verify:

- `curl -H "X-SDK-Key: k_server" https://flags.yourdomain.com/sdk/flags`
  → `Cache-Control: public, max-age=300` (free plan), `X-Poll-Interval: 300`
- Change a gate → CDN purge fires → re-fetch shows updated ETag
- `curl -X POST -H "X-SDK-Key: k_client" .../sdk/evaluate -d '{"user":{"user_id":"u1"}}'`
- Send test events → `wrangler cron trigger flags-worker` → verify results in D1

See `cost.md` for full pricing breakdown and tier estimates.

## Implementation Sequencing

**Phase 1 — Shared core + infrastructure (2 days)**

1. Create `packages/core/` with Drizzle schema, scopedDb, plans, KV helpers, eval logic, Zod schemas
2. D1 schema migration + KV namespace + custom domain setup
3. Worker: SDK key auth middleware + `/sdk/flags` + `/sdk/experiments` + `/sdk/evaluate` endpoints
4. Next.js: Auth.js config with inline provisioning, `authenticateAdmin()`
5. Next.js: Admin CRUD Server Actions + Route Handlers for gates/configs/experiments

**Phase 2 — SDK (1 day)** 6. Server SDK: `FlagsClient` with polling, `initOnce()` for serverless 7. Client SDK: `FlagsClientBrowser` with `identify()` + bootstrap support 8. EventBuffer + auto-exposure logging

**Phase 3 — Events pipeline (2 days)** 9. Next.js: Event catalog CRUD (Server Actions + Route Handlers) + auto-discovery in Worker `/collect` 10. Next.js: Metric library CRUD 11. Next.js: Experiment ↔ metrics join (role selector in UI)

**Phase 4 — Analysis (2 days)** 12. Worker: AE SQL query helper 13. Worker: Analysis cron → Queue fan-out → per-project analysis (Welch t-test, CUPED) 14. Worker: Baseline freeze job (CUPED prerequisite)
**Required before production:** migrate cron trigger to Queue-based dispatch
(`ANALYSIS_QUEUE`) so individual experiment analysis jobs can be retried
independently and failures are routed to `experiment-analysis-dlq` instead
of silently dropping results.

**Phase 5 — Dashboard (3 days)** 15. Next.js: Route Handlers for results + timeseries (read from experiment_results D1) 16. Results page: CI chart, verdict box, time series, guardrail summary 17. Experiment creation form with quick setup profiles 18. Universe management + project settings pages

## DLQ Replay Runbook

When `analysis_failures` shows unresolved rows after fixing the root cause, re-enqueue manually — don't wait for the next 02:00 UTC cron:

```bash
# 1. Identify failed projects
wrangler d1 execute flags-db --command \
  "SELECT project_id, failed_at FROM analysis_failures WHERE resolved_at IS NULL"

# 2. Fix and deploy the Worker fix
wrangler deploy

# 3. Re-enqueue each failed project (repeat per project_id)
wrangler queues publish experiment-analysis \
  --message '{"project_id":"<id>"}'

# 4. Confirm resolution (resolved_at populated after successful run)
wrangler d1 execute flags-db --command \
  "SELECT * FROM analysis_failures WHERE resolved_at IS NOT NULL ORDER BY resolved_at DESC LIMIT 10"
```

## Monitoring

| Signal                          | Mechanism                                                        | Alert threshold                  |
| ------------------------------- | ---------------------------------------------------------------- | -------------------------------- |
| Cron ran successfully           | `system_health` D1 table via `GET /api/admin/system/health`      | `last_fired_at` > 26h ago        |
| Analysis DLQ received a message | Email via Resend to `ALERT_EMAIL` + `analysis_failures` D1 table | Any unresolved entry in last 26h |
| CDN purge failed                | Structured CRITICAL log in `purgeCache()`                        | Any occurrence                   |
| KV blob approaching limit       | `GET /api/admin/projects/:id/storage` endpoint                   | >80% of 25MB                     |
| Experiment results stale        | Dashboard reads `analysis_failures` and last `ds`                | No update in >26h                |

External dead man's switch (optional): set `CRONITOR_HEARTBEAT_URL` env var.
The cron sends a check-in after successful fan-out; Cronitor alerts if absent for >2h.

## Remaining Limitations

| Limitation                                                       | Accepted because                                                                                                                                                                                                                |
| ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AE SQL eventually consistent (~1 min)                            | Fine for daily analysis batch; AE queries use `analysisFence = analysisStartTs - 2min` as stable read horizon                                                                                                                   |
| KV global replication up to 60s; CDN purge acknowledgment ~150ms | Accepted — all use cases tolerate 10–60s propagation. No SSE. See `02-kv-cache.md` § "Propagation SLA".                                                                                                                         |
| AE retention window (90–540 days per plan)                       | R2 archival cron (04:00 UTC) exports all AE events daily to `flaglab-events` R2 bucket. Analysis reads R2 for dates older than `ae_retention_days`. Experiments of any duration are safe. See `06-analysis.md` § "R2 Archival". |
| CUPED baseline writes chunked at 100/batch                       | D1 batch limit is 100 statements; large projects require multiple batch calls                                                                                                                                                   |
| CUPED overlap < 50% falls back to plain Welch                    | Logged with `cuped_overlap_pct`; CUPED on biased sample is worse than no CUPED                                                                                                                                                  |
| expsCache 10s TTL (was 60s)                                      | Narrower split-brain window after experiment stop; small KV read cost increase                                                                                                                                                  |
| Retention metric uses elapsed-ms not calendar days               | Documented in metric creation UI; consistent internal semantics                                                                                                                                                                 |
| Custom domain required for CDN purge                             | Standard practice for production Workers                                                                                                                                                                                        |
| AE no cross-dataset JOINs                                        | Fetch both datasets separately and join aggregated results in-memory in cron                                                                                                                                                    |
| D1 write contention between analysis cron and admin mutations    | Analysis runs at 02:00 UTC (low admin traffic); both Worker cron and Next.js Server Actions write to the same D1 — mid-day triggered analysis is rare                                                                           |
| AE fire-and-forget exposure writes (free/pro)                    | Detection via `ae_sample_drop_warning` (20% threshold). Accepted SLA for non-premium tiers. See Future Plans below.                                                                                                             |
| Client SDK key enables event injection                           | Rate limited (100 req/min/IP, 10K req/min/key). Documented as lower-integrity guarantee. See Security Notes below.                                                                                                              |

## Future Plans

Items deferred from the design review, to be evaluated when scale or customer demand warrants:

### Queue-backed exposure writes (all plans)

Losing even 2% of exposure events causes SRM (Sample Ratio Mismatch), which invalidates the entire experiment. Currently, exposure events use fire-and-forget AE writes on free/pro plans. Consider routing exposure events (not metric events) through `COLLECT_QUEUE` on all plans for retry semantics. Metric events can stay fire-and-forget — missing a few metric events degrades precision but doesn't invalidate the experiment.

**Cost at 1M DAU:** ~$15/month (36M queue ops × $0.40/million). Revisit when the first customer reports SRM caused by AE ingestion loss.

### R2 archival for audit_log

`experiment_results` already archives to R2 after `results_final_archive_days`. The `audit_log` table grows unbounded (one row per admin mutation, with JSON payload). At 10 mutations/day across 500 projects = 1.8M rows/year. Add an identical R2 archival pattern: archive audit_log rows older than `audit_log_retention_days` to R2, then delete from D1. Dashboard reads archived audit entries from R2 via `GET /api/admin/audit?archived=true`.

### R2 archival for user_metric_baseline

CUPED baselines are purged for projects with no running experiments (retention cron). But active projects accumulate baseline rows proportional to unique users × metrics. At 100K users × 10 metrics = 1M rows per project. Add a per-project row cap (e.g., 500K users) as a plan limit, or archive old baselines when experiments stop.

## Security Notes

### Client SDK key integrity model

Client SDK keys are embedded in browser JavaScript and are public. An attacker with a client key can:

- Call `/collect` with valid event names and inflated values to bias `sum`/`avg` metrics
- Fabricate fake `user_id` values to inflate group sizes asymmetrically
- Replay valid `/collect` requests (no nonce or timestamp validation)

**Accepted because:** Per-IP (100 req/min) and per-key (10K req/min) rate limits bound the injection volume. At 10K req/min, an attacker can inject at most 14.4M events/day — detectable by the `ae_sample_drop_warning` and SRM checks in the analysis cron.

**Recommendation for customers running high-stakes experiments:** Use server-side SDK keys for exposure and metric event logging. Server keys are never exposed to browsers. Document this in the customer-facing guide (`stats-guide-customers.md`).
