# Runtime Boundary — Dashboard vs Worker

This document defines exactly what runs where and why. Every ambiguous operation
has an explicit home. If you're unsure where a new piece of code belongs, this
document is the decision framework.

---

## Mental Model

These are **two separate Cloudflare Workers** that deploy independently:

- **Pages Functions Worker** — `@cloudflare/next-on-pages` compiles the Next.js app (Server Components, Server Actions, API routes, middleware) into a Worker managed by Cloudflare Pages. Owns admin CRUD, auth, and D1/KV writes for admin mutations.
- **flags-worker** — the explicitly deployed `wrangler deploy` Worker. Owns the SDK hot path, background jobs (cron/queue), and CLI device auth.

Both bind the same D1 database and KV namespace — they share data infrastructure.
Communication between them is limited to the CLI auth relay (Service Binding for `/auth/device/complete`).

```
┌─────────────────────────────────────────────────────────────┐
│  Pages Functions Worker  (Next.js — apps/ui)                │
│                                                             │
│  • All UI rendering (server + client components)            │
│  • Auth.js session management (Google OAuth / JWT, 15-min)  │
│  • All admin CRUD (Server Actions + Route Handlers)         │
│  • D1 reads and writes (admin mutations)                    │
│  • KV writes (rebuildFlags, rebuildExperiments)              │
│  • CDN purge (on admin mutations)                           │
│  • CLI auth relay page (/cli-auth → Worker device flow)     │
│  • Project provisioning (inline in Auth.js jwt callback)    │
│  • SDK key validation for CLI requests (X-SDK-Key)          │
└────────────────────┬────────────────────────────────────────┘
                     │ Service Binding — only for CLI auth relay
                     │ (/cli-auth/complete → Worker /auth/device/complete)
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  flags-worker  (packages/worker — wrangler deploy)          │
│                                                             │
│  • SDK hot path (KV reads, CDN cached)                      │
│  • Event ingestion (/collect → Analytics Engine)            │
│  • CLI device auth (/auth/device/*)                         │
│  • Background jobs (cron, queue consumers)                  │
│  • D1 reads (SDK key validation, analysis)                  │
│  • D1 writes (analysis results, CUPED baselines)            │
│  • AE writes (event ingestion) + AE SQL reads (analysis)    │
│  • NO admin CRUD. NO JWT verification.                       │
│                                                             │
│  TWO distinct request classes:                              │
│  1. Production hot path  (SDK reads, event ingestion)       │
│  2. Background jobs      (cron, queue consumers)            │
└─────────────────────────────────────────────────────────────┘
```

**The invariant:** The Dashboard owns admin auth and mutations.
The Worker owns the production hot path and background computation.
Both share `@flaglab/core` for DB schema, KV rebuild, eval logic, and plans.

**Service Binding usage:** Retained only for CLI auth relay. The `/cli-auth/complete`
page in Next.js calls `env.FLAGS_WORKER.fetch('/auth/device/complete', ...)` because
the Worker owns `CLI_TOKEN_KV` for one-time token delivery. All other admin operations
go directly from Next.js to D1/KV — no Service Binding needed.

---

## Dashboard Responsibilities (apps/ui)

### What it owns

| Responsibility | Implementation | Notes |
|---|---|---|
| User session | Auth.js v5 JWT (Google, GitHub, magic link), 15-min expiry | JWT stored in cookie, no D1 session table |
| Project provisioning | `auth.ts` JWT callback writes directly to D1 | Happens once per new user; creates project + SDK keys inline |
| All admin CRUD | Server Actions (browser) + Route Handlers (CLI) | D1 write → KV rebuild → CDN purge |
| Admin UI pages | Next.js Server + Client Components | Gates, experiments, results, settings |
| Results rendering | Server Component reads from D1 via Route Handler | Reads `experiment_results` table directly |
| CLI auth relay | `/cli-auth` page + `/cli-auth/complete` API route | Bridges Auth.js session → Worker device flow |
| Input validation | `@conform-to/zod` + Zod schemas from `@flaglab/core` | Full validation, not just pre-validation |
| CLI admin auth | `authenticateAdmin()` validates SDK key via KV | Same KV lookup as Worker uses for SDK hot path |
| Static assets | Cloudflare Pages CDN | No Worker involvement |

### Admin mutation pattern

Every admin mutation follows this pattern — no Service Binding proxy:

```
User action (form submit / button click)
    ↓
Next.js Server Action (browser) or Route Handler (CLI)
    ↓ authenticateAdmin() → { projectId }
    ↓ Zod validation (from @flaglab/core)
    ↓ checkLimit() (from @flaglab/core)
    ↓ D1 write via scopedDb()
    ↓ rebuildFlags() / rebuildExperiments() → KV write + CDN purge
    ↓
Dashboard re-renders with updated data (SWR revalidate or server rerender)
```

See `03-worker-endpoints.md` § Admin request authorization (Next.js) for the full `authenticateAdmin()` implementation.
```

### Auth.js scope

Auth.js handles login/logout (OAuth, magic link), JWT session persistence, and project provisioning (inline D1 write in `jwt` callback on first login). SDK key management and CLI device auth are collaborative: CLI device flow is Worker-side, SDK key CRUD is Next.js-side.

### Next.js middleware scope

```typescript
// apps/ui/middleware.ts
import { auth } from '@/auth'
import { NextResponse } from 'next/server'

export default auth((req) => {
  // Redirect unauthenticated users to login for protected routes
  if (!req.auth && req.nextUrl.pathname.startsWith('/app')) {
    return NextResponse.redirect(new URL('/login', req.url))
  }
  // API admin routes: no redirect — authenticateAdmin() handles auth in handlers

  // CSP: mitigates XSS on the admin UI. Without this, an XSS payload could invoke
  // Server Actions using the victim's session cookie (httpOnly prevents exfiltration
  // but not same-origin requests). script-src 'self' blocks inline/injected scripts.
  const res = NextResponse.next()
  res.headers.set('Content-Security-Policy', "script-src 'self'; object-src 'none'; base-uri 'self'")
  return res
})

export const config = {
  matcher: ['/app/:path*'],
}
```

Middleware only gates UI page access. API routes (`/api/admin/*`) authenticate
via `authenticateAdmin()` in each handler — middleware does not run for them.

---

## Worker Responsibilities (packages/worker)

The Worker has two operationally distinct request classes (admin write path moved to Next.js).

---

### Class 1 — Production Hot Path

These endpoints are called by customer SDKs in production. They are on the
critical path for customer applications. Latency target: < 5ms Worker CPU time.
CDN absorbs > 95% of requests at scale.

| Endpoint | Auth | Primary storage | CDN cached? |
|---|---|---|---|
| `GET /sdk/flags/:projectId` | server SDK key | KV `:flags` blob | Yes — infinite TTL, purge on change |
| `GET /sdk/experiments/:projectId` | server SDK key | KV `:experiments` blob | Yes — infinite TTL, purge on change |
| `POST /sdk/evaluate` | client SDK key | KV (both blobs) | No — user-specific response |
| `POST /collect` | client SDK key | Analytics Engine (write-only) | No |
| `GET /sdk/bootstrap` | server SDK key | KV (both blobs) | No — user-specific |

**Rules for hot-path endpoints:**

- **No D1 reads on the hot path** — the only D1 touch is the SDK key lookup,
  which is module-scope cached for 60s. After the cache warms, zero D1 queries
  per request.
- **No synchronous computation** — `evalGate` and `evalExperiment` run in Worker
  memory from the KV blob. No network calls during evaluation.
- **Fire-and-forget for AE** — `/collect` calls `env.AE.writeDataPoint()` without
  awaiting. The Worker returns 202 immediately.
- **ETag / 304** — both `/sdk/flags` and `/sdk/experiments` implement conditional
  GET. SDKs send `If-None-Match`; Workers return 304 when content hasn't changed.
  No KV read needed for a 304 (version is in module-scope cache).

```
/sdk/flags request lifecycle:
  1. Auth: sha256(X-SDK-Key) → module-scope keyCache (60s TTL) → D1 on miss
  2. getFlags(projectId):
       a. flagsCache hit (10s TTL) → return immediately
       b. miss → KV.get(projectId:flags) → parse JSON → cache 10s → return
  3. Build Cache-Control from plan's poll_interval (read from PLANS bundle, no D1)
  4. ETag check → 304 if unchanged
  5. Return blob with CDN headers
  Total D1 reads (warm): 0
  Total KV reads (CDN hit): 0
  Total KV reads (CDN miss, module cache hit): 0
  Total KV reads (CDN miss, module cache miss): 1
```

### Admin Write Path (Next.js — NOT on Worker)

Admin CRUD has moved to Next.js Server Actions and Route Handlers. See `03-worker-endpoints.md`
for the full endpoint reference. All admin endpoints live at `/api/admin/*` on the Pages domain.

Auth is dual: Auth.js JWT (browser) or SDK key (CLI), via `authenticateAdmin()`.
Every mutation follows: authenticate → validate → checkLimit → D1 write → rebuildFlags/rebuildExperiments → CDN purge.

The Worker has **no admin endpoints and no JWT verification**.

#### Admin endpoints by resource (Next.js Route Handlers)

```
── Gates ──────────────────────────────────────────────────────
POST   /api/admin/gates                → INSERT gates + rebuildFlags
PATCH  /api/admin/gates/:id            → UPDATE gates + rebuildFlags
PATCH  /api/admin/gates/:id/enable     → UPDATE enabled=1 + rebuildFlags
PATCH  /api/admin/gates/:id/disable    → UPDATE enabled=0 + rebuildFlags

── Configs ────────────────────────────────────────────────────
POST   /api/admin/configs              → INSERT configs + rebuildFlags
PATCH  /api/admin/configs/:id          → UPDATE value + rebuildFlags

── Experiments ────────────────────────────────────────────────
POST   /api/admin/experiments          → INSERT experiments (status=draft)
PATCH  /api/admin/experiments/:id      → UPDATE metadata + rebuildExperiments
PATCH  /api/admin/experiments/:id/status → start/stop + CUPED freeze + ANALYSIS_QUEUE
POST   /api/admin/experiments/:id/reanalyze → recompute results
POST   /api/admin/experiments/:id/archive → UPDATE status=archived
POST   /api/admin/experiments/:id/metrics → INSERT experiment_metrics

── Universes ──────────────────────────────────────────────────
POST   /api/admin/universes            → INSERT universes + rebuildExperiments
PATCH  /api/admin/universes/:id        → UPDATE holdout_range + rebuildExperiments

── Metrics / Events / Attributes ─────────────────────────────
POST   /api/admin/metrics              → INSERT metrics
POST   /api/admin/events               → INSERT events
PATCH  /api/admin/events/:id           → UPDATE pending=0 (approve auto-discovered)
POST   /api/admin/attributes           → INSERT user_attributes

── SDK Keys ───────────────────────────────────────────────────
POST   /api/admin/keys                 → INSERT sdk_keys + KV write
PATCH  /api/admin/keys/:id/revoke      → UPDATE revoked_at + KV delete

── Projects ───────────────────────────────────────────────────
PATCH  /api/admin/projects/:id         → UPDATE name + rebuildFlags
POST   /api/admin/projects/:id/plan    → UPDATE plan (billing flow) + rebuildFlags

── Read endpoints ─────────────────────────────────────────────
GET    /api/admin/gates, experiments, universes, metrics, events, attributes, keys, plans
GET    /api/admin/experiments/:id/results, timeseries
GET    /api/admin/projects/:id/storage

── Worker-only (CLI device auth) ──────────────────────────────
POST   /auth/device/start              → D1 INSERT cli_auth_sessions (Worker)
POST   /auth/device/complete           → PKCE verify + SDK key + CLI_TOKEN_KV (Worker)
GET    /auth/device/poll               → PKCE verify + CLI_TOKEN_KV.get (Worker)
```

Note: `experiments/:id/reanalyze` and `experiments/:id/status` (stop) enqueue
messages to `ANALYSIS_QUEUE` on the Worker. Next.js uses the Service Binding
(`env.FLAGS_WORKER.fetch(...)`) or direct Queue API to send these messages.

---

### Class 2 — Background Jobs

These run on Cloudflare's scheduler and queue infrastructure. No external caller.
No auth required (they run inside Cloudflare's trusted boundary).

#### Cron 1 — Analysis fan-out (02:00 UTC daily)

```
runAnalysisCron():
  1. SELECT DISTINCT project_id FROM projects p
        JOIN experiments e ON e.project_id = p.id
        WHERE e.status = 'running'
     → D1 read, typically < 50ms

  2. ANALYSIS_QUEUE.sendBatch(projects.map(p => ({ body: { project_id: p.id } })))
     → Cloudflare Queues write

  3. Write AE heartbeat: EXPOSURES.writeDataPoint({ indexes: ['__system__'], ... })
  4. Ping CRONITOR_HEARTBEAT_URL (optional dead man's switch)
```

#### Queue consumer — Per-project analysis

Message shape: `{ project_id, trigger, experiment? }`

```
consumeAnalysis({ project_id, trigger, experiment? }):

  trigger='daily':            select experiments WHERE status='running'
  trigger='experiment_stopped': select experiment WHERE name=? (status may be 'stopped')
  trigger='reanalyze':        select all experiments WHERE status IN ('running','stopped')

  isFinal = trigger IN ('experiment_stopped', 'reanalyze')

  For each selected experiment:
    1. AE SQL + R2 fallback: first exposures (paginated, with R2 for old data)
    2. AE SQL + R2 fallback: metric events per user
    3. In-memory join: build byGroup map
    4. Winsorize → CUPED → mSPRT → Welch t-test → SRM detection
    5. D1 INSERT OR REPLACE INTO experiment_results (is_final=isFinal)
    6. computeVerdict → store in D1

  On success: D1 UPDATE analysis_failures SET resolved_at = now
  On failure: retry up to 3×; DLQ writes analysis_failures row on 3rd failure
```

#### DLQ consumer — Analysis failure logging

```
consumeAnalysisDlq({ project_id }):
  D1 INSERT OR REPLACE INTO analysis_failures (project_id, failed_at, retry_count=3, message_body)
  Structured log → alerting channel
```

#### Cron 2 — Retention purge (03:00 UTC daily)

```
runRetentionPurge():
  For each project (SELECT id, plan FROM projects):
    plan = getPlan(project.plan)  ← bundle, no D1
    cutoff = today - plan.results_retention_days

    D1: DELETE FROM experiment_results WHERE project_id=? AND ds < ? AND is_final=0
    D1: Archive is_final=1 rows older than results_final_archive_days to R2, then delete
    D1: DELETE FROM audit_log WHERE project_id=? AND created_at < audit_log_retention_days
    D1: DELETE FROM user_metric_baseline WHERE project_id NOT IN (running experiments)
    D1: DELETE FROM cli_auth_sessions WHERE expires_at < ? AND status IN ('expired','complete')
  Ping CRONITOR_HEARTBEAT_URL
```

**Background jobs have no HTTP response.** They succeed silently or write to
`analysis_failures` + structured logs. They never throw unhandled exceptions —
all per-experiment errors are caught so one bad experiment doesn't abort the rest.

---

## Data Ownership by Storage Layer

| Storage | Owner | Notes |
|---|---|---|
| **D1** | Shared (Dashboard + Worker) | Dashboard writes admin mutations; Worker writes analysis results + CUPED baselines |
| **KV** (FLAGS_KV) | Shared (Dashboard + Worker) | Dashboard writes KV blobs on admin mutations; Worker reads for SDK hot path |
| **KV** (CLI_TOKEN_KV) | Worker exclusively | Single-use token delivery for CLI auth |
| **Analytics Engine** | Worker exclusively (writes + reads) | `/collect` writes; analysis cron reads via AE SQL |
| **ANALYSIS_QUEUE** | Worker cron writes, Worker consumer reads | Next.js enqueues via Service Binding for stop/reanalyze |
| **Auth.js JWT** | Dashboard exclusively | Worker never reads or verifies JWTs |
| **Cloudflare Pages env vars** | Dashboard process | AUTH_SECRET, CLI_SERVICE_SECRET, CF_API_TOKEN, OAuth secrets |
| **Worker secrets** | Worker process | CF_API_TOKEN, CLI_SERVICE_SECRET, RESEND_API_KEY |

---

## Authorization Map — Where Each Check Runs

```
Dashboard (Next.js middleware):
  ✓ Is there a valid Auth.js session? (redirect to /login if not)
  ✗ Does not run on /api/admin/* routes — auth handled in handlers

Dashboard (Next.js Server Action — browser):
  ✓ authenticateAdmin() → Auth.js session → project_id from JWT
  ✓ Is the plan limit satisfied? (checkLimit from @flaglab/core)

Dashboard (Next.js Route Handler — CLI):
  ✓ authenticateAdmin() → SDK key validation → project_id from KV
  ✓ Is the plan limit satisfied? (checkLimit from @flaglab/core)

Worker (SDK hot path):
  ✓ Is the SDK key valid and of the right type? (validateSdkKey from @flaglab/core)
  ✗ No project ownership check — key is scoped to project already

Worker (background jobs):
  ✗ No auth — runs inside Cloudflare trusted boundary
```

---

## Request Flows — Key Operations

### Gate create (Dashboard user)

```
1. User fills gate form in browser → clicks Save
2. Browser → Next.js Server Action (actions/gates.ts → createGate)
3. Server Action: authenticateAdmin() → { projectId } from Auth.js JWT
4. Server Action: gateCreateSchema.parse(formData) — Zod validation
5. Server Action: checkLimit(env, projectId, 'flags', plan) — D1 SELECT COUNT
6. Server Action: D1 INSERT INTO gates via scopedDb()
7. Server Action: rebuildFlags(env, projectId, planName)
     a. D1 SELECT all gates, all configs for project
     b. JSON.stringify blob
     c. KV.put(projectId:flags, blob)
     d. purgeCache('/sdk/flags/projectId') → CF Cache Purge API
8. Server Action → Browser: revalidatePath('/gates'), SWR revalidates
9. CDN purge acknowledged (~150ms); KV global replication completes within 60s
```

### SDK flag evaluation (customer server)

```
1. Customer's server SDK polls /sdk/flags (every plan.poll_interval seconds)
2. Request hits Cloudflare CDN edge node
3. Cache hit (max-age=31536000, not yet purged) → CDN returns blob, no Worker involved
   -- OR --
3. Cache miss (first request or after purge):
     a. CDN → Worker
     b. Worker: sha256(X-SDK-Key) → keyCache (60s) → D1 on miss
     c. Worker: getFlags(projectId) → flagsCache (10s) → KV on miss
     d. Worker: return blob with ETag + X-Poll-Interval + Cache-Control
     e. CDN: cache response for next requests
4. SDK: store blob in process memory
5. SDK: evalGate(gate, user) for each getFlag() call — pure in-memory, no network
```

### Experiment stop + final analysis (Dashboard user)

```
1. User clicks "Stop experiment"
2. Browser → Server Action (actions/experiments.ts → stopExperiment)
3. Server Action: authenticateAdmin() → { projectId }
4. Server Action: D1 UPDATE experiments SET status='stopped'
5. Server Action: enqueue ANALYSIS_QUEUE via Service Binding or Queue API
     { project_id, trigger: 'experiment_stopped', experiment: name }
6. Server Action: rebuildExperiments → KV write + CDN purge
7. Server Action → Browser: revalidatePath

Background (seconds to minutes later, depending on queue scheduling):
8. Worker queue consumer receives message
9. analyzeProject(project_id):
     a. AE SQL: pull exposures for this experiment
     b. AE SQL: pull metric events
     c. Welch t-test → SRM → verdict
     d. D1 INSERT INTO experiment_results (is_final=1)
     e. Clear analysis_failures if prior failure existed
10. Dashboard: user refreshes results page → sees final verdict
```

### CLI login (developer machine)

```
1. `flaglab login` → CLI generates state + code_verifier + code_challenge
2. CLI → Worker POST /auth/device/start
     Body: { state, code_challenge, expires_at: now+5min }
     → D1 INSERT INTO cli_auth_sessions (pending)
3. CLI opens browser: app.yourdomain.com/cli-auth?state=&code_challenge=
4. Browser → Next.js /cli-auth page → checks Auth.js session (redirect to OAuth if needed)
5. User completes OAuth → Auth.js session established
6. /cli-auth page renders CliAuthComplete component
7. CliAuthComplete → Next.js POST /api/cli-auth/complete
8. Next.js route handler → Worker POST /auth/device/complete
     Headers: X-Service-Key: CLI_SERVICE_SECRET
     Body: { state, project_id, code_verifier }
9. Worker: verify X-Service-Key
10. Worker: D1 atomic UPDATE status='processing' WHERE status='pending' (race guard)
11. Worker: PKCE verify: SHA256(code_verifier) == code_challenge
12. Worker: generate raw token, compute hash
13. Worker: D1 batch (INSERT sdk_keys + UPDATE cli_auth_sessions status=complete)
14. Worker: CLI_TOKEN_KV.put(cli_token:{state}, rawToken, { expirationTtl: 300 })
15. Worker → Next.js: { ok: true }

(Meanwhile, CLI is polling every 2s:)
16. CLI GET /auth/device/poll?state={state}
     Header: X-Code-Verifier: {code_verifier}
17. Worker: PKCE re-verify (prevents state theft)
18. Worker: CLI_TOKEN_KV.get + immediate delete (one-time delivery)
19. Worker → CLI: { token, project_id }
20. CLI: save to ~/.config/flaglab/config.json (via `conf`)
```

---

## What Belongs Where — Decision Rules

**Put it in the Dashboard (Next.js) if:**
- It renders HTML or JSON for a human user
- It needs the Auth.js session (user email, project_id from JWT)
- It is admin CRUD (create, read, update, disable) for gates/configs/experiments/etc.
- It needs to authenticate a browser user or a CLI via SDK key
- It writes D1 as part of an admin mutation
- It rebuilds KV blobs or purges CDN after an admin mutation

**Put it in the Worker if:**
- It is called by customer SDKs (not by the Dashboard or CLI)
- It must complete with zero D1 reads in the warm case
- It has a CDN caching opportunity
- It reads or writes Analytics Engine
- It performs statistical computation
- It must run on a schedule (cron) or in response to a queue message
- It handles CLI device auth (needs CLI_TOKEN_KV)

**Put it in @flaglab/core if:**
- It is shared between Dashboard and Worker (DB schema, KV rebuild, eval logic, plans, limits, Zod schemas)
- It should be a single source of truth used by both runtimes

**Put it in background jobs (Worker) if:**
- It is triggered by time (daily analysis, retention purge, AE archival)
- It is triggered by an event that doesn't need a synchronous response (experiment stop → final analysis)
- It accesses Analytics Engine SQL (AE SQL is only available from a Worker context)
- It takes longer than a typical HTTP request budget

---

## Deployment Independence

Dashboard and Worker deploy independently. Neither deployment requires the other
to restart.

| Change | Deploy | Effect |
|---|---|---|
| UI page change | `apps/ui` deploy (CF Pages) | Immediate; Worker unchanged |
| New admin endpoint | `packages/worker` deploy | `wrangler deploy`; Dashboard picks up new endpoint automatically |
| Plan limit change | `packages/worker` deploy (plans.yaml edit) | All plan checks update; no D1 migration |
| Schema migration | `wrangler d1 migrations apply` then Worker deploy | Run migration before deploying Worker that needs new columns |
| SDK key rotation | Worker endpoint call (PATCH /admin/keys/:id/revoke) | KV revocation set updated; 60s module cache drain |
| AUTH_SECRET rotation | Pages env update only (Worker no longer uses AUTH_SECRET) | All active Auth.js sessions invalidated; all users must re-login |
| Cron schedule change | `wrangler.toml` + Worker deploy | Cloudflare updates trigger schedule |

**Never deploy in this order:** Worker first, then Dashboard, when a breaking
API change removes an endpoint that the current Dashboard version depends on.
Always: Dashboard first (backward compat) → Worker, or use feature flags on the
Worker to gate new behavior.

---

## Environment Variables — Where Each Lives

### Cloudflare Pages (Dashboard process)

```
AUTH_SECRET               = <Auth.js signing secret> — NOT in Worker (Worker doesn't verify JWTs)
AUTH_GOOGLE_ID            = <Google OAuth client ID>
AUTH_GOOGLE_SECRET        = <Google OAuth client secret>
RESEND_API_KEY            = <for magic link emails>
CF_API_TOKEN              = <Cache Purge scope only> — for CDN purge on admin mutations
CLI_SERVICE_SECRET        = <random 32-byte hex> — shared with Worker, protects /auth/device/complete
CF_ZONE_ID                = (var) zone for CDN purge
FLAGS_DOMAIN              = (var) flags.yourdomain.com
```

### Cloudflare Worker secrets (wrangler secret put)

```
CF_API_TOKEN              — Cache Purge scope only (for cron-triggered rebuilds)
CLI_SERVICE_SECRET        — protects /auth/device/complete
RESEND_API_KEY            — analysis failure alert emails
```

### Cloudflare Worker vars (wrangler.toml [vars])

```
CF_ZONE_ID                — zone for CDN purge
FLAGS_DOMAIN              — flags.yourdomain.com
CF_ACCOUNT_ID             — for AE SQL API calls from cron
CRONITOR_HEARTBEAT_URL    — optional dead man's switch
ALERT_EMAIL               — operator email for analysis failure notifications
```

### Removed from both processes

```
PROVISION_SERVICE_SECRET  — REMOVED (provisioning is inline in Auth.js callback)
AUTH_SECRET (Worker)       — REMOVED from Worker (Worker no longer verifies JWTs)
NEXT_TO_WORKER_SECRET     — REMOVED (was already removed; Service Binding is trust proof)
```

### Never in either process

```
Raw SDK keys              — generated in Next.js, delivered once, never stored in plaintext
```

---

## Anti-Patterns to Avoid

| Anti-pattern | Why it's wrong | Correct approach |
|---|---|---|
| Admin CRUD in Worker | Worker should only handle SDK hot path + background jobs; admin CRUD adds latency and complexity | Admin CRUD in Next.js Server Actions + Route Handlers |
| Worker verifies Auth.js JWTs | Worker has no admin endpoints; JWT verification is unnecessary overhead | Only Next.js verifies JWTs; Worker validates SDK keys only |
| D1 writes without scopedDb() | Missing `WHERE project_id` exposes cross-tenant data | Always use `scopedDb()` from `@flaglab/core` — in both Next.js and Worker |
| Worker renders HTML | Workers are not designed for SSR; Pages has better caching and asset handling | Worker returns JSON; Dashboard renders |
| Evaluation logic in Dashboard | evalGate/evalExperiment must stay in Worker (and SDK) — rule parity requires co-location with the data | Evaluation only in Worker + `@flaglab/core` |
| Dashboard polls AE SQL for dashboards | AE SQL is only for the Worker/cron context; latency and auth are wrong for UI | Cron writes results to D1; Dashboard reads from D1 directly |
| Worker calls Next.js | Worker doesn't know about the Dashboard; callbacks go through shared storage (KV, D1, queues) | One-way dependency: Dashboard calls Worker (only for CLI auth relay) |
| Raw SDK keys in env vars | Pages env vars are visible in CF dashboard to CF account members; SDK keys are secrets | Keys generated in Next.js, hashed immediately, raw key shown once in UI |
| Plan limits in UI only | UI can be bypassed; limits must be enforced at write time | `checkLimit()` from `@flaglab/core` before every INSERT — in Server Actions and Route Handlers |
| Skipping checkLimit because "it's just Next.js" | Next.js Route Handlers are the CLI's admin surface — same enforcement as browser | Every mutation path calls `checkLimit()` regardless of caller |
