# Design Decision: JWT Auth + Admin API Consolidation

## Goal

1. **Stateless JWT auth** — remove the `sessions` D1 table; no stored session state anywhere.
2. **Consolidate admin APIs into Next.js** — eliminate the Service Binding proxy pattern; Server Actions and Route Handlers talk to D1/KV directly.
3. **Slim the Worker** — Worker becomes SDK hot path + background jobs + CLI device auth only.

## Security Assessment

| Concern | Risk | Mitigation |
|---|---|---|
| No per-session revocation (sessions table removed) | LOW | 15-minute JWT expiry; compromised session self-expires. AUTH_SECRET rotation as nuclear option. |
| Pages Worker gains D1/KV write access | LOW | Same Cloudflare trust boundary; `scopedDb()` enforces project isolation identically. |
| CLI admin path moves to Next.js Route Handlers | LOW | CLI sends `X-SDK-Key`; Next.js validates against KV the same way Worker did. |
| CF_API_TOKEN (CDN purge) now in Pages env | LOW | Pages env vars are already trusted (they hold AUTH_SECRET, OAuth secrets). Scope is Cache Purge only. |
| plans.yaml no longer compiled into Worker only | NONE | Shared `@flaglab/core` package; same build-time import, no runtime difference. |

**No significant security risk from this consolidation.**

---

## Architecture — Before vs After

### Before

```
Browser → Next.js Server Action → workerFetch() → Service Binding → Worker → D1/KV/CDN
CLI     → HTTP X-SDK-Key        → Worker → D1/KV/CDN
SDK     → HTTP X-SDK-Key        → Worker (CDN) → KV
Cron    → Worker → D1/KV/AE
```

### After

```
Browser → Next.js Server Action → D1/KV/CDN directly
CLI     → Next.js Route Handler (X-SDK-Key) → D1/KV/CDN directly
SDK     → Worker (CDN) → KV                                        (unchanged)
Cron    → Worker → D1/KV/AE                                        (unchanged)
```

---

## What Does NOT Change

- SDK endpoints (Worker) — zero changes
- SDK packages (@flaglab/sdk) — zero changes
- MCP server — zero changes
- Analysis pipeline (Worker cron + queue) — zero changes
- KV blob shapes — zero changes
- CDN caching strategy — zero changes
- Rate limiting rules — unchanged (admin rules now apply to Next.js, not Worker)
- CLI command interface — zero changes (only base URL changes)

---

## Cross-References

The following details are now maintained in their canonical locations:

- **File structure:** See `03-worker-endpoints.md` § File Structure.
- **`authenticateAdmin()` implementation:** See `03-worker-endpoints.md` § Admin request authorization (Next.js).
- **Auth.js config (JWT callback, inline provisioning):** See `packages.md` § Auth.js (NextAuth v5) Integration.
- **Server Action and Route Handler patterns:** See `03-worker-endpoints.md` § Admin Endpoints.
- **Environment variables (final state):** See `13-runtime-boundary.md` § Environment Variables.
- **"What Goes Where" responsibility table:** See `13-runtime-boundary.md` § Dashboard Responsibilities and Worker Responsibilities.
- **Binding changes (wrangler.toml):** See `08-deployment.md`.
- **D1 schema changes (DROP sessions):** See `01-schema.md`.
- **Shared package (@flaglab/core) exports:** See `packages.md` § `packages/core/package.json`.
- **CLI changes (base URL migration):** See `09-cli.md`.
- **Rate limiting rules:** See `02-kv-cache.md`.

---

## Implementation Sequence

### Phase 1 — Extract @flaglab/core (no behavior change)

1. Create `packages/core/` with Drizzle schema, scopedDb, plans, kv helpers, eval logic, Zod schemas
2. Update `packages/worker/` imports to use `@flaglab/core`
3. Verify all Worker tests pass with shared imports
4. Deploy Worker — zero behavior change

### Phase 2 — Add D1/KV bindings to Pages + inline provisioning

1. Add D1 + KV bindings to Pages project settings
2. Move provisioning logic from Worker `/auth/provision` into Auth.js `jwt` callback
3. Remove `PROVISION_SERVICE_SECRET` from both environments
4. Deploy Pages — new users provisioned inline; existing users unaffected

### Phase 3 — Migrate admin endpoints to Next.js

1. Add Route Handlers under `app/api/admin/*` (CLI-facing REST)
2. Add Server Actions under `actions/*` (browser-facing mutations)
3. Update `authenticateAdmin()` to handle both JWT and SDK key
4. Add CF_API_TOKEN to Pages env (for CDN purge)
5. Migrate one endpoint at a time (gates first), verify CLI works
6. Remove migrated endpoint from Worker after Pages version is live

### Phase 4 — Remove Worker admin path + sessions table

1. Remove all `/admin/*` routes from Worker
2. Remove `verifyAuthJwt()`, `getProjectAndVerifyAccess()` from Worker
3. D1 migration: `DROP TABLE sessions`
4. Update Auth.js `maxAge` to 15 minutes
5. Remove `NEXT_TO_WORKER_SECRET` references (already gone if using Service Binding)
6. Deploy Worker (slimmed) then Deploy Pages (final)

### Phase 5 — CLI base URL migration

1. Update CLI `api_url` default from `flags.yourdomain.com` to `app.yourdomain.com/api`
2. Existing CLI installs: `flaglab login` re-saves credentials with new `api_url`
3. Keep Worker admin endpoints alive for 1 release cycle (deprecation window), then remove
