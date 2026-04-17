# Infrastructure Cost Model

_Last updated: 2026-04-14. Verify against https://developers.cloudflare.com/workers/platform/pricing/ before budgeting._

---

## Base Plan

**Workers Paid — $5/month** unlocks paid-tier limits on all Cloudflare products below.
All costs below are in addition to this $5 base.

---

## Pricing Reference (Cloudflare, mid-2025)

| Product                 | Included     | Overage           |
| ----------------------- | ------------ | ----------------- |
| Workers requests        | 10M/month    | $0.30/million     |
| Analytics Engine writes | 10M/month    | $0.25/million     |
| AE query rows scanned   | —            | $1.00/billion     |
| KV reads                | 10M/month    | $0.50/million     |
| KV writes               | 1M/month     | $5.00/million     |
| D1 row reads            | 25B/month    | $0.001/million    |
| D1 row writes           | 50M/month    | $1.00/million     |
| D1 storage              | 5GB          | $0.75/GB/month    |
| Cloudflare Queues       | 1M ops/month | $0.40/million ops |
| R2 storage              | 10GB         | $0.015/GB/month   |
| R2 writes (Class A)     | 1M/month     | $4.50/million     |
| CDN purge API           | unlimited    | Free              |
| Cron Triggers           | unlimited    | Free              |
| Pages (static)          | unlimited    | Free              |

---

## Session Assumptions

| Signal                                | Count per session                                                                                                   |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `/sdk/evaluate` calls                 | 1                                                                                                                   |
| `/collect` calls (batched)            | 1                                                                                                                   |
| AE writes (exposures + metric events) | 12 (base); +5–6 for experiment participants with auto-guardrails enabled — see § Auto-Guardrail Metrics Cost Impact |
| `/sdk/flags` served from CDN          | ~0 Worker hits (max-age=300 + purge)                                                                                |

Server SDK flag polling uses `Cache-Control: max-age=300`. Most polls return 304
from CDN edge — the Worker only sees a request on CDN expiry or after a purge event.
At 10 flag changes/day with 10 PoPs: ~300 Worker requests/day from polling, negligible.

---

## Three-Tier Cost Breakdown

### Tier 1 — Starter (10K DAU, 5 server SDK instances, 2 projects)

| Component                                             | Monthly volume       | Included | Extra  | Cost          |
| ----------------------------------------------------- | -------------------- | -------- | ------ | ------------- |
| Workers base                                          | —                    | —        | —      | **$5.00**     |
| Workers requests (`/evaluate` + `/collect`)           | 600K + 600K = 1.2M   | 10M      | 0      | $0            |
| AE writes                                             | 10K × 30 × 12 = 3.6M | 10M      | 0      | $0            |
| AE query scans (cron: 2 projects × 2 exp × 3 metrics) | ~60M rows            | —        | ~$0.06 | $0            |
| KV reads (module-scope cached)                        | ~100K                | 10M      | 0      | $0            |
| Queue ops (cron fan-out + DLQ)                        | varies               | 1M       | 0      | $0            |
| D1 reads/writes                                       | ~50K                 | 25B/50M  | 0      | $0            |
| CLI_TOKEN_KV writes                                   | ~50 (login events)   | 1M       | 0      | $0            |
| **Total**                                             |                      |          |        | **~$5/month** |

---

### Tier 2 — Growth (100K DAU, 20 server SDK instances, 10 projects)

| Component                                                         | Monthly volume       | Included | Extra | Cost           |
| ----------------------------------------------------------------- | -------------------- | -------- | ----- | -------------- |
| Workers base                                                      | —                    | —        | —     | **$5.00**      |
| Workers requests                                                  | 6M + 6M = 12M        | 10M      | 2M    | **$0.60**      |
| AE writes                                                         | 100K × 30 × 12 = 36M | 10M      | 26M   | **$6.50**      |
| AE query scans (10 projects × 5 exp × 3 metrics × 100K rows × 30) | ~4.5B rows           | —        | 4.5   | **$4.50**      |
| KV reads                                                          | ~600K                | 10M      | 0     | $0             |
| Queue ops (cron fan-out + DLQ)                                    | varies               | 1M       | 0     | $0             |
| D1                                                                | ~500K rows           | 25B      | 0     | $0             |
| **Total**                                                         |                      |          |       | **~$17/month** |

---

### Tier 3 — Scale (1M DAU, 100 server SDK instances, 20 projects)

| Component                                                          | Monthly volume      | Included | Extra | Cost            |
| ------------------------------------------------------------------ | ------------------- | -------- | ----- | --------------- |
| Workers base                                                       | —                   | —        | —     | **$5.00**       |
| Workers requests                                                   | 60M + 60M = 120M    | 10M      | 110M  | **$33.00**      |
| AE writes                                                          | 1M × 30 × 12 = 360M | 10M      | 350M  | **$87.50**      |
| AE query scans (20 projects × 10 exp × 5 metrics × 500K rows × 30) | ~150B rows          | —        | 150   | **$150.00**     |
| KV reads (module-scope cached, low miss rate)                      | ~6M                 | 10M      | 0     | $0              |
| Queue ops (cron fan-out + DLQ)                                     | varies              | 1M       | 0     | $0              |
| D1 writes (cron results: 20×10×3×30=18K rows)                      | ~18K                | 50M      | 0     | $0              |
| **Total**                                                          |                     |          |       | **~$276/month** |

> **Note:** AE query scans at scale (150B rows/month) is the dominant cost driver.
> The Queue-based fan-out cron runs each project's analysis in parallel, but total
> AE rows scanned scales with projects × experiments × users.
> Mitigation: push more aggregation into AE SQL (already done), reducing scan count.

Queue operations at analysis scale: 20 projects × 30 days × 2 ops (produce + consume) = 1,200 ops/month — well within the 1M included.

---

## Unit Economics

| Tier    | DAU  | Monthly cost | Cost per 1K users |
| ------- | ---- | ------------ | ----------------- |
| Starter | 10K  | ~$5          | $0.50             |
| Growth  | 100K | ~$17         | $0.17             |
| Scale   | 1M   | ~$276        | $0.28             |

Costs are not strictly linear because AE query scans grow with experiments × users × projects,
not just users.

---

## Cost by Component at Scale (1M DAU)

```
Workers requests  $33   ████████░░░░░░░░░░░░░░░░░░░  12%
AE writes         $87   █████████████████░░░░░░░░░░░  32%
AE query scans   $150   ██████████████████████████████  54%
Everything else    $6   █░░░░░░░░░░░░░░░░░░░░░░░░░░░   2%
─────────────────────
Total            $276
```

AE query scans dominate at scale because the analysis cron reads all exposures and
metric events per experiment. Mitigations:

1. **Push aggregation into AE SQL** (already designed) — reduces rows scanned per query
   from O(users) to O(users) but with smaller result payload. The key win is not having
   to paginate multi-million-row result sets.

2. **Archive old experiments to R2** — experiments stopped > 90 days need not be
   re-scanned daily. Archive their AE data to R2 and only query AE for running experiments.

3. **Reduce cron frequency for small experiments** — if an experiment has < 100 users,
   skip the daily cron and run weekly instead.

---

## R2 Archival Cost (always on, all plans)

R2 archival runs daily for every project. One NDJSON file per dataset per project per day
= 2 R2 write ops/project/day. Write costs are negligible (within the 1M/month free tier
at any realistic project count). Storage is the only real cost.

Average event size in NDJSON: ~140 bytes. At 1 year of retention:

| DAU  | Events/month | Raw/month | Stored after 1yr | **R2 cost/month**  |
| ---- | ------------ | --------- | ---------------- | ------------------ |
| 1K   | 360K         | 50MB      | 600MB            | **$0** (free tier) |
| 10K  | 3.6M         | 504MB     | 6GB              | **$0** (free tier) |
| 100K | 36M          | 5GB       | 60GB             | **~$0.75**         |
| 1M   | 360M         | 50GB      | 600GB            | **~$7.50**         |
| 10M  | 3.6B         | 500GB     | 6TB              | **~$75**           |
| 50M  | 18B          | 2.5TB     | 30TB             | **~$375**          |

R2 write ops at daily batching: 2 writes/project/day. For 100 projects: 6,000/month — well within the 1M free tier. Write cost is $0 at all realistic scales.

---

## Comparison to Commercial Alternatives

| Platform               | 10K users/month | 100K users/month | 1M users/month |
| ---------------------- | --------------- | ---------------- | -------------- |
| **This platform**      | **~$5**         | **~$17**         | **~$276**      |
| LaunchDarkly (Starter) | ~$150           | ~$750            | ~$5,000+       |
| Statsig (Pro)          | ~$100           | ~$500            | ~$2,000+       |
| Eppo                   | Custom (~$500+) | Custom           | Custom         |
| GrowthBook Cloud       | ~$0 (free tier) | ~$200            | Custom         |

This platform is 10–50× cheaper than commercial alternatives at all tiers.
The cost difference compounds with scale — commercial platforms charge per-seat
or per-MTU (monthly tracked user), this platform charges per API request and AE write.

---

## Auto-Guardrail Metrics Cost Impact

Auto-collected browser metrics (LCP, INP, CLS, JS error rate) add AE writes and AE query scan cost. The impact depends entirely on one design decision: **gate to experiment participants only**.

**With gating** (SDK only emits auto-metric events when user is in ≥1 active experiment):

| Tier    | DAU  | Extra AE writes/month | Extra AE query scan | Added cost              |
| ------- | ---- | --------------------- | ------------------- | ----------------------- |
| Starter | 10K  | ~0.2M                 | ~2B rows            | ~$0 (within free tiers) |
| Growth  | 100K | ~2M                   | ~20B rows           | ~$2/month               |
| Scale   | 1M   | ~19M                  | ~150B rows          | ~$165/month             |

At Scale, AE writes increase from 360M → 379M (+5%) and query scans double from ~150B → ~300B rows/month (+$150). The $165/month total is a 60% increase on the base $276 — but buys automatic performance and error monitoring on every experiment.

**Without gating** (all users emit auto-metrics regardless of experiment participation): ~10× more AE writes and query scans at 10% allocation. At Scale this adds ~$1,550/month — not viable. The AE write ceiling (25M/day) becomes a constraint at ~1.3M DAU without gating vs. ~13M DAU with gating.

**Implementation:** Three lines in the SDK's `visibilitychange` handler:

```typescript
if (this.exposureSeen.size === 0) return; // no experiments → skip auto-metrics
pushMetric("__auto_lcp", lastLcp);
```

See `auto-guardrails.md` for the full design.

---

## Cost Optimization Levers

| Lever                                        | Saves                          | How                                                         |
| -------------------------------------------- | ------------------------------ | ----------------------------------------------------------- |
| Push aggregation into AE SQL                 | 50–80% AE query cost           | Already designed — reduces rows scanned                     |
| Gate auto-metrics to experiment participants | 90% AE writes + query scans    | SDK skips auto-metric events when `exposureSeen.size === 0` |
| Batch R2 archival (1 file/project/day)       | 99%+ R2 write cost             | Don't write per-event, write daily NDJSON file              |
| Module-scope KV cache                        | ~90% KV reads                  | Already implemented (10s/60s TTL)                           |
| CDN purge + max-age=300                      | ~95% flag-poll Worker requests | Already implemented                                         |
| Skip cron for inactive experiments           | Proportional AE scan savings   | Add `last_exposure_at` guard in cron                        |
| Archive stopped experiments > 30 days        | Proportional AE scan savings   | Move to R2 after stopping                                   |

---

## Monitoring

Monitoring signals and mechanisms are in `08-deployment.md` § "Monitoring". Effective monitoring overhead is **$0** — Cronitor free tier + AE heartbeat events (within the 10M included writes).

---

## Cost Impact of Critical/High Bug Fixes

All fixes below have negligible cost impact. The largest driver (H2) actually eliminates a risk
rather than adding cost.

| Fix                                                              | Change                                                     | Cost impact                                                                                                                                                                                                    |
| ---------------------------------------------------------------- | ---------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **C1 — CORS middleware**                                         | Adds `OPTIONS` preflight handler to Hono                   | +~0.1M Worker requests/month per tier (preflight caching at 24h reduces repeat preflights). ~$0.03/month at Scale.                                                                                             |
| **C2 — per-user post-exposure filter in `computeAggregate`**     | In-memory filter before aggregation                        | $0 — no extra AE queries, no extra D1 reads                                                                                                                                                                    |
| **C3 — AE sample drop detection in analysis cron**               | +1 D1 read per experiment per day (previous day's n)       | ~$0 — within D1 free tier                                                                                                                                                                                      |
| **C3 — Durable ingestion (Premium/Enterprise)**                  | COLLECT_QUEUE: 360M ops/month at 1M DAU                    | +$143.60/month at Scale — only on Premium+ plans where per-project pricing absorbs it                                                                                                                          |
| **C4 — R2 metric events fallback**                               | R2 reads for long-running experiments (>ae_retention_days) | $0 — R2 reads are $0.36/million; this path only activates for rare long-running experiments and reads a handful of NDJSON files per run                                                                        |
| **H1 — `reanalyze` is_final scoped to stopped experiments**      | Logic change only                                          | $0                                                                                                                                                                                                             |
| **H2 — `is_final` row archival to R2 (prevents D1 2GB ceiling)** | +R2 writes for archived result rows; -D1 storage           | **Saves** D1 storage overage risk. R2 storage for result rows at Scale: ~22MB/year (20 exp × 5 metrics × 3 groups × 200 bytes × 365 days). R2 cost: ~$0/month. Eliminates the D1 2GB ceiling hit at ~8 months. |
| **H3 — DLQ consumer max_retries=1**                              | +1 Queue retry op per DLQ failure                          | $0 — only fires on rare failure paths                                                                                                                                                                          |
| **H4+H6 — block immutable field changes on running experiments** | 1 extra D1 read per PATCH (already cached by projectCache) | $0                                                                                                                                                                                                             |
| **H5 — CUPED contamination guard on restart**                    | +1 D1 read at experiment start (experiment row)            | $0 — single row read                                                                                                                                                                                           |
| **H7 — hash vector CI harness**                                  | Build-time only                                            | $0                                                                                                                                                                                                             |
| **H8 — `rewrite-blob.mjs`**                                      | Rollback tooling                                           | $0                                                                                                                                                                                                             |
| **`rebuildExperiments()` size pre-check**                        | Size check before KV write (already computed JSON)         | $0                                                                                                                                                                                                             |
| **Archival cron failure alerting**                               | +1 Resend email per failure event                          | $0 — only on failure paths                                                                                                                                                                                     |

### Total additional monthly cost

| Tier              | Before | After    | Delta      |
| ----------------- | ------ | -------- | ---------- |
| Starter (10K DAU) | ~$5    | ~$5      | **$0**     |
| Growth (100K DAU) | ~$17   | ~$17     | **$0**     |
| Scale (1M DAU)    | ~$276  | ~$276.03 | **+$0.03** |

All fixes are structurally free. The dominant cost driver remains AE query scans (54% of Scale tier cost), unchanged by any fix. The H2 fix (D1 result archival to R2) eliminates a hard ceiling risk at zero additional cost.
