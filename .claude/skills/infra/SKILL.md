---
name: infra
description: Runbook for shipeasy production infrastructure — three Cloudflare Workers (edge worker, Next.js UI worker, static docs worker), shared D1/KV/Queue/AE/R2 resources, the i18n string-manager subsystem, and the day-to-day ops playbook (deploys, log tails, DLQ replay, D1 migrations, secret rotation, CDN purge triage). Use this skill whenever the user asks about deploying, provisioning, tailing prod logs, debugging cron/queue/analysis, rotating secrets, publishing label chunks, or inspecting D1/KV/R2 state.
user-invocable: true
allowed-tools: Bash, Read, Grep, Glob
---

# shipeasy infra runbook

Three independently-deployed Cloudflare Workers, one shared data plane. Every command below assumes you're in the repo root unless stated otherwise. Verify live names before any command that touches them:

```bash
wrangler d1 list
wrangler kv namespace list
wrangler queues list
wrangler r2 bucket list
wrangler r2 bucket domain list <bucket>
```

**Historical note:** prior to 2026-04-17 the edge worker ran under the name `flags-worker`, D1 was `flags-db`, and a separate `i18n-api` Worker handled strings. Those are gone. Current state is consolidated under the names below.

---

## What deploys where

| Artifact                  | Source                                        | Deploy target                                                                                                      | Owner                                                                                                                                                     |
| ------------------------- | --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Admin dashboard           | [apps/ui/](../../../apps/ui/)                 | CF Worker `shipeasy` via OpenNext ([apps/ui/wrangler.jsonc](../../../apps/ui/wrangler.jsonc))                      | Server Actions, Route Handlers, Auth.js v5, admin CRUD (experiments + i18n), CLI admin auth, chunk uploads to R2                                          |
| SDK hot path + cron/queue | [packages/worker/](../../../packages/worker/) | CF Worker `shipeasy-worker` via wrangler ([packages/worker/wrangler.toml](../../../packages/worker/wrangler.toml)) | `/sdk/*` (flags, experiments, evaluate, bootstrap, i18n manifest/discovery/loader/collect), `/collect`, `/auth/device/*`, analysis cron + queue consumers |
| Public docs site          | [apps/docs/](../../../apps/docs/)             | CF Worker `shipeasy-docs` via Workers Assets ([apps/docs/wrangler.jsonc](../../../apps/docs/wrangler.jsonc))       | Static Next.js export (fumadocs), no bindings, no secrets                                                                                                 |
| Shared library            | [packages/core/](packages/core/)              | Imported as TS source by both Workers                                                                              | Drizzle schema, KV rebuild/purge, eval logic, plans, Zod schemas                                                                                          |

Both Workers bind the **same** D1, **same** `FLAGS_KV`, **same** R2 buckets. Admin writes → D1 → KV rebuild → CDN purge. SDK reads → KV / R2 only (no D1 on hot path). See [experiment-platform/13-runtime-boundary.md](experiment-platform/13-runtime-boundary.md) for the authoritative responsibility split.

---

## Live Cloudflare inventory (account `b3b935b0b2a42ae7ec5029cd3de2f0e8`)

### D1

| Binding | Database      | UUID                                   |
| ------- | ------------- | -------------------------------------- |
| `DB`    | `shipeasy-db` | `e151fb96-2d60-4de3-aed6-8ff51730caae` |

### KV namespaces

| Binding        | ID                                 | Used for                                                                                                                                     |
| -------------- | ---------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `FLAGS_KV`     | `e0ddf5c86029435880897410ca270488` | `sdk_key:{hash}`, `{pid}:flags`, `{pid}:experiments`, `{pid}:catalog`, `{pid}:i18n-manifest`, `{pid}:i18n-discovery`, `purge_pending:{path}` |
| `CLI_TOKEN_KV` | `997c2f34a89e4d8197fb8f2c9a3c940a` | Short-TTL park for admin tokens during PKCE device-auth handoff                                                                              |

### Analytics Engine datasets

| Binding         | Dataset                  |
| --------------- | ------------------------ |
| `EXPOSURES`     | `shipeasy_exposures`     |
| `METRIC_EVENTS` | `shipeasy_metric_events` |
| `I18N_REQUESTS` | `shipeasy_i18n_requests` |

AE must be enabled at the account level once before the first deploy that references a dataset — see **§ Analytics Engine one-time enable**.

### Queues

| Queue                     | Producer                                   | Consumer                                   | Purpose                                  |
| ------------------------- | ------------------------------------------ | ------------------------------------------ | ---------------------------------------- |
| `experiment-analysis`     | `shipeasy-worker` (cron fan-out)           | `shipeasy-worker`                          | Per-project Welch + SRM + CUPED analysis |
| `experiment-analysis-dlq` | (failures from above)                      | `shipeasy-worker` (logs each message)      | DLQ observability                        |
| `i18n-usage`              | `shipeasy-worker` (rollup fan-out, future) | `shipeasy-worker` (stub ack until Phase 6) | Per-project i18n request rollup          |
| `i18n-usage-dlq`          | (failures)                                 | `shipeasy-worker`                          | DLQ observability                        |

### R2 buckets

| Binding     | Bucket            | Public domain                                      |
| ----------- | ----------------- | -------------------------------------------------- |
| `EVENTS_R2` | `shipeasy-events` | private (archival only)                            |
| `LABELS_R2` | `i18n-labels`     | `labels.shipeasy.ai` (public, 1y-immutable chunks) |

### Workers + custom domains

| Worker                           | Route                                             | Cron schedules                                       |
| -------------------------------- | ------------------------------------------------- | ---------------------------------------------------- |
| `shipeasy-worker`                | `cdn.shipeasy.ai` (custom domain)                 | `0 2 * * *`, `0 3 * * *`, `0 4 * * *`, `*/5 * * * *` |
| `shipeasy` (OpenNext)            | `shipeasy.ai`, `www.shipeasy.ai` (custom domains) | —                                                    |
| `shipeasy-docs` (Workers Assets) | `docs.shipeasy.ai` (custom domain)                | —                                                    |

### Secrets

Set per Worker via `wrangler secret put <NAME> --name <worker-name>`. Confirm with `wrangler secret list --name <worker-name>`.

| Secret                       | `shipeasy-worker` | `shipeasy` (UI)               | Notes                                                                                                                                |
| ---------------------------- | ----------------- | ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `CF_API_TOKEN`               | ✓                 | ✓                             | Cache Purge + Analytics Engine Read, scoped to the `shipeasy.ai` zone. See **§ CF_API_TOKEN scopes**                                 |
| `CLI_SERVICE_SECRET`         | ✓                 | ✓                             | Shared secret. UI's `/cli-auth/complete` sends it in `X-Service-Key` to worker's `/auth/device/complete`. Must be identical on both. |
| `AUTH_SECRET`                | —                 | ✓                             | Auth.js v5 JWT signing                                                                                                               |
| `AUTH_GOOGLE_ID` / `_SECRET` | —                 | ✓                             | OAuth provider                                                                                                                       |
| `AUTH_GITHUB_ID` / `_SECRET` | —                 | ✓                             | OAuth provider                                                                                                                       |
| `RESEND_API_KEY`             | ✓ (unused here)   | ✓                             | Email delivery (alerts / invites)                                                                                                    |
| `ANTHROPIC_API_KEY`          | —                 | (add when AI translate ships) | i18n `shipeasy i18n translate`                                                                                                       |

### Vars (non-secret, in wrangler config)

Both Workers share: `CF_ZONE_ID=327bf22a5c585b1a72387bea588bf212`, `CF_ACCOUNT_ID=b3b935b0b2a42ae7ec5029cd3de2f0e8`, `FLAGS_DOMAIN=cdn.shipeasy.ai`. UI adds `LABELS_DOMAIN=labels.shipeasy.ai`, `WORKER_URL=https://cdn.shipeasy.ai`, `NEXTAUTH_URL=https://shipeasy.ai`.

---

## Deploy commands

`pnpm` reserves the word `deploy` for its own subcommand, so `pnpm --filter ... deploy` **does not** invoke the package.json script. Always call `wrangler` directly:

### Edge Worker (`shipeasy-worker`)

```bash
cd packages/worker
pnpm exec wrangler dev           # local, bound to preview resources
pnpm exec wrangler deploy        # production
pnpm exec wrangler deployments list
pnpm exec wrangler tail          # live logs
```

### UI Worker (`shipeasy`, via OpenNext)

```bash
cd apps/ui
pnpm run deploy                  # package.json script — opennextjs-cloudflare build && deploy
pnpm run preview                 # build + local preview
pnpm run upload                  # build + upload, don't promote
pnpm run cf-typegen              # regenerate cloudflare-env.d.ts after wrangler.jsonc changes (MUST run after any binding edit)
```

### Docs Worker (`shipeasy-docs`, static Workers Assets)

```bash
cd apps/docs
pnpm run deploy                  # next build (static export → ./out) && wrangler deploy
pnpm run preview                 # next build && wrangler dev (local preview)
```

Static export: Next.js writes `./out`, wrangler uploads it as [Workers Assets](https://developers.cloudflare.com/workers/static-assets/). No bindings, no secrets — purely static. Rollback via dashboard: **Workers & Pages → shipeasy-docs → Deployments → [prior] → Rollback**.

**Deploy order when shipping a schema change** (from [experiment-platform/08-deployment.md](experiment-platform/08-deployment.md)):

1. Edit [packages/core/src/db/schema.ts](packages/core/src/db/schema.ts).
2. `cd packages/worker && pnpm exec drizzle-kit generate` → inspect the new `.sql` in `packages/worker/migrations/`.
3. `pnpm exec wrangler d1 migrations apply shipeasy-db --remote` (non-interactive — auto-answers "yes" when run by Claude).
4. `cd packages/worker && pnpm exec wrangler deploy` — Worker first (it has the new Drizzle types).
5. `cd apps/ui && pnpm run deploy` — UI second.

**Schema-migration rules:**

- SQLite — `ALTER TABLE ADD COLUMN` must be nullable or carry a DEFAULT.
- Never rename/drop a column while the old Worker is live — dual-write, redeploy, then drop.
- Migrate **before** deploy, never after. Old code reading new additive schema is safe; new code reading old schema is not.

Verify migration state:

```bash
pnpm exec wrangler d1 migrations list shipeasy-db --remote
pnpm exec wrangler d1 execute shipeasy-db --remote --command \
  "SELECT * FROM d1_migrations ORDER BY id DESC LIMIT 5"
```

---

## CI/CD — GitHub Actions autodeploy

All three Workers deploy automatically on push to `main` via [.github/workflows/deploy.yml](../../../.github/workflows/deploy.yml). Three parallel jobs: `deploy-docs`, `deploy-worker`, `deploy-ui`. No dependency between jobs — they all start immediately.

### Required GitHub secret

| Secret                    | Value                                                                       | Permissions needed                                   |
| ------------------------- | --------------------------------------------------------------------------- | ---------------------------------------------------- |
| `CLOUDFLARE_DEPLOY_TOKEN` | A **separate** CF API token created for CI (not the runtime `CF_API_TOKEN`) | Workers Scripts:Edit, Workers Routes:Edit, Zone:Read |

Create the token: **Cloudflare → Profile → API Tokens → Create Token → Custom Token**:

| Row | Permission                                                                              |
| --- | --------------------------------------------------------------------------------------- |
| 1   | **Account** · **Workers Scripts** · **Edit**, Account = `Vshaveyko@gmail.com's Account` |
| 2   | **Zone** · **Workers Routes** · **Edit**, Zone = `shipeasy.ai`                          |
| 3   | **Zone** · **Zone** · **Read**, Zone = `shipeasy.ai`                                    |

Then add it in GitHub: **Settings → Secrets and variables → Actions → New repository secret** → name `CLOUDFLARE_DEPLOY_TOKEN`.

### Manual re-run after secret rotation

If the token is rotated, update the GitHub secret and re-run the workflow from the Actions tab — no code change needed.

---

## Log tailing

```bash
wrangler tail --name shipeasy-worker                       # edge worker (SDK hot path, cron, queue consumer)
wrangler tail --name shipeasy                              # UI worker (Server Actions, Route Handlers)
wrangler tail --name shipeasy-worker --format pretty --status error
wrangler tail --name shipeasy-worker --search purgeCache   # grep a substring
wrangler tail --name shipeasy-worker --sampling-rate 0.1   # for high-volume paths
```

Both workers have `observability.enabled = true`; persisted logs queryable in dashboard → **Workers & Pages → <worker> → Logs** for the plan's retention window. UI worker has `upload_source_maps: true` — stack traces resolve to TS line numbers.

**Cron/queue manual trigger:**

```bash
wrangler cron trigger --name shipeasy-worker               # fires all scheduled handlers once
# Replay one analysis message:
wrangler queues publish experiment-analysis \
  --message '{"project_id":"<id>","trigger":"daily"}'
# Replay with reanalyze trigger:
wrangler queues publish experiment-analysis \
  --message '{"project_id":"<id>","trigger":"reanalyze"}'
```

---

## Analytics Engine one-time enable

AE is account-scoped and defaults off. Before the first `wrangler deploy` that references an `[[analytics_engine_datasets]]` binding, visit:

https://dash.cloudflare.com/b3b935b0b2a42ae7ec5029cd3de2f0e8/workers/analytics-engine

Click **Enable Analytics Engine**. No form fields — datasets are auto-created on first `writeDataPoint()`. Symptom if skipped: `wrangler deploy` fails with `You need to enable Analytics Engine. [code: 10089]`.

Datasets: `shipeasy_exposures`, `shipeasy_metric_events`, `shipeasy_i18n_requests`.

---

## CF_API_TOKEN scopes

The same token is used by both Workers for:

1. **CDN cache purge** after KV rebuild ([packages/core/src/kv/purge.ts](packages/core/src/kv/purge.ts)).
2. **AE SQL queries** during the 02:00 analysis cron ([packages/worker/src/lib/ae.ts](../../../packages/worker/src/lib/ae.ts)) and archival ([packages/worker/src/analysis/archival.ts](../../../packages/worker/src/analysis/archival.ts)).

Required permissions (**Cloudflare → Profile → API Tokens → Custom Token**):

| Row | Permission                                                                                |
| --- | ----------------------------------------------------------------------------------------- |
| 1   | **Zone** · **Cache Purge** · **Purge**, Zone Resources = `shipeasy.ai`                    |
| 2   | **Account** · **Account Analytics** · **Read**, Account = `Vshaveyko@gmail.com's Account` |

Verify token capabilities without redeploying:

```bash
TOKEN=$(echo | wrangler secret:bulk --name shipeasy-worker < /dev/null 2>&1 | head -0; printf "%s" "$CF_API_TOKEN_VALUE")
# Manually:
curl -sS -H "Authorization: Bearer $TOKEN" https://api.cloudflare.com/client/v4/user/tokens/verify
# Probe cache purge (harmless — purges a nonexistent path):
curl -sS -w "\n%{http_code}\n" -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -X POST "https://api.cloudflare.com/client/v4/zones/327bf22a5c585b1a72387bea588bf212/purge_cache" \
  --data '{"files":["https://cdn.shipeasy.ai/__probe__"]}'
# Probe AE:
curl -sS -w "\n%{http_code}\n" -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -X POST "https://api.cloudflare.com/client/v4/accounts/b3b935b0b2a42ae7ec5029cd3de2f0e8/analytics_engine/sql" \
  --data 'SELECT 1'
```

401 on either probe = missing scope; add the permission row at the dashboard URL above and retry. No secret reupload needed — scope changes propagate immediately to the existing token value.

### CF_API_TOKEN rotation

```bash
# 1. Create a new token in the dashboard with the same scopes.
# 2. Put it on BOTH workers:
printf '%s' "<NEW_TOKEN>" | wrangler secret put CF_API_TOKEN --name shipeasy-worker
printf '%s' "<NEW_TOKEN>" | wrangler secret put CF_API_TOKEN --name shipeasy
# 3. Wait ≥60s for isolate propagation across all regions.
#    The purgeCache retry budget is ~3s total — a too-early old-token revoke will break CDN purges on in-flight mutations.
# 4. Revoke the old token in the dashboard.
# 5. Tail logs for 5 minutes — grep for purgeCache or cdn_purge_failed.
```

---

## Runbooks — common failures

### 1. "Results haven't updated today"

The 02:00 UTC cron, the queue fan-out, or the per-project consumer failed.

```bash
# Was the cron heartbeat written?
pnpm exec wrangler d1 execute shipeasy-db --remote --command \
  "SELECT * FROM system_health WHERE key='analysis_cron'"
# Alert: last_fired_at > 26h ago.

# Any unresolved failures?
pnpm exec wrangler d1 execute shipeasy-db --remote --command \
  "SELECT project_id, failed_at, message_body FROM analysis_failures WHERE resolved_at IS NULL ORDER BY failed_at DESC"
```

**Fix → re-enqueue** without waiting for tomorrow's cron:

```bash
# After deploying the fix:
cd packages/worker && pnpm exec wrangler deploy
# Re-enqueue failed projects (one message per project, trigger=reanalyze to redo completed experiments too):
for pid in <ids>; do
  pnpm exec wrangler queues publish experiment-analysis \
    --message "{\"project_id\":\"$pid\",\"trigger\":\"reanalyze\"}"
done
# Confirm resolution:
pnpm exec wrangler d1 execute shipeasy-db --remote --command \
  "SELECT project_id, resolved_at FROM analysis_failures ORDER BY failed_at DESC LIMIT 10"
```

### 2. "SDK still sees old flag values after an admin change"

CDN purge failed or is still pending.

```bash
wrangler tail --name shipeasy-worker --search purgeCache
wrangler tail --name shipeasy --search purgeCache
# Pending purges (async retry) are parked in KV:
pnpm exec wrangler kv key list --namespace-id e0ddf5c86029435880897410ca270488 --prefix purge_pending:
```

The `*/5 * * * *` purge-retry cron ([packages/worker/src/analysis/purge-retry.ts](../../../packages/worker/src/analysis/purge-retry.ts)) drains these. If they're accumulating, it's almost always a missing **Cache Purge** scope on `CF_API_TOKEN` — re-check at **§ CF_API_TOKEN scopes**.

### 3. "Deploy succeeded but SDK returns 5xx / empty"

Likely a mismatch between wrangler config IDs and live resources. Compare:

```bash
wrangler kv namespace list
wrangler d1 list
wrangler r2 bucket list
wrangler queues list
# Then grep wrangler configs for each id and bucket_name.
```

### 4. "KV blob getting too big"

KV value limit is 25MB; `rebuildFlags` / `rebuildExperiments` pre-check at 24MB and throw.

```bash
# Inspect a project's blob size:
pnpm exec wrangler kv key get --namespace-id e0ddf5c86029435880897410ca270488 "<project_id>:flags" | wc -c
pnpm exec wrangler kv key get --namespace-id e0ddf5c86029435880897410ca270488 "<project_id>:experiments" | wc -c
```

### 5. "Events not showing up"

`/collect` is fire-and-forget to AE. Detection signal is `ae_sample_drop_warning` emitted by the analysis cron when today's N drops >20% vs yesterday ([packages/worker/src/analysis/consumer.ts](../../../packages/worker/src/analysis/consumer.ts)).

Check zone rate-limit rules and any WAF custom rule matches. For i18n `/collect` specifically, confirm the SDK key has `scope='i18n'` — a mismatched scope throws 403 before the event is even queued.

### 6. "Auth not working / users signed out"

Auth.js JWT TTL is 15 min by design. If truly broken:

```bash
wrangler secret list --name shipeasy | grep AUTH_SECRET
# Verify NEXTAUTH_URL in wrangler.jsonc matches the deployed host.
```

### 7. "i18n chunk not available at labels.shipeasy.ai"

R2 serves chunks publicly via the custom domain. Verify in order:

```bash
wrangler r2 bucket domain list i18n-labels
# → labels.shipeasy.ai should be enabled; ssl_status=active (pending for ~5 min after provisioning).

# Is the object there?
wrangler r2 object get i18n-labels/labels/<pid>/<profile_id>/<chunk>.<hash>.json | head -c 200

# Is public access enabled on the bucket?
# Check via dashboard (no CLI): R2 → i18n-labels → Settings → Public access = Allow
```

If public access is off, `https://labels.shipeasy.ai/labels/...` returns 401. If SSL is still pending, browsers show a cert error — wait out the 5-minute provisioning window.

---

## Runbook — first-time resource provisioning

Only useful when bootstrapping a staging account. For production, use the inventory table above. These exact commands were used to provision current prod on 2026-04-17:

```bash
# KV
wrangler kv namespace create FLAGS_KV
wrangler kv namespace create CLI_TOKEN_KV

# Queues
wrangler queues create experiment-analysis
wrangler queues create experiment-analysis-dlq
wrangler queues create i18n-usage
wrangler queues create i18n-usage-dlq

# R2
wrangler r2 bucket create shipeasy-events
wrangler r2 bucket create i18n-labels

# R2 public domain (R2 → i18n-labels → Settings → Public access → Allow — dashboard only)
wrangler r2 bucket domain add i18n-labels \
  --domain labels.shipeasy.ai \
  --zone-id 327bf22a5c585b1a72387bea588bf212 \
  --min-tls 1.2

# Analytics Engine (dashboard one-click, see § above)
# Then uncomment analytics_engine_datasets blocks in packages/worker/wrangler.toml.

# Secrets on edge worker
echo "$CF_API_TOKEN_VALUE"       | wrangler secret put CF_API_TOKEN       --name shipeasy-worker
openssl rand -hex 32 | tee /dev/stderr | wrangler secret put CLI_SERVICE_SECRET --name shipeasy-worker

# Mirror shared secrets onto UI worker (use the SAME CLI_SERVICE_SECRET value):
echo "$CF_API_TOKEN_VALUE"        | wrangler secret put CF_API_TOKEN       --name shipeasy
echo "$CLI_SERVICE_SECRET_VALUE"  | wrangler secret put CLI_SERVICE_SECRET --name shipeasy

# D1 migrations
cd packages/worker
pnpm exec drizzle-kit generate
pnpm exec wrangler d1 migrations apply shipeasy-db --remote
```

**Important:** `CLI_SERVICE_SECRET` must be **byte-identical** on both Workers — the UI sends it, the worker `safeCompare`s it. Regenerating it on one Worker without mirroring breaks `flaglab login` / `shipeasy login`.

---

## Runbook — WAF / SDK bypass rule

Zone-level managed challenges block unauthenticated curl of `cdn.shipeasy.ai`. Add a custom WAF rule to exempt authenticated SDK paths:

**Dashboard:** https://dash.cloudflare.com/b3b935b0b2a42ae7ec5029cd3de2f0e8/shipeasy.ai/security/waf/custom-rules → Create rule.

| Field      | Value                                                                                                                                                                                                                                                                          |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Name       | `shipeasy SDK bypass`                                                                                                                                                                                                                                                          |
| Expression | `(http.host eq "cdn.shipeasy.ai" and (starts_with(http.request.uri.path, "/sdk/") or http.request.uri.path eq "/collect" or starts_with(http.request.uri.path, "/auth/device/") or http.request.uri.path eq "/healthz" or http.request.uri.path eq "/.well-known/i18n.json"))` |
| Action     | **Skip**                                                                                                                                                                                                                                                                       |
| Skip       | All remaining custom rules, Managed Rulesets, Rate limiting, Super Bot Fight Mode                                                                                                                                                                                              |
| Placement  | First                                                                                                                                                                                                                                                                          |

The `/sdk/*` prefix covers both experiment (`/sdk/flags`, `/sdk/experiments`, `/sdk/evaluate`, `/sdk/bootstrap`) and i18n (`/sdk/i18n/manifest/*`, `/sdk/i18n/discovery/*`, `/sdk/i18n/collect`, `/sdk/i18n/loader.js`) endpoints. Auth is enforced at the Worker in [packages/worker/src/lib/auth.ts](../../../packages/worker/src/lib/auth.ts) via `requireKey()`.

---

## Runbook — i18n label chunk publish flow

_(Phase 2 of [string-manager-platform/plan.md](string-manager-platform/plan.md); partially implemented.)_

1. Server Action in `apps/ui` validates input, runs `checkLimit(env, projectId, 'label_keys', plan)`, writes/updates `label_keys` rows in D1.
2. Server Action builds the chunk JSON, computes `content_hash = sha256(body).slice(0,12)`, uploads to R2:
   ```
   PUT s3://i18n-labels/labels/{project_id}/{profile_id}/{chunk_name}.{content_hash}.json
   Cache-Control: public, max-age=31536000, immutable
   ```
3. Server Action rewrites `labels/{project_id}/{profile_id}/manifest.json` (non-immutable).
4. `rebuildI18nManifest(env, projectId)` → `env.FLAGS_KV.put('{pid}:i18n-manifest', ...)`.
5. `purgeCache(env, '/sdk/i18n/manifest/{project_id}')` (3× retry → purge_pending KV fallback).
6. Audit log row.

Customer loader flow:

```
loader.js → GET cdn.shipeasy.ai/sdk/i18n/manifest/{pid} (worker, KV-backed, ETag-cached)
         → GET labels.shipeasy.ai/labels/{pid}/{profile}/{chunk}.{hash}.json (R2 direct, 1y immutable)
```

### Debug chunk availability

```bash
# List uploaded chunks for a project/profile:
wrangler r2 object list i18n-labels --prefix "labels/<pid>/<profile_id>/"
# Fetch a specific chunk via the CDN:
curl -sS -D - "https://labels.shipeasy.ai/labels/<pid>/<profile_id>/<chunk>.<hash>.json" | head -20
# Inspect the manifest blob:
wrangler kv key get --namespace-id e0ddf5c86029435880897410ca270488 "<pid>:i18n-manifest" | jq .
```

---

## Runbook — R2 custom domain management

Adding or removing a custom domain on an R2 bucket (useful for staging or renaming):

```bash
wrangler r2 bucket domain list i18n-labels
wrangler r2 bucket domain add i18n-labels \
  --domain labels.shipeasy.ai \
  --zone-id 327bf22a5c585b1a72387bea588bf212 \
  --min-tls 1.2
wrangler r2 bucket domain remove i18n-labels --domain <legacy>
wrangler r2 bucket domain get i18n-labels --domain labels.shipeasy.ai
```

SSL provisioning (`ssl_status=pending → active`) takes ≤5 min after `add`. The bucket's public-access toggle is dashboard-only: **R2 → i18n-labels → Settings → Public access → Allow**. Without it, the custom domain returns 401.

---

## Runbook — rollback

### Edge Worker rollback

```bash
cd packages/worker
pnpm exec wrangler deployments list
pnpm exec wrangler rollback <version-id>
# Or interactively:
pnpm exec wrangler rollback
```

Cloudflare keeps the last 10 versions. Rollback is near-instant (isolates flip within seconds).

### UI Worker rollback

Not via CLI. Dashboard → **Workers & Pages → shipeasy → Deployments → [prior deployment] → Rollback**. Custom domain routes within ~30s.

### D1 rollback

No automatic rollback on any D1 tier. Always write an explicit reversal migration (`000N_rollback_<feature>.sql`) and apply it manually. Prefer preventing the need: apply migrations to staging first, run full Playwright suite, then prod.

### Queue message replay

```bash
# Re-enqueue a message that the DLQ picked up:
wrangler queues publish experiment-analysis \
  --message '{"project_id":"<id>","trigger":"reanalyze"}'
```

---

## Runbook — dead-table cleanup

Historical `i18n-api` left 14 empty tables in `shipeasy-db` that were cleaned up on 2026-04-17:

```
accounts, users, members, api_keys, api_tokens,
email_auth_codes, refresh_tokens, developer_seats,
invitations, app_memberships, audit_events,
cli_auth_requests, oauth_states, webhooks
```

The 5 legacy `label_*` tables had a different (account-scoped) schema and were re-created with `project_id` scoping as part of migration `0001_far_wendigo.sql`.

Before dropping any table in D1, **always verify zero rows** on every candidate:

```bash
for t in <comma_list>; do
  pnpm exec wrangler d1 execute shipeasy-db --remote --command "SELECT COUNT(*) FROM $t" \
    | grep -oE '"[A-Z0-9_()*]+": [0-9]+' | head -1
done
```

---

## D1 query cheat sheet

```sql
-- Migration history
SELECT id, name, applied_at FROM d1_migrations ORDER BY id DESC LIMIT 10;

-- Unresolved analysis failures
SELECT project_id, failed_at, message_body
FROM analysis_failures WHERE resolved_at IS NULL
ORDER BY failed_at DESC;

-- Cron heartbeats
SELECT * FROM system_health ORDER BY last_fired_at DESC;

-- Project + plan
SELECT id, name, plan, created_at FROM projects ORDER BY created_at DESC LIMIT 20;

-- Live SDK keys by project
SELECT id, type, scope, created_at, expires_at
FROM sdk_keys
WHERE project_id = '<pid>' AND revoked_at IS NULL
ORDER BY created_at DESC;

-- Pending event-catalog approvals (auto-discovered from /collect)
SELECT project_id, name, created_at FROM events WHERE pending = 1 ORDER BY created_at DESC;

-- Most recent final results for an experiment
SELECT metric, group_name, n, mean, delta, p_value, is_final
FROM experiment_results
WHERE project_id = '<pid>' AND experiment = '<name>' AND is_final = 1
ORDER BY metric, group_name;

-- i18n publish status per profile
SELECT p.name AS profile, c.name AS chunk, c.published_at, c.published_hash
FROM label_profiles p
JOIN label_chunks c ON c.profile_id = p.id
WHERE p.project_id = '<pid>'
ORDER BY p.name, c.name;
```

Run remote: `pnpm exec wrangler d1 execute shipeasy-db --remote --command "..."`.
Run local (miniflare-backed during `wrangler dev`): same with `--local`.

---

## Health signals & alert thresholds

| Signal                               | Source                                                                | Alert when                                                      |
| ------------------------------------ | --------------------------------------------------------------------- | --------------------------------------------------------------- |
| Analysis cron fired                  | `system_health.last_fired_at` for key=`analysis_cron`                 | > 26h ago                                                       |
| Analysis DLQ                         | `analysis_failures` rows where `resolved_at IS NULL`                  | any row < 26h old                                               |
| CDN purge failed                     | log event `cdn_purge_failed` (CRITICAL) + `purge_pending:*` KV growth | any occurrence                                                  |
| KV blob oversize                     | dashboard R/W on `{pid}:flags` or `{pid}:experiments`                 | >20 MB (80% of 24 MB pre-check)                                 |
| AE sample drop                       | log event `ae_sample_drop_warning`                                    | any occurrence                                                  |
| R2 chunk 404 on `labels.shipeasy.ai` | user report or canary                                                 | any occurrence (manifest referenced a hash that never uploaded) |

Optional external dead-man: set `CRONITOR_HEARTBEAT_URL` on `shipeasy-worker` — the analysis cron pings it after a successful fan-out.

---

## References

- [experiment-platform/08-deployment.md](experiment-platform/08-deployment.md) — wrangler.toml template, deployment order, DLQ replay, rate limits.
- [experiment-platform/13-runtime-boundary.md](experiment-platform/13-runtime-boundary.md) — UI Worker vs edge Worker responsibility map.
- [experiment-platform/02-kv-cache.md](experiment-platform/02-kv-cache.md) — KV blob layout, CDN purge SLA, async purge retry.
- [experiment-platform/06-analysis.md](experiment-platform/06-analysis.md) — analysis pipeline, AE SQL queries, CUPED freeze, R2 archival.
- [string-manager-platform/plan.md](string-manager-platform/plan.md) — authoritative i18n plan post-unification.
- [string-manager-platform/deployment.md](string-manager-platform/deployment.md) — **historical**, pre-unification multi-worker design. Ignore the multi-worker/multi-Pages topology; keep only the R2 loader upload section and Cloudflare Access notes.
- [CLAUDE.md](CLAUDE.md) — monorepo commands + architectural invariants.
