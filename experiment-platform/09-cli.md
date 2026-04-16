# CLI — `@flaglab/cli`

Full command-line interface for managing gates, configs, experiments, events and metrics.
No deletion anywhere — only create, update, stop/disable.

CLI admin commands hit **Next.js Route Handlers** at `app.yourdomain.com/api/admin/*`
(not the Worker). Auth is via admin SDK key (`X-SDK-Key` header), validated by Next.js.
The CLI auth device flow (`flaglab login`) still uses the Worker for PKCE completion.

## Auth Flow (with PKCE binding)

```
flaglab login
  1. CLI generates:
     - random state UUID
     - random code_verifier (32 bytes, base64url)
     - code_challenge = SHA256(code_verifier) base64url-encoded
  2. Opens browser: https://app.yourdomain.com/cli-auth?state=<state>&code_challenge=<challenge>
  3. Web app stores {state, code_challenge} — user logs in
  4. Web app backend POSTs to /auth/device/complete:
       { state, project_id, code_verifier }  ← verifier presented at server, not in browser
     Worker verifies: SHA256(code_verifier) == stored code_challenge
     Worker generates admin SDK key, stores ONLY token_hash in sdk_keys
     Worker stores token_hash (not raw token) in cli_auth_sessions
  5. CLI polls GET /auth/device/poll?state=<state>
       Header: X-Code-Verifier: <verifier>
     CLI sends X-Code-Verifier header — not in URL (not logged by infrastructure)
     Worker re-verifies PKCE on every poll (prevents state theft)
     → 202 while pending, 200+token when complete, 410 if expired
  6. CLI saves token to ~/.flaglab/credentials.json (chmod 600)
  7. All subsequent commands use: X-SDK-Key: <token>

Why PKCE:
  Without it, CLI_SERVICE_SECRET alone can complete any auth session.
  With PKCE, completing auth requires the code_verifier that only the CLI generated.
  Stealing the state UUID from the browser URL is useless without the verifier.
```

The `cli_auth_sessions` table schema is in `01-schema.md`. Apply via Drizzle migration generated from `packages/core/src/db/schema.ts` via `drizzle-kit generate`.

### Token Expiry Handling

The CLI checks token expiry on every command invocation. If the token expires within 7 days, a warning is printed. If the token is already expired, the CLI prints an error and exits.

```typescript
// In api/client.ts constructor — check expiry on every command
const creds = loadCredentials()
if (!creds) throw new Error('Not logged in. Run: flaglab login')

if (creds.expires_at) {
  const daysLeft = (new Date(creds.expires_at).getTime() - Date.now()) / 86_400_000
  if (daysLeft <= 0) {
    console.error('Session expired. Run: flaglab login')
    process.exit(1)
  }
  if (daysLeft <= 7) {
    console.warn(`⚠ Session expires in ${Math.ceil(daysLeft)} days. Run: flaglab login`)
  }
}
```

## Worker: CLI Device Auth Endpoints

The CLI PKCE device flow uses Worker endpoints (they need `CLI_TOKEN_KV` for one-time token delivery).

| Route | Auth | Called by |
|---|---|---|
| `POST /auth/device/start` | none | CLI (creates pending session in D1) |
| `POST /auth/device/complete` | `X-Service-Key: CLI_SERVICE_SECRET` | Next.js `/cli-auth/complete` relay after user login |
| `GET /auth/device/poll?state=` | none (state is the credential) | CLI (polling with X-Code-Verifier header) |

Worker implementation is in `packages/worker/src/auth/device.ts`. Key points: atomic
`status='processing'` UPDATE prevents double-completion races; raw token is stored in
`CLI_TOKEN_KV` (5-min TTL) not D1; deleted immediately on first retrieval.

## Next.js: Admin Endpoints (called by CLI)

All admin CRUD endpoints are Next.js Route Handlers at `/api/admin/*`.
The CLI sends `X-SDK-Key` header; Next.js validates it via `authenticateAdmin()`.

```
GET  /api/admin/experiments/:name           — single experiment by name
GET  /api/admin/experiments/:name/results   — results + verdict (from experiment_results D1)
POST /api/admin/experiments/:name/metrics   — attach metric with role
PATCH /api/admin/experiments/:name/status   — start/stop (sets status field)
```

## CLI Package Structure

```
packages/cli/
  package.json
  tsconfig.json
  bin/flaglab.js          — #!/usr/bin/env node + require('../dist/index.js')
  src/
    index.ts             — program setup, global flags, addCommand
    auth/
      login.ts           — browser open + poll loop
      logout.ts          — clear credentials
      whoami.ts          — print project_id + plan
      storage.ts         — ~/.flaglab/credentials.json (chmod 600)
    api/
      client.ts          — fetch wrapper, X-SDK-Key, ApiError
      types.ts           — Gate, Config, Experiment, Metric, ExperimentResult
    commands/
      gates.ts           — list|create|update|enable|disable
      configs.ts         — list|get|set
      experiments.ts     — list|create|start|stop|status + metric add
      events.ts          — list|register
      metrics.ts         — list|create
    util/
      output.ts          — printTable(), printJson(), statusColor()
      spinner.ts         — ora wrapper
      error.ts           — ApiError, handleError()
```

**Dependencies:** `commander`, `cli-table3`, `ora`, `chalk`, `open`

## Commands Reference

```
flaglab login
flaglab logout
flaglab whoami

flaglab gates list
flaglab gates create <name> --rollout <0-100> [--rules <json>] [--salt <s>] [--killswitch]
flaglab gates update <name> [--rollout <0-100>] [--rules <json>]
flaglab gates enable <name>
flaglab gates disable <name>                    # "stop" for gates

flaglab configs list
flaglab configs get <name>
flaglab configs set <name> <value>              # value parsed as JSON if valid, else string

flaglab experiments list
flaglab experiments create <name> \
  --universe <name> \
  --allocation <0-100> \
  [--groups <json>] \                          # [{name,weight,params}], weights are integers summing to 10000 (5000 = 50%)
  [--params <json>] \                          # {paramName: "string"|"bool"|"number"}
  [--targeting-gate <name>] \
  [--salt <s>]
flaglab experiments start <name>
flaglab experiments stop <name>                 # sets status=stopped, does not delete
flaglab experiments status <name>              # shows results table + verdict
flaglab experiments metric add <exp> <metric> --role goal|guardrail|secondary

flaglab events list
flaglab events register <name> \
  --description "..." \
  --property "value:number:required" \         # repeat for each property
  --property "currency:string:optional"

flaglab metrics list
flaglab metrics create <name> \
  --event <event_name> \
  --aggregation count_users|count_events|sum|avg|retention_7d|retention_30d \
  [--value-path <property_name>] \             # required for sum/avg
  [--winsorize <0-100>]                        # percentile cap, default 99
```

All commands accept `--json` (global flag) for machine-readable output and
`--project <id>` to override the default project from credentials.

## Key Implementations

### src/auth/storage.ts

Uses `conf` for cross-platform config storage with proper file permissions and atomic writes (see `packages.md` § `packages/cli/package.json`):

```typescript
import Conf from 'conf'

export interface Credentials {
  token: string; project_id: string; api_url: string; saved_at: string; expires_at: string
  // api_url points to Next.js: https://app.yourdomain.com/api
  // (was previously Worker: https://flags.yourdomain.com)
}

const store = new Conf<Credentials>({ projectName: 'flaglab' })

export const saveCredentials  = (c: Credentials) => store.set(c)
export const loadCredentials  = () => store.size > 0 ? store.store as Credentials : null
export const clearCredentials = () => store.clear()
// Stored at: ~/Library/Preferences/flaglab-nodejs/config.json (macOS)
//            ~/.config/flaglab-nodejs/config.json (Linux)
//            %APPDATA%\flaglab-nodejs\config.json (Windows)
```

### src/auth/login.ts

```typescript
export const loginCommand = new Command('login')
  .description('Authenticate with FlagLab')
  .action(async () => {
    const state         = randomUUID()
    const codeVerifier  = base64url(randomBytes(32))  // 32 random bytes
    const codeChallenge = base64url(createHash('sha256').update(codeVerifier).digest())
    const authUrl       = `${APP_URL}/cli-auth?state=${state}&code_challenge=${encodeURIComponent(codeChallenge)}`

    console.log('Opening browser for authentication...')
    console.log(`If it didn't open, visit:\n  ${authUrl}`)
    await open(authUrl)

    const spin    = spinner('Waiting for authentication...')
    const deadline = Date.now() + 300_000
    spin.start()

    while (Date.now() < deadline) {
      await sleep(2_000)
      // Include code_verifier in header — Worker re-verifies PKCE
      // Header avoids code_verifier appearing in server/proxy access logs
      const res = await fetch(`${API_URL}/auth/device/poll?state=${state}`, {
        headers: { 'X-Code-Verifier': codeVerifier },
      })

      if (res.status === 202) continue
      if (res.status === 403) { spin.fail('PKCE verification failed — possible interception attempt'); process.exit(1) }
      if (res.status === 410) { spin.fail('Session expired — run `flaglab login` again'); process.exit(1) }
      if (res.status === 200) {
        const { token, project_id } = await res.json()
        saveCredentials({ token, project_id, api_url: API_URL, saved_at: new Date().toISOString() })
        spin.succeed(`Logged in! Project: ${project_id}`)
        return
      }
    }
    spin.fail('Authentication timed out')
    process.exit(1)
  })
```

### src/api/client.ts

```typescript
export class ApiClient {
  constructor(private overrideProject?: string) {
    const creds = loadCredentials()
    if (!creds) throw new Error('Not logged in. Run: flaglab login')
    this.baseUrl   = creds.api_url
    this.token     = creds.token
    this.projectId = overrideProject ?? creds.project_id
  }

  async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers: {
        'X-SDK-Key':    this.token,
        'Content-Type': 'application/json',
        'User-Agent':   `flaglab-cli/${PKG_VERSION}`,
      },
      body: body ? JSON.stringify(body) : undefined,
    })
    if (res.status === 401) throw new ApiError('Not authenticated. Run: flaglab login', 401)
    if (res.status === 403) throw new ApiError('Forbidden', 403)
    if (!res.ok) throw new ApiError(`API error ${res.status}: ${await res.text()}`, res.status)
    if (res.status === 204) return null as T
    return res.json()
  }

  get<T>(path: string)                  { return this.request<T>('GET', path) }
  post<T>(path: string, body: unknown)  { return this.request<T>('POST', path, body) }
  patch<T>(path: string, body: unknown) { return this.request<T>('PATCH', path, body) }
}
```

### experiments status output

```
$ flaglab experiments status checkout_exp

checkout_exp  running
Universe: checkout  Allocation: 10%  Started: 4/1/2026

▶ Ship it
  conversion_rate improved by +2.3% (p=0.021). Guardrails: page_load_time ✓

┌──────────────────┬──────────────┬─────────┬──────────┬─────────┬──────────────────────┐
│ Metric           │ Role         │ Group   │ Δ%       │ p-value │ 95% CI               │
├──────────────────┼──────────────┼─────────┼──────────┼─────────┼──────────────────────┤
│ conversion_rate  │ goal         │ test    │ +2.30%   │ 0.0210  │ [+0.003, +0.039]     │
│ page_load_time   │ guardrail    │ test    │ +0.10%   │ 0.8100  │ [-0.042,  +0.044]    │
└──────────────────┴──────────────┴─────────┴──────────┴─────────┴──────────────────────┘
```

## Distribution

**npm (primary):**
```bash
npm install -g @flaglab/cli
flaglab login
```

**Homebrew tap:**
```ruby
# homebrew-flaglab/Formula/flaglab.rb
class Flaglab < Formula
  desc "CLI for FlagLab feature flags and experimentation"
  url "https://registry.npmjs.org/@flaglab/cli/-/cli-1.0.0.tgz"
  depends_on "node"
  def install
    system "npm", "install", *std_npm_args
    bin.install_symlink Dir["#{libexec}/bin/*"]
  end
end
```

**Standalone binary (optional):** use `@yao-pkg/pkg` to bundle Node.js + CLI into
a single binary per platform (macOS/Linux/Windows). Distribute via GitHub Releases.
Removes the Node.js dependency for end users.

## Implementation Sequence

1. D1 migration: `migration_002_cli_auth.sql`
2. Worker: add `CLI_SERVICE_SECRET` to wrangler.toml secrets + `Env` type
3. Worker: implement `deviceComplete()`, `devicePoll()` in `worker/src/auth/device.ts`
4. Worker: wire new auth routes in `worker/src/index.ts`
5. Worker: add missing admin endpoints (single experiment, results, metric attach, status patch)
6. Web app: `/cli-auth` page that calls `POST /auth/device/complete` after session verification
7. CLI: scaffold (`package.json`, `tsconfig.json`, `bin/flaglab.js`)
8. CLI: `auth/storage.ts` + `auth/login.ts` + `auth/logout.ts` + `auth/whoami.ts`
9. CLI: `api/client.ts` + `api/types.ts`
10. CLI: `util/output.ts` + `util/spinner.ts` + `util/error.ts`
11. CLI: commands in order: gates → configs → experiments → events → metrics
12. CLI: publish to npm + create Homebrew tap

No new KV namespaces or AE datasets needed beyond `CLI_TOKEN_KV` (already in `08-deployment.md` wrangler.toml). Add `CLI_SERVICE_SECRET` via `wrangler secret put`. All D1 writes from CLI commands go through Next.js Route Handlers (`/api/admin/*`) which call the same `rebuildFlags()` / `rebuildExperiments()` / `purgeCache()` functions from `@flaglab/core` as the browser admin UI.
