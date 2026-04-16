# Experiment Platform — Feature Flags, Config, A/B Experiments

Self-contained GK + SV + QE + analysis platform deployed on Cloudflare + Next.js.

## Files

| File | Contents |
|---|---|
| `01-schema.md` | D1 database schema — all tables |
| `02-kv-cache.md` | KV cache design, blob split, CDN purge strategy |
| `03-worker-endpoints.md` | File structure (core + worker + ui), auth, admin + SDK endpoints |
| `04-evaluation.md` | Gate/experiment evaluation logic, server SDK |
| `05-events-sdk.md` | Event catalog, SDK instrumentation, AE field layout |
| `06-analysis.md` | Metric aggregation types, analysis cron, stats |
| `stats-decisions.md` | Every statistical decision: what it solves, what it risks, real-world examples, defaults |
| `stats-guide-customers.md` | Customer-facing guide: how experiments work, what the verdicts mean, launch checklist |
| `auto-guardrails.md` | Auto-collected browser guardrail metrics — design, tiers, statistics, cost, implementation |
| `07-dashboard.md` | Results dashboard, experiment creation UI |
| `08-deployment.md` | wrangler.toml, deployment order, limitations |
| `plans.yaml` | Platform plan config — all resource limits and feature gates per tier |
| `packages.md` | Monorepo structure, Auth.js integration, all package.json files |
| `scaling.md` | Scaling limits, migration path, Instagram-scale breakdown |
| `cost.md` | Infrastructure cost model — pricing, tier breakdowns, optimizations |
| `10-mcp-server.md` | MCP server, cross-language SDK templates |
| `11-skills.md` | AI skills (setup, experiment, analyze, cleanup) |
| `12-sdk-reference.md` | SDK contracts, installation, and implementation checklist for all 6 languages |
| `13-runtime-boundary.md` | What lives in the Dashboard vs Worker — authorization map, data ownership, request flows |
| `09-cli.md` | CLI package (`@flaglab/cli`), auth flow, all commands |

## Architecture

```
Next.js UI (CF Pages) — admin CRUD + auth
    ↓ Server Actions + Route Handlers
    D1 (source of truth)
    KV :flags + :experiments blobs (rebuild + purge on every change)

CLI → Next.js Route Handlers (/api/admin/*) → D1/KV/CDN (same as browser path)

Worker: /sdk/flags        →  KV :flags  (gates + configs, plan TTL, infinite CDN cache)
Worker: /sdk/experiments  →  KV :experiments (universes + experiments, 600s CDN cache)
Worker: /sdk/evaluate     →  both KV blobs → eval in Worker → flat map (client SDKs)
Worker: /collect          →  Analytics Engine (fire-and-forget, no queue)
Worker: /auth/device/*    →  CLI device auth (PKCE flow)
                               ↓
                          Cron (daily 02:00 UTC) → AE SQL → t-test → D1 results
                             Cloudflare Queue (ANALYSIS_QUEUE)
                               ↓ one message per project
                          Queue Consumer → per-project analysis
```

Auth is stateless JWT (Auth.js v5, 15-minute expiry, no stored sessions).
Admin CRUD lives in Next.js Server Actions (browser) and Route Handlers (CLI).
The Worker handles only SDK hot path, background jobs, and CLI device auth.

## Key Decisions

| Decision | Rationale |
|---|---|
| **Polling, no SSE** | SSE requires persistent connections; breaks serverless (Lambda, Vercel, CF Workers, PHP-FPM). Polling at plan interval (10–300s) is acceptable for all use cases. |
| **No Durable Objects** | Removed with SSE. DO duration billing ~$4/connection/month for SSE connections. Polling costs ~$0 (CDN absorbs). |
| **Infinite CDN TTL + explicit purge** | Better than TTL: changes propagate in ~150ms, CDN stays warm indefinitely. Purge API is free. |
| **Two KV blobs per project** | Gates/configs change often (plan TTL). Experiments are stable mid-run (600s). A gate change doesn't invalidate the experiment CDN cache. |
| **Analytics Engine for events** | D1 is SQLite — can't handle high-throughput event writes. AE is Cloudflare's columnar store, designed for this. |
| **Plans table, not per-project interval** | poll_interval is a platform lever we control. Changing a plan value propagates to all projects on that plan via KV, no per-project rebuild needed. |
| **Holdout on universe, not experiment** | A holdout must exclude the same users from ALL experiments in a universe. If on the experiment, users could be in the holdout for one experiment but not another — defeating the purpose. |

## Cloudflare Primitives

| Primitive | Role |
|---|---|
| **Pages** | Next.js admin UI + admin API (Server Actions + Route Handlers) |
| **Workers** | SDK hot path + background jobs + CLI device auth |
| **KV** | Rules cache — globally replicated (written by Pages + Worker) |
| **D1** | Source of truth (SQLite, shared by Pages + Worker) |
| **Analytics Engine** | Event writes (exposures + metrics) — Worker only |
| **Cron Triggers** | Daily analysis — Worker only |
| **Queues** | ANALYSIS_QUEUE + DLQ — cron fan-out, one project per consumer invocation |

No Durable Objects. No SSE. No stored sessions (stateless JWT, 15-min expiry).

## Scale

Handles up to ~50M DAU on the Cloudflare stack. See `cost.md` for tier pricing and `scaling.md` for the migration path beyond that.
