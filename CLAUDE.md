# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository layout

pnpm + Turborepo monorepo. Workspaces are declared in `pnpm-workspace.yaml` (`apps/*`, `packages/*`). Node `>=20`, pnpm `>=9` (project pinned to `pnpm@10.33.0`). Shared TS config lives in `tsconfig.base.json`.

- `apps/ui` — Next.js 16 (App Router, React 19) admin dashboard. Deployed via `@opennextjs/cloudflare` to a Cloudflare Worker (`shipeasy`, see `wrangler.jsonc`). Tailwind v4 + shadcn/Base UI, Auth.js v5 (NextAuth), Fumadocs for `/docs`, Conform + Zod for forms.
- `packages/core` (`@shipeasy/core`) — shared library consumed by both `ui` and `worker`. Drizzle schema, KV rebuild/cache/purge helpers, gate + experiment evaluation, SDK key / crypto auth, plan limits, Zod schemas, D1-scoped DB helpers. Uses TS source exports (no build step; `"."` → `./src/index.ts`).
- `packages/worker` (`@shipeasy/worker`) — Cloudflare Worker, Hono app. Hosts the SDK hot path (`/sdk/*`, `/collect`), CLI device-auth flow (`/auth/device/*`), and the cron/queue analysis pipeline (`src/analysis/*`). Deployed with `wrangler`. Drizzle migrations live here (`drizzle.config.ts` points at `../core/src/db/schema.ts`, dialect `sqlite`, driver `d1-http`).
- `packages/sdk` (`@shipeasy/sdk`) — published customer SDK. Dual server/client build via tsup, conditional exports (`node` → `dist/server`, `browser` → `dist/client`). `zod` is an optional peer dep.
- `packages/cli` (`@shipeasy/cli`) — distributed CLI binary `shipeasy` (commander-based). Built with tsup (CJS + dts).
- `packages/mcp-server` (`@shipeasy/mcp-server`) — MCP server binary `shipeasy-mcp` for AI-assisted experiment setup. ESM, built with tsup.
- `experiment-platform/` — design docs (numbered `01-schema.md` … `13-runtime-boundary.md`, plus `packages.md`, `plans.yaml`, `cost.md`, `scaling.md`, stats guides). Start here (`experiment-platform/README.md`) when you need architectural context beyond what's in the code.
- `experiment-lab/` — static HTML prototypes (`index.html`, `new-experiment.html`, `new-flag.html`). Not part of the build.

Note: the top-level `README.md` is an untouched `create-next-app` stub and does not describe this project — ignore it in favor of `experiment-platform/README.md`.

## Commands

All workflow tasks are orchestrated by Turbo at the root:

- `pnpm build` — `turbo build` (respects `^build`; outputs include `dist/**`, `.next/**`, `.open-next/**`).
- `pnpm dev` — `turbo dev` (persistent, uncached).
- `pnpm lint` — `turbo lint`.
- `pnpm type-check` — `turbo type-check` (waits on upstream builds).
- `pnpm test` — `turbo test` (waits on upstream builds). For `apps/ui` this is the Playwright e2e suite (see Testing below).

Run a task in a single workspace with `pnpm --filter <name> <script>`, e.g. `pnpm --filter @shipeasy/worker test` or `pnpm --filter @shipeasy/ui dev`. A single Vitest file: `pnpm --filter @shipeasy/worker exec vitest run path/to/file.test.ts`.

Package-specific scripts worth knowing:

- `apps/ui`: `next dev` / `next build` / `next start`, plus `opennextjs-cloudflare build && opennextjs-cloudflare {deploy,upload,preview}` exposed as `deploy` / `upload` / `preview`. `pnpm --filter @shipeasy/ui cf-typegen` regenerates `cloudflare-env.d.ts` from `wrangler.jsonc`.
- `packages/worker`: `wrangler dev` / `wrangler deploy`, `vitest` (uses `@cloudflare/vitest-pool-workers`). Drizzle migrations: `pnpm --filter @shipeasy/worker exec drizzle-kit generate` / `migrate`.
- `packages/sdk`: `tsup` build, `vitest`.
- `packages/cli`: `ts-node src/index.ts` for local dev; `tsup` to build the distributable.

## Architecture

Two deploy targets, one shared library:

1. **Next.js admin UI** (`apps/ui`) is deployed as a Cloudflare Worker via OpenNext. It owns admin CRUD (Server Actions + Route Handlers under `src/app/api/*`), Auth.js sessions, and the customer-facing `/docs`. The CLI hits the same admin Route Handlers for programmatic access.
2. **Edge Worker** (`packages/worker`, Hono) owns the SDK hot path (`/sdk/flags`, `/sdk/experiments`, `/sdk/evaluate`), event ingestion (`/collect` → Analytics Engine), CLI device-auth (`/auth/device/*`), and scheduled analysis (cron → `ANALYSIS_QUEUE` → per-project consumer in `src/analysis/`).

Both runtimes share Cloudflare resources:

- **D1** is source of truth (schema in `packages/core/src/db/schema.ts`, accessed through Drizzle; `db/scoped.ts` enforces project scoping).
- **KV** holds two blobs per project — `:flags` (gates + configs, plan-driven TTL) and `:experiments` (universes + experiments, 600s CDN cache). Writers (UI Server Actions and some Worker paths) call the rebuild helpers in `packages/core/src/kv/` and then explicit CDN purge; readers never touch D1 on the hot path.
- **Analytics Engine** is the events store (written only from the Worker, fire-and-forget).
- **Cron Triggers + Queues** drive daily analysis; the cron enqueues one message per project and the queue consumer runs the t-test + writes results back to D1.

Auth is stateless JWT (Auth.js v5, 15-minute expiry — no stored sessions). Key architectural rules (from `experiment-platform/README.md`):

- No Durable Objects, no SSE — polling at plan interval only.
- Infinite CDN TTL + explicit purge for KV blobs (not TTL-based invalidation).
- Holdouts live on the universe, not individual experiments.
- Plan-level knobs (e.g. `poll_interval`) live in `packages/core/src/config/plans.ts`; changing a plan propagates through KV rebuild, no per-project migration.

When changing anything that touches runtime/ownership boundaries between the UI and Worker, consult `experiment-platform/13-runtime-boundary.md` — it is the authoritative map of what each runtime is allowed to do.

## Testing

**REQUIRED: every new workflow must be covered with a full e2e test.**

A "workflow" means any user-visible path in `apps/ui` — a new page, auth flow, form submission, navigation, redirect, or access-control guard. If a user can reach it in the browser, it ships with an e2e spec in the same PR. This rule is non-negotiable; do not open a PR for a new workflow without the accompanying spec.

- Tool: Playwright, configured in [apps/ui/playwright.config.ts](apps/ui/playwright.config.ts). Specs live in [apps/ui/e2e/](apps/ui/e2e/).
- Run: `pnpm --filter @shipeasy/ui test` (or `pnpm test` at root via Turbo). Use `pnpm --filter @shipeasy/ui test:e2e:ui` while authoring.
- The `webServer` block boots `next dev -p 3100` with test-only `AUTH_*` env vars injected, so specs don't collide with a local `pnpm dev` on `3000` and don't require real OAuth credentials.
- Smoke-level coverage is the baseline: assert the page loads, the core copy/CTAs render, and primary links/redirects go where they claim. Add deeper assertions (form submit, happy-path navigation, access-control redirects) whenever the workflow involves state or side effects.
- Browsers are installed with `pnpm --filter @shipeasy/ui exec playwright install chromium`. CI must run this before `pnpm test`.

## Conventions worth knowing

- Workspace packages import each other as `@shipeasy/<name>` via `workspace:*`. `@shipeasy/core` exposes TS sources directly (no build artifact), so type-check in consumers will pick up changes immediately but CI still needs `^build` dependencies for bundled packages.
- The `ui` app's `tsconfig.json` uses `@/*` for `src/*`. Treat `src/auth.ts` as the Auth.js entry.
- Wrangler `compatibility_date` is pinned in both `apps/ui/wrangler.jsonc` and `packages/worker/wrangler.toml` — bump both together.
- `apps/ui/cloudflare-env.d.ts` is generated; do not hand-edit. Regenerate with `cf-typegen` after changing `wrangler.jsonc` bindings.
