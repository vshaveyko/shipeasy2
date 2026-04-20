# Deploy

**Do not reintroduce GitHub Actions for Cloudflare deploys.** Every Worker
in this repo is deployed by **Cloudflare Workers Builds** (Cloudflare's own
git-triggered build pipeline, configured per-Worker in the dashboard at
`dash.cloudflare.com → Workers & Pages → <worker> → Settings → Builds`).

A push to `main` triggers a build on each Worker whose paths are touched.
Cloudflare runs the configured Build command, then the Deploy command.
No external CI, no `CLOUDFLARE_API_TOKEN` secret juggling, no GitHub
Actions workflow.

If `/.github/workflows/deploy.yml` ever reappears in a PR: reject it.

## Workers in this repo

| Worker                                  | Domain             | Directory          | Wrangler config                 |
| --------------------------------------- | ------------------ | ------------------ | ------------------------------- |
| `shipeasy` (admin UI)                   | `shipeasy.ai`      | `apps/ui/`         | `apps/ui/wrangler.jsonc`        |
| `shipeasy-worker` (edge / SDK hot path) | `cdn.shipeasy.ai`  | `packages/worker/` | `packages/worker/wrangler.toml` |
| `shipeasy-docs` (Fumadocs site)         | `docs.shipeasy.ai` | `apps/docs/`       | `apps/docs/wrangler.jsonc`      |

The admin UI and the edge worker **share** the D1 database `shipeasy-db`
and the `FLAGS_KV` namespace. Schema migrations under
`packages/worker/migrations/` apply to that shared DB.

## Build commands per Worker

Copy these into each Worker's Build settings in the Cloudflare dashboard.

### `shipeasy` — admin UI

Root directory: repo root (monorepo).

**Build command:**

```
pnpm install --frozen-lockfile && pnpm --filter @shipeasy/i18n-react build && pnpm --filter @shipeasy/devtools build && pnpm --filter @shipeasy/worker exec wrangler d1 migrations apply shipeasy-db --remote && pnpm --filter @shipeasy/ui exec opennextjs-cloudflare build
```

**Deploy command:**

```
pnpm --filter @shipeasy/ui exec opennextjs-cloudflare deploy
```

Why each step:

1. `pnpm install --frozen-lockfile` — deps.
2. `pnpm --filter @shipeasy/devtools build` — compiles the IIFE bundle
   and drops a fresh `apps/ui/public/se-devtools.js`. Without this step
   you ship whatever was committed last, not the current source.
3. `pnpm --filter @shipeasy/worker exec wrangler d1 migrations apply shipeasy-db --remote`
   — applies any new SQL migration. **Idempotent.** Must run before the
   new code that expects the new schema goes live (e.g. the soft-delete
   migration added `deleted_at` columns that `scopedDb.select` now
   filters on). Cloudflare Builds authenticates wrangler automatically
   from the build environment, so no API token is needed in env vars.
4. `pnpm --filter @shipeasy/ui exec opennextjs-cloudflare build` —
   OpenNext adapter compiles Next.js into a Worker bundle.

### `shipeasy-worker` — edge / SDK hot path

Root directory: repo root.

**Build command:**

```
pnpm install --frozen-lockfile && pnpm --filter @shipeasy/worker exec wrangler d1 migrations apply shipeasy-db --remote
```

**Deploy command:**

```
pnpm --filter @shipeasy/worker deploy
```

Wrangler builds the worker bundle itself during `wrangler deploy`; there
is no explicit build step beyond installing deps and applying migrations.
If you add a separate TypeScript build step later, put it between
`install` and `migrate`.

### `shipeasy-docs` — Fumadocs site

Root directory: repo root.

**Build command:**

```
pnpm install --frozen-lockfile && pnpm --filter @shipeasy/docs exec fumadocs-mdx && pnpm --filter @shipeasy/docs exec next build
```

**Deploy command:**

```
pnpm --filter @shipeasy/docs exec wrangler deploy
```

The docs site does not touch the shared D1, so no migration step here.

## Local deploy (break-glass)

If Cloudflare Builds is down, or you need to force-deploy from a laptop,
the root-level scripts in `package.json` mirror the CF config:

```bash
CLOUDFLARE_API_TOKEN=<token> pnpm deploy       # migrate + worker + admin UI
CLOUDFLARE_API_TOKEN=<token> pnpm deploy:docs  # docs only
CLOUDFLARE_API_TOKEN=<token> pnpm migrate      # migrations only
```

The token needs scopes: `Account:Workers Scripts:Edit`,
`Account:Workers KV Storage:Edit`, **`Account:D1:Edit`**,
`Account:Account Settings:Read`, `Zone:Workers Routes:Edit` for the
shipeasy.ai zone.

## Adding a new migration

1. Edit `packages/core/src/db/schema.ts`.
2. From `packages/worker/`: `pnpm exec drizzle-kit generate`
   → writes a new `NNNN_<name>.sql` under `migrations/`.
3. Review the generated SQL.
4. Commit schema + migration file together.
5. Push to `main` — Cloudflare Builds runs `wrangler d1 migrations apply`
   as part of the admin-UI and edge-worker builds before the new code
   ships.

**Never edit or reorder existing migration files** — wrangler tracks
applied migrations by filename in D1's `d1_migrations` table. Renaming
or mutating a committed file makes D1 think a fresh migration is
pending and double-applies structure changes.

## Checking state

```bash
# Which migrations are applied vs pending on prod D1:
pnpm --filter @shipeasy/worker exec wrangler d1 migrations list shipeasy-db --remote

# Live tail of admin UI logs (catches server-side errors from 500 responses):
pnpm --filter @shipeasy/ui exec wrangler tail shipeasy

# Live tail of edge worker:
pnpm --filter @shipeasy/worker exec wrangler tail shipeasy-worker
```

## Telltale symptoms that point back here

| Symptom                                                                          | Likely cause                                                                                                                                                                             |
| -------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/api/admin/<x> → HTTP 500 — D1_ERROR: no such column …`                         | Migration missing. Re-trigger the admin-UI build; step 3 of the build command applies it.                                                                                                |
| `/api/admin/<x> → HTTP 500 — Cannot read properties of undefined (reading 'DB')` | `getEnv()` sync called on a cold OpenNext context. `withAdmin` already warms it; any new handler that calls `scopedDb`/`getEnv` outside the wrapper needs its own `getEnvAsync()` first. |
| DevTools popup opens to `DNS_PROBE_FINISHED_NXDOMAIN`                            | `adminUrl` default pointing at a domain that doesn't exist. Check `packages/devtools/src/index.ts::scriptTagOrigin()`.                                                                   |
| Connect-to-ShipEasy OAuth returns to `/dashboard` instead of the approval card   | `/auth/signin` hardcoded `callbackUrl`. It now reads from `?callbackUrl=` and rejects non-relative paths.                                                                                |
