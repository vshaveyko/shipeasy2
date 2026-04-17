# Scaling Limits & Migration Path

Where the current Cloudflare-based design holds, where it breaks, and how to evolve it.

---

## Current System Ceiling: ~50M DAU

The Cloudflare stack works well up to approximately 50M daily active users.
Above that, Analytics Engine becomes the binding constraint.

| Scale           | DAU         | Status                 | Binding constraint                |
| --------------- | ----------- | ---------------------- | --------------------------------- |
| Startup         | < 1M        | ✅ Excellent           | None                              |
| SMB SaaS        | 1M – 10M    | ✅ Solid               | None                              |
| Mid-market      | 10M – 50M   | ✅ Works               | AE approaching write limit        |
| Large SaaS      | 50M – 100M  | ⚠️ Straining           | AE write ceiling (25M writes/day) |
| Enterprise      | 100M – 500M | ✗ Breaks               | AE + D1 analysis both fail        |
| Instagram-scale | 500M+       | ✗ Fails at every layer | Everything                        |

---

## Instagram-Scale Reference Numbers

Used throughout this document as a stress-test benchmark.

| Metric                       | Value            |
| ---------------------------- | ---------------- |
| Daily active users           | ~500 million     |
| Events/day                   | ~100–500 billion |
| Backend server instances     | ~50,000–100,000  |
| Concurrent experiments       | ~1,000+          |
| Engineers shipping flags/day | thousands        |

---

## Where Each Component Breaks

### Analytics Engine — breaks at ~25M events/day (hard platform ceiling)

Cloudflare AE's documented limit is **25 million writes/day** on the paid plan.

At Instagram scale:

```
500M DAU × 20% in experiments × 15 events/user/day = 1.5 billion writes/day
```

That is 60× the hard ceiling. Even if Cloudflare raised the limit, AE is a
time-series observability store — not designed for petabyte-scale experiment data.

**Breaks at:** ~25M events/day regardless of plan.

---

### Analysis cron — mathematically impossible above ~100K allocated users/experiment

Even with Queue fan-out and server-side AE SQL aggregation, one large experiment:

```
500M DAU × 10% allocation = 50M exposed users
50M rows ÷ 10,000 (AE SQL page size) = 5,000 paginated API requests
5,000 requests × 100ms each = 500 seconds per experiment

1,000 concurrent experiments × 500 seconds = 139 hours to analyze one day's data
```

The Queue consumer has a 15-minute CPU budget. The entire pipeline would need to
complete in 24 hours. At 1,000 experiments this requires ~350 parallel consumers
running continuously — at which point you have reinvented Apache Spark.

**Breaks at:** hundreds of experiments with millions of users each.

---

### D1 (SQLite) — breaks within weeks at experiment-heavy orgs

Results table growth:

```
1,000 experiments × 20 metrics × 3 groups × 365 days = 21.9M rows/year
× ~200 bytes/row = 4.4GB

D1 ceiling: 2GB per database
```

D1 is also single-writer SQLite. Hundreds of engineers shipping flags
simultaneously hits the write throughput ceiling (~1,000 writes/second).

**Breaks at:** ~10M result rows (~50 experiments × 20 metrics × 1 year) or
sustained high admin write throughput.

---

### KV blob — approaches 25MB ceiling above ~10,000 gates

```
5,000 gates × 500 bytes avg   =  2.5MB  ✓ fine
5,000 gates × 2KB with rules  = 10.0MB  ✓ fine
10,000 gates × 2KB            = 20.0MB  ⚠ approaching
15,000 gates × 2KB            = 30.0MB  ✗ exceeds 25MB limit
```

Cloudflare KV has a hard 25MB per-value limit. A 25MB blob also takes longer to
deserialize on every SDK poll, adding latency.

**Breaks at:** ~10,000–15,000 gates with complex targeting rules.

---

### Workers requests — scales well, cost grows linearly

```
100,000 server instances × 1 poll/10s = 10,000 requests/second
CDN absorbs ~95% (max-age=300, stable blobs) → ~500 Worker requests/second
= 43M Worker requests/day × $0.30/million = $13/day = $390/month
```

Workers scale horizontally across Cloudflare's 300+ PoPs. This is not a
technical constraint but a cost one. At Instagram scale the flag delivery cost
is a rounding error on their infra bill.

**Does not break technically.** Cost is linear and manageable.

---

### CDN purge — works, but flag-change velocity needs awareness

At high engineering velocity (many engineers shipping flags simultaneously),
purge API calls can cluster. The Cloudflare Purge API is rate-limited per zone.
This is not a correctness issue (KV is always updated first) but can cause brief
stale-CDN windows if the purge rate limit is hit during a mass deploy.

**Mitigation:** batch purge calls; debounce rapid successive updates to the same flag.

---

## What Instagram Actually Uses (Meta's Real Stack)

Meta built purpose-specific infrastructure for each layer over many years.

| Our layer         | Meta equivalent                                   | Reason                                                                   |
| ----------------- | ------------------------------------------------- | ------------------------------------------------------------------------ |
| Analytics Engine  | **Scribe → Scuba** (real-time) + **Hive** (batch) | Custom log-transport + petabyte columnar store                           |
| D1 results table  | **TAO** + sharded **MySQL**                       | Distributed graph DB for social graph; sharded MySQL for structured data |
| KV rules cache    | **Configerator**                                  | Global distributed config with sub-second propagation to all servers     |
| Analysis cron     | **Dataswarm** (internal Spark)                    | Hundreds of machines doing terabyte joins daily                          |
| Workers evaluate  | Dedicated **C++ evaluation services**             | Microsecond latency at billions of evaluations/day                       |
| Event ingestion   | **Scribe** + **Hive pipeline**                    | Kafka-scale reliable log transport                                       |
| Result dashboards | **Deltoid** + **Scuba**                           | Custom experiment analysis UI on top of Scuba real-time queries          |

Meta's analysis pipeline for a large experiment takes dedicated Dataswarm clusters
hours to run, producing results that flow into Scuba for real-time dashboards and
Hive for archival analysis. This was built by hundreds of engineers over many years.

---

## Migration Path: Staged Evolution

The API surface (SDKs, CLI, admin UI) stays stable across all stages.
Only the backend infrastructure changes.

### Stage 1 — Cloudflare stack (current) — up to ~50M DAU

```
Events       → Analytics Engine (25M writes/day limit)
Config/rules → D1 + KV
Analysis     → Cloudflare Queue + Workers cron
Results      → D1 experiment_results
```

Cost: $5–$276/month depending on scale (see cost.md).

---

### Stage 2 — Hybrid: replace event pipeline — 50M–500M DAU

**Trigger:** AE write volume approaching 25M/day, or experiment population
exceeding ~100K allocated users per experiment.

**Changes:**

- Replace AE → **Kafka** → **BigQuery / Snowflake / Databricks**
- Replace analysis cron → **scheduled Spark/dbt job** writing results back to D1
- Keep D1 for config, catalog, analysis results (still low write volume)
- Keep KV for rules cache (still fine unless gate count > 10K)
- Keep Workers for flag evaluation (still scales horizontally)

The SDKs call the same `/collect` endpoint. The Worker forwards events to Kafka
instead of AE. This is a backend swap with no client-facing changes.

```
Events       → POST /collect → Worker → Kafka → BigQuery/Snowflake
Config/rules → D1 + KV (unchanged)
Analysis     → Spark/dbt job (scheduled or triggered) → D1 results
Dashboards   → read from D1 results (unchanged)
```

**Cost driver:** BigQuery/Snowflake at 1B events/day + Kafka cluster.
Rough estimate: $500–$5,000/month depending on query frequency.

---

### Stage 3 — Full rewrite of data layer — 500M+ DAU

**Trigger:** D1 approaching 2GB, admin write throughput saturating SQLite,
gate count approaching KV blob limits, analysis taking hours even in Spark.

**Changes:**

- Replace D1 → **Postgres cluster** (RDS, Cloud SQL, or CockroachDB/Spanner for geo-distribution)
- Replace KV → **dedicated config service** (Redis Cluster, or Configerator-like CDN-pushed config)
- Replace Workers evaluate → **dedicated evaluation fleet** (Go/Rust services, co-located with app servers)
- Add **real-time exposure monitoring** (streaming pipeline: Kafka → Flink → time-series DB)
- Analysis stays as Spark but moves to continuous streaming for large experiments

```
Events       → Scribe/Kafka → data warehouse
Config/rules → Postgres + Redis Cluster / dedicated config service
Evaluation   → dedicated evaluation services (not Cloudflare Workers)
Analysis     → Spark streaming + batch → Postgres results
Dashboards   → dedicated analytics UI (Grafana / internal tool)
```

This is effectively a ground-up rewrite of the backend. SDKs may need new
endpoints but the core API contract (getFlag, getExperiment, track) stays stable.

---

See `cost.md` for cost comparison against commercial alternatives at each scale tier.

## Key Design Decisions That Make Migration Easier

The current design was made with this migration path in mind:

1. **Events are fire-and-forget** — `/collect` can switch from AE to Kafka with no
   SDK changes. The Worker is the only thing that changes.

2. **Analysis is decoupled from delivery** — the cron reads from the event store and
   writes to D1 results. Swapping AE → BigQuery only requires changing the cron's
   read path; the write path (D1) and the dashboard read path are unchanged.

3. **Evaluation is stateless** — `evalGate()` and `evalExperiment()` are pure
   functions with no external dependencies. Moving from Workers to a dedicated
   evaluation service only requires wrapping them in a different HTTP server.

4. **SDK API is stable** — `getFlag()`, `getExperiment()`, `track()` don't change
   across stages. Customers never need to update their instrumentation code.

5. **Plans are in YAML** — adding new plan tiers for enterprise or adjusting limits
   requires no migration. Edit `plans.yaml`, redeploy.

---

## Summary

Build the Cloudflare stack. It handles 99% of real-world SaaS use cases at
10–50× lower cost than commercial alternatives. When you hit the AE ceiling
(~25M events/day, typically at 50M+ DAU), swap the event pipeline to Kafka +
BigQuery — a backend change with no customer impact. Everything else can stay
on Cloudflare for much longer. A full Meta-style infrastructure rewrite only
makes sense above ~500M DAU, which is a problem most companies would celebrate
having.
