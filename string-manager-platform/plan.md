# Plan: Folding the String Manager into shipeasy

> **Source of truth for all design decisions: [experiment-platform/](../experiment-platform/).**
> This document maps the standalone "ShipEasyI18n / Label Rewrite Service" draft in [implementation-plan.md](implementation-plan.md) onto the existing shipeasy monorepo and infra. Where the draft conflicts with experiment-platform conventions, **experiment-platform wins**. The draft becomes a feature inside shipeasy (the "i18n" subapp), not a standalone product.
>
> **Scope:** how to integrate, what to reuse, what to drop, what to add, in what order. **Not** a re-design of the i18n product itself — entity model, loader contract, editor UX, codemods, AI flows are all preserved from the draft.

---

## TL;DR

- The string manager becomes a **subapp inside shipeasy**, scoped by `project_id` (not `account_id`).
- All admin CRUD lives in `apps/ui` (Server Actions + `/api/admin/i18n/*` Route Handlers). The standalone `packages/api` Hono worker proposed in the draft is **dropped** — admin paths go through Next.js, hot paths go through the existing `packages/worker`.
- D1 is the source of truth (new i18n tables added to `packages/core/src/db/schema.ts`). KV holds a per-project manifest blob with infinite CDN TTL + explicit purge. R2 stores published chunk JSONs (content-hashed, immutable). Analytics Engine + Queue capture loader request events. This is **the same shape** as the experiment platform's flags/experiments/events pipeline.
- Auth.js v5 (already wired in `apps/ui`) handles dashboard sessions. The CLI uses the existing PKCE device flow + `validateSdkKey()` from `@shipeasy/core` — **no separate i18n auth system**. The loader script's "public key" becomes a `sdk_keys` row with a new `scope = 'i18n'`.
- Plan limits live in [packages/core/src/config/plans.yaml](../packages/core/src/config/plans.yaml) — same file, new keys (e.g., `max_label_keys`, `monthly_loader_requests`).
- One new SDK package (`packages/i18n-sdk`) plus one new asset package (`packages/i18n-loader`) for the embeddable JS. Framework wrappers are deferred to a later phase.

---

## Architecture mapping

The following table maps every concept in the draft to the equivalent shipeasy surface. **Anything in the right column already exists; anything new must follow the conventions of the equivalent in [experiment-platform/](../experiment-platform/).**

| Draft concept                                                     | Maps to in shipeasy                                                                                                                                                                                                      |
| ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Standalone `packages/api` (Hono worker for admin)                 | **Dropped.** Admin lives in [apps/ui](../apps/ui/) Server Actions + `apps/ui/src/app/api/admin/i18n/*` Route Handlers (CLI re-uses these). See [13-runtime-boundary.md](../experiment-platform/13-runtime-boundary.md).  |
| Loader manifest + chunk delivery                                  | New routes on existing [packages/worker](../packages/worker/) (`/sdk/i18n/manifest/:projectId`, `/sdk/i18n/discovery/:projectId`). Chunk files served direct from R2 via Cloudflare CDN.                                 |
| `accounts`, `users`, `members` tables                             | **Dropped.** Use existing `projects` (project_id is the tenancy unit) + Auth.js sessions in `apps/ui`. Multi-user/team support is a separate cross-platform concern, not i18n-specific.                                  |
| `api_keys` (public, embeddable) + `api_tokens` (CLI secret)       | Both collapse onto the existing `sdk_keys` table. Add a `scope` column (`'experiments' \| 'i18n'`) so a single project can issue keys for either subsystem. CLI auth keeps using PKCE device flow → `validateSdkKey()`.  |
| Email OTP / OAuth in i18n worker                                  | **Dropped.** Auth.js v5 in [apps/ui/src/auth.ts](../apps/ui/src/auth.ts) is the only auth entry.                                                                                                                         |
| Custom JWT signing for editor popup                               | Auth.js session cookie + a short-lived signed token issued by a Server Action. Pattern mirrors the device-auth `CLI_TOKEN_KV` flow in [packages/worker/src/auth/](../packages/worker/src/auth/).                         |
| Stripe billing                                                    | **Out of scope** for this plan. Plan limits are enforced; payment plumbing is a separate workstream.                                                                                                                     |
| Resend email                                                      | **Out of scope** for v1. No transactional email needed once Auth.js owns sign-in.                                                                                                                                        |
| `usage_daily` (per-key request counts)                            | Loader request events go to **Analytics Engine** (new dataset `I18N_REQUESTS`). A daily cron in `packages/worker/src/analysis/` rolls them up into a D1 `i18n_usage_daily` table — same pattern as `experiment_results`. |
| Per-account discovery `/.well-known/i18n.json`                    | `GET /sdk/i18n/discovery/:projectId` on the worker, served from KV with infinite CDN TTL + explicit purge. The customer site simply rewrites `/.well-known/i18n.json` → that worker URL.                                 |
| AI translation worker                                             | Lives in `packages/cli` and `packages/mcp-server`. Calls Anthropic from the operator's machine, writes a draft via `/api/admin/i18n/drafts`. No server-side AI execution.                                                |
| Codemods                                                          | New `packages/cli/src/commands/i18n/codemods/` (per-framework AST transforms). Start with Next.js + React; defer the long tail of frameworks.                                                                            |
| 15 framework SDK packages                                         | **Deferred.** v1 ships only `packages/i18n-sdk` (dual server/client, mirrors `packages/sdk` shape). Framework wrappers come later as separate packages.                                                                  |
| Skills / Claude Code plugins                                      | New `.claude/skills/i18n/` directory, structured per [11-skills.md](../experiment-platform/11-skills.md).                                                                                                                |
| Subdomains (`app.i18n.shipeasy.ai`, `api.i18n.shipeasy.ai`, etc.) | **Dropped.** Single dashboard at `shipeasy.ai/dashboard/i18n`. Worker is the same `shipeasy` worker that already serves `/sdk/*`.                                                                                        |

---

## Schema additions

Single change: extend [packages/core/src/db/schema.ts](../packages/core/src/db/schema.ts) with i18n tables. All carry `project_id` and are accessed via the existing [`scopedDb()`](../packages/core/src/db/scoped.ts) — non-negotiable per [01-schema.md](../experiment-platform/01-schema.md).

```
label_profiles       (id, project_id, name, default_chunk_id, created_at)
label_chunks         (id, project_id, profile_id, name, is_index,
                      published_url, published_hash, published_at, etag)
label_keys           (id, project_id, profile_id, chunk_id, key, value,
                      description, updated_at, updated_by)
label_drafts         (id, project_id, profile_id, name, source_profile_id,
                      created_by, status, created_at, published_at)
label_draft_keys     (id, project_id, draft_id, key, value, description,
                      updated_by, updated_at)
i18n_usage_daily     (project_id, sdk_key_id, date, request_count)
sdk_keys             ── add column: scope TEXT NOT NULL DEFAULT 'experiments'
                       CHECK (scope IN ('experiments','i18n'))
```

- Drizzle migration generated via `pnpm --filter @shipeasy/worker exec drizzle-kit generate` then applied with `wrangler d1 migrations apply` (per [CLAUDE.md](../CLAUDE.md)).
- Zod schemas for every mutation live in `packages/core/src/schemas/i18n.ts`, exported from `packages/core/src/index.ts`. Mirrors the existing per-resource files in [packages/core/src/schemas/](../packages/core/src/schemas/).

---

## KV + R2 layout

Per project:

| Key                           | Owner          | TTL strategy                                                                                                                                                                 |
| ----------------------------- | -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `{project_id}:i18n-manifest`  | i18n subsystem | Infinite CDN TTL + explicit purge on every chunk publish/unpublish. Same rule as `:flags` / `:experiments` blobs in [02-kv-cache.md](../experiment-platform/02-kv-cache.md). |
| `{project_id}:i18n-discovery` | i18n subsystem | Same. Holds the body of `/.well-known/i18n.json` (profiles list, coverage, glossary, framework hints).                                                                       |

R2 bucket `LABELS_R2`:

```
labels/{project_id}/{profile_id}/{chunk_name}.{content_hash}.json   ← immutable, 1y cache
labels/{project_id}/{profile_id}/manifest.json                       ← rewritten on each publish
```

Publish pipeline (Server Action in `apps/ui` → helper in `@shipeasy/core`):

1. `authenticateAdmin()` (Auth.js JWT or SDK key, same as today).
2. Validate request with Zod.
3. `checkLimit(env, projectId, 'label_keys', plan)`.
4. D1 batch write: insert/update `label_keys`, recompute `published_hash` for affected chunks.
5. R2 upload: `labels/{project_id}/{profile_id}/{chunk_name}.{hash}.json` (immutable; no overwrite).
6. R2 upload: rewrite `manifest.json` for the profile.
7. `rebuildI18nManifest(projectId)` → write `{project_id}:i18n-manifest` KV blob.
8. `purgeCache(env, '/sdk/i18n/manifest/' + projectId)` with the existing 3× retry logic.

The customer's loader.js fetches:

1. `https://{worker}/sdk/i18n/manifest/{project_id}` → manifest with chunk URLs.
2. Each chunk URL points directly into R2 via Cloudflare CDN (no worker hop, 1y immutable cache).

This matches the **infinite-TTL + explicit purge** rule in [02-kv-cache.md](../experiment-platform/02-kv-cache.md) and the **zero D1 reads on the warm hot path** rule in [13-runtime-boundary.md](../experiment-platform/13-runtime-boundary.md).

---

## Worker endpoints (hot path)

Adds to [packages/worker/src/sdk/](../packages/worker/src/sdk/), all auth'd via the existing SDK-key middleware:

| Route                                | Purpose                                                                                                         | Cache                                                                                                              |
| ------------------------------------ | --------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `GET /sdk/i18n/manifest/:projectId`  | Returns the manifest blob from KV (chunk → R2 URL map).                                                         | `Cache-Control: public, max-age=…` (plan-driven), ETag, infinite CDN TTL with explicit purge.                      |
| `GET /sdk/i18n/discovery/:projectId` | Serves `/.well-known/i18n.json` from KV.                                                                        | Same.                                                                                                              |
| `POST /sdk/i18n/collect`             | Loader fires-and-forgets request events. Worker writes to AE dataset `I18N_REQUESTS`.                           | No body, fire-and-forget, same shape as `/collect` in [05-events-sdk.md](../experiment-platform/05-events-sdk.md). |
| `GET /sdk/i18n/loader.js`            | (Optional) serves the embeddable bundle from a Worker static asset binding, or redirects to a versioned R2 URL. | 1y immutable.                                                                                                      |

Background:

- `packages/worker/src/analysis/i18n-rollup.ts` — daily cron (separate fan-out per project, same pattern as the experiment analysis cron in [06-analysis.md](../experiment-platform/06-analysis.md)) reads AE `I18N_REQUESTS`, writes `i18n_usage_daily`, enforces `monthly_loader_requests` plan limits.

---

## Admin surface in apps/ui

New routes under [apps/ui/src/app/dashboard/](../apps/ui/src/app/dashboard/):

```
dashboard/i18n/
  page.tsx                    ← overview: profiles + recent activity
  profiles/
    page.tsx                  ← list
    new/page.tsx              ← create profile
    [profileId]/
      page.tsx                ← chunks + keys workspace
      chunks/[chunkId]/page.tsx
      drafts/page.tsx
      drafts/[draftId]/page.tsx
      settings/page.tsx
  keys/page.tsx               ← global key search across profiles
  settings/page.tsx           ← scoped sdk_keys (scope='i18n'), allowed domains
```

Server Actions in `apps/ui/src/app/dashboard/i18n/_actions/` follow the canonical mutation pipeline:

```
authenticateAdmin → Zod validate → checkLimit → D1 write
                  → R2 upload (chunks)
                  → rebuildI18nManifest / rebuildI18nDiscovery
                  → purgeCache (3× retry)
                  → audit log row
```

Route Handlers under `apps/ui/src/app/api/admin/i18n/*` mirror every action so the CLI hits HTTP, not Server Actions. Same convention as `apps/ui/src/app/api/admin/{flags,experiments,…}` in [13-runtime-boundary.md](../experiment-platform/13-runtime-boundary.md).

**Per [CLAUDE.md](../CLAUDE.md): every new route ships with a Playwright spec in `apps/ui/e2e/auth/i18n/`. No exceptions.**

---

## CLI

Add a top-level `i18n` namespace to the existing [packages/cli](../packages/cli/) binary. Existing `login` / `whoami` carry over (PKCE device flow already implemented per [09-cli.md](../experiment-platform/09-cli.md)).

```
packages/cli/src/commands/i18n/
  init.ts          ← scaffold .shipeasy/i18n.json, install pre-commit hook
  push.ts          ← upload local strings → /api/admin/i18n/keys
  pull.ts          ← download published strings to local disk
  publish.ts       ← trigger profile publish via /api/admin/i18n/publish
  translate.ts     ← Anthropic call → POST /api/admin/i18n/drafts
  draft.ts         ← list / publish drafts
  validate.ts      ← pre-commit: ensure code-side keys exist server-side
  codemod/
    nextjs.ts      ← AST transform: JSX text → <ShipEasyI18nString k="…">
    react.ts
    (others deferred)
```

All commands authenticate via the saved CLI token from `~/.config/shipeasy/config.json` and call `apps/ui` Route Handlers, never the worker.

---

## MCP server

Add tools to existing [packages/mcp-server](../packages/mcp-server/) per [10-mcp-server.md](../experiment-platform/10-mcp-server.md):

```
packages/mcp-server/src/tools/i18n/
  scan-code.ts        ← read repo, list candidate strings
  create-key.ts       ← POST /api/admin/i18n/keys
  translate-all.ts    ← drive the translate CLI command
  publish.ts
  validate.ts
```

No new binary; `shipeasy-mcp` keeps the existing entry point and just registers more tools.

---

## SDK + loader packages

Two new workspace packages, both following [12-sdk-reference.md](../experiment-platform/12-sdk-reference.md) and [packages.md](../experiment-platform/packages.md):

- `packages/i18n-sdk` — dual server/client build via tsup, conditional exports (`node` → `dist/server`, `browser` → `dist/client`). Server-side helpers fetch the manifest at SSR time and inline strings into the HTML; client-side wraps the loader for hydration. Zod is an optional peer dep, same as the existing SDK.
- `packages/i18n-loader` — produces the three embeddable artifacts (`loader.js`, `editor-trigger.js`, `editor.js`) via tsup. Build output is uploaded to R2 at `cdn/i18n/loader/{semver}/loader.js` during release; the worker's `/sdk/i18n/loader.js` route 302s to the current pinned version.

Framework-specific wrappers (`@shipeasy/react`, `@shipeasy/i18n-vue`, etc.) are **explicitly deferred** to the differentiators phase.

---

## Plans + limits

Edit [packages/core/src/config/plans.yaml](../packages/core/src/config/plans.yaml) — add per-tier i18n knobs alongside the existing experiment knobs:

```yaml
free:
  max_label_profiles: 2
  max_label_keys: 200
  max_label_chunks_per_profile: 5
  monthly_loader_requests: 100_000
  ai_translate_enabled: false
  in_browser_editor_enabled: false

pro:
  max_label_profiles: 20
  max_label_keys: 10_000
  max_label_chunks_per_profile: 50
  monthly_loader_requests: 5_000_000
  ai_translate_enabled: true
  in_browser_editor_enabled: true
```

Register the limit checks in [packages/core/src/limits.ts](../packages/core/src/limits.ts) so every i18n Server Action calls `checkLimit(env, projectId, 'label_keys', plan)` before writing. Same enforcement model as the experiment subsystem — no per-project migration is ever needed when limits change ([README.md](../experiment-platform/README.md) §plan-level knobs).

---

## Folder structure: full delta

```
apps/ui/
  src/app/dashboard/i18n/                  ← NEW (pages + Server Actions + _actions/)
  src/app/api/admin/i18n/                  ← NEW (Route Handlers, mirror Server Actions)
  e2e/auth/i18n/                           ← NEW (Playwright specs — required)
  wrangler.jsonc                           ← MODIFY (add LABELS_R2 binding)
  cloudflare-env.d.ts                      ← REGEN via cf-typegen

packages/core/src/
  db/schema.ts                             ← MODIFY (label_*, i18n_usage_daily, sdk_keys.scope)
  schemas/i18n.ts                          ← NEW (Zod for all i18n mutations)
  kv/rebuild.ts                            ← MODIFY (add rebuildI18nManifest, rebuildI18nDiscovery)
  kv/cache.ts                              ← MODIFY (extend cache key types)
  r2/                                      ← NEW (publishChunk, contentHash, manifestBuilder)
  config/plans.yaml                        ← MODIFY (add i18n knobs)
  limits.ts                                ← MODIFY (register i18n limit checks)
  index.ts                                 ← MODIFY (export new helpers)
  eval/i18n.ts                             ← NEW (manifest assembly logic shared by UI + worker)

packages/worker/src/
  sdk/i18n-manifest.ts                     ← NEW
  sdk/i18n-discovery.ts                    ← NEW
  sdk/i18n-collect.ts                      ← NEW
  sdk/i18n-loader.ts                       ← NEW (asset binding redirect)
  analysis/i18n-rollup.ts                  ← NEW (daily cron rollup)
  index.ts                                 ← MODIFY (mount routes, add cron handler)
  wrangler.toml                            ← MODIFY (LABELS_R2, I18N_REQUESTS AE dataset)

packages/cli/src/commands/i18n/            ← NEW (init, push, pull, publish, translate, draft, validate, codemod/)

packages/mcp-server/src/tools/i18n/        ← NEW

packages/i18n-sdk/                         ← NEW package (tsup dual build, mirrors packages/sdk)
packages/i18n-loader/                      ← NEW package (tsup builds the three embeddable bundles)

.claude/skills/i18n/                       ← NEW (skills bundle per 11-skills.md)

string-manager-platform/                   ← RENAMED → i18n-platform/
  README.md                                ← NEW (mirrors experiment-platform/README.md, points at numbered docs)
  01-schema.md … 13-runtime-boundary.md    ← NEW (extracted + rewritten from implementation-plan.md
                                                   to match experiment-platform's numbering and rules)
  plans.yaml                               ← NEW (i18n-only excerpt for doc reference; canonical lives in core)
  implementation-plan.md                   ← ARCHIVED (kept for history; header already flags as outdated)
  ai-discovery.md, deployment.md,
  security.md, start-page.md,
  frameworks/                              ← KEEP, link from new numbered docs
```

A separate companion task: bring [string-manager-platform/](.) into the same shape as [experiment-platform/](../experiment-platform/) — same numbered file layout, same README index. The current `implementation-plan.md` is preserved as a historical reference (it already declares itself out-of-date in its header), but the numbered docs become the live spec going forward.

---

## Phased delivery

Mirrors the structure in [TODO.md](../TODO.md) — each phase ships in isolation and gates the next.

### Phase 0 — Doc parity (1 day)

Reorganise this folder to mirror `experiment-platform/`. Numbered docs, README index, packages.md. No code yet.

### Phase 1 — Schema + admin CRUD (week)

Drizzle migration for `label_*` + `i18n_usage_daily` + `sdk_keys.scope`. Server Actions + Route Handlers + dashboard pages for profiles → chunks → keys. Playwright specs in same PR. **Exit:** an operator can create a profile, add chunks and keys entirely from the UI.

### Phase 2 — Publish pipeline + manifest delivery (week)

R2 upload helpers in `@shipeasy/core/r2/`. `rebuildI18nManifest` + `purgeCache`. Worker routes `/sdk/i18n/manifest/:projectId` and discovery. **Exit:** publishing a profile from the UI produces a CDN-served manifest that a `curl` can fetch in <50 ms warm.

### Phase 3 — Embeddable loader MVP (week)

`packages/i18n-loader` (loader.js only, no editor). Worker `/sdk/i18n/loader.js` redirect. Demo HTML page wires script tag → loader → manifest → text rewrite. **Exit:** a real static page rewrites strings end-to-end against a deployed worker.

### Phase 4 — CLI push/pull (days)

`shipeasy i18n init/push/pull/publish` + the `validate` pre-commit. Reuses existing PKCE login. **Exit:** a developer can sync a JSON file of strings up and pull published values back down.

### Phase 5 — Drafts + AI translate (week)

Drafts schema, draft UI, `shipeasy i18n translate` (Anthropic call from CLI), draft → publish merge. **Exit:** translate `en:prod` → `fr:prod`, review in dashboard, publish.

### Phase 6 — In-browser editor + usage rollup (week)

`editor-trigger.js` + `editor.js` artifacts; editor-auth Server Action issues short-lived signed token. AE `I18N_REQUESTS` dataset wired; `i18n-rollup` cron writes `i18n_usage_daily`; quota enforcement in `/sdk/i18n/manifest`. **Exit:** Alt+Shift+E opens the editor on any embedded site; quota rejection returns a clean 429.

### Phase 7 — Differentiators (ongoing)

MCP tools, framework-specific SDK packages (`@shipeasy/react`, etc.), full codemod matrix, AI discovery `/.well-known/i18n.json`, Claude Code skills bundle. Independently orderable.

---

## Hard rules carried over from experiment-platform (do not violate)

- **Every D1 query touching tenant data uses `scopedDb(env, projectId)`.** No exceptions for the i18n subsystem ([01-schema.md](../experiment-platform/01-schema.md)).
- **No D1 reads on the warm hot path.** Loader manifest fetches are KV-backed with infinite CDN TTL and explicit purge; chunk files are direct R2 ([02-kv-cache.md](../experiment-platform/02-kv-cache.md)).
- **Polling, not push.** No SSE, no WebSockets, no Durable Objects, even for the in-browser editor's "did the manifest change" check ([README.md](../experiment-platform/README.md)).
- **Plans compile into the worker bundle from `plans.yaml`.** No D1 query to resolve plan settings on the hot path.
- **All admin mutations call `checkLimit()` before writing.** UI validation alone is not sufficient; the CLI bypasses the UI ([13-runtime-boundary.md](../experiment-platform/13-runtime-boundary.md)).
- **All KV rebuilds call `purgeCache()` with 3× retry.** Stale strings are a customer-visible bug.
- **Every new workflow ships with a Playwright e2e spec in the same PR.** Non-negotiable per [CLAUDE.md](../CLAUDE.md).
- **`compatibility_date` stays in sync between [apps/ui/wrangler.jsonc](../apps/ui/wrangler.jsonc) and [packages/worker/wrangler.toml](../packages/worker/wrangler.toml).** Bump them together, never separately.

---

## Open questions to resolve before Phase 1

1. **Loader auth for embedded JS.** The draft uses a "public key" embedded in the script tag. Should that be a `sdk_keys` row with `type='client'` + `scope='i18n'`, or a new lightweight `i18n_public_keys` table? Recommend the former — one fewer table, reuses `validateSdkKey()`.
2. **R2 binding location.** Does `apps/ui` need direct R2 write access (Server Actions upload chunks), or should chunk uploads be proxied through the worker? Direct from `apps/ui` is simpler and matches "admin writes happen in Next.js" — but doubles the Cloudflare bindings to maintain.
3. **Multi-user editing on a single project.** Today shipeasy is single-owner-per-project (Auth.js owner_email lookup). The i18n editor implies multiple human translators. Either (a) defer multi-user until shipeasy adds it project-wide, or (b) the editor uses a per-translator short-lived token issued by the project owner. Recommend (a) — multi-user is a cross-cutting platform concern, not i18n-specific.
4. **Naming.** Is the user-visible name "i18n", "Strings", or "Labels"? The draft uses all three; the dashboard route, package names, and docs should pick one. Recommend `i18n` for paths/packages, "Strings" for UI copy.

These are flagged for the operator to decide; defaults above are reasonable starting points and can ship as-is.
