# ShipEasy — Path to Working State

High-level execution plan. Details live in [experiment-platform/](experiment-platform/) — do not inline them here.

## Where we are

- **Worker hot path** (SDK eval, `/collect`, cron, queue consumer, stats lib, device auth) is scaffolded.
- **`@shipeasy/core`** has the full structure (db, kv, eval, auth, schemas, limits, plans config).
- **`apps/ui`** has dashboard route folders but no Server Actions, no `/api/admin/*`, no forms.
- **SDKs, CLI, MCP server** are placeholder files only.
- **D1 migrations, KV/AE/Queue/R2 bindings, deploy pipelines** not verified end-to-end.

## Execution phases

Each phase is a shippable outcome. Don't start N+1 until N's exit criteria are green.

### Phase 0 — Baseline confidence (days)

Goal: every existing scaffold runs locally before building on top.

- [x] `pnpm build`, `pnpm type-check`, `pnpm lint`, `pnpm test` all green at root.
- `wrangler dev` boots the worker; `next dev` boots the UI; existing Playwright specs pass.
- D1 migrations generate + apply against a local D1; seed a dev project + SDK key.
- [x] Fill any obvious gaps (missing plans.yaml content, missing drizzle migration file, cloudflare-env typegen).

### Phase 1 — Admin surface (apps/ui) — the critical path

Goal: an operator can log in, create a project, and configure every resource in the D1 schema. Nothing downstream works without this.

- [x] Server Actions for every admin mutation (gate/config/experiment/universe/metric/event/attribute/key/settings). Mutation path: authz → validate → limit check → D1 write → KV rebuild → CDN purge. Pattern lives in [13-runtime-boundary.md](experiment-platform/13-runtime-boundary.md).
- [x] Route Handlers under `/api/admin/*` mirror the mutations so the CLI has an API.
- [x] Forms + list/detail pages for all dashboard sub-routes already on disk. Use existing shadcn/Base UI.
- [x] Per CLAUDE.md: **every new workflow ships with a Playwright e2e spec in the same PR.** Non-negotiable.
- [x] Audit log writes on every mutation.

Exit: create project → issue SDK key → define gate + experiment entirely from the UI, with e2e coverage.

### Phase 2 — Read path end-to-end (days)

Goal: close the loop from a configured flag to a client read. Proves Phase 1 + worker + KV actually cooperate.

- `curl` the worker's `/sdk/flags`, `/sdk/experiments`, `/sdk/evaluate` with a real key from Phase 1 and verify KV blob shape, eval determinism, ETag/poll headers.
- [x] Ship one SDK — the TypeScript server SDK in `packages/sdk/src/server` — to the contract in [12-sdk-reference.md](experiment-platform/12-sdk-reference.md). Others stay stubs.
- [x] Vitest cross-runtime eval parity (worker vs. core vs. SDK) using the test vectors called out in [04-evaluation.md](experiment-platform/04-evaluation.md).

Exit: a tiny Node script using `@shipeasy/sdk` reads the flag created in Phase 1.

### Phase 3 — Write path + analysis loop (week)

Goal: exposures and metric events flow from SDK → AE → analysis → dashboard results.

- Wire `/collect` writes against a real AE binding; confirm both datasets populate.
- Run the cron locally (wrangler `--test-scheduled`), confirm queue fan-out and consumer success; verify DLQ path.
- [x] Surface results on the experiment detail page (CI chart, verdict, time series). Feature-gate premium stats per [plans.yaml](experiment-platform/plans.yaml).
- Retention + AE archival crons scheduled and smoke-tested.

Exit: a seeded experiment yields a verdict on the dashboard after a manual cron trigger.

### Phase 4 — CLI (days)

Goal: parity with the minimum admin surface needed for scripting.

- [x] PKCE device auth (worker endpoints already exist).
- [x] Commands call `/api/admin/*` from Phase 1, not the worker. See [09-cli.md](experiment-platform/09-cli.md) for the command matrix.
- [x] Start with `login`, `whoami`, `flags *`, `experiments *`. Defer the long tail.

Exit: CLI can do everything Phase 1's UI can do for flags + experiments.

### Phase 5 — Client SDK + instrumentation (week)

Goal: a real browser app can boot, evaluate, dedupe exposures, and track events.

- [x] Implement `packages/sdk/src/client` per [12-sdk-reference.md](experiment-platform/12-sdk-reference.md) and [05-events-sdk.md](experiment-platform/05-events-sdk.md): identify, exposure buffer, visibility/background flushing, localStorage anon id.
- [x] Add auto-guardrail collection per [auto-guardrails.md](experiment-platform/auto-guardrails.md) (LCP/INP/CLS/JS errors/network/abandon).

Exit: a demo page using the client SDK flows exposures + auto-guardrails end-to-end into the dashboard verdict.

### Phase 6 — Production deploy (week)

Goal: two workers live on Cloudflare with real bindings, clean rollout + rollback story.

- Follow the deployment sequence in [08-deployment.md](experiment-platform/08-deployment.md) for both `apps/ui` (OpenNext worker) and `packages/worker`.
- Provision D1, both KV namespaces, AE datasets, Queue + DLQ, R2 bucket, cron triggers.
- Keep `compatibility_date` in sync across both wrangler configs (per CLAUDE.md).
- Secret rotation + CDN purge token runbook documented once, not repeated here.
- Staging project → smoke all e2e specs against the deployed URL.

Exit: a production URL, a staging URL, and a written rollback procedure.

### Phase 7 — Differentiators (ongoing)

Ship after the platform works. Independently orderable.

- **MCP server** — implement tools per [10-mcp-server.md](experiment-platform/10-mcp-server.md).
- **AI skills** bundle per [11-skills.md](experiment-platform/11-skills.md).
- **Additional language SDKs** (Python, Go, Ruby, Java, PHP, mobile) to the contract in [12-sdk-reference.md](experiment-platform/12-sdk-reference.md).
- **Docs site** content under `/docs` (Fumadocs).
- **Plan-limit UX**: surface usage vs. limits from [plans.yaml](experiment-platform/plans.yaml).
- **Stats polish**: CUPED + mSPRT UI affordances, SRM alerts, per [06-analysis.md](experiment-platform/06-analysis.md) and [stats-decisions.md](experiment-platform/stats-decisions.md).

## Standing rules (from CLAUDE.md)

- New `apps/ui` workflow ⇒ Playwright e2e spec in the same PR.
- Mutations go D1 → KV rebuild → CDN purge. Hot path never touches D1.
- Bump `compatibility_date` in both wrangler configs together.
- Don't hand-edit `cloudflare-env.d.ts`; regenerate with `cf-typegen`.

## Open questions to resolve before Phase 1

- Billing/plan assignment flow — does project provisioning set a plan, or is it a separate UI?
- Does the first admin login auto-create a personal project, or require explicit creation?
- Is `/docs` (Fumadocs) content part of Phase 1 shipping criteria or deferred?
