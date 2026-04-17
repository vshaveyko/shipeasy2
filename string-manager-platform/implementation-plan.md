> **Historical design doc** (pre-shipeasy-unification, 2026-04-13). Written when i18n was the whole product; now it's one subapp of the unified shipeasy.ai Next.js app. Branding (`i18n login`, `i18n_at_*`, separate `auth.shipeasy.ai`, etc.) is out of date. See [TODO.md](../TODO.md) for current architecture.

# Plan: Label Rewrite Service (ShipEasyI18n) — Full Implementation

**Goal**: Build a standalone SaaS platform that lets customers override/translate UI strings on any web app via a script tag, with a visual in-browser editor, AI-native CLI/MCP tooling, and full go-to-market surfaces.

**Architecture**: Cloudflare Workers (Hono.js) + D1 + R2 + KV + Queues for delivery; Next.js on Cloudflare Pages for dashboard, landing, and docs; CLI as npm package; MCP server as npx-runnable package.

**Tech Stack**: TypeScript throughout. Hono.js (Workers), Next.js 14 App Router (Pages), D1 (SQLite at edge), R2 (object storage), Cloudflare KV, Cloudflare Queues, Resend (email), Stripe (billing), Wrangler (deployment).

**Design Reference**: `docs/plans/2026-04-11-label-rewrite-service-design-v2.md`

---

## Repository Structure

```
label-rewrite-service/
  packages/
    api/          ← Cloudflare Worker + Hono.js (api.i18n.shipeasy.ai)
    dashboard/    ← Next.js App Router (app.i18n.shipeasy.ai)
    landing/      ← Next.js marketing site (i18n.shipeasy.ai)
    docs/         ← Starlight/Astro docs site (docs.i18n.shipeasy.ai)
    admin/        ← Next.js internal admin (admin.i18n.shipeasy.ai)
    loader/       ← loader.js + editor-trigger.js + editor.js build
    mcp/          ← i18n-mcp npx package
    cli/          ← i18n CLI npm package
    codemods/     ← per-framework codemod scripts
  shared/
    types/        ← shared TypeScript types
    schema/       ← D1 migrations (sql files)
  plans/
  docs/
```

---

## Dependency Groups

| Group | Steps | Can Parallelize                                                            |
| ----- | ----- | -------------------------------------------------------------------------- |
| 1     | 1–3   | Yes — monorepo setup, D1 schema, shared types                              |
| 2     | 4–6   | Yes — auth API, KV key store, R2 + manifest system                         |
| 3     | 7–9   | Yes — loader.js build, management CRUD API, usage tracking                 |
| 4     | 10–12 | Yes — dashboard auth+shell, in-browser editor trigger, MCP server skeleton |
| 5     | 13–15 | Yes — dashboard label workspace, editor overlay, CLI skeleton              |
| 6     | 16–18 | Yes — drafts API, dashboard drafts UI, developer seat tracking             |
| 7     | 19–21 | Yes — CLI AI commands, landing page, docs platform                         |
| 8     | 22–24 | Yes — internal admin dashboard, codemod scripts, GitHub Action             |
| 9     | 25    | No — end-to-end verification                                               |

---

## Step 1: Monorepo Scaffold

**Files**: `package.json`, `pnpm-workspace.yaml`, `turbo.json`, `wrangler.toml` (api), `tsconfig.base.json`

### 1a. Init monorepo

```bash
mkdir label-rewrite-service && cd label-rewrite-service
pnpm init
pnpm add -Dw turbo typescript
```

### 1b. `pnpm-workspace.yaml`

```yaml
packages:
  - "packages/*"
  - "shared/*"
```

### 1c. `turbo.json`

```json
{
  "pipeline": {
    "build": { "dependsOn": ["^build"], "outputs": ["dist/**"] },
    "dev": { "cache": false, "persistent": true },
    "test": { "dependsOn": ["^build"] },
    "typecheck": {}
  }
}
```

### 1d. Scaffold package directories

```bash
mkdir -p packages/{api,dashboard,landing,docs,admin,loader,mcp,cli,codemods}
mkdir -p shared/{types,schema}
```

### 1e. `shared/types/index.ts`

```typescript
export interface LabelKey {
  id: string;
  profileId: string;
  chunkId: string;
  key: string;
  value: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
  updatedBy: string;
}

export interface LabelProfile {
  id: string;
  accountId: string;
  name: string; // e.g. "en:prod"
  createdAt: string;
}

export interface LabelChunk {
  id: string;
  profileId: string;
  name: string;
  isIndex: boolean;
  publishedUrl: string | null;
  publishedHash: string | null;
  publishedAt: string | null;
}

export interface ApiKey {
  id: string;
  accountId: string;
  label: string;
  keyPrefix: string; // "i18n_pk_" + first 8 chars for display
  allowedDomains: string[];
  quotaMonthly: number;
  usageCurrentMonth: number;
  createdAt: string;
  revokedAt: string | null;
}

export interface Account {
  id: string;
  name: string;
  plan: "free" | "pro" | "business" | "enterprise";
  stripeCustomerId: string | null;
  createdAt: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  githubId: string | null;
  googleId: string | null;
  createdAt: string;
  lastLoginAt: string;
}

export interface Member {
  id: string;
  accountId: string;
  userId: string;
  role: "owner" | "editor";
  invitedAt: string;
  acceptedAt: string | null;
}

export interface LabelDraft {
  id: string;
  profileId: string;
  accountId: string;
  name: string;
  createdBy: string;
  status: "active" | "published" | "archived";
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
}

export interface DeveloperSeat {
  id: string;
  accountId: string;
  userId: string;
  firstSeenAt: string;
  lastActiveAt: string;
}
```

### 1f. Commit

```bash
git init && git add . && git commit -m "chore: monorepo scaffold with shared types"
```

---

## Step 2: D1 Schema Migrations

**Files**: `shared/schema/001_initial.sql`, `shared/schema/002_drafts.sql`, `shared/schema/003_seats.sql`

### 2a. `shared/schema/001_initial.sql`

```sql
CREATE TABLE accounts (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  plan TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free','pro','business','enterprise')),
  stripe_customer_id TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  avatar_url TEXT,
  github_id TEXT UNIQUE,
  github_username TEXT,
  google_id TEXT UNIQUE,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  last_login_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE members (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL REFERENCES accounts(id),
  user_id TEXT NOT NULL REFERENCES users(id),
  role TEXT NOT NULL DEFAULT 'editor' CHECK (role IN ('owner','editor')),
  invited_at TEXT NOT NULL DEFAULT (datetime('now')),
  accepted_at TEXT,
  UNIQUE(account_id, user_id)
);

CREATE TABLE api_keys (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL REFERENCES accounts(id),
  key_hash TEXT NOT NULL UNIQUE,
  key_prefix TEXT NOT NULL,
  label TEXT NOT NULL,
  allowed_domains TEXT NOT NULL DEFAULT '[]',
  quota_monthly INTEGER NOT NULL DEFAULT 1000000,
  usage_current_month INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  revoked_at TEXT
);

CREATE TABLE api_tokens (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL REFERENCES accounts(id),
  token_hash TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  created_by TEXT NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  last_used_at TEXT,
  revoked_at TEXT
);

CREATE TABLE email_auth_codes (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  code_hash TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  used_at TEXT,
  attempt_count INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE refresh_tokens (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  account_id TEXT NOT NULL REFERENCES accounts(id),
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  used_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE label_profiles (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL REFERENCES accounts(id),
  name TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(account_id, name)
);

CREATE TABLE label_chunks (
  id TEXT PRIMARY KEY,
  profile_id TEXT NOT NULL REFERENCES label_profiles(id),
  name TEXT NOT NULL,
  is_index INTEGER NOT NULL DEFAULT 0,
  published_url TEXT,
  published_hash TEXT,
  published_at TEXT,
  etag TEXT,
  UNIQUE(profile_id, name)
);

CREATE TABLE label_keys (
  id TEXT PRIMARY KEY,
  profile_id TEXT NOT NULL REFERENCES label_profiles(id),
  chunk_id TEXT NOT NULL REFERENCES label_chunks(id),
  key TEXT NOT NULL,
  value TEXT NOT NULL DEFAULT '',
  description TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_by TEXT NOT NULL REFERENCES users(id),
  UNIQUE(profile_id, key)
);

CREATE TABLE usage_daily (
  api_key_id TEXT NOT NULL REFERENCES api_keys(id),
  date TEXT NOT NULL,
  request_count INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY(api_key_id, date)
);
```

### 2b. `shared/schema/002_drafts.sql`

```sql
CREATE TABLE label_drafts (
  id TEXT PRIMARY KEY,
  profile_id TEXT NOT NULL REFERENCES label_profiles(id),
  account_id TEXT NOT NULL REFERENCES accounts(id),
  name TEXT NOT NULL,
  created_by TEXT NOT NULL REFERENCES users(id),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','published','archived')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  published_at TEXT
);

CREATE TABLE label_draft_keys (
  id TEXT PRIMARY KEY,
  draft_id TEXT NOT NULL REFERENCES label_drafts(id),
  key TEXT NOT NULL,
  value TEXT NOT NULL,
  description TEXT,
  updated_by TEXT NOT NULL REFERENCES users(id),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(draft_id, key)
);
```

### 2c. `shared/schema/003_seats.sql`

```sql
CREATE TABLE developer_seats (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL REFERENCES accounts(id),
  user_id TEXT NOT NULL REFERENCES users(id),
  first_seen_at TEXT NOT NULL DEFAULT (datetime('now')),
  last_active_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(account_id, user_id)
);
```

### 2d. Apply via wrangler

```bash
wrangler d1 execute i18n-db --file=shared/schema/001_initial.sql
wrangler d1 execute i18n-db --file=shared/schema/002_drafts.sql
wrangler d1 execute i18n-db --file=shared/schema/003_seats.sql
# For test env:
wrangler d1 execute i18n-db-test --file=shared/schema/001_initial.sql --env=test
```

### 2e. Commit

```bash
git add . && git commit -m "feat: D1 schema migrations — accounts, keys, profiles, drafts, seats"
```

---

## Step 3: API Worker Skeleton

**Files**: `packages/api/src/index.ts`, `packages/api/src/middleware/auth.ts`, `packages/api/wrangler.toml`, `packages/api/package.json`

### 3a. `packages/api/package.json`

```json
{
  "name": "@i18n/api",
  "version": "0.0.1",
  "scripts": {
    "dev": "wrangler dev",
    "deploy": "wrangler deploy",
    "test": "vitest"
  },
  "dependencies": {
    "hono": "^4.0.0"
  },
  "devDependencies": {
    "@cloudflare/workers-types": "^4.0.0",
    "wrangler": "^3.0.0",
    "vitest": "^1.0.0"
  }
}
```

### 3b. `packages/api/wrangler.toml`

```toml
name = "i18n-api"
main = "src/index.ts"
compatibility_date = "2024-01-01"

[[d1_databases]]
binding = "DB"
database_name = "i18n-db"
database_id = "YOUR_D1_ID"

[[kv_namespaces]]
binding = "KV_KEYS"
id = "YOUR_KV_ID"

[[r2_buckets]]
binding = "R2"
bucket_name = "i18n-labels"

[[queues.producers]]
binding = "USAGE_QUEUE"
queue = "i18n-usage"

[vars]
RESEND_API_KEY = ""
JWT_SECRET = ""
CLOUDFLARE_ZONE_ID = ""
CLOUDFLARE_PURGE_TOKEN = ""
```

### 3c. `packages/api/src/index.ts`

```typescript
import { Hono } from "hono";
import { cors } from "hono/cors";
import { authRoutes } from "./routes/auth";
import { keysRoutes } from "./routes/keys";
import { profilesRoutes } from "./routes/profiles";
import { chunksRoutes } from "./routes/chunks";
import { labelKeysRoutes } from "./routes/labelKeys";
import { publishRoutes } from "./routes/publish";
import { draftsRoutes } from "./routes/drafts";
import { usageRoutes } from "./routes/usage";
import { editorRoutes } from "./routes/editor";
import { tokenRoutes } from "./routes/tokens";

export interface Env {
  DB: D1Database;
  KV_KEYS: KVNamespace;
  R2: R2Bucket;
  USAGE_QUEUE: Queue;
  RESEND_API_KEY: string;
  JWT_SECRET: string;
  CLOUDFLARE_ZONE_ID: string;
  CLOUDFLARE_PURGE_TOKEN: string;
}

const app = new Hono<{ Bindings: Env }>();

app.use(
  "*",
  cors({
    origin: ["https://app.i18n.shipeasy.ai", "https://admin.i18n.shipeasy.ai"],
    credentials: true,
  }),
);

app.route("/auth", authRoutes);
app.route("/editor", editorRoutes);
app.route("/keys", keysRoutes);
app.route("/tokens", tokenRoutes);
app.route("/profiles", profilesRoutes);
app.route("/chunks", chunksRoutes);
app.route("/label-keys", labelKeysRoutes);
app.route("/publish", publishRoutes);
app.route("/drafts", draftsRoutes);
app.route("/usage", usageRoutes);

app.get("/health", (c) => c.json({ ok: true }));

export default app;
```

### 3d. `packages/api/src/middleware/auth.ts`

```typescript
import { Context, Next } from "hono";
import { Env } from "../index";

export interface JWTPayload {
  userId: string;
  accountId: string;
  exp: number;
}

export async function requireJWT(c: Context<{ Bindings: Env }>, next: Next) {
  const token = c.req.header("Authorization")?.replace("Bearer ", "");
  if (!token) return c.json({ error: "Unauthorized" }, 401);

  try {
    const payload = await verifyJWT(token, c.env.JWT_SECRET);
    if (payload.exp < Date.now() / 1000) return c.json({ error: "Token expired" }, 401);
    c.set("jwtPayload", payload);
    await next();
  } catch {
    return c.json({ error: "Invalid token" }, 401);
  }
}

export async function requireApiToken(c: Context<{ Bindings: Env }>, next: Next) {
  const token = c.req.header("Authorization")?.replace("Bearer ", "");
  if (!token || !token.startsWith("i18n_at_")) return c.json({ error: "API token required" }, 401);

  const hash = await sha256(token);
  const row = await c.env.DB.prepare(
    "SELECT * FROM api_tokens WHERE token_hash = ? AND revoked_at IS NULL",
  )
    .bind(hash)
    .first();

  if (!row) return c.json({ error: "Invalid API token" }, 401);

  await c.env.DB.prepare("UPDATE api_tokens SET last_used_at = ? WHERE id = ?")
    .bind(new Date().toISOString(), row.id)
    .run();

  c.set("apiToken", row);
  await next();
}

export async function signJWT(payload: JWTPayload, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const header = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = btoa(JSON.stringify(payload));
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${header}.${body}`));
  return `${header}.${body}.${btoa(String.fromCharCode(...new Uint8Array(sig)))}`;
}

export async function verifyJWT(token: string, secret: string): Promise<JWTPayload> {
  const [header, body, sig] = token.split(".");
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"],
  );
  const valid = await crypto.subtle.verify(
    "HMAC",
    key,
    Uint8Array.from(atob(sig), (c) => c.charCodeAt(0)),
    new TextEncoder().encode(`${header}.${body}`),
  );
  if (!valid) throw new Error("Invalid signature");
  return JSON.parse(atob(body));
}

export async function sha256(input: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
```

### 3e. Test skeleton

```bash
cd packages/api && pnpm test
```

### 3f. Commit

```bash
git add . && git commit -m "feat: API worker skeleton — Hono app, JWT/token auth middleware"
```

---

## Step 4: OAuth + Email OTP Auth Routes

**Files**: `packages/api/src/routes/auth.ts`, `packages/api/src/lib/email.ts`

### 4a. `packages/api/src/lib/email.ts`

```typescript
export async function sendOTPEmail(email: string, code: string, resendApiKey: string) {
  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${resendApiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: "ShipEasyI18n <noreply@i18n.shipeasy.ai>",
      to: email,
      subject: `Your login code: ${code}`,
      html: `<p>Your ShipEasyI18n login code is: <strong>${code}</strong></p><p>Expires in 15 minutes.</p>`,
    }),
  });
}
```

### 4b. `packages/api/src/routes/auth.ts`

```typescript
import { Hono } from "hono";
import { Env } from "../index";
import { signJWT, sha256 } from "../middleware/auth";
import { sendOTPEmail } from "../lib/email";
import { nanoid } from "nanoid";

const auth = new Hono<{ Bindings: Env }>();

// Email OTP request
auth.post("/email/request", async (c) => {
  const { email } = await c.req.json<{ email: string }>();
  if (!email || !email.includes("@")) return c.json({ error: "Invalid email" }, 400);

  // Rate limit: max 3 per email per 15 min
  const recent = await c.env.DB.prepare(
    "SELECT COUNT(*) as count FROM email_auth_codes WHERE email = ? AND created_at > datetime('now', '-15 minutes')",
  )
    .bind(email)
    .first<{ count: number }>();
  if ((recent?.count ?? 0) >= 3) return c.json({ error: "Too many requests" }, 429);

  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const codeHash = await sha256(code);
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

  await c.env.DB.prepare(
    "INSERT INTO email_auth_codes (id, email, code_hash, expires_at) VALUES (?, ?, ?, ?)",
  )
    .bind(nanoid(), email, codeHash, expiresAt)
    .run();

  await sendOTPEmail(email, code, c.env.RESEND_API_KEY);
  return c.json({ ok: true });
});

// Email OTP verify
auth.post("/email/verify", async (c) => {
  const { email, code } = await c.req.json<{ email: string; code: string }>();
  const codeHash = await sha256(code);

  const record = await c.env.DB.prepare(
    "SELECT * FROM email_auth_codes WHERE email = ? AND code_hash = ? AND used_at IS NULL AND expires_at > datetime('now')",
  )
    .bind(email, codeHash)
    .first<{ id: string; attempt_count: number }>();

  if (!record) {
    // Increment attempt count on existing unexpired codes
    await c.env.DB.prepare(
      "UPDATE email_auth_codes SET attempt_count = attempt_count + 1 WHERE email = ? AND used_at IS NULL AND expires_at > datetime('now')",
    )
      .bind(email)
      .run();
    // Invalidate if 3+ failed attempts
    await c.env.DB.prepare(
      "UPDATE email_auth_codes SET used_at = datetime('now') WHERE email = ? AND attempt_count >= 3 AND used_at IS NULL",
    )
      .bind(email)
      .run();
    return c.json({ error: "Invalid or expired code" }, 401);
  }

  // Mark used
  await c.env.DB.prepare("UPDATE email_auth_codes SET used_at = datetime('now') WHERE id = ?")
    .bind(record.id)
    .run();

  const { user, accountId } = await upsertUserByEmail(email, c.env.DB);
  const token = await issueTokens(user.id, accountId, c.env);
  return c.json(token);
});

// Google OAuth redirect
auth.get("/google", (c) => {
  const state = encodeState({ flow: "dashboard", nonce: nanoid() }, c.env.JWT_SECRET);
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id", c.env.GOOGLE_CLIENT_ID);
  url.searchParams.set("redirect_uri", "https://api.i18n.shipeasy.ai/auth/google/callback");
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "openid email profile");
  url.searchParams.set("state", state);
  return c.redirect(url.toString());
});

// GitHub OAuth redirect
auth.get("/github", (c) => {
  const state = encodeState({ flow: "dashboard", nonce: nanoid() }, c.env.JWT_SECRET);
  const url = new URL("https://github.com/login/oauth/authorize");
  url.searchParams.set("client_id", c.env.GITHUB_CLIENT_ID);
  url.searchParams.set("redirect_uri", "https://api.i18n.shipeasy.ai/auth/github/callback");
  url.searchParams.set("scope", "user:email");
  url.searchParams.set("state", state);
  return c.redirect(url.toString());
});

// Shared callback handler (Google + GitHub)
auth.get("/google/callback", async (c) => handleOAuthCallback(c, "google"));
auth.get("/github/callback", async (c) => handleOAuthCallback(c, "github"));

auth.post("/refresh", async (c) => {
  const { refreshToken } = await c.req.json<{ refreshToken: string }>();
  const hash = await sha256(refreshToken);
  const record = await c.env.DB.prepare(
    "SELECT * FROM refresh_tokens WHERE token_hash = ? AND used_at IS NULL AND expires_at > datetime('now')",
  )
    .bind(hash)
    .first<{ id: string; user_id: string; account_id: string }>();

  if (!record) return c.json({ error: "Invalid refresh token" }, 401);

  await c.env.DB.prepare("UPDATE refresh_tokens SET used_at = datetime('now') WHERE id = ?")
    .bind(record.id)
    .run();

  const token = await issueTokens(record.user_id, record.account_id, c.env);
  return c.json(token);
});

auth.delete("/logout", async (c) => {
  // Refresh token revocation handled client-side (sessionStorage clear)
  return c.json({ ok: true });
});

async function issueTokens(userId: string, accountId: string, env: Env) {
  const jwt = await signJWT(
    { userId, accountId, exp: Math.floor(Date.now() / 1000) + 8 * 3600 },
    env.JWT_SECRET,
  );
  const rawRefresh = nanoid(48);
  const refreshHash = await sha256(rawRefresh);
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  await env.DB.prepare(
    "INSERT INTO refresh_tokens (id, user_id, account_id, token_hash, expires_at) VALUES (?, ?, ?, ?, ?)",
  )
    .bind(nanoid(), userId, accountId, refreshHash, expiresAt)
    .run();
  return { jwt, refreshToken: rawRefresh };
}

async function upsertUserByEmail(email: string, db: D1Database) {
  let user = await db.prepare("SELECT * FROM users WHERE email = ?").bind(email).first<any>();
  if (!user) {
    const id = nanoid();
    await db
      .prepare("INSERT INTO users (id, name, email) VALUES (?, ?, ?)")
      .bind(id, email.split("@")[0], email)
      .run();
    user = { id, name: email.split("@")[0], email };
    // Create account + owner membership
    const accountId = nanoid();
    await db
      .prepare("INSERT INTO accounts (id, name) VALUES (?, ?)")
      .bind(accountId, `${email.split("@")[0]}'s workspace`)
      .run();
    await db
      .prepare("INSERT INTO members (id, account_id, user_id, role) VALUES (?, ?, ?, ?)")
      .bind(nanoid(), accountId, id, "owner")
      .run();
    return { user, accountId };
  }
  const member = await db
    .prepare("SELECT account_id FROM members WHERE user_id = ? LIMIT 1")
    .bind(user.id)
    .first<{ account_id: string }>();
  return { user, accountId: member!.account_id };
}

function encodeState(data: object, secret: string): string {
  return btoa(JSON.stringify(data));
}

async function handleOAuthCallback(c: any, provider: "google" | "github") {
  // Exchange code for profile, upsert user, issue tokens
  // Implementation varies by provider — see full implementation guide
  return c.json({ ok: true }); // placeholder
}

export { auth as authRoutes };
```

### 4c. Test: OTP rate limiting

```typescript
// packages/api/src/routes/auth.test.ts
import { describe, it, expect } from "vitest";

describe("POST /auth/email/request", () => {
  it("rejects more than 3 requests per 15 min for same email", async () => {
    // mock D1 returning count=3
    // expect 429
  });
  it("rejects invalid email format", async () => {
    // expect 400
  });
});

describe("POST /auth/email/verify", () => {
  it("marks code used after successful verification", async () => {});
  it("invalidates code after 3 failed attempts", async () => {});
  it("rejects expired codes", async () => {});
});
```

```bash
cd packages/api && pnpm test
```

### 4d. Commit

```bash
git add . && git commit -m "feat: auth routes — email OTP, Google/GitHub OAuth, JWT + refresh tokens"
```

---

## Step 5: API Key Store (KV + D1)

**Files**: `packages/api/src/routes/keys.ts`, `packages/api/src/lib/apiKeys.ts`

### 5a. `packages/api/src/lib/apiKeys.ts`

```typescript
import { Env } from "../index";
import { sha256 } from "../middleware/auth";
import { nanoid } from "nanoid";

export function generatePublicKey(): { raw: string; prefix: string } {
  const raw = `i18n_pk_${nanoid(32)}`;
  return { raw, prefix: raw.slice(0, 14) };
}

export async function storeApiKey(
  env: Env,
  accountId: string,
  label: string,
  domains: string[],
  quota: number,
) {
  const { raw, prefix } = generatePublicKey();
  const hash = await sha256(raw);
  const id = nanoid();

  await env.DB.prepare(
    "INSERT INTO api_keys (id, account_id, key_hash, key_prefix, label, allowed_domains, quota_monthly) VALUES (?, ?, ?, ?, ?, ?, ?)",
  )
    .bind(id, accountId, hash, prefix, label, JSON.stringify(domains), quota)
    .run();

  // Mirror to KV for edge lookups
  await env.KV_KEYS.put(raw, JSON.stringify({ accountId, domains, quota, keyId: id }), {
    metadata: { accountId },
  });

  return { id, raw, prefix };
}

export async function validatePublicKey(
  env: Env,
  key: string,
  origin: string,
): Promise<{ accountId: string; keyId: string } | null> {
  const cached = (await env.KV_KEYS.get(key, "json")) as {
    accountId: string;
    domains: string[];
    keyId: string;
  } | null;
  if (!cached) return null;

  // Domain whitelist check (write path protection only)
  if (cached.domains.length > 0) {
    const hostname = new URL(origin).hostname;
    const allowed = cached.domains.some((d) => hostname === d || hostname.endsWith(`.${d}`));
    if (!allowed) return null;
  }

  return { accountId: cached.accountId, keyId: cached.keyId };
}

export async function revokeApiKey(env: Env, keyId: string, accountId: string) {
  const row = await env.DB.prepare("SELECT key_hash FROM api_keys WHERE id = ? AND account_id = ?")
    .bind(keyId, accountId)
    .first<{ key_hash: string }>();
  if (!row) return false;

  // Find raw key from KV by scanning — better: store key→id mapping
  await env.DB.prepare("UPDATE api_keys SET revoked_at = datetime('now') WHERE id = ?")
    .bind(keyId)
    .run();
  // KV deletion: reconstruct raw key from prefix lookup or store separately
  return true;
}
```

### 5b. `packages/api/src/routes/keys.ts`

```typescript
import { Hono } from "hono";
import { Env } from "../index";
import { requireJWT } from "../middleware/auth";
import { storeApiKey, revokeApiKey } from "../lib/apiKeys";

const keys = new Hono<{ Bindings: Env }>();
keys.use("*", requireJWT);

keys.get("/", async (c) => {
  const { accountId } = c.get("jwtPayload");
  const rows = await c.env.DB.prepare(
    "SELECT id, key_prefix, label, allowed_domains, quota_monthly, usage_current_month, created_at, revoked_at FROM api_keys WHERE account_id = ? ORDER BY created_at DESC",
  )
    .bind(accountId)
    .all();
  return c.json(rows.results);
});

keys.post("/", async (c) => {
  const { accountId } = c.get("jwtPayload");
  const { label, domains, quota } = await c.req.json<{
    label: string;
    domains: string[];
    quota: number;
  }>();
  const result = await storeApiKey(c.env, accountId, label, domains, quota);
  return c.json(result, 201);
});

keys.patch("/:id", async (c) => {
  const { accountId } = c.get("jwtPayload");
  const { label, domains, quota } = await c.req.json<{
    label?: string;
    domains?: string[];
    quota?: number;
  }>();
  await c.env.DB.prepare(
    "UPDATE api_keys SET label = COALESCE(?, label), allowed_domains = COALESCE(?, allowed_domains), quota_monthly = COALESCE(?, quota_monthly) WHERE id = ? AND account_id = ?",
  )
    .bind(
      label ?? null,
      domains ? JSON.stringify(domains) : null,
      quota ?? null,
      c.req.param("id"),
      accountId,
    )
    .run();
  return c.json({ ok: true });
});

keys.delete("/:id", async (c) => {
  const { accountId } = c.get("jwtPayload");
  const ok = await revokeApiKey(c.env, c.req.param("id"), accountId);
  return ok ? c.json({ ok: true }) : c.json({ error: "Not found" }, 404);
});

export { keys as keysRoutes };
```

### 5c. Commit

```bash
git add . && git commit -m "feat: API key management — KV mirror, domain validation, revocation"
```

---

## Step 6: R2 Label File Storage + Manifest System

**Files**: `packages/api/src/lib/publisher.ts`, `packages/api/src/routes/publish.ts`

### 6a. `packages/api/src/lib/publisher.ts`

```typescript
import { Env } from "../index";
import { createHash } from "./hash";

export interface LabelFile {
  v: number;
  profile: string;
  chunk: string;
  strings: Record<string, string>;
}

export async function publishProfile(env: Env, profileId: string): Promise<void> {
  const profile = await env.DB.prepare("SELECT * FROM label_profiles WHERE id = ?")
    .bind(profileId)
    .first<any>();
  const chunks = await env.DB.prepare("SELECT * FROM label_chunks WHERE profile_id = ?")
    .bind(profileId)
    .all();
  const manifest: Record<string, string> = {};

  for (const chunk of chunks.results as any[]) {
    const keys = await env.DB.prepare("SELECT key, value FROM label_keys WHERE chunk_id = ?")
      .bind(chunk.id)
      .all();

    const strings: Record<string, string> = {};
    for (const k of keys.results as any[]) strings[k.key] = k.value;

    const file: LabelFile = { v: 1, profile: profile.name, chunk: chunk.name, strings };
    const content = JSON.stringify(file);
    const hash = await createHash(content);
    const path = `labels/${profile.account_id}/${profileId}/${chunk.name}.${hash}.json`;

    await env.R2.put(path, content, {
      httpMetadata: {
        contentType: "application/json",
        cacheControl: "public, max-age=31536000, immutable",
      },
    });

    const url = `https://cdn.i18n.shipeasy.ai/${path}`;
    manifest[chunk.name] = url;

    await env.DB.prepare(
      "UPDATE label_chunks SET published_url = ?, published_hash = ?, published_at = ?, etag = ? WHERE id = ?",
    )
      .bind(url, hash, new Date().toISOString(), hash, chunk.id)
      .run();
  }

  // Write manifest
  const manifestPath = `labels/${profile.account_id}/${profileId}/manifest.json`;
  await env.R2.put(manifestPath, JSON.stringify(manifest), {
    httpMetadata: {
      contentType: "application/json",
      cacheControl: "public, max-age=60, stale-while-revalidate=3600",
    },
  });

  // Purge manifest from CDN cache instantly
  await purgeManifestCache(env, `https://cdn.i18n.shipeasy.ai/${manifestPath}`);
}

async function purgeManifestCache(env: Env, url: string): Promise<void> {
  await fetch(`https://api.cloudflare.com/client/v4/zones/${env.CLOUDFLARE_ZONE_ID}/purge_cache`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.CLOUDFLARE_PURGE_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ files: [url] }),
  });
}

export async function lib_hash(content: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(content));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, 12);
}
```

### 6b. `packages/api/src/routes/publish.ts`

```typescript
import { Hono } from "hono";
import { Env } from "../index";
import { requireJWT } from "../middleware/auth";
import { publishProfile } from "../lib/publisher";

const publish = new Hono<{ Bindings: Env }>();
publish.use("*", requireJWT);

publish.get("/profiles/:id/diff", async (c) => {
  // Return unpublished changes vs last published_at
  const profileId = c.req.param("id");
  const unpublished = await c.env.DB.prepare(
    "SELECT key, value, updated_at FROM label_keys WHERE profile_id = ? AND updated_at > COALESCE((SELECT MIN(published_at) FROM label_chunks WHERE profile_id = ?), '1970-01-01')",
  )
    .bind(profileId, profileId)
    .all();
  return c.json(unpublished.results);
});

publish.post("/profiles/:id/publish", async (c) => {
  const { accountId } = c.get("jwtPayload");
  const profileId = c.req.param("id");
  // Verify ownership
  const profile = await c.env.DB.prepare(
    "SELECT id FROM label_profiles WHERE id = ? AND account_id = ?",
  )
    .bind(profileId, accountId)
    .first();
  if (!profile) return c.json({ error: "Not found" }, 404);

  await publishProfile(c.env, profileId);
  return c.json({ ok: true });
});

export { publish as publishRoutes };
```

### 6c. Commit

```bash
git add . && git commit -m "feat: R2 publisher — chunk files, manifest, Cloudflare CDN cache purge"
```

---

## Step 7: Loader Script Build (`loader.js`, `editor-trigger.js`, `editor.js`)

**Files**: `packages/loader/src/loader.ts`, `packages/loader/src/editor-trigger.ts`, `packages/loader/src/editor.ts`, `packages/loader/build.config.ts`

### 7a. `packages/loader/src/loader.ts`

```typescript
// ~2KB gzipped — NO framework imports
(function () {
  const script = document.currentScript as HTMLScriptElement;
  const publicKey = script.dataset.key!;
  const profile = script.dataset.profile!;
  const declaredChunk = script.dataset.chunk || "index";
  const hideUntilReady = script.dataset.hideUntilReady === "true";

  const STORAGE_KEY = `i18n_${publicKey}_${profile}`;
  const MANIFEST_URL = `https://cdn.i18n.shipeasy.ai/labels/${publicKey}/${profile}/manifest.json`;

  // Interpolate {{variable}} tokens
  function interpolate(value: string, vars: Record<string, string>): string {
    return value.replace(/\{\{(\w+)\}\}/g, (_, k) => vars[k] ?? `{{${k}}}`);
  }

  // Apply label to a single DOM element
  function applyElement(el: Element) {
    const key = el.getAttribute("data-label");
    if (!key || !window.__i18n?.strings) return;
    const value = window.__i18n.strings[key];
    if (!value) return;
    const rawVars = el.getAttribute("data-variables");
    const vars = rawVars ? JSON.parse(rawVars) : {};
    const attr = el.getAttribute("data-label-attr");
    const result = interpolate(value, vars);
    if (attr) el.setAttribute(attr, result);
    else el.textContent = result;
  }

  // Scan node + all descendants
  function applyToSubtree(root: Element | Document) {
    root.querySelectorAll("[data-label]").forEach(applyElement);
  }

  // MutationObserver for SPA route changes / lazy mounts
  const observer = new MutationObserver((mutations) => {
    for (const m of mutations) {
      m.addedNodes.forEach((node) => {
        if (node.nodeType === 1) applyToSubtree(node as Element);
      });
    }
  });

  // Public API
  window.__i18n = {
    strings: {},
    ready: false,
    callbacks: [] as Array<() => void>,
    updateCallbacks: [] as Array<() => void>,
    t(key: string, vars: Record<string, string> = {}): string {
      const value = this.strings[key];
      return value ? interpolate(value, vars) : key;
    },
    ready(cb: () => void) {
      this.ready ? cb() : this.callbacks.push(cb);
    },
    on(event: "update", cb: () => void) {
      if (event === "update") this.updateCallbacks.push(cb);
    },
    prefetch(chunk: string) {
      fetchChunk(chunk);
    },
    register(key: string, meta: { desc?: string }) {
      /* store metadata */
    },
  };

  let revealTimeout: ReturnType<typeof setTimeout> | null = null;

  function applyStrings(strings: Record<string, string>) {
    Object.assign(window.__i18n!.strings, strings);
    applyToSubtree(document);
    window.__i18n!.updateCallbacks.forEach((cb) => cb());
    if (hideUntilReady && revealTimeout) {
      clearTimeout(revealTimeout);
      document.documentElement.style.visibility = "";
    }
  }

  function markReady() {
    window.__i18n!.ready = true;
    window.__i18n!.callbacks.forEach((cb) => cb());
  }

  async function fetchChunk(chunkName: string) {
    const manifest = window.__i18n!.manifest;
    if (!manifest || !manifest[chunkName]) return;
    const res = await fetch(manifest[chunkName]);
    if (!res.ok) return;
    const data = await res.json();
    applyStrings(data.strings);
    // Cache in sessionStorage
    const cached = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || "{}");
    cached[chunkName] = data.strings;
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(cached));
  }

  async function boot() {
    // 1. Apply sessionStorage cache instantly
    const cached = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || "{}");
    if (Object.keys(cached).length > 0) {
      for (const strings of Object.values(cached) as Record<string, string>[]) {
        applyStrings(strings);
      }
      markReady();
    } else if (hideUntilReady) {
      document.documentElement.style.visibility = "hidden";
      revealTimeout = setTimeout(() => {
        document.documentElement.style.visibility = "";
      }, 200);
    }

    // 2. Fetch manifest
    try {
      const manifestRes = await fetch(MANIFEST_URL);
      const manifest = await manifestRes.json();
      window.__i18n!.manifest = manifest;

      // 3. Fetch index + declared chunk in parallel
      const toFetch = [...new Set(["index", declaredChunk])];
      await Promise.all(toFetch.map(fetchChunk));
      markReady();

      // 4. Eager-load remaining chunks after first render
      requestIdleCallback(() => {
        Object.keys(manifest)
          .filter((c) => !toFetch.includes(c))
          .forEach(fetchChunk);
      });
    } catch (e) {
      // Fail silently — original strings shown
      if (hideUntilReady) document.documentElement.style.visibility = "";
      markReady();
    }

    // 5. Start MutationObserver
    observer.observe(document.body, { childList: true, subtree: true });
  }

  // Handle Shadow DOM
  const origAttachShadow = Element.prototype.attachShadow;
  Element.prototype.attachShadow = function (init) {
    const shadow = origAttachShadow.call(this, init);
    observer.observe(shadow, { childList: true, subtree: true });
    return shadow;
  };

  boot();

  // Load editor-trigger.js after first render
  requestIdleCallback(() => {
    const s = document.createElement("script");
    s.src = `https://cdn.i18n.shipeasy.ai/editor-trigger.js`;
    s.dataset.key = publicKey;
    document.head.appendChild(s);
  });
})();

declare global {
  interface Window {
    __i18n?: {
      strings: Record<string, string>;
      manifest?: Record<string, string>;
      ready: boolean;
      callbacks: Array<() => void>;
      updateCallbacks: Array<() => void>;
      t: (key: string, vars?: Record<string, string>) => string;
      ready: (cb: () => void) => void;
      on: (event: "update", cb: () => void) => void;
      prefetch: (chunk: string) => void;
      register: (key: string, meta: { desc?: string }) => void;
    };
  }
}
```

### 7b. `packages/loader/src/editor-trigger.ts`

```typescript
// ~1KB — registers trigger only
(function () {
  const script = document.currentScript as HTMLScriptElement;
  const publicKey = script.dataset.key!;
  const SESSION_KEY = `i18n_editor_${publicKey}`;
  const EDITOR_NONCE_KEY = `i18n_nonce_${publicKey}`;
  const POPUP_ORIGIN = "https://app.i18n.shipeasy.ai";

  function openLoginPopup() {
    const nonce = crypto.randomUUID();
    sessionStorage.setItem(EDITOR_NONCE_KEY, nonce);
    const url = `${POPUP_ORIGIN}/editor-auth?key=${publicKey}&origin=${encodeURIComponent(location.origin)}&nonce=${nonce}`;
    window.open(url, "i18n_editor_auth", "width=480,height=640,left=200,top=100");
  }

  function loadEditor(token: string) {
    const s = document.createElement("script");
    s.src = "https://cdn.i18n.shipeasy.ai/editor.js";
    s.dataset.token = token;
    document.head.appendChild(s);
  }

  // Check for existing valid session
  const stored = sessionStorage.getItem(SESSION_KEY);
  if (stored) {
    try {
      const { token, exp } = JSON.parse(stored);
      if (exp > Date.now() / 1000) {
        loadEditor(token);
        return;
      }
    } catch {}
  }

  // Listen for postMessage from popup
  window.addEventListener("message", (e) => {
    if (e.origin !== POPUP_ORIGIN) return;
    if (e.data.type !== "i18n_auth_success") return;

    // Verify nonce — prevents token injection attacks
    const expectedNonce = sessionStorage.getItem(EDITOR_NONCE_KEY);
    if (!expectedNonce || e.data.nonce !== expectedNonce) return;
    sessionStorage.removeItem(EDITOR_NONCE_KEY);

    // Store JWT + exp in sessionStorage
    sessionStorage.setItem(SESSION_KEY, JSON.stringify({ token: e.data.token, exp: e.data.exp }));
    loadEditor(e.data.token);
  });

  // Keyboard shortcut: Alt+Shift+E
  document.addEventListener("keydown", (e) => {
    if (e.altKey && e.shiftKey && e.key === "E") openLoginPopup();
  });

  // URL param: ?i18n_edit=1
  if (new URLSearchParams(location.search).get("i18n_edit") === "1") openLoginPopup();
})();
```

### 7c. Build config (`packages/loader/build.config.ts`)

```typescript
import { build } from "esbuild";

await build({
  entryPoints: ["src/loader.ts", "src/editor-trigger.ts", "src/editor.ts"],
  bundle: true,
  minify: true,
  outdir: "dist",
  format: "iife",
  target: ["es2015"],
  define: { "process.env.NODE_ENV": '"production"' },
});
```

### 7d. Verify bundle sizes

```bash
cd packages/loader && pnpm build
ls -lh dist/
# loader.js must be < 5KB gzipped
# editor-trigger.js must be < 2KB gzipped
gzip -c dist/loader.js | wc -c
gzip -c dist/editor-trigger.js | wc -c
```

### 7e. Commit

```bash
git add . && git commit -m "feat: loader.js + editor-trigger.js — label delivery, MutationObserver, PKCE nonce auth"
```

---

## Step 8: Label Key CRUD API + Profile/Chunk Routes

**Files**: `packages/api/src/routes/profiles.ts`, `packages/api/src/routes/chunks.ts`, `packages/api/src/routes/labelKeys.ts`

### 8a. `packages/api/src/routes/labelKeys.ts`

```typescript
import { Hono } from "hono";
import { Env } from "../index";
import { requireJWT } from "../middleware/auth";
import { nanoid } from "nanoid";

const labelKeys = new Hono<{ Bindings: Env }>();
labelKeys.use("*", requireJWT);

labelKeys.get("/chunks/:chunkId/keys", async (c) => {
  const { chunkId } = c.req.param();
  const { search, page = "1" } = c.req.query();
  const offset = (parseInt(page) - 1) * 50;
  let query = "SELECT * FROM label_keys WHERE chunk_id = ?";
  const binds: any[] = [chunkId];
  if (search) {
    query += " AND (key LIKE ? OR value LIKE ? OR description LIKE ?)";
    binds.push(...[`%${search}%`, `%${search}%`, `%${search}%`]);
  }
  query += " ORDER BY key LIMIT 50 OFFSET ?";
  binds.push(offset);
  const rows = await c.env.DB.prepare(query)
    .bind(...binds)
    .all();
  return c.json(rows.results);
});

labelKeys.post("/chunks/:chunkId/keys", async (c) => {
  const { userId } = c.get("jwtPayload");
  const { chunkId } = c.req.param();
  const { key, value, description } = await c.req.json<{
    key: string;
    value: string;
    description?: string;
  }>();
  const chunk = await c.env.DB.prepare("SELECT profile_id FROM label_chunks WHERE id = ?")
    .bind(chunkId)
    .first<{ profile_id: string }>();
  if (!chunk) return c.json({ error: "Chunk not found" }, 404);

  const id = nanoid();
  await c.env.DB.prepare(
    "INSERT INTO label_keys (id, profile_id, chunk_id, key, value, description, updated_by) VALUES (?, ?, ?, ?, ?, ?, ?)",
  )
    .bind(id, chunk.profile_id, chunkId, key, value, description ?? null, userId)
    .run();
  return c.json({ id }, 201);
});

labelKeys.patch("/:id", async (c) => {
  const { userId } = c.get("jwtPayload");
  const { value, description, updatedAt } = await c.req.json<{
    value?: string;
    description?: string;
    updatedAt?: string;
  }>();

  // Optimistic locking
  if (updatedAt) {
    const current = await c.env.DB.prepare("SELECT updated_at FROM label_keys WHERE id = ?")
      .bind(c.req.param("id"))
      .first<{ updated_at: string; value: string; updated_by: string }>();
    if (current && current.updated_at > updatedAt) {
      return c.json(
        {
          conflict: true,
          currentValue: current.value,
          updatedBy: current.updated_by,
          updatedAt: current.updated_at,
        },
        409,
      );
    }
  }

  await c.env.DB.prepare(
    "UPDATE label_keys SET value = COALESCE(?, value), description = COALESCE(?, description), updated_by = ?, updated_at = datetime('now') WHERE id = ?",
  )
    .bind(value ?? null, description ?? null, userId, c.req.param("id"))
    .run();
  return c.json({ ok: true });
});

labelKeys.delete("/:id", async (c) => {
  await c.env.DB.prepare("DELETE FROM label_keys WHERE id = ?").bind(c.req.param("id")).run();
  return c.json({ ok: true });
});

export { labelKeys as labelKeysRoutes };
```

### 8b. Commit

```bash
git add . && git commit -m "feat: label key CRUD — optimistic locking, search, pagination"
```

---

## Step 9: Usage Tracking via Cloudflare Queue

**Files**: `packages/api/src/routes/usage.ts`, `packages/api/src/workers/usageConsumer.ts`

### 9a. `packages/api/src/workers/usageConsumer.ts`

```typescript
// Processes usage queue messages and writes to D1 in batches
export interface UsageMessage {
  keyId: string;
  date: string; // YYYY-MM-DD
  count: number;
}

export async function handleUsageQueue(batch: MessageBatch<UsageMessage>, env: { DB: D1Database }) {
  // Aggregate by keyId+date
  const aggregated = new Map<string, number>();
  for (const msg of batch.messages) {
    const k = `${msg.body.keyId}|${msg.body.date}`;
    aggregated.set(k, (aggregated.get(k) ?? 0) + msg.body.count);
  }

  for (const [key, count] of aggregated) {
    const [keyId, date] = key.split("|");
    await env.DB.prepare(
      "INSERT INTO usage_daily (api_key_id, date, request_count) VALUES (?, ?, ?) ON CONFLICT(api_key_id, date) DO UPDATE SET request_count = request_count + excluded.request_count",
    )
      .bind(keyId, date, count)
      .run();
  }

  batch.ackAll();
}
```

### 9b. Usage route

```typescript
// packages/api/src/routes/usage.ts
import { Hono } from "hono";
import { Env } from "../index";
import { requireJWT } from "../middleware/auth";

const usage = new Hono<{ Bindings: Env }>();
usage.use("*", requireJWT);

usage.get("/", async (c) => {
  const { accountId } = c.get("jwtPayload");
  const rows = await c.env.DB.prepare(
    "SELECT k.id, k.label, k.key_prefix, SUM(u.request_count) as this_month FROM api_keys k LEFT JOIN usage_daily u ON u.api_key_id = k.id AND u.date >= strftime('%Y-%m-01', 'now') WHERE k.account_id = ? GROUP BY k.id",
  )
    .bind(accountId)
    .all();
  return c.json(rows.results);
});

usage.get("/history", async (c) => {
  const { accountId } = c.get("jwtPayload");
  const { from, to } = c.req.query();
  const rows = await c.env.DB.prepare(
    "SELECT u.date, u.api_key_id, u.request_count FROM usage_daily u JOIN api_keys k ON k.id = u.api_key_id WHERE k.account_id = ? AND u.date BETWEEN ? AND ? ORDER BY u.date DESC",
  )
    .bind(accountId, from || "2024-01-01", to || "2099-01-01")
    .all();
  return c.json(rows.results);
});

export { usage as usageRoutes };
```

### 9c. Commit

```bash
git add . && git commit -m "feat: usage tracking — Cloudflare Queue consumer, daily aggregation"
```

---

## Step 10: Dashboard — Auth + Shell (Next.js)

**Files**: `packages/dashboard/app/layout.tsx`, `packages/dashboard/app/(auth)/login/page.tsx`, `packages/dashboard/app/(app)/layout.tsx`, `packages/dashboard/lib/auth.ts`

### 10a. Init Next.js

```bash
cd packages/dashboard
npx create-next-app@latest . --typescript --app --tailwind --src-dir=false
pnpm add @tanstack/react-query axios js-cookie
```

### 10b. `packages/dashboard/lib/auth.ts`

```typescript
export interface Session {
  jwt: string;
  refreshToken: string;
  userId: string;
  accountId: string;
  exp: number;
}

const SESSION_KEY = "i18n_dashboard_session";

export function getSession(): Session | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const session: Session = JSON.parse(raw);
    if (session.exp < Date.now() / 1000) return null;
    return session;
  } catch {
    return null;
  }
}

export function saveSession(session: Session) {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function clearSession() {
  sessionStorage.removeItem(SESSION_KEY);
}

export async function refreshSession(current: Session): Promise<Session | null> {
  const res = await fetch("/api/proxy/auth/refresh", {
    method: "POST",
    body: JSON.stringify({ refreshToken: current.refreshToken }),
    headers: { "Content-Type": "application/json" },
  });
  if (!res.ok) return null;
  const data = await res.json();
  const newSession = { ...current, ...data };
  saveSession(newSession);
  return newSession;
}
```

### 10c. Login page `packages/dashboard/app/(auth)/login/page.tsx`

```tsx
"use client";
import { useState } from "react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [code, setCode] = useState(["", "", "", "", "", ""]);

  const sendCode = async () => {
    await fetch("/api/proxy/auth/email/request", {
      method: "POST",
      body: JSON.stringify({ email }),
      headers: { "Content-Type": "application/json" },
    });
    setCodeSent(true);
  };

  const verifyCode = async () => {
    const res = await fetch("/api/proxy/auth/email/verify", {
      method: "POST",
      body: JSON.stringify({ email, code: code.join("") }),
      headers: { "Content-Type": "application/json" },
    });
    if (res.ok) {
      const session = await res.json();
      // saveSession + redirect to /dashboard
    }
  };

  if (codeSent)
    return (
      <div className="flex flex-col items-center gap-4 p-8">
        <h1 className="text-xl font-semibold">Check your email</h1>
        <p className="text-gray-500">We sent a 6-digit code to {email}</p>
        <div className="flex gap-2">
          {code.map((d, i) => (
            <input
              key={i}
              type="text"
              maxLength={1}
              value={d}
              className="w-10 h-12 text-center border rounded text-lg"
              onChange={(e) => {
                const next = [...code];
                next[i] = e.target.value;
                setCode(next);
              }}
            />
          ))}
        </div>
        <button onClick={verifyCode} className="bg-black text-white px-6 py-2 rounded">
          Verify
        </button>
        <button onClick={() => sendCode()} className="text-sm text-gray-400">
          Resend
        </button>
      </div>
    );

  return (
    <div className="flex flex-col items-center gap-4 p-8 max-w-sm mx-auto mt-20">
      <h1 className="text-2xl font-bold">Sign in to ShipEasyI18n</h1>
      <a href="/api/proxy/auth/google" className="w-full border rounded px-4 py-2 text-center">
        Continue with Google
      </a>
      <a href="/api/proxy/auth/github" className="w-full border rounded px-4 py-2 text-center">
        Continue with GitHub
      </a>
      <div className="flex items-center gap-2 w-full">
        <hr className="flex-1" />
        <span className="text-gray-400 text-sm">or</span>
        <hr className="flex-1" />
      </div>
      <input
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="your@email.com"
        className="w-full border rounded px-3 py-2"
      />
      <button onClick={sendCode} className="w-full bg-black text-white rounded px-4 py-2">
        Send code
      </button>
    </div>
  );
}
```

### 10d. Commit

```bash
git add . && git commit -m "feat: dashboard — Next.js auth shell, login page (OAuth + OTP)"
```

---

## Step 11: Editor Auth Popup + Permission Check

**Files**: `packages/dashboard/app/editor-auth/page.tsx`, `packages/api/src/routes/editor.ts`

### 11a. `packages/api/src/routes/editor.ts`

```typescript
import { Hono } from "hono";
import { Env } from "../index";

const editor = new Hono<{ Bindings: Env }>();

// Verify user has access to the account owning this public key
editor.post("/verify", async (c) => {
  const { jwt, publicKey } = await c.req.json<{ jwt: string; publicKey: string }>();

  // Verify JWT
  const { verifyJWT } = await import("../middleware/auth");
  let payload: { userId: string; accountId: string };
  try {
    payload = await verifyJWT(jwt, c.env.JWT_SECRET);
  } catch {
    return c.json({ error: "Invalid token" }, 401);
  }

  // Verify the public key belongs to the same account
  const { sha256 } = await import("../middleware/auth");
  const kvData = (await c.env.KV_KEYS.get(publicKey, "json")) as { accountId: string } | null;
  if (!kvData || kvData.accountId !== payload.accountId) {
    return c.json({ authorized: false }, 403);
  }

  // Track developer seat
  const today = new Date().toISOString();
  await c.env.DB.prepare(
    "INSERT INTO developer_seats (id, account_id, user_id, first_seen_at, last_active_at) VALUES (?, ?, ?, ?, ?) ON CONFLICT(account_id, user_id) DO UPDATE SET last_active_at = excluded.last_active_at",
  )
    .bind(crypto.randomUUID(), payload.accountId, payload.userId, today, today)
    .run();

  return c.json({ authorized: true });
});

export { editor as editorRoutes };
```

### 11b. `packages/dashboard/app/editor-auth/page.tsx`

```tsx
"use client";
import { useSearchParams } from "next/navigation";
import { useState } from "react";

export default function EditorAuthPage() {
  const params = useSearchParams();
  const publicKey = params.get("key")!;
  const origin = params.get("origin")!;
  const nonce = params.get("nonce")!;
  const isRefresh = params.get("refresh") === "true";

  const [step, setStep] = useState<"login" | "verifying" | "success" | "denied">("login");

  async function afterLogin(jwt: string, refreshToken: string, exp: number) {
    setStep("verifying");
    const res = await fetch("/api/proxy/editor/verify", {
      method: "POST",
      body: JSON.stringify({ jwt, publicKey }),
      headers: { "Content-Type": "application/json" },
    });
    if (!res.ok || !(await res.json()).authorized) {
      setStep("denied");
      return;
    }
    // Post back to parent with nonce
    window.opener?.postMessage({ type: "i18n_auth_success", token: jwt, exp, nonce }, origin);
    setStep("success");
    setTimeout(() => window.close(), 500);
  }

  if (step === "denied")
    return (
      <div className="p-8 text-center">
        <p className="text-red-500 font-semibold">You don't have access to this site</p>
        <p className="text-gray-400 mt-2 text-sm">{origin}</p>
      </div>
    );

  if (step === "success")
    return <div className="p-8 text-center text-green-600">Authenticated ✓</div>;

  return (
    <div className="p-8 max-w-sm mx-auto">
      <h2 className="text-lg font-semibold mb-4">Sign in to edit labels</h2>
      <p className="text-sm text-gray-400 mb-6">{origin}</p>
      {/* Same login form as main login, calls afterLogin on success */}
    </div>
  );
}
```

### 11c. Commit

```bash
git add . && git commit -m "feat: editor auth popup — permission check, seat tracking, PKCE nonce postMessage"
```

---

## Step 12: MCP Server

**Files**: `packages/mcp/src/index.ts`, `packages/mcp/src/tools/*.ts`, `packages/mcp/package.json`

### 12a. `packages/mcp/package.json`

```json
{
  "name": "i18n-mcp",
  "version": "0.1.0",
  "bin": { "i18n-mcp": "dist/index.js" },
  "scripts": { "build": "tsc", "start": "node dist/index.js" },
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.0.0",
    "axios": "^1.0.0"
  }
}
```

### 12b. `packages/mcp/src/index.ts`

```typescript
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { tools } from "./tools/index.js";

const server = new Server({ name: "i18n", version: "0.1.0" }, { capabilities: { tools: {} } });

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: tools.map((t) => ({
    name: t.name,
    description: t.description,
    inputSchema: t.inputSchema,
  })),
}));

server.setRequestHandler(CallToolRequestSchema, async (req) => {
  const tool = tools.find((t) => t.name === req.params.name);
  if (!tool) throw new Error(`Unknown tool: ${req.params.name}`);
  const i18nKey = process.env.ShipEasyI18n_KEY!;
  const i18nToken = process.env.ShipEasyI18n_SECRET_TOKEN;
  const apiBase = process.env.ShipEasyI18n_API_BASE || "https://api.i18n.shipeasy.ai";
  return tool.execute(req.params.arguments ?? {}, { i18nKey, i18nToken, apiBase });
});

const transport = new StdioServerTransport();
await server.connect(transport);
```

### 12c. `packages/mcp/src/tools/index.ts`

```typescript
import { listKeysTool } from "./listKeys.js";
import { getKeyTool } from "./getKey.js";
import { createKeyTool } from "./createKey.js";
import { updateKeyTool } from "./updateKey.js";
import { deleteKeyTool } from "./deleteKey.js";
import { scanCodeTool } from "./scanCode.js";
import { validateTool } from "./validate.js";
import { translateTool } from "./translate.js";
import { translateAllTool } from "./translateAll.js";
import { publishTool } from "./publish.js";
import {
  draftListTool,
  draftCreateTool,
  draftUpdateTool,
  draftPublishTool,
  draftDiffTool,
} from "./drafts.js";

export const tools = [
  listKeysTool,
  getKeyTool,
  createKeyTool,
  updateKeyTool,
  deleteKeyTool, // require ShipEasyI18n_SECRET_TOKEN
  scanCodeTool,
  validateTool,
  translateTool,
  translateAllTool, // require ShipEasyI18n_SECRET_TOKEN
  publishTool, // require ShipEasyI18n_SECRET_TOKEN
  draftListTool,
  draftCreateTool,
  draftUpdateTool,
  draftPublishTool,
  draftDiffTool,
];
```

### 12d. Example tool: `packages/mcp/src/tools/createKey.ts`

```typescript
export const createKeyTool = {
  name: "i18n_create_key",
  description: "Create a new label key in a chunk. Requires ShipEasyI18n_SECRET_TOKEN.",
  inputSchema: {
    type: "object",
    properties: {
      key: { type: "string", description: 'Dot-notation key, e.g. "checkout.total"' },
      value: { type: "string", description: "Default string value with optional {{variables}}" },
      description: { type: "string", description: "Brief description for translators" },
      chunkId: { type: "string", description: "Target chunk ID" },
    },
    required: ["key", "value", "chunkId"],
  },
  async execute(args: any, ctx: { i18nKey: string; i18nToken?: string; apiBase: string }) {
    if (!ctx.i18nToken) throw new Error("ShipEasyI18n_SECRET_TOKEN required for write operations");
    const res = await fetch(`${ctx.apiBase}/chunks/${args.chunkId}/keys`, {
      method: "POST",
      headers: { Authorization: `Bearer ${ctx.i18nToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ key: args.key, value: args.value, description: args.description }),
    });
    const data = await res.json();
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
  },
};
```

### 12e. Commit

```bash
git add . && git commit -m "feat: MCP server — all label management tools, read/write auth separation"
```

---

## Step 13: Dashboard — Label Workspace

**Files**: `packages/dashboard/app/(app)/profiles/[id]/page.tsx`, `packages/dashboard/components/LabelTable.tsx`, `packages/dashboard/components/KeyEditor.tsx`

### 13a. `packages/dashboard/components/LabelTable.tsx`

```tsx
"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

interface Key {
  id: string;
  key: string;
  value: string;
  description: string | null;
  updated_at: string;
}

export function LabelTable({ chunkId }: { chunkId: string }) {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);

  const { data: keys } = useQuery<Key[]>({
    queryKey: ["keys", chunkId, search],
    queryFn: () =>
      fetch(`/api/proxy/chunks/${chunkId}/keys?search=${search}`).then((r) => r.json()),
  });

  const updateMutation = useMutation({
    mutationFn: async ({
      id,
      value,
      description,
      updatedAt,
    }: {
      id: string;
      value: string;
      description?: string;
      updatedAt: string;
    }) => {
      const res = await fetch(`/api/proxy/label-keys/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ value, description, updatedAt }),
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${getJWT()}` },
      });
      if (res.status === 409) {
        const conflict = await res.json();
        throw { type: "conflict", ...conflict };
      }
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["keys", chunkId] }),
  });

  return (
    <div>
      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search keys..."
        className="border rounded px-3 py-1 w-full mb-4"
      />
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-gray-400">
            <th className="text-left py-2">Key</th>
            <th>Value</th>
            <th>Description</th>
          </tr>
        </thead>
        <tbody>
          {keys?.map((k) => (
            <tr key={k.id} className="border-b hover:bg-gray-50" onClick={() => setEditingId(k.id)}>
              <td className="py-2 font-mono text-xs">{k.key}</td>
              <td>{k.value}</td>
              <td className="text-gray-400">{k.description}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function getJWT(): string {
  const s = sessionStorage.getItem("i18n_dashboard_session");
  return s ? JSON.parse(s).jwt : "";
}
```

### 13b. Commit

```bash
git add . && git commit -m "feat: dashboard label workspace — table, inline edit, optimistic conflict detection"
```

---

## Step 14: CLI Skeleton

**Files**: `packages/cli/src/index.ts`, `packages/cli/src/commands/*.ts`, `packages/cli/package.json`

### 14a. `packages/cli/package.json`

```json
{
  "name": "i18n-cli",
  "version": "0.1.0",
  "bin": { "i18n": "dist/index.js" },
  "scripts": { "build": "tsc", "dev": "ts-node src/index.ts" },
  "dependencies": {
    "commander": "^12.0.0",
    "chalk": "^5.0.0",
    "ora": "^8.0.0",
    "axios": "^1.0.0",
    "conf": "^12.0.0"
  }
}
```

### 14b. `packages/cli/src/index.ts`

```typescript
#!/usr/bin/env node
import { Command } from "commander";
import { loginCommand } from "./commands/login.js";
import { scanCommand } from "./commands/scan.js";
import { pushCommand } from "./commands/push.js";
import { validateCommand } from "./commands/validate.js";
import { publishCommand } from "./commands/publish.js";
import { keysCommand } from "./commands/keys.js";
import { translateCommand } from "./commands/translate.js";
import { coverageCommand } from "./commands/coverage.js";
import { draftCommand } from "./commands/draft.js";
import { initCommand } from "./commands/init.js";
import { importCommand } from "./commands/import.js";
import { exportCommand } from "./commands/export.js";

const program = new Command();
program.name("i18n").description("Label Rewrite Service CLI").version("0.1.0");

program.addCommand(initCommand);
program.addCommand(loginCommand);
program.addCommand(scanCommand);
program.addCommand(pushCommand);
program.addCommand(validateCommand);
program.addCommand(publishCommand);
program.addCommand(keysCommand);
program.addCommand(translateCommand);
program.addCommand(coverageCommand);
program.addCommand(draftCommand);
program.addCommand(importCommand);
program.addCommand(exportCommand);

program.parse();
```

### 14c. `packages/cli/src/commands/scan.ts`

```typescript
import { Command } from "commander";
import { glob } from "glob";
import { readFile } from "fs/promises";
import chalk from "chalk";
import { loadConfig } from "../lib/config.js";
import { getApiKeys } from "../lib/api.js";

export const scanCommand = new Command("scan")
  .description("Scan codebase for data-label attributes and i18n.t() calls")
  .option("--diff <ref>", "Scan only files changed since git ref")
  .option("--json", "Output as JSON")
  .action(async (opts) => {
    const config = await loadConfig();
    let files: string[];

    if (opts.diff) {
      const { execSync } = await import("child_process");
      const changed = execSync(`git diff --name-only ${opts.diff}`).toString().trim().split("\n");
      files = changed.filter((f) => config.scan.include.some((p: string) => f.match(p)));
    } else {
      files = await glob(config.scan.include, { ignore: config.scan.exclude });
    }

    const found: { key: string; file: string; line: number }[] = [];
    for (const file of files) {
      const content = await readFile(file, "utf8");
      const lines = content.split("\n");
      lines.forEach((line, i) => {
        // Match data-label="..." and i18n.t('...')
        const dataLabelMatch = line.match(/data-label="([^"]+)"/);
        const tCallMatch = line.match(/(?:i18n\.t|window\.__i18n\.t)\(['"]([^'"]+)['"]/);
        const key = dataLabelMatch?.[1] || tCallMatch?.[1];
        if (key) found.push({ key, file, line: i + 1 });
      });
    }

    // Compare against existing ShipEasyI18n keys
    const existingKeys = await getApiKeys(config);
    const newKeys = found.filter((f) => !existingKeys.includes(f.key));

    if (opts.json) {
      console.log(JSON.stringify(newKeys));
      return;
    }

    if (newKeys.length === 0) {
      console.log(chalk.green("✓ No new keys found"));
      return;
    }
    console.log(`\n  Found ${chalk.yellow(newKeys.length)} new keys not in ShipEasyI18n:\n`);
    newKeys.forEach((k) =>
      console.log(
        `  ${chalk.cyan("✦")} ${chalk.bold(k.key.padEnd(40))} ${chalk.gray(k.file + ":" + k.line)}`,
      ),
    );
    console.log(`\n  Run ${chalk.bold("i18n push")} to create them.\n`);
  });
```

### 14d. `packages/cli/src/commands/init.ts`

```typescript
import { Command } from "commander";
import { writeFile, mkdir } from "fs/promises";
import { existsSync } from "fs";

export const initCommand = new Command("init")
  .description("Initialize ShipEasyI18n in this project")
  .option("--skills", "Install Claude Code skill files to .claude/skills/i18n/")
  .action(async (opts) => {
    // 1. Write i18n.config.json
    const config = {
      key: process.env.ShipEasyI18n_KEY || "i18n_pk_YOUR_KEY",
      profile: "en:prod",
      chunks: { index: ["nav.*", "common.*"] },
      scan: { include: ["src/**/*.{tsx,vue,html,erb}"], exclude: ["node_modules", "dist"] },
    };
    await writeFile("i18n.config.json", JSON.stringify(config, null, 2));

    // 2. Install pre-commit hook
    const hookPath = ".git/hooks/pre-commit";
    if (!existsSync(hookPath)) {
      await writeFile(hookPath, "#!/bin/sh\ni18n validate\n", { mode: 0o755 });
    }

    // 3. Install skill files if --skills
    if (opts.skills) {
      await mkdir(".claude/skills/i18n", { recursive: true });
      // Copy skill files from package
      const skillsDir = new URL("../skills/", import.meta.url).pathname;
      // ... copy files
    }

    console.log("✓ ShipEasyI18n initialized. Edit i18n.config.json with your public key.");
  });
```

### 14e. Commit

```bash
git add . && git commit -m "feat: CLI skeleton — init, scan, push, validate, keys, translate, draft commands"
```

---

## Step 15: Editor Overlay (editor.js)

**Files**: `packages/loader/src/editor.ts`

### 15a. `packages/loader/src/editor.ts`

```typescript
// Loaded only after successful editor auth — ~50KB budget
(function () {
  const script = document.currentScript as HTMLScriptElement;
  const token = script.dataset.token!;

  // --- Shadow DOM container to avoid CSS conflicts ---
  const host = document.createElement("div");
  host.id = "i18n-editor-root";
  document.body.appendChild(host);
  const shadow = host.attachShadow({ mode: "open" });

  // --- Toolbar ---
  const toolbar = document.createElement("div");
  toolbar.style.cssText =
    "position:fixed;bottom:20px;right:20px;background:#1a1a1a;color:#fff;padding:8px 12px;border-radius:8px;font-family:monospace;font-size:12px;z-index:2147483647;display:flex;gap:8px;align-items:center;cursor:move";
  toolbar.innerHTML = `
    <span style="width:8px;height:8px;background:#4ade80;border-radius:50%;display:inline-block"></span>
    <span id="i18n-draft-name">ShipEasyI18n Editor</span>
    <button id="i18n-publish">Publish</button>
    <button id="i18n-logout" style="opacity:0.6">✕</button>
  `;
  shadow.appendChild(toolbar);

  // --- Popover ---
  let currentPopover: HTMLElement | null = null;
  let currentKey: string | null = null;

  function showPopover(el: Element, key: string) {
    removePopover();
    currentKey = key;
    const value = window.__i18n?.strings[key] ?? "";
    const desc = el.getAttribute("data-label-desc") || "";
    const rawVars = el.getAttribute("data-variables");
    const vars = rawVars ? JSON.parse(rawVars) : {};
    const varNames = Object.keys(vars);

    const popover = document.createElement("div");
    popover.style.cssText =
      "position:absolute;background:#fff;border:1px solid #e5e7eb;border-radius:8px;padding:12px;box-shadow:0 4px 20px rgba(0,0,0,.15);z-index:2147483646;width:320px;font-family:system-ui;font-size:13px";
    popover.innerHTML = `
      <div style="font-weight:600;margin-bottom:4px;font-family:monospace;font-size:11px;color:#6b7280">${key}</div>
      ${desc ? `<div style="color:#6b7280;font-size:12px;margin-bottom:8px;padding:6px 8px;background:#f9fafb;border-radius:4px">ⓘ ${desc}</div>` : ""}
      <textarea id="i18n-value" style="width:100%;border:1px solid #e5e7eb;border-radius:4px;padding:6px;font-size:13px;resize:vertical;min-height:60px">${value}</textarea>
      ${varNames.length ? `<div style="color:#9ca3af;font-size:11px;margin-top:4px">Variables: ${varNames.map((v) => `{{${v}}}`).join(", ")}</div>` : ""}
      <div style="display:flex;gap:8px;margin-top:8px;justify-content:flex-end">
        <button id="i18n-save-draft" style="border:1px solid #e5e7eb;border-radius:4px;padding:4px 10px;cursor:pointer">Save draft</button>
        <button id="i18n-save-publish" style="background:#1a1a1a;color:#fff;border-radius:4px;padding:4px 10px;cursor:pointer">Publish</button>
      </div>
    `;

    const rect = el.getBoundingClientRect();
    popover.style.top = `${rect.bottom + scrollY + 4}px`;
    popover.style.left = `${Math.min(rect.left + scrollX, window.innerWidth - 340)}px`;
    document.body.appendChild(popover);
    currentPopover = popover;

    popover.querySelector("#i18n-save-draft")?.addEventListener("click", () => saveKey(false));
    popover.querySelector("#i18n-save-publish")?.addEventListener("click", () => saveKey(true));
  }

  async function saveKey(publish: boolean) {
    if (!currentKey || !currentPopover) return;
    const value = (currentPopover.querySelector("#i18n-value") as HTMLTextAreaElement).value;
    const res = await fetch(`https://api.i18n.shipeasy.ai/label-keys/${encodeKey(currentKey)}`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        value,
        updatedAt: window.__i18n?.strings[currentKey + "_updated_at"],
      }),
    });
    if (res.status === 409) {
      const conflict = await res.json();
      // Show conflict resolution UI
      const keep = confirm(
        `Conflict: ${conflict.updatedBy} saved "${conflict.currentValue}". Keep yours?`,
      );
      if (!keep) {
        /* restore their value */
      }
      return;
    }
    // Live preview
    if (window.__i18n) window.__i18n.strings[currentKey] = value;
    document.querySelectorAll(`[data-label="${currentKey}"]`).forEach((el) => {
      const rawVars = el.getAttribute("data-variables");
      const vars = rawVars ? JSON.parse(rawVars) : {};
      el.textContent = value.replace(/\{\{(\w+)\}\}/g, (_, k) => vars[k] ?? `{{${k}}}`);
    });
    removePopover();
  }

  function removePopover() {
    currentPopover?.remove();
    currentPopover = null;
  }

  function encodeKey(key: string) {
    return encodeURIComponent(key);
  }

  // --- Highlight on hover ---
  document.addEventListener("mouseover", (e) => {
    const el = (e.target as Element).closest("[data-label]");
    if (!el) return;
    (el as HTMLElement).style.outline = "2px solid #4ade80";
    (el as HTMLElement).style.outlineOffset = "2px";
    el.addEventListener(
      "mouseleave",
      () => {
        (el as HTMLElement).style.outline = "";
      },
      { once: true },
    );
  });

  document.addEventListener(
    "click",
    (e) => {
      const el = (e.target as Element).closest("[data-label]");
      if (!el) {
        removePopover();
        return;
      }
      e.preventDefault();
      e.stopPropagation();
      showPopover(el, el.getAttribute("data-label")!);
    },
    true,
  );

  toolbar.querySelector("#i18n-logout")?.addEventListener("click", () => {
    sessionStorage.removeItem(`i18n_editor_${script.dataset.key}`);
    host.remove();
  });
})();
```

### 15b. Commit

```bash
git add . && git commit -m "feat: editor.js overlay — Shadow DOM toolbar, popover, live preview, conflict resolution"
```

---

## Step 16: Drafts API

**Files**: `packages/api/src/routes/drafts.ts`

### 16a. `packages/api/src/routes/drafts.ts`

```typescript
import { Hono } from "hono";
import { Env } from "../index";
import { requireJWT } from "../middleware/auth";
import { nanoid } from "nanoid";

const drafts = new Hono<{ Bindings: Env }>();
drafts.use("*", requireJWT);

// Plan guard
drafts.use("*", async (c, next) => {
  const { accountId } = c.get("jwtPayload");
  const account = await c.env.DB.prepare("SELECT plan FROM accounts WHERE id = ?")
    .bind(accountId)
    .first<{ plan: string }>();
  if (!account || account.plan === "free")
    return c.json({ error: "Upgrade to Pro to use drafts", upgrade: true }, 402);
  await next();
});

drafts.get("/profiles/:id/drafts", async (c) => {
  const rows = await c.env.DB.prepare(
    "SELECT * FROM label_drafts WHERE profile_id = ? AND status = ? ORDER BY updated_at DESC",
  )
    .bind(c.req.param("id"), "active")
    .all();
  return c.json(rows.results);
});

drafts.post("/profiles/:id/drafts", async (c) => {
  const { userId, accountId } = c.get("jwtPayload");
  const { name } = await c.req.json<{ name: string }>();
  const id = nanoid();
  await c.env.DB.prepare(
    "INSERT INTO label_drafts (id, profile_id, account_id, name, created_by) VALUES (?, ?, ?, ?, ?)",
  )
    .bind(id, c.req.param("id"), accountId, name, userId)
    .run();
  return c.json({ id }, 201);
});

drafts.get("/:id/keys", async (c) => {
  // ETag support for polling
  const rows = await c.env.DB.prepare("SELECT * FROM label_draft_keys WHERE draft_id = ?")
    .bind(c.req.param("id"))
    .all();
  const etag = `"${Date.now()}"`; // replace with content hash
  if (c.req.header("If-None-Match") === etag) return new Response(null, { status: 304 });
  return c.json(rows.results, 200, { ETag: etag });
});

drafts.post("/:id/publish", async (c) => {
  const { accountId } = c.get("jwtPayload");
  const draftId = c.req.param("id");
  const draft = await c.env.DB.prepare("SELECT * FROM label_drafts WHERE id = ? AND account_id = ?")
    .bind(draftId, accountId)
    .first<any>();
  if (!draft) return c.json({ error: "Not found" }, 404);

  // Merge draft keys into label_keys
  const draftKeys = await c.env.DB.prepare("SELECT * FROM label_draft_keys WHERE draft_id = ?")
    .bind(draftId)
    .all();
  for (const dk of draftKeys.results as any[]) {
    await c.env.DB.prepare(
      "UPDATE label_keys SET value = ?, updated_at = datetime('now') WHERE profile_id = ? AND key = ?",
    )
      .bind(dk.value, draft.profile_id, dk.key)
      .run();
  }

  // Publish profile
  const { publishProfile } = await import("../lib/publisher.js");
  await publishProfile(c.env, draft.profile_id);

  // Archive draft
  await c.env.DB.prepare(
    "UPDATE label_drafts SET status = 'published', published_at = datetime('now') WHERE id = ?",
  )
    .bind(draftId)
    .run();
  return c.json({ ok: true });
});

export { drafts as draftsRoutes };
```

### 16b. Commit

```bash
git add . && git commit -m "feat: drafts API — plan guard, ETag polling, merge + publish, archive"
```

---

## Step 17: Dashboard — Drafts UI

**Files**: `packages/dashboard/app/(app)/profiles/[id]/drafts/page.tsx`

### 17a. Drafts page

```tsx
"use client";
import { useQuery, useMutation } from "@tanstack/react-query";

export default function DraftsPage({ params }: { params: { id: string } }) {
  const { data: drafts } = useQuery({
    queryKey: ["drafts", params.id],
    queryFn: () => fetch(`/api/proxy/profiles/${params.id}/drafts`).then((r) => r.json()),
  });

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-lg font-semibold">Drafts</h2>
        <button className="bg-black text-white rounded px-4 py-2 text-sm">+ New draft</button>
      </div>
      <div className="space-y-2">
        {drafts?.map((d: any) => (
          <div key={d.id} className="border rounded p-4 flex justify-between items-center">
            <div>
              <div className="font-medium">{d.name}</div>
              <div className="text-sm text-gray-400">
                Updated {new Date(d.updated_at).toLocaleDateString()}
              </div>
            </div>
            <div className="flex gap-2">
              <button className="text-sm border rounded px-3 py-1">View diff</button>
              <button className="text-sm bg-black text-white rounded px-3 py-1">Publish</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

### 17b. Commit

```bash
git add . && git commit -m "feat: dashboard drafts UI — list, create, diff, publish"
```

---

## Step 18: Developer Seat Tracking + Billing

**Files**: `packages/api/src/routes/seats.ts`, `packages/api/src/lib/stripe.ts`, `packages/dashboard/app/(app)/settings/billing/page.tsx`

### 18a. `packages/api/src/lib/stripe.ts`

```typescript
export const SEAT_LIMITS: Record<string, number> = {
  free: 2,
  pro: 5,
  business: 20,
  enterprise: Infinity,
};

export async function checkSeatLimit(
  env: { DB: D1Database },
  accountId: string,
): Promise<{ allowed: boolean; current: number; limit: number }> {
  const account = await env.DB.prepare("SELECT plan FROM accounts WHERE id = ?")
    .bind(accountId)
    .first<{ plan: string }>();
  const plan = account?.plan ?? "free";
  const limit = SEAT_LIMITS[plan] ?? 1;

  const current = await env.DB.prepare(
    "SELECT COUNT(*) as count FROM developer_seats WHERE account_id = ? AND last_active_at > datetime('now', '-30 days')",
  )
    .bind(accountId)
    .first<{ count: number }>();

  return { allowed: (current?.count ?? 0) < limit, current: current?.count ?? 0, limit };
}
```

### 18b. Seat check in editor auth

```typescript
// Add to packages/api/src/routes/editor.ts POST /verify
const seatCheck = await checkSeatLimit(c.env, kvData.accountId);
if (!seatCheck.allowed) {
  return c.json(
    { authorized: false, reason: "seat_limit", current: seatCheck.current, limit: seatCheck.limit },
    403,
  );
}
```

### 18c. Billing page shows active seats

```tsx
// packages/dashboard/app/(app)/settings/billing/page.tsx
// Shows: current plan, active seats this month, upgrade CTA
```

### 18d. Commit

```bash
git add . && git commit -m "feat: developer seat tracking — 30-day active window, plan limits, billing page"
```

---

## Step 19: CLI AI Commands (translate, coverage)

**Files**: `packages/cli/src/commands/translate.ts`, `packages/cli/src/commands/coverage.ts`

### 19a. `packages/cli/src/commands/translate.ts`

```typescript
import { Command } from "commander";
import chalk from "chalk";
import ora from "ora";
import { loadConfig, getToken } from "../lib/config.js";
import { apiClient } from "../lib/api.js";

export const translateCommand = new Command("translate")
  .description("AI-translate missing keys from source to target profile")
  .option("--from <profile>", "Source profile")
  .option("--to <profile>", "Target profile")
  .option("--key <key>", "Translate single key only")
  .option("--missing-only", "Only translate keys missing in target (default: true)", true)
  .action(async (opts) => {
    const config = await loadConfig();
    const api = apiClient(config, await getToken());
    const spinner = ora("Translating...").start();

    const res = await api.post("/translate", {
      fromProfile: opts.from || config.profile,
      toProfile: opts.to,
      key: opts.key,
      missingOnly: opts.missingOnly,
    });

    spinner.succeed(`Translated ${res.data.count} keys → created draft "${res.data.draftName}"`);
    console.log(chalk.gray(`  Preview: i18n draft switch "${res.data.draftName}"`));
    console.log(chalk.gray(`  Publish: i18n draft publish "${res.data.draftName}"`));
  });
```

### 19b. Commit

```bash
git add . && git commit -m "feat: CLI translate + coverage commands with draft output"
```

---

## Step 20: Landing Page (i18n.shipeasy.ai)

**Files**: `packages/landing/` — Next.js static site

### 20a. Init

```bash
cd packages/landing
npx create-next-app@latest . --typescript --app --tailwind
```

### 20b. Key sections to implement in `packages/landing/app/page.tsx`

```
/ (landing page)
  ├── Hero — "Translate any web app without touching code"
  │     ├── Demo embed showing live label switching
  │     └── CTA: "Start free" → app.i18n.shipeasy.ai/register
  ├── How it works — 3-step: Add script tag → Manage labels → Publish
  ├── Features grid — per-framework integrations, in-browser editor, AI translate, CI/CD
  ├── Pricing table — Free / Pro $29 / Business $99 / Enterprise
  ├── Social proof — logos, testimonials
  ├── Footer — docs, blog, GitHub, status
/pricing         ← detailed pricing page
/blog            ← MDX blog
/changelog       ← release notes
```

### 20c. Pricing component

```tsx
// packages/landing/app/components/PricingTable.tsx
const plans = [
  {
    name: "Free",
    price: "$0",
    features: ["1 profile", "1M req/mo", "2 seats", "Dashboard + editor"],
  },
  {
    name: "Pro",
    price: "$29/mo",
    features: [
      "5 profiles",
      "10M req/mo",
      "5 seats",
      "Drafts",
      "Variable validation",
      "Webhooks",
      "100k AI chars/mo included",
    ],
  },
  {
    name: "Business",
    price: "$99/mo",
    features: [
      "Unlimited profiles",
      "100M req/mo",
      "20 seats",
      "Approval workflow",
      "Custom CDN domain",
      "Priority support",
      "1M AI chars/mo included",
    ],
  },
  {
    name: "Enterprise",
    price: "Custom",
    features: [
      "Unlimited everything",
      "SSO / SAML",
      "Audit log",
      "SLA 99.9%",
      "Self-hosted option",
      "Negotiated AI quota",
    ],
  },
];

// AI translation — three paths on Pro+. Hosted is bundled; BYO paths are free and bypass the quota.
const aiOptions = [
  {
    name: "Hosted AI (included)",
    price: "Bundled in paid plans",
    blurb:
      "100k chars/mo on Pro, 1M chars/mo on Business. Overage $0.00005/char ($50 per 1M). Curated model, zero setup. Great for small translation workloads.",
  },
  {
    name: "Bring Your Own API Key",
    price: "Free on Pro+",
    blurb:
      "Plug in OpenAI, Anthropic, Gemini, Azure OpenAI, or local Ollama. We call your provider with your key. Zero markup, zero quota, zero lock-in.",
  },
  {
    name: "ShipEasyI18n MCP server (BYO AI tool)",
    price: "Free on Pro+",
    blurb:
      "Download the ShipEasyI18n MCP server, plug it into Claude Code, Cursor, Claude Desktop, or any MCP client. Translate with the AI you already pay for — results save straight into your profile.",
  },
];
```

### 20c.1 Competitor comparison component

Render directly below the pricing table on `/` and `/pricing`. Goal: show devs we undercut incumbents on price while shipping the things _they_ care about (no-code loader, framework SDKs, Cloudflare edge latency).

```tsx
// packages/landing/app/components/CompetitorCompare.tsx
const rows = [
  {
    feature: "Starting paid price",
    us: "$29/mo",
    weglot: "$17/mo",
    phrase: "$27/mo",
    lokalise: "$120/mo",
    crowdin: "$50/mo",
  },
  {
    feature: "Mid tier",
    us: "$99/mo",
    weglot: "$53/mo",
    phrase: "$90/mo",
    lokalise: "$230/mo",
    crowdin: "$200/mo",
  },
  {
    feature: "Requests included (mid)",
    us: "100M",
    weglot: "500k pv",
    phrase: "n/a",
    lokalise: "n/a",
    crowdin: "n/a",
  },
  {
    feature: "Edge CDN delivery",
    us: "Yes (CF)",
    weglot: "Yes",
    phrase: "No",
    lokalise: "No",
    crowdin: "No",
  },
  {
    feature: "No-code loader (1 script tag)",
    us: "Yes",
    weglot: "Yes",
    phrase: "No",
    lokalise: "No",
    crowdin: "No",
  },
  {
    feature: "Framework SDKs (React/Vue/…)",
    us: "14+",
    weglot: "Partial",
    phrase: "SDK-only",
    lokalise: "SDK-only",
    crowdin: "SDK-only",
  },
  {
    feature: "In-browser visual editor",
    us: "Yes",
    weglot: "Yes",
    phrase: "No",
    lokalise: "Partial",
    crowdin: "Partial",
  },
  {
    feature: "AI: hosted included",
    us: "100k–1M chars bundled",
    weglot: "Bundled (capped)",
    phrase: "Add-on",
    lokalise: "Bundled",
    crowdin: "Bundled",
  },
  {
    feature: "AI: Bring your own API key (OpenAI/Anthropic/…)",
    us: "Yes (free)",
    weglot: "No",
    phrase: "No",
    lokalise: "No",
    crowdin: "No",
  },
  {
    feature: "MCP server — translate w/ Claude Code, Cursor, etc.",
    us: "Yes (free)",
    weglot: "No",
    phrase: "No",
    lokalise: "No",
    crowdin: "No",
  },
  {
    feature: "Drafts / approval workflow",
    us: "Pro / Biz",
    weglot: "Business",
    phrase: "Pro",
    lokalise: "Yes",
    crowdin: "Yes",
  },
  {
    feature: "Self-host option",
    us: "Enterprise",
    weglot: "No",
    phrase: "No",
    lokalise: "No",
    crowdin: "Enterprise",
  },
  {
    feature: "Pay only for what you use (AI)",
    us: "Yes",
    weglot: "No",
    phrase: "No",
    lokalise: "No",
    crowdin: "No",
  },
];

// Headline above table:
//   "Priced like Weglot. Built like Lokalise. Runs on Cloudflare's edge."
// Subhead:
//   "We unbundle AI so you don't pay for translation you don't use — most teams save 40–60% vs Lokalise."
```

**Why these columns**: Weglot = closest price competitor; Phrase = closest dev-tool competitor; Lokalise/Crowdin = the enterprise incumbents teams compare us to during bake-offs. Keep the row count ≤ 12 — longer tables don't convert.

**What to emphasize above the fold**:

1. **Cheaper mid-tier than Phrase, Lokalise, Crowdin** ($99 vs $90–230).
2. **Edge delivery** — translations served from Cloudflare's 300+ POPs, not a single origin.
3. **BYO AI (two ways)** — plug in your own OpenAI/Anthropic/Gemini/Azure/Ollama API key, OR use our downloadable MCP server with Claude Code / Cursor / Claude Desktop. No competitor offers either. Free on Pro+.
4. **14+ framework SDKs** — Next.js, Remix, Astro, Nuxt, SvelteKit, Qwik, Solid, Angular, Vue, React, Rails, Django, Laravel, FBT.
5. **Built for applications, not websites** — structured keys, ICU plurals, drafts/approval, webhooks, seats. Weglot translates pages; we translate products.

### 20d. Deploy to Cloudflare Pages

```bash
cd packages/landing && pnpm build
wrangler pages deploy out --project-name i18n-landing
```

### 20e. Commit

```bash
git add . && git commit -m "feat: landing page — hero, how it works, pricing table, Cloudflare Pages deploy"
```

---

## Step 21: Documentation Platform (docs.i18n.shipeasy.ai)

**Files**: `packages/docs/` — Starlight (Astro-based)

### 21a. Init Starlight

```bash
cd packages/docs
npm create astro@latest . -- --template starlight
```

### 21b. Content structure `packages/docs/src/content/docs/`

```
getting-started/
  quick-start.md           ← add script tag, your first label
  how-it-works.md          ← architecture overview
  key-concepts.md          ← profiles, chunks, drafts

frameworks/
  react.md
  nextjs-app-router.md
  nextjs-pages-router.md
  remix.md
  vue.md
  nuxt.md
  angular.md
  svelte.md
  sveltekit.md
  solid.md
  qwik.md
  astro.md
  rails.md
  django.md
  laravel.md
  wordpress.md
  fbt-adapter.md

api-reference/
  rest-api.md              ← all endpoints with examples
  javascript-api.md        ← window.i18n.t(), ready(), on(), prefetch()
  data-attributes.md       ← data-label, data-variables, data-label-desc, data-label-attr

cli/
  installation.md
  commands.md              ← all commands with examples
  ci-cd.md                 ← GitHub Actions, GitLab CI
  pre-commit-hook.md

mcp/
  setup.md                 ← .claude/mcp.json config
  tools.md                 ← all MCP tools reference
  claude-code-workflow.md  ← end-to-end workflow examples

onboarding/
  codemod.md               ← running i18n codemod for automated migration
  ai-assisted.md           ← using Claude/Codex for migration path

concepts/
  drafts.md
  variable-interpolation.md
  page-splitting.md
  caching.md
  seat-billing.md
```

### 21c. React integration doc (example content)

```markdown
---
title: React Integration
description: Use ShipEasyI18n with React 18 for zero-flash label management
---

## Installation

\`\`\`bash
npm install @i18n/react
\`\`\`

## Script tag

Add to `public/index.html` `<head>`:

\`\`\`html

<script src="https://cdn.i18n.shipeasy.ai/loader.js"
        data-key="i18n_pk_YOUR_KEY"
        data-profile="en:prod"
        async></script>

\`\`\`

## Usage

\`\`\`tsx
import { useShipEasyI18n } from '@i18n/react'

function Greeting({ name }: { name: string }) {
const { t } = useShipEasyI18n()
return <h1>{t('user.greeting', { name })}</h1>
}
\`\`\`

## Declarative (no hook required)

\`\`\`tsx
<span
data-label="user.greeting"
data-variables={JSON.stringify({ name })}
data-label-desc="Main greeting shown on dashboard after login"
/>
\`\`\`

## SSR / Next.js considerations

See [Next.js App Router](./nextjs-app-router) for hydration mismatch handling.
```

### 21d. Commit

```bash
git add . && git commit -m "feat: docs platform — Starlight/Astro, all framework guides, API reference, CLI + MCP docs"
```

---

## Step 22: Stripe Integration

**Files**: `packages/api/src/lib/stripe.ts`, `packages/api/src/routes/billing.ts`, `packages/api/src/routes/webhooks.ts`, `packages/dashboard/app/(app)/settings/billing/page.tsx`

Stripe handles all payment collection. ShipEasyI18n stores only `stripe_customer_id` and `stripe_subscription_id` — no card data ever touches ShipEasyI18n servers.

### 22a. Stripe product/price setup (run once in Stripe dashboard)

```
Products to create in Stripe:
  ShipEasyI18n Pro      → price_pro_monthly      $29/mo  (recurring, flat)
  ShipEasyI18n Business → price_business_monthly $99/mo  (recurring, flat)
  ShipEasyI18n Enterprise → price_enterprise     custom (contact sales)

Metered add-ons:
  ShipEasyI18n Requests    → price_requests_overage   $0.0001/req above plan quota (metered)
  ShipEasyI18n AI (meter)  → price_ai_chars_overage   $0.00005/char above plan's bundled AI quota (metered)
```

Notes:

- Bundled AI quota lives on every paid plan — no separate AI subscription item. Only the overage is metered.
- BYO (API key or MCP server) bypasses hosted AI entirely; no metering, no quota.
- Request overage and AI char overage are separate Stripe metered line items.

Save price IDs to Workers secrets:

```bash
wrangler secret put STRIPE_SECRET_KEY
wrangler secret put STRIPE_WEBHOOK_SECRET
wrangler secret put STRIPE_PRICE_PRO
wrangler secret put STRIPE_PRICE_BUSINESS
wrangler secret put STRIPE_PRICE_REQUESTS_OVERAGE
wrangler secret put STRIPE_PRICE_AI_CHARS_OVERAGE
```

### 22b. D1 schema additions `shared/schema/004_billing.sql`

```sql
ALTER TABLE accounts ADD COLUMN stripe_customer_id TEXT;
ALTER TABLE accounts ADD COLUMN stripe_subscription_id TEXT;
ALTER TABLE accounts ADD COLUMN subscription_status TEXT DEFAULT 'active';
ALTER TABLE accounts ADD COLUMN billing_period_end TEXT;
ALTER TABLE accounts ADD COLUMN cancel_at_period_end INTEGER DEFAULT 0;

-- AI translation: bundled on every paid plan, overage metered. BYO (API key or MCP) bypasses hosted quota.
ALTER TABLE accounts ADD COLUMN ai_chars_used_this_period INTEGER NOT NULL DEFAULT 0;
ALTER TABLE accounts ADD COLUMN ai_overage_subscription_item_id TEXT; -- stripe sub item for metered overage reporting
ALTER TABLE accounts ADD COLUMN ai_byo_provider TEXT;       -- 'openai' | 'anthropic' | 'gemini' | 'azure' | 'ollama' | NULL
ALTER TABLE accounts ADD COLUMN ai_byo_key_ciphertext TEXT; -- AES-GCM encrypted API key

CREATE TABLE billing_events (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL REFERENCES accounts(id),
  stripe_event_id TEXT NOT NULL UNIQUE,
  event_type TEXT NOT NULL,
  amount_cents INTEGER,
  currency TEXT,
  status TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  raw_payload TEXT NOT NULL
);
```

```bash
wrangler d1 execute i18n-db --file=shared/schema/004_billing.sql
```

### 22c. `packages/api/src/lib/stripe.ts`

```typescript
export const PLAN_PRICES: Record<string, string> = {
  pro: process.env.STRIPE_PRICE_PRO!,
  business: process.env.STRIPE_PRICE_BUSINESS!,
};

export const PLAN_LIMITS = {
  //           requests,      seats, profiles, apiKeys, aiCharsIncluded, mcpAllowed
  free: {
    requests: 1_000_000,
    seats: 2,
    profiles: 1,
    apiKeys: 1,
    aiCharsIncluded: 0,
    byoAllowed: false,
  },
  pro: {
    requests: 10_000_000,
    seats: 5,
    profiles: 5,
    apiKeys: 5,
    aiCharsIncluded: 100_000,
    byoAllowed: true,
  },
  business: {
    requests: 100_000_000,
    seats: 20,
    profiles: -1,
    apiKeys: -1,
    aiCharsIncluded: 1_000_000,
    byoAllowed: true,
  },
  enterprise: {
    requests: -1,
    seats: -1,
    profiles: -1,
    apiKeys: -1,
    aiCharsIncluded: -1,
    byoAllowed: true,
  },
};

// Hosted AI overage billed per character beyond the bundled quota. No separate subscription.
// BYO key / BYO MCP bypasses hosted quota entirely and is free on Pro+.
export const AI_OVERAGE_PRICE_PER_CHAR = 0.00005; // $50 per 1M chars

export async function getOrCreateStripeCustomer(
  stripeKey: string,
  accountId: string,
  email: string,
  name: string,
): Promise<string> {
  const res = await stripeRequest(stripeKey, "POST", "/customers", {
    email,
    name,
    metadata: { i18n_account_id: accountId },
  });
  return res.id;
}

export async function createCheckoutSession(
  stripeKey: string,
  customerId: string,
  priceId: string,
  successUrl: string,
  cancelUrl: string,
): Promise<string> {
  const res = await stripeRequest(stripeKey, "POST", "/checkout/sessions", {
    customer: customerId,
    mode: "subscription",
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: successUrl,
    cancel_url: cancelUrl,
    allow_promotion_codes: true,
    billing_address_collection: "auto",
    subscription_data: { metadata: { i18n_customer_id: customerId } },
  });
  return res.url;
}

export async function createCustomerPortalSession(
  stripeKey: string,
  customerId: string,
  returnUrl: string,
): Promise<string> {
  const res = await stripeRequest(stripeKey, "POST", "/billing_portal/sessions", {
    customer: customerId,
    return_url: returnUrl,
  });
  return res.url;
}

export async function cancelSubscription(stripeKey: string, subscriptionId: string): Promise<void> {
  await stripeRequest(stripeKey, "POST", `/subscriptions/${subscriptionId}`, {
    cancel_at_period_end: true,
  });
}

export async function changeSubscriptionPlan(
  stripeKey: string,
  subscriptionId: string,
  newPriceId: string,
): Promise<void> {
  // Fetch subscription first to get item ID
  const sub = await stripeRequest(stripeKey, "GET", `/subscriptions/${subscriptionId}`);
  const itemId = sub.items.data[0].id;
  await stripeRequest(stripeKey, "POST", `/subscriptions/${subscriptionId}`, {
    items: [{ id: itemId, price: newPriceId }],
    proration_behavior: "always_invoice",
  });
}

async function stripeRequest(key: string, method: string, path: string, body?: object) {
  const res = await fetch(`https://api.stripe.com/v1${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body ? encodeFormData(body) : undefined,
  });
  if (!res.ok) throw new Error(`Stripe error: ${await res.text()}`);
  return res.json();
}

function encodeFormData(obj: object, prefix = ""): string {
  return Object.entries(obj)
    .map(([k, v]) => {
      const key = prefix ? `${prefix}[${k}]` : k;
      if (typeof v === "object" && v !== null) return encodeFormData(v, key);
      return `${encodeURIComponent(key)}=${encodeURIComponent(String(v))}`;
    })
    .join("&");
}
```

### 22d. `packages/api/src/routes/billing.ts`

```typescript
import { Hono } from "hono";
import { Env } from "../index";
import { requireJWT } from "../middleware/auth";
import {
  getOrCreateStripeCustomer,
  createCheckoutSession,
  createCustomerPortalSession,
  cancelSubscription,
  PLAN_PRICES,
} from "../lib/stripe.js";

const billing = new Hono<{ Bindings: Env }>();
billing.use("*", requireJWT);

// GET /billing — current plan, subscription status, usage summary
billing.get("/", async (c) => {
  const { accountId } = c.get("jwtPayload");
  const account = await c.env.DB.prepare(
    "SELECT plan, stripe_subscription_id, subscription_status, billing_period_end, cancel_at_period_end FROM accounts WHERE id = ?",
  )
    .bind(accountId)
    .first<any>();

  const usage = await c.env.DB.prepare(
    "SELECT SUM(request_count) as total FROM usage_daily ud JOIN api_keys k ON k.id = ud.api_key_id WHERE k.account_id = ? AND ud.date >= strftime('%Y-%m-01', 'now')",
  )
    .bind(accountId)
    .first<{ total: number }>();

  const seats = await c.env.DB.prepare(
    "SELECT COUNT(*) as count FROM developer_seats WHERE account_id = ? AND last_active_at > datetime('now', '-30 days')",
  )
    .bind(accountId)
    .first<{ count: number }>();

  return c.json({ ...account, usage: usage?.total ?? 0, activeSeats: seats?.count ?? 0 });
});

// POST /billing/checkout — create Stripe Checkout session for upgrade
billing.post("/checkout", async (c) => {
  const { accountId, userId } = c.get("jwtPayload");
  const { plan } = await c.req.json<{ plan: "pro" | "business" }>();
  const priceId = PLAN_PRICES[plan];
  if (!priceId) return c.json({ error: "Invalid plan" }, 400);

  const account = await c.env.DB.prepare("SELECT * FROM accounts WHERE id = ?")
    .bind(accountId)
    .first<any>();
  const user = await c.env.DB.prepare("SELECT email, name FROM users WHERE id = ?")
    .bind(userId)
    .first<any>();

  // Get or create Stripe customer
  let customerId = account.stripe_customer_id;
  if (!customerId) {
    customerId = await getOrCreateStripeCustomer(
      c.env.STRIPE_SECRET_KEY,
      accountId,
      user.email,
      user.name,
    );
    await c.env.DB.prepare("UPDATE accounts SET stripe_customer_id = ? WHERE id = ?")
      .bind(customerId, accountId)
      .run();
  }

  const url = await createCheckoutSession(
    c.env.STRIPE_SECRET_KEY,
    customerId,
    priceId,
    "https://app.i18n.shipeasy.ai/settings/billing?success=1",
    "https://app.i18n.shipeasy.ai/settings/billing?cancelled=1",
  );
  return c.json({ url });
});

// POST /billing/portal — Stripe Customer Portal (manage subscription, invoices, cancel)
billing.post("/portal", async (c) => {
  const { accountId } = c.get("jwtPayload");
  const account = await c.env.DB.prepare("SELECT stripe_customer_id FROM accounts WHERE id = ?")
    .bind(accountId)
    .first<any>();
  if (!account?.stripe_customer_id) return c.json({ error: "No active subscription" }, 400);

  const url = await createCustomerPortalSession(
    c.env.STRIPE_SECRET_KEY,
    account.stripe_customer_id,
    "https://app.i18n.shipeasy.ai/settings/billing",
  );
  return c.json({ url });
});

export { billing as billingRoutes };
```

### 22e. `packages/api/src/routes/webhooks.ts`

Stripe sends signed webhook events — verify signature before processing.

```typescript
import { Hono } from "hono";
import { Env } from "../index";
import { nanoid } from "nanoid";

const webhooks = new Hono<{ Bindings: Env }>();

const PLAN_BY_PRICE: Record<string, string> = {
  // Populated from env at runtime
};

webhooks.post("/stripe", async (c) => {
  const body = await c.req.text();
  const sig = c.req.header("stripe-signature");
  if (!sig) return c.json({ error: "Missing signature" }, 400);

  // Verify Stripe webhook signature
  if (!(await verifyStripeSignature(body, sig, c.env.STRIPE_WEBHOOK_SECRET))) {
    return c.json({ error: "Invalid signature" }, 401);
  }

  const event = JSON.parse(body);

  // Idempotency — skip already-processed events
  const existing = await c.env.DB.prepare("SELECT id FROM billing_events WHERE stripe_event_id = ?")
    .bind(event.id)
    .first();
  if (existing) return c.json({ ok: true });

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object;
      const customerId = session.customer;
      const subscriptionId = session.subscription;
      // Look up account by stripe_customer_id
      const account = await c.env.DB.prepare("SELECT id FROM accounts WHERE stripe_customer_id = ?")
        .bind(customerId)
        .first<{ id: string }>();
      if (!account) break;
      // Fetch subscription to get price
      const sub = await fetchStripeSubscription(c.env.STRIPE_SECRET_KEY, subscriptionId);
      const priceId = sub.items.data[0].price.id;
      const plan = getPlanFromPriceId(priceId, c.env);
      await c.env.DB.prepare(
        "UPDATE accounts SET plan = ?, stripe_subscription_id = ?, subscription_status = 'active', billing_period_end = ? WHERE id = ?",
      )
        .bind(
          plan,
          subscriptionId,
          new Date(sub.current_period_end * 1000).toISOString(),
          account.id,
        )
        .run();
      break;
    }

    case "customer.subscription.updated": {
      const sub = event.data.object;
      const account = await c.env.DB.prepare("SELECT id FROM accounts WHERE stripe_customer_id = ?")
        .bind(sub.customer)
        .first<{ id: string }>();
      if (!account) break;
      const priceId = sub.items.data[0].price.id;
      const plan = getPlanFromPriceId(priceId, c.env);
      await c.env.DB.prepare(
        "UPDATE accounts SET plan = ?, subscription_status = ?, billing_period_end = ?, cancel_at_period_end = ? WHERE id = ?",
      )
        .bind(
          plan,
          sub.status,
          new Date(sub.current_period_end * 1000).toISOString(),
          sub.cancel_at_period_end ? 1 : 0,
          account.id,
        )
        .run();
      break;
    }

    case "customer.subscription.deleted": {
      // Subscription ended — downgrade to free
      const sub = event.data.object;
      const account = await c.env.DB.prepare("SELECT id FROM accounts WHERE stripe_customer_id = ?")
        .bind(sub.customer)
        .first<{ id: string }>();
      if (!account) break;
      await c.env.DB.prepare(
        "UPDATE accounts SET plan = 'free', stripe_subscription_id = NULL, subscription_status = 'cancelled' WHERE id = ?",
      )
        .bind(account.id)
        .run();
      break;
    }

    case "invoice.payment_failed": {
      const invoice = event.data.object;
      const account = await c.env.DB.prepare("SELECT id FROM accounts WHERE stripe_customer_id = ?")
        .bind(invoice.customer)
        .first<{ id: string }>();
      if (!account) break;
      await c.env.DB.prepare("UPDATE accounts SET subscription_status = 'past_due' WHERE id = ?")
        .bind(account.id)
        .run();
      // TODO: send payment failure email via Resend
      break;
    }

    case "invoice.paid": {
      // Record billing event for admin dashboard
      const invoice = event.data.object;
      const account = await c.env.DB.prepare("SELECT id FROM accounts WHERE stripe_customer_id = ?")
        .bind(invoice.customer)
        .first<{ id: string }>();
      if (account) {
        await c.env.DB.prepare(
          "INSERT INTO billing_events (id, account_id, stripe_event_id, event_type, amount_cents, currency, status, raw_payload) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        )
          .bind(
            nanoid(),
            account.id,
            event.id,
            event.type,
            invoice.amount_paid,
            invoice.currency,
            "paid",
            body,
          )
          .run();
      }
      break;
    }
  }

  return c.json({ ok: true });
});

async function verifyStripeSignature(body: string, sig: string, secret: string): Promise<boolean> {
  const parts = sig.split(",").reduce(
    (acc, part) => {
      const [k, v] = part.split("=");
      acc[k] = v;
      return acc;
    },
    {} as Record<string, string>,
  );

  const timestamp = parts["t"];
  const expectedSig = parts["v1"];
  const signedPayload = `${timestamp}.${body}`;

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig_bytes = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(signedPayload));
  const computed = Array.from(new Uint8Array(sig_bytes))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return computed === expectedSig;
}

async function fetchStripeSubscription(key: string, id: string) {
  const res = await fetch(`https://api.stripe.com/v1/subscriptions/${id}`, {
    headers: { Authorization: `Bearer ${key}` },
  });
  return res.json();
}

function getPlanFromPriceId(priceId: string, env: Env): string {
  if (priceId === env.STRIPE_PRICE_PRO) return "pro";
  if (priceId === env.STRIPE_PRICE_BUSINESS) return "business";
  return "free";
}

export { webhooks as webhooksRoutes };
```

### 22f. Dashboard billing page `packages/dashboard/app/(app)/settings/billing/page.tsx`

```tsx
"use client";
import { useQuery } from "@tanstack/react-query";

const PLAN_LABELS: Record<string, string> = {
  free: "Free",
  pro: "Pro",
  business: "Business",
  enterprise: "Enterprise",
};
const PLAN_LIMITS: Record<string, { requests: string; seats: number; profiles: string }> = {
  free: { requests: "1M", seats: 1, profiles: "1" },
  pro: { requests: "10M", seats: 5, profiles: "5" },
  business: { requests: "100M", seats: 20, profiles: "Unlimited" },
  enterprise: { requests: "Unlimited", seats: -1, profiles: "Unlimited" },
};

export default function BillingPage() {
  const { data } = useQuery({
    queryKey: ["billing"],
    queryFn: () => fetch("/api/proxy/billing").then((r) => r.json()),
  });

  const upgrade = async (plan: string) => {
    const res = await fetch("/api/proxy/billing/checkout", {
      method: "POST",
      body: JSON.stringify({ plan }),
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${getJWT()}` },
    });
    const { url } = await res.json();
    window.location.href = url;
  };

  const manageSubscription = async () => {
    const res = await fetch("/api/proxy/billing/portal", {
      method: "POST",
      headers: { Authorization: `Bearer ${getJWT()}` },
    });
    const { url } = await res.json();
    window.location.href = url;
  };

  if (!data) return null;
  const limits = PLAN_LIMITS[data.plan];
  const usagePct = Math.round(
    (data.usage /
      (data.plan === "free" ? 1_000_000 : data.plan === "pro" ? 10_000_000 : 100_000_000)) *
      100,
  );

  return (
    <div className="p-6 max-w-2xl space-y-6">
      {/* Current plan */}
      <div className="border rounded-lg p-5">
        <div className="flex justify-between items-start">
          <div>
            <div className="text-sm text-gray-400 mb-1">Current plan</div>
            <div className="text-2xl font-bold">{PLAN_LABELS[data.plan]}</div>
            {data.cancel_at_period_end ? (
              <div className="text-sm text-red-500 mt-1">
                Cancels {new Date(data.billing_period_end).toLocaleDateString()}
              </div>
            ) : data.billing_period_end ? (
              <div className="text-sm text-gray-400 mt-1">
                Renews {new Date(data.billing_period_end).toLocaleDateString()}
              </div>
            ) : null}
          </div>
          {data.stripe_subscription_id && (
            <button onClick={manageSubscription} className="text-sm border rounded px-3 py-1">
              Manage subscription
            </button>
          )}
        </div>
      </div>

      {/* Usage */}
      <div className="border rounded-lg p-5 space-y-3">
        <div className="font-medium">Usage this month</div>
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Requests</span>
            <span>
              {(data.usage / 1000).toFixed(0)}K / {limits.requests}
            </span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-black rounded-full transition-all"
              style={{ width: `${Math.min(usagePct, 100)}%` }}
            />
          </div>
        </div>
        <div className="flex justify-between text-sm">
          <span>Active developer seats</span>
          <span>
            {data.activeSeats} / {limits.seats === -1 ? "∞" : limits.seats}
          </span>
        </div>
      </div>

      {/* Upgrade options */}
      {data.plan === "free" && (
        <div className="grid grid-cols-2 gap-4">
          {[
            {
              plan: "pro",
              label: "Pro",
              price: "$29/mo",
              features: ["5 profiles", "10M requests", "5 seats", "Drafts", "Webhooks"],
            },
            {
              plan: "business",
              label: "Business",
              price: "$99/mo",
              features: [
                "Unlimited profiles",
                "100M requests",
                "20 seats",
                "AI translation",
                "Custom CDN",
              ],
            },
          ].map(({ plan, label, price, features }) => (
            <div key={plan} className="border rounded-lg p-4 space-y-3">
              <div className="font-semibold">{label}</div>
              <div className="text-2xl font-bold">{price}</div>
              <ul className="text-sm text-gray-500 space-y-1">
                {features.map((f) => (
                  <li key={f}>✓ {f}</li>
                ))}
              </ul>
              <button
                onClick={() => upgrade(plan)}
                className="w-full bg-black text-white rounded px-3 py-2 text-sm"
              >
                Upgrade to {label}
              </button>
            </div>
          ))}
        </div>
      )}

      {data.plan === "pro" && (
        <div className="border rounded-lg p-4 flex justify-between items-center">
          <div>
            <div className="font-semibold">Business — $99/mo</div>
            <div className="text-sm text-gray-400">
              100M requests, 20 seats, AI translation, custom CDN
            </div>
          </div>
          <button
            onClick={() => upgrade("business")}
            className="bg-black text-white rounded px-4 py-2 text-sm"
          >
            Upgrade
          </button>
        </div>
      )}
    </div>
  );
}

function getJWT(): string {
  return JSON.parse(sessionStorage.getItem("i18n_dashboard_session") || "{}").jwt || "";
}
```

### 22g. Tests `packages/api/src/routes/webhooks.test.ts`

```typescript
import { describe, it, expect } from "vitest";

describe("POST /webhooks/stripe", () => {
  it("rejects requests with missing signature", async () => {
    // POST without stripe-signature → expect 400
  });
  it("rejects requests with invalid signature", async () => {
    // POST with wrong signature → expect 401
  });
  it("activates pro plan on checkout.session.completed", async () => {
    // mock D1, send valid signed checkout.session.completed event
    // expect account.plan = 'pro'
  });
  it("downgrades to free on customer.subscription.deleted", async () => {
    // mock D1, send subscription.deleted event
    // expect account.plan = 'free', stripe_subscription_id = null
  });
  it("is idempotent — ignores duplicate event IDs", async () => {
    // process same event twice → expect only one DB write
  });
  it("sets past_due status on invoice.payment_failed", async () => {
    // expect subscription_status = 'past_due'
  });
});
```

```bash
cd packages/api && pnpm test src/routes/webhooks.test.ts
```

### 22h. Commit

```bash
git add . && git commit -m "feat: Stripe integration — checkout, customer portal, webhooks, plan sync, billing page"
```

---

## Step 22b: Internal Admin Dashboard (admin.i18n.shipeasy.ai)

**Files**: `packages/admin/` — Next.js App Router, protected by Cloudflare Access

### 22b-i. Init + protect

```bash
cd packages/admin && npx create-next-app@latest . --typescript --app --tailwind
pnpm add @tanstack/react-query recharts date-fns
```

Protect with Cloudflare Access (zero-trust, email allowlist for internal team):

```bash
# In Cloudflare dashboard: Access → Applications → Add → Self-hosted
# Domain: admin.i18n.shipeasy.ai
# Policy: Allow emails matching *@yourdomain.com
# No code changes needed — Cloudflare handles auth at edge
```

Admin API calls use `ADMIN_TOKEN` env var (separate from user JWTs):

```typescript
// packages/admin/lib/api.ts
const ADMIN_TOKEN = process.env.ADMIN_TOKEN!;
export const adminFetch = (path: string, opts?: RequestInit) =>
  fetch(`https://api.i18n.shipeasy.ai/admin${path}`, {
    ...opts,
    headers: {
      Authorization: `Bearer ${ADMIN_TOKEN}`,
      "Content-Type": "application/json",
      ...opts?.headers,
    },
  });
```

### 22b-ii. Admin API routes `packages/api/src/routes/admin.ts`

```typescript
import { Hono } from "hono";
import { Env } from "../index";

const admin = new Hono<{ Bindings: Env }>();

// Protect all admin routes with ADMIN_TOKEN
admin.use("*", async (c, next) => {
  const token = c.req.header("Authorization")?.replace("Bearer ", "");
  if (token !== c.env.ADMIN_TOKEN) return c.json({ error: "Forbidden" }, 403);
  await next();
});

// --- Dashboard metrics ---
admin.get("/metrics", async (c) => {
  const [accounts, mrr, usage, seats] = await Promise.all([
    c.env.DB.prepare(
      "SELECT COUNT(*) as total, plan, COUNT(CASE WHEN created_at > datetime('now', '-7 days') THEN 1 END) as new_this_week FROM accounts GROUP BY plan",
    ).all(),
    c.env.DB.prepare(
      "SELECT SUM(amount_cents) as mrr FROM billing_events WHERE event_type = 'invoice.paid' AND created_at >= strftime('%Y-%m-01', 'now') AND status = 'paid'",
    ).first<{ mrr: number }>(),
    c.env.DB.prepare(
      "SELECT SUM(request_count) as total FROM usage_daily WHERE date >= strftime('%Y-%m-01', 'now')",
    ).first<{ total: number }>(),
    c.env.DB.prepare(
      "SELECT COUNT(DISTINCT account_id) as accounts FROM developer_seats WHERE last_active_at > datetime('now', '-30 days')",
    ).first<{ accounts: number }>(),
  ]);
  return c.json({
    plans: accounts.results,
    mrr: mrr?.mrr ?? 0,
    requestsThisMonth: usage?.total ?? 0,
    accountsWithActiveSeats: seats?.accounts ?? 0,
  });
});

// Monthly MRR history (last 12 months)
admin.get("/metrics/mrr-history", async (c) => {
  const rows = await c.env.DB.prepare(
    "SELECT strftime('%Y-%m', created_at) as month, SUM(amount_cents) as mrr FROM billing_events WHERE event_type = 'invoice.paid' AND status = 'paid' GROUP BY month ORDER BY month DESC LIMIT 12",
  ).all();
  return c.json(rows.results);
});

// --- Accounts ---
admin.get("/accounts", async (c) => {
  const { search, plan, sort = "created_at", page = "1" } = c.req.query();
  const offset = (parseInt(page) - 1) * 50;
  let query = `
    SELECT a.*, 
      (SELECT COUNT(*) FROM members WHERE account_id = a.id) as member_count,
      (SELECT SUM(request_count) FROM usage_daily ud JOIN api_keys k ON k.id = ud.api_key_id WHERE k.account_id = a.id AND ud.date >= strftime('%Y-%m-01', 'now')) as requests_this_month,
      (SELECT COUNT(*) FROM developer_seats WHERE account_id = a.id AND last_active_at > datetime('now', '-30 days')) as active_seats,
      (SELECT amount_cents FROM billing_events WHERE account_id = a.id AND event_type = 'invoice.paid' ORDER BY created_at DESC LIMIT 1) as last_payment_cents
    FROM accounts a WHERE 1=1
  `;
  const binds: any[] = [];
  if (search) {
    query += " AND (a.name LIKE ? OR a.id LIKE ?)";
    binds.push(`%${search}%`, `%${search}%`);
  }
  if (plan) {
    query += " AND a.plan = ?";
    binds.push(plan);
  }
  query += ` ORDER BY a.${sort} DESC LIMIT 50 OFFSET ?`;
  binds.push(offset);
  const rows = await c.env.DB.prepare(query)
    .bind(...binds)
    .all();
  return c.json(rows.results);
});

admin.get("/accounts/:id", async (c) => {
  const id = c.req.param("id");
  const [account, members, keys, profiles, usageHistory, billingEvents, seats] = await Promise.all([
    c.env.DB.prepare("SELECT * FROM accounts WHERE id = ?").bind(id).first(),
    c.env.DB.prepare(
      "SELECT m.*, u.email, u.name, u.avatar_url FROM members m JOIN users u ON u.id = m.user_id WHERE m.account_id = ?",
    )
      .bind(id)
      .all(),
    c.env.DB.prepare("SELECT * FROM api_keys WHERE account_id = ? ORDER BY created_at DESC")
      .bind(id)
      .all(),
    c.env.DB.prepare("SELECT * FROM label_profiles WHERE account_id = ?").bind(id).all(),
    c.env.DB.prepare(
      "SELECT date, SUM(request_count) as requests FROM usage_daily ud JOIN api_keys k ON k.id = ud.api_key_id WHERE k.account_id = ? GROUP BY date ORDER BY date DESC LIMIT 30",
    )
      .bind(id)
      .all(),
    c.env.DB.prepare(
      "SELECT * FROM billing_events WHERE account_id = ? ORDER BY created_at DESC LIMIT 20",
    )
      .bind(id)
      .all(),
    c.env.DB.prepare(
      "SELECT ds.*, u.email, u.name FROM developer_seats ds JOIN users u ON u.id = ds.user_id WHERE ds.account_id = ?",
    )
      .bind(id)
      .all(),
  ]);
  return c.json({
    account,
    members: members.results,
    keys: keys.results,
    profiles: profiles.results,
    usageHistory: usageHistory.results,
    billingEvents: billingEvents.results,
    seats: seats.results,
  });
});

// Force plan change (admin override, no Stripe needed for testing/enterprise)
admin.patch("/accounts/:id/plan", async (c) => {
  const { plan } = await c.req.json<{ plan: string }>();
  await c.env.DB.prepare("UPDATE accounts SET plan = ? WHERE id = ?")
    .bind(plan, c.req.param("id"))
    .run();
  return c.json({ ok: true });
});

// Impersonation — issue a short-lived JWT for the account owner
admin.post("/accounts/:id/impersonate", async (c) => {
  const accountId = c.req.param("id");
  const owner = await c.env.DB.prepare(
    "SELECT user_id FROM members WHERE account_id = ? AND role = 'owner' LIMIT 1",
  )
    .bind(accountId)
    .first<{ user_id: string }>();
  if (!owner) return c.json({ error: "No owner found" }, 404);

  const { signJWT } = await import("../middleware/auth.js");
  const jwt = await signJWT(
    {
      userId: owner.user_id,
      accountId,
      exp: Math.floor(Date.now() / 1000) + 3600,
      impersonated: true,
    } as any,
    c.env.JWT_SECRET,
  );
  return c.json({ jwt, expiresIn: 3600 });
});

// Subscriptions
admin.get("/subscriptions", async (c) => {
  const rows = await c.env.DB.prepare(
    "SELECT a.id, a.name, a.plan, a.subscription_status, a.billing_period_end, a.cancel_at_period_end, a.stripe_subscription_id, a.stripe_customer_id FROM accounts a WHERE a.plan != 'free' ORDER BY a.created_at DESC",
  ).all();
  return c.json(rows.results);
});

// Cancel subscription (admin-initiated)
admin.post("/accounts/:id/cancel-subscription", async (c) => {
  const account = await c.env.DB.prepare("SELECT stripe_subscription_id FROM accounts WHERE id = ?")
    .bind(c.req.param("id"))
    .first<{ stripe_subscription_id: string }>();
  if (!account?.stripe_subscription_id) return c.json({ error: "No subscription" }, 400);
  const { cancelSubscription } = await import("../lib/stripe.js");
  await cancelSubscription(c.env.STRIPE_SECRET_KEY, account.stripe_subscription_id);
  return c.json({ ok: true });
});

// Usage leaderboard
admin.get("/usage", async (c) => {
  const rows = await c.env.DB.prepare(
    "SELECT a.id, a.name, a.plan, SUM(ud.request_count) as requests FROM usage_daily ud JOIN api_keys k ON k.id = ud.api_key_id JOIN accounts a ON a.id = k.account_id WHERE ud.date >= strftime('%Y-%m-01', 'now') GROUP BY a.id ORDER BY requests DESC LIMIT 100",
  ).all();
  return c.json(rows.results);
});

// Quota alerts — accounts over 80% of their monthly limit
admin.get("/alerts/quota", async (c) => {
  // Returns accounts approaching quota limits
  const rows = await c.env.DB.prepare(
    `
    SELECT a.id, a.name, a.plan,
      SUM(ud.request_count) as used,
      CASE a.plan WHEN 'free' THEN 1000000 WHEN 'pro' THEN 10000000 ELSE 100000000 END as limit
    FROM usage_daily ud
    JOIN api_keys k ON k.id = ud.api_key_id
    JOIN accounts a ON a.id = k.account_id
    WHERE ud.date >= strftime('%Y-%m-01', 'now')
    GROUP BY a.id
    HAVING CAST(used AS FLOAT) / limit > 0.8
    ORDER BY CAST(used AS FLOAT) / limit DESC
  `,
  ).all();
  return c.json(rows.results);
});

// Feature flags
admin.get("/flags", async (c) => {
  const rows = await c.env.DB.prepare(
    "SELECT * FROM feature_flags ORDER BY account_id, flag",
  ).all();
  return c.json(rows.results);
});

admin.post("/flags", async (c) => {
  const { accountId, flag, enabled } = await c.req.json<{
    accountId: string;
    flag: string;
    enabled: boolean;
  }>();
  await c.env.DB.prepare(
    "INSERT INTO feature_flags (id, account_id, flag, enabled) VALUES (?, ?, ?, ?) ON CONFLICT(account_id, flag) DO UPDATE SET enabled = excluded.enabled",
  )
    .bind(crypto.randomUUID(), accountId, flag, enabled ? 1 : 0)
    .run();
  return c.json({ ok: true });
});

export { admin as adminRoutes };
```

Add feature flags table: `shared/schema/005_flags.sql`:

```sql
CREATE TABLE feature_flags (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL REFERENCES accounts(id),
  flag TEXT NOT NULL,
  enabled INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(account_id, flag)
);
```

### 22b-iii. Page structure `packages/admin/app/`

```
app/
  layout.tsx                     ← sidebar + top nav
  page.tsx                       ← redirect → /dashboard
  dashboard/page.tsx             ← overview metrics
  accounts/page.tsx              ← accounts list
  accounts/[id]/page.tsx         ← account detail
  subscriptions/page.tsx         ← all paid subscriptions
  usage/page.tsx                 ← usage leaderboard + quota alerts
  billing/page.tsx               ← MRR, billing events, payment history
  flags/page.tsx                 ← feature flag management
  health/page.tsx                ← system health
```

### 22b-iv. Dashboard overview `packages/admin/app/dashboard/page.tsx`

```tsx
"use client";
import { useQuery } from "@tanstack/react-query";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { adminFetch } from "../../lib/api";

export default function AdminDashboard() {
  const { data: metrics } = useQuery({
    queryKey: ["admin-metrics"],
    queryFn: () => adminFetch("/metrics").then((r) => r.json()),
  });
  const { data: mrrHistory } = useQuery({
    queryKey: ["mrr-history"],
    queryFn: () => adminFetch("/metrics/mrr-history").then((r) => r.json()),
  });
  const { data: alerts } = useQuery({
    queryKey: ["quota-alerts"],
    queryFn: () => adminFetch("/alerts/quota").then((r) => r.json()),
  });

  const totalAccounts = metrics?.plans?.reduce((s: number, p: any) => s + p.total, 0) ?? 0;
  const paidAccounts =
    metrics?.plans
      ?.filter((p: any) => p.plan !== "free")
      .reduce((s: number, p: any) => s + p.total, 0) ?? 0;

  return (
    <div className="p-6 space-y-6">
      {/* KPI cards */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "MRR", value: `$${((metrics?.mrr ?? 0) / 100).toFixed(0)}`, sub: "this month" },
          { label: "Total accounts", value: totalAccounts, sub: `${paidAccounts} paid` },
          {
            label: "Requests",
            value: `${((metrics?.requestsThisMonth ?? 0) / 1_000_000).toFixed(1)}M`,
            sub: "this month",
          },
          {
            label: "Active dev seats",
            value: metrics?.accountsWithActiveSeats ?? 0,
            sub: "accounts with activity",
          },
        ].map(({ label, value, sub }) => (
          <div key={label} className="border rounded-lg p-4">
            <div className="text-sm text-gray-400">{label}</div>
            <div className="text-3xl font-bold mt-1">{value}</div>
            <div className="text-xs text-gray-400 mt-1">{sub}</div>
          </div>
        ))}
      </div>

      {/* Plan distribution */}
      <div className="border rounded-lg p-4">
        <div className="font-medium mb-3">Accounts by plan</div>
        <div className="flex gap-4">
          {metrics?.plans?.map((p: any) => (
            <div key={p.plan} className="text-center">
              <div className="text-2xl font-bold">{p.total}</div>
              <div className="text-sm text-gray-400 capitalize">{p.plan}</div>
              <div className="text-xs text-green-500">+{p.new_this_week} this week</div>
            </div>
          ))}
        </div>
      </div>

      {/* MRR chart */}
      <div className="border rounded-lg p-4">
        <div className="font-medium mb-3">MRR (last 12 months)</div>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart
            data={mrrHistory?.map((m: any) => ({ month: m.month, mrr: m.mrr / 100 })) ?? []}
          >
            <XAxis dataKey="month" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `$${v}`} />
            <Tooltip formatter={(v: number) => [`$${v}`, "MRR"]} />
            <Bar dataKey="mrr" fill="#000" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Quota alerts */}
      {alerts?.length > 0 && (
        <div className="border border-yellow-200 bg-yellow-50 rounded-lg p-4">
          <div className="font-medium text-yellow-800 mb-2">⚠ Quota alerts ({alerts.length})</div>
          {alerts.slice(0, 5).map((a: any) => (
            <div key={a.id} className="flex justify-between text-sm py-1">
              <span>{a.name}</span>
              <span className="text-yellow-700">
                {Math.round((a.used / a.limit) * 100)}% of {a.plan} quota
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

### 22b-v. Accounts list `packages/admin/app/accounts/page.tsx`

```tsx
"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { adminFetch } from "../../lib/api";

const PLAN_COLORS: Record<string, string> = {
  free: "bg-gray-100 text-gray-600",
  pro: "bg-blue-100 text-blue-700",
  business: "bg-purple-100 text-purple-700",
  enterprise: "bg-yellow-100 text-yellow-700",
};

export default function AccountsPage() {
  const [search, setSearch] = useState("");
  const [plan, setPlan] = useState("");

  const { data } = useQuery({
    queryKey: ["admin-accounts", search, plan],
    queryFn: () => adminFetch(`/accounts?search=${search}&plan=${plan}`).then((r) => r.json()),
  });

  return (
    <div className="p-6">
      <div className="flex gap-3 mb-4">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search accounts..."
          className="border rounded px-3 py-1.5 flex-1 text-sm"
        />
        <select
          value={plan}
          onChange={(e) => setPlan(e.target.value)}
          className="border rounded px-3 py-1.5 text-sm"
        >
          <option value="">All plans</option>
          {["free", "pro", "business", "enterprise"].map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-gray-400 text-left">
            <th className="pb-2">Account</th>
            <th>Plan</th>
            <th>Requests</th>
            <th>Seats</th>
            <th>MRR</th>
            <th>Created</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {data?.map((a: any) => (
            <tr key={a.id} className="border-b hover:bg-gray-50">
              <td className="py-2.5">
                <div className="font-medium">{a.name}</div>
                <div className="text-xs text-gray-400">{a.id}</div>
              </td>
              <td>
                <span className={`px-2 py-0.5 rounded text-xs font-medium ${PLAN_COLORS[a.plan]}`}>
                  {a.plan}
                </span>
              </td>
              <td>{((a.requests_this_month ?? 0) / 1000).toFixed(0)}K</td>
              <td>{a.active_seats}</td>
              <td>{a.last_payment_cents ? `$${(a.last_payment_cents / 100).toFixed(0)}` : "—"}</td>
              <td className="text-gray-400">{new Date(a.created_at).toLocaleDateString()}</td>
              <td>
                <Link href={`/accounts/${a.id}`} className="text-xs text-blue-600 hover:underline">
                  View →
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

### 22b-vi. Account detail `packages/admin/app/accounts/[id]/page.tsx`

```tsx
"use client";
import { useQuery, useMutation } from "@tanstack/react-query";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { adminFetch } from "../../../lib/api";

export default function AccountDetailPage({ params }: { params: { id: string } }) {
  const { data } = useQuery({
    queryKey: ["admin-account", params.id],
    queryFn: () => adminFetch(`/accounts/${params.id}`).then((r) => r.json()),
  });

  const impersonate = async () => {
    const res = await adminFetch(`/accounts/${params.id}/impersonate`, { method: "POST" });
    const { jwt } = await res.json();
    // Open dashboard in new tab with impersonation token
    const url = `https://app.i18n.shipeasy.ai/impersonate?token=${jwt}`;
    window.open(url, "_blank");
  };

  const changePlan = async (plan: string) => {
    await adminFetch(`/accounts/${params.id}/plan`, {
      method: "PATCH",
      body: JSON.stringify({ plan }),
    });
  };

  if (!data) return <div className="p-6">Loading...</div>;
  const { account, members, keys, usageHistory, billingEvents, seats } = data;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold">{account.name}</h1>
          <div className="text-sm text-gray-400 font-mono">{account.id}</div>
        </div>
        <div className="flex gap-2">
          <select
            defaultValue={account.plan}
            onChange={(e) => changePlan(e.target.value)}
            className="border rounded px-3 py-1.5 text-sm"
          >
            {["free", "pro", "business", "enterprise"].map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
          <button onClick={impersonate} className="bg-black text-white rounded px-3 py-1.5 text-sm">
            Impersonate
          </button>
        </div>
      </div>

      {/* Usage chart */}
      <div className="border rounded-lg p-4">
        <div className="font-medium mb-3">Requests (last 30 days)</div>
        <ResponsiveContainer width="100%" height={150}>
          <LineChart data={usageHistory.map((u: any) => ({ date: u.date, requests: u.requests }))}>
            <XAxis dataKey="date" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} />
            <Tooltip />
            <Line type="monotone" dataKey="requests" stroke="#000" dot={false} strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Members + Seats */}
      <div className="grid grid-cols-2 gap-4">
        <div className="border rounded-lg p-4">
          <div className="font-medium mb-3">Members ({members.length})</div>
          {members.map((m: any) => (
            <div key={m.id} className="flex justify-between py-1 text-sm">
              <span>
                {m.name} <span className="text-gray-400">({m.email})</span>
              </span>
              <span className="text-gray-400">{m.role}</span>
            </div>
          ))}
        </div>
        <div className="border rounded-lg p-4">
          <div className="font-medium mb-3">Active dev seats ({seats.length})</div>
          {seats.map((s: any) => (
            <div key={s.id} className="flex justify-between py-1 text-sm">
              <span>{s.name}</span>
              <span className="text-gray-400">
                {new Date(s.last_active_at).toLocaleDateString()}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Billing events */}
      <div className="border rounded-lg p-4">
        <div className="font-medium mb-3">Billing events</div>
        {billingEvents.map((e: any) => (
          <div key={e.id} className="flex justify-between py-1.5 text-sm border-b last:border-0">
            <span>{e.event_type}</span>
            <span>{e.amount_cents ? `$${(e.amount_cents / 100).toFixed(2)}` : "—"}</span>
            <span className="text-gray-400">{new Date(e.created_at).toLocaleDateString()}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
```

### 22b-vii. Complimentary (free) plan grants

Admins can grant any customer a permanent complimentary plan — keeps their full feature access but bypasses Stripe billing entirely. Useful for design partners, investors, and friends-and-family accounts.

**Schema addition** `shared/schema/006_complimentary.sql`:

```sql
ALTER TABLE accounts ADD COLUMN complimentary INTEGER NOT NULL DEFAULT 0;
ALTER TABLE accounts ADD COLUMN complimentary_plan TEXT;  -- plan tier to grant (pro, business, enterprise)
ALTER TABLE accounts ADD COLUMN complimentary_note TEXT;  -- internal reason
ALTER TABLE accounts ADD COLUMN complimentary_granted_by TEXT REFERENCES users(id);
ALTER TABLE accounts ADD COLUMN complimentary_granted_at TEXT;
```

```bash
wrangler d1 execute i18n-db --file=shared/schema/006_complimentary.sql
```

**Admin API endpoint** (add to `packages/api/src/routes/admin.ts`):

```typescript
// Grant complimentary plan
admin.post("/accounts/:id/complimentary", async (c) => {
  const { plan, note } = await c.req.json<{ plan: string; note: string }>();
  await c.env.DB.prepare(
    "UPDATE accounts SET complimentary = 1, complimentary_plan = ?, plan = ?, complimentary_note = ?, complimentary_granted_at = datetime('now') WHERE id = ?",
  )
    .bind(plan, plan, note, c.req.param("id"))
    .run();
  return c.json({ ok: true });
});

// Revoke complimentary — downgrades to free
admin.delete("/accounts/:id/complimentary", async (c) => {
  await c.env.DB.prepare(
    "UPDATE accounts SET complimentary = 0, complimentary_plan = NULL, plan = 'free', complimentary_note = NULL WHERE id = ?",
  )
    .bind(c.req.param("id"))
    .run();
  return c.json({ ok: true });
});
```

**Webhook guard** — complimentary accounts must never be downgraded by Stripe events.
Add to top of each webhook case that changes `plan` or `subscription_status`:

```typescript
// Skip Stripe-driven plan changes for complimentary accounts
const account = await c.env.DB.prepare("SELECT complimentary FROM accounts WHERE id = ?")
  .bind(accountId)
  .first<{ complimentary: number }>();
if (account?.complimentary) break; // never downgrade complimentary accounts
```

**Plan enforcement guard** — complimentary overrides plan limits everywhere:

```typescript
// packages/api/src/lib/planGuard.ts
export async function getEffectivePlan(db: D1Database, accountId: string): Promise<string> {
  const account = await db
    .prepare("SELECT plan, complimentary, complimentary_plan FROM accounts WHERE id = ?")
    .bind(accountId)
    .first<{ plan: string; complimentary: number; complimentary_plan: string }>();
  if (!account) return "free";
  // Complimentary overrides — use complimentary_plan if set, otherwise use plan
  return account.complimentary && account.complimentary_plan
    ? account.complimentary_plan
    : account.plan;
}
```

Replace all direct `account.plan` reads in middleware with `getEffectivePlan()`.

**Admin UI** — on the account detail page, a "Complimentary" section:

```tsx
// In packages/admin/app/accounts/[id]/page.tsx
<div className="border rounded-lg p-4">
  <div className="font-medium mb-3">Complimentary access</div>
  {account.complimentary ? (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded text-xs font-medium">
          Active
        </span>
        <span className="text-sm capitalize">{account.complimentary_plan} plan granted</span>
      </div>
      <div className="text-sm text-gray-400">Note: {account.complimentary_note}</div>
      <div className="text-xs text-gray-400">
        Granted {new Date(account.complimentary_granted_at).toLocaleDateString()}
      </div>
      <button onClick={revokeComplimentary} className="text-sm text-red-500 hover:underline">
        Revoke
      </button>
    </div>
  ) : (
    <div className="space-y-2">
      <select id="comp-plan" className="border rounded px-2 py-1 text-sm">
        {["pro", "business", "enterprise"].map((p) => (
          <option key={p} value={p}>
            {p}
          </option>
        ))}
      </select>
      <input
        id="comp-note"
        placeholder="Reason (e.g. design partner, investor)"
        className="border rounded px-2 py-1 text-sm w-full"
      />
      <button
        onClick={grantComplimentary}
        className="bg-green-600 text-white rounded px-3 py-1.5 text-sm"
      >
        Grant complimentary plan
      </button>
    </div>
  )}
</div>
```

Complimentary accounts are also visually tagged in the accounts list with a ★ badge next to their plan pill.

### 22b-viii. Subscriptions page `packages/admin/app/subscriptions/page.tsx`

```tsx
// Shows all paid + complimentary accounts in one view
// Columns: account, plan, type (paid/complimentary), status, period end, MRR contribution
// Actions per row:
//   paid:          view detail, cancel subscription, open Stripe dashboard
//   complimentary: view detail, revoke complimentary
// Filters: type (paid/complimentary), plan, status (active/past_due/cancelled)
// Summary row: total paid MRR, count complimentary (excluded from MRR)
```

### 22b-ix. Commit

```bash
git add . && git commit -m "feat: internal admin dashboard — metrics, MRR chart, accounts, subscriptions, usage, impersonation, feature flags, complimentary plan grants"
```

---

## Step 23: Codemod Scripts

**Files**: `packages/codemods/src/`, `packages/cli/src/commands/codemod.ts`

**Reliability targets**: HTML ~95%, React/Vue/Svelte ~85%, Angular ~80%, ERB/Django/Blade ~75%.
Conservative strategy: only transform high-confidence cases, skip and flag everything ambiguous.
Output always includes a review file listing skipped strings with file + line + reason.

### 23a. `packages/codemods/package.json`

```json
{
  "name": "@i18n/codemods",
  "version": "0.1.0",
  "scripts": { "build": "tsc", "test": "vitest" },
  "dependencies": {
    "@babel/parser": "^7.0.0",
    "@babel/traverse": "^7.0.0",
    "@babel/generator": "^7.0.0",
    "@babel/types": "^7.0.0",
    "jscodeshift": "^0.15.0",
    "cheerio": "^1.0.0",
    "vue-template-compiler": "^2.7.0",
    "@vue/compiler-sfc": "^3.0.0"
  },
  "devDependencies": { "vitest": "^1.0.0", "typescript": "^5.0.0" }
}
```

### 23b. Common string detector `packages/codemods/src/lib/commonStrings.ts`

Two-pass approach: first pass collects all strings and their frequency across files, second pass assigns keys. Strings that qualify as "common" get `common.*` keys and are assigned to the `common` chunk (which maps to the index chunk or its own chunk).

A string is "common" if it:

1. Matches the built-in dictionary of known UI primitives, OR
2. Appears in 3+ different files (frequency threshold, configurable)

```typescript
// Built-in dictionary of universally common UI strings → canonical key slug
export const COMMON_DICTIONARY: Record<string, string> = {
  // Actions
  cancel: "cancel",
  save: "save",
  submit: "submit",
  confirm: "confirm",
  delete: "delete",
  remove: "remove",
  edit: "edit",
  update: "update",
  create: "create",
  add: "add",
  close: "close",
  done: "done",
  back: "back",
  next: "next",
  previous: "previous",
  continue: "continue",
  finish: "finish",
  apply: "apply",
  reset: "reset",
  clear: "clear",
  search: "search",
  filter: "filter",
  sort: "sort",
  export: "export",
  import: "import",
  download: "download",
  upload: "upload",
  copy: "copy",
  share: "share",
  send: "send",
  publish: "publish",
  preview: "preview",
  view: "view",
  open: "open",
  start: "start",
  stop: "stop",
  yes: "yes",
  no: "no",
  ok: "ok",
  okay: "ok",
  // States
  loading: "loading",
  saving: "saving",
  saved: "saved",
  error: "error",
  success: "success",
  warning: "warning",
  active: "active",
  inactive: "inactive",
  enabled: "enabled",
  disabled: "disabled",
  required: "required",
  optional: "optional",
  // Navigation
  home: "home",
  dashboard: "dashboard",
  settings: "settings",
  profile: "profile",
  logout: "logout",
  "sign out": "sign_out",
  "sign in": "sign_in",
  login: "login",
  // Common phrases
  "are you sure?": "are_you_sure",
  "please wait": "please_wait",
  "try again": "try_again",
  "learn more": "learn_more",
  "see all": "see_all",
  "show more": "show_more",
  "show less": "show_less",
  "read more": "read_more",
  "view all": "view_all",
  "no results": "no_results",
  "no results found": "no_results_found",
  "not found": "not_found",
  "something went wrong": "something_went_wrong",
  "page not found": "page_not_found",
  // Form labels
  name: "name",
  email: "email",
  password: "password",
  username: "username",
  phone: "phone",
  address: "address",
  "first name": "first_name",
  "last name": "last_name",
  "date of birth": "date_of_birth",
  description: "description",
  // Time
  today: "today",
  yesterday: "yesterday",
  tomorrow: "tomorrow",
};

export interface StringOccurrence {
  text: string; // normalized (trimmed, lowercase for comparison)
  originalText: string; // as it appears in source
  file: string;
  count: number;
}

export class CommonStringDetector {
  // text → Set of files it appears in
  private occurrences = new Map<string, Set<string>>();
  // text → original casing (first seen wins)
  private originals = new Map<string, string>();

  record(text: string, filePath: string) {
    const normalized = text.trim().toLowerCase();
    if (!this.occurrences.has(normalized)) {
      this.occurrences.set(normalized, new Set());
      this.originals.set(normalized, text.trim());
    }
    this.occurrences.get(normalized)!.add(filePath);
  }

  // Returns map of normalized text → common key (e.g. "cancel" → "common.cancel")
  // threshold: min number of files a string must appear in to be promoted (default 3)
  buildCommonMap(threshold = 3): Map<string, string> {
    const commonMap = new Map<string, string>();

    for (const [normalized, files] of this.occurrences) {
      // 1. Dictionary match — always promote regardless of frequency
      const dictKey = COMMON_DICTIONARY[normalized];
      if (dictKey) {
        commonMap.set(normalized, `common.${dictKey}`);
        continue;
      }

      // 2. Frequency threshold — promote if seen in enough distinct files
      if (files.size >= threshold) {
        const slug = normalized
          .replace(/[^a-z0-9\s]/g, "")
          .replace(/\s+/g, "_")
          .slice(0, 40)
          .replace(/_+$/g, "");
        commonMap.set(normalized, `common.${slug}`);
      }
    }

    return commonMap;
  }

  // Returns all strings promoted to common, with their files and key
  getCommonStrings(
    threshold = 3,
  ): Array<{ text: string; key: string; files: string[]; fromDictionary: boolean }> {
    const commonMap = this.buildCommonMap(threshold);
    return Array.from(commonMap.entries()).map(([normalized, key]) => ({
      text: this.originals.get(normalized)!,
      key,
      files: Array.from(this.occurrences.get(normalized) ?? []),
      fromDictionary: !!COMMON_DICTIONARY[normalized],
    }));
  }

  reset() {
    this.occurrences.clear();
    this.originals.clear();
  }
}
```

### 23c. Shared key generator `packages/codemods/src/lib/keyGen.ts`

Key naming strategy: `snake_case(filename)` + `snake_case(text.slice(0,30))`.
Readable, deterministic, collision-resistant. Collisions get `_2`, `_3` suffix.
Common strings bypass this and use `common.*` keys from `CommonStringDetector`.

```typescript
const seen = new Map<string, number>();

// commonMap is passed in after the first-pass scan
export function generateKey(
  filePath: string,
  text: string,
  commonMap?: Map<string, string>,
): string {
  const normalized = text.trim().toLowerCase();

  // Check if this string was promoted to common in first pass
  if (commonMap?.has(normalized)) return commonMap.get(normalized)!;

  // File-specific key
  const file = filePath
    .replace(/.*\//, "")
    .replace(/\.(tsx?|jsx?|vue|html|erb|html\.erb|py|blade\.php)$/, "")
    .replace(/[^a-zA-Z0-9]/g, "_")
    .toLowerCase()
    .replace(/^_+|_+$/g, "");

  const slug = text
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, "_")
    .slice(0, 30)
    .replace(/_+$/g, "");

  const base = `${file}.${slug}`;
  const count = seen.get(base) ?? 0;
  seen.set(base, count + 1);
  return count === 0 ? base : `${base}_${count + 1}`;
}

export function resetKeys() {
  seen.clear();
}

export function isTranslatable(text: string): boolean {
  const t = text.trim();
  if (!t || t.length < 2) return false;
  if (/^\d+(\.\d+)?$/.test(t)) return false;
  if (/^#[0-9a-fA-F]{3,8}$/.test(t)) return false;
  if (/^https?:\/\//.test(t)) return false;
  if (/^[a-z][a-zA-Z0-9-]*$/.test(t) && !/ /.test(t)) return false;
  if (/^\s*$/.test(t)) return false;
  return true;
}

export const TRANSLATABLE_ATTRS = new Set([
  "placeholder",
  "alt",
  "title",
  "aria-label",
  "aria-description",
  "aria-placeholder",
  "tooltip",
  "data-tooltip",
  "label",
]);
```

### 23c. Skipped string reporter `packages/codemods/src/lib/reporter.ts`

```typescript
export interface SkippedString {
  file: string;
  line: number;
  text: string;
  reason:
    | "dynamic_expression"
    | "prop_passed_to_child"
    | "conditional_ternary"
    | "variable_reference"
    | "already_translated"
    | "not_translatable"
    | "dangerous_html"
    | "map_expression";
}

export interface TransformedString {
  file: string;
  line: number;
  key: string;
  value: string;
}

export interface CommonString {
  text: string;
  key: string; // common.cancel, common.save, etc.
  files: string[]; // files where it appears
  fromDictionary: boolean;
}

export class CodemodReport {
  transformed: TransformedString[] = [];
  skipped: SkippedString[] = [];
  commonStrings: CommonString[] = []; // populated after first pass

  addTransformed(file: string, line: number, key: string, value: string) {
    this.transformed.push({ file, line, key, value });
  }

  addSkipped(file: string, line: number, text: string, reason: SkippedString["reason"]) {
    this.skipped.push({ file, line, text, reason });
  }

  print() {
    const fileSpecific = this.transformed.filter((t) => !t.key.startsWith("common.")).length;
    const common = this.transformed.filter((t) => t.key.startsWith("common.")).length;
    console.log(`\n  Transformed:       ${this.transformed.length} strings`);
    if (common > 0) {
      console.log(
        `    → ${common} extracted to common chunk (${this.commonStrings.length} unique common keys)`,
      );
      console.log(`    → ${fileSpecific} file-specific keys`);
    }
    console.log(`  Skipped:           ${this.skipped.length} strings (see review file)`);
    const collisions = this.transformed.filter((t) => /_\d+$/.test(t.key)).length;
    if (collisions) console.log(`  Key collisions:    ${collisions} renamed (added _2, _3...)`);
  }

  toJSON() {
    const commonKeys = this.commonStrings.map((s) => ({
      key: s.key,
      value: s.text,
      chunk: "common",
      fromDictionary: s.fromDictionary,
      appearsInFiles: s.files.length,
    }));
    const fileKeys = this.transformed
      .filter((t) => !t.key.startsWith("common."))
      .map((t) => ({ key: t.key, value: t.value, chunk: "auto" }));

    return {
      summary: {
        transformed: this.transformed.length,
        commonKeys: commonKeys.length,
        fileSpecificKeys: fileKeys.length,
        skipped: this.skipped.length,
      },
      commonKeys, // → assigned to 'common' chunk in i18n push
      fileSpecificKeys: fileKeys,
      skipped: this.skipped,
    };
  }
}
```

### 23d. React/JSX codemod `packages/codemods/src/react.ts`

Handles: JSXText, string JSXExpressionContainers, template literals with expressions, translatable attributes.
Skips: variables, ternaries, map expressions, dangerouslySetInnerHTML, already-labeled elements.

```typescript
import * as parser from "@babel/parser";
import traverse from "@babel/traverse";
import generate from "@babel/generator";
import * as t from "@babel/types";
import { generateKey, isTranslatable, TRANSLATABLE_ATTRS } from "./lib/keyGen.js";
import { CodemodReport } from "./lib/reporter.js";

export function reactCodemod(source: string, filePath: string, report: CodemodReport): string {
  const ast = parser.parse(source, {
    sourceType: "module",
    plugins: ["jsx", "typescript"],
    errorRecovery: true,
  });

  traverse(ast, {
    // 1. JSXText: <button>Sign in</button>
    JSXText(path) {
      const text = path.node.value;
      if (!isTranslatable(text)) return;

      const parent = path.parent as t.JSXElement;
      const opening = parent.openingElement;

      // Skip if already has data-label
      const hasLabel = opening.attributes.some(
        (a) => t.isJSXAttribute(a) && t.isJSXIdentifier(a.name) && a.name.name === "data-label",
      );
      if (hasLabel) {
        report.addSkipped(
          filePath,
          path.node.loc?.start.line ?? 0,
          text.trim(),
          "already_translated",
        );
        return;
      }

      // Skip if parent has dangerouslySetInnerHTML
      const hasDangerous = opening.attributes.some(
        (a) =>
          t.isJSXAttribute(a) &&
          t.isJSXIdentifier(a.name) &&
          a.name.name === "dangerouslySetInnerHTML",
      );
      if (hasDangerous) {
        report.addSkipped(filePath, path.node.loc?.start.line ?? 0, text.trim(), "dangerous_html");
        return;
      }

      const key = generateKey(filePath, text.trim());
      report.addTransformed(filePath, path.node.loc?.start.line ?? 0, key, text.trim());

      // Add data-label + data-label-desc to parent element
      opening.attributes.push(
        t.jsxAttribute(t.jsxIdentifier("data-label"), t.stringLiteral(key)),
        t.jsxAttribute(t.jsxIdentifier("data-label-desc"), t.stringLiteral(text.trim())),
      );
    },

    // 2. JSX string attributes: placeholder="...", alt="...", etc.
    JSXAttribute(path) {
      const name = path.node.name;
      if (!t.isJSXIdentifier(name)) return;
      if (!TRANSLATABLE_ATTRS.has(name.name)) return;

      const value = path.node.value;
      if (!t.isStringLiteral(value)) return;
      if (!isTranslatable(value.value)) return;

      const parent = path.parent as t.JSXOpeningElement;
      const hasLabel = parent.attributes.some(
        (a) =>
          t.isJSXAttribute(a) &&
          t.isJSXIdentifier(a.name) &&
          (a.name.name === "data-label" || a.name.name === `data-label-${name.name}`),
      );
      if (hasLabel) return;

      const key = generateKey(filePath, value.value);
      report.addTransformed(filePath, path.node.loc?.start.line ?? 0, key, value.value);

      parent.attributes.push(
        t.jsxAttribute(t.jsxIdentifier("data-label"), t.stringLiteral(key)),
        t.jsxAttribute(t.jsxIdentifier("data-label-attr"), t.stringLiteral(name.name)),
        t.jsxAttribute(
          t.jsxIdentifier("data-label-desc"),
          t.stringLiteral(`${name.name} for: ${value.value}`),
        ),
      );
    },

    // 3. JSXExpressionContainer with template literal: <p>{`Hello, ${name}!`}</p>
    JSXExpressionContainer(path) {
      const expr = path.node.expression;
      if (!t.isTemplateLiteral(expr)) return;

      // Only handle template literals with TemplateElement + Identifier expressions (simple vars)
      const allSimpleExpressions = expr.expressions.every(
        (e) => t.isIdentifier(e) || t.isMemberExpression(e),
      );
      if (!allSimpleExpressions) {
        report.addSkipped(
          filePath,
          path.node.loc?.start.line ?? 0,
          "[complex template literal]",
          "dynamic_expression",
        );
        return;
      }

      // Reconstruct as "Hello, {{name}}!" format
      let template = "";
      expr.quasis.forEach((q, i) => {
        template += q.value.cooked;
        if (i < expr.expressions.length) {
          const e = expr.expressions[i];
          const varName = t.isIdentifier(e) ? e.name : generate(e).code;
          template += `{{${varName}}}`;
        }
      });

      if (!isTranslatable(template.replace(/\{\{[^}]+\}\}/g, ""))) return;

      // Build data-variables object expression
      const varEntries = expr.expressions.map((e) => {
        const varName = t.isIdentifier(e) ? e.name : generate(e).code;
        return t.objectProperty(t.stringLiteral(varName), e as t.Expression);
      });

      const parent = path.parent as t.JSXElement;
      const opening = parent.openingElement;
      const hasLabel = opening.attributes.some(
        (a) => t.isJSXAttribute(a) && t.isJSXIdentifier(a.name) && a.name.name === "data-label",
      );
      if (hasLabel) return;

      const key = generateKey(filePath, template.replace(/\{\{[^}]+\}\}/g, "VAR").trim());
      report.addTransformed(filePath, path.node.loc?.start.line ?? 0, key, template);

      opening.attributes.push(
        t.jsxAttribute(t.jsxIdentifier("data-label"), t.stringLiteral(key)),
        t.jsxAttribute(
          t.jsxIdentifier("data-variables"),
          t.jsxExpressionContainer(
            t.callExpression(t.memberExpression(t.identifier("JSON"), t.identifier("stringify")), [
              t.objectExpression(varEntries),
            ]),
          ),
        ),
        t.jsxAttribute(t.jsxIdentifier("data-label-desc"), t.stringLiteral(template)),
      );
    },

    // 4. Ternary expressions — flag for manual review
    ConditionalExpression(path) {
      if (!path.findParent((p) => p.isJSXElement())) return;
      const { consequent, alternate } = path.node;
      if (t.isStringLiteral(consequent) && isTranslatable(consequent.value)) {
        report.addSkipped(
          filePath,
          path.node.loc?.start.line ?? 0,
          consequent.value,
          "conditional_ternary",
        );
      }
      if (t.isStringLiteral(alternate) && isTranslatable(alternate.value)) {
        report.addSkipped(
          filePath,
          path.node.loc?.start.line ?? 0,
          alternate.value,
          "conditional_ternary",
        );
      }
    },

    // 5. .map() callbacks — flag for manual review
    CallExpression(path) {
      if (!t.isMemberExpression(path.node.callee)) return;
      if (!t.isIdentifier(path.node.callee.property, { name: "map" })) return;
      if (!path.findParent((p) => p.isJSXElement())) return;
      report.addSkipped(
        filePath,
        path.node.loc?.start.line ?? 0,
        "[map expression]",
        "map_expression",
      );
    },
  });

  return generate(ast, { retainLines: true }, source).code;
}
```

### 23e. HTML codemod `packages/codemods/src/html.ts`

Uses Cheerio (jQuery-like) — simplest and most reliable of all codemods (~95%).

```typescript
import * as cheerio from "cheerio";
import { generateKey, isTranslatable, TRANSLATABLE_ATTRS } from "./lib/keyGen.js";
import { CodemodReport } from "./lib/reporter.js";

export function htmlCodemod(source: string, filePath: string, report: CodemodReport): string {
  const $ = cheerio.load(source, { xmlMode: false, decodeEntities: false });

  // 1. Text nodes
  $("*").each((_, el) => {
    if (el.type !== "tag") return;
    const node = $(el);
    if (node.attr("data-label")) return; // already labeled

    // Direct text content (not in child elements)
    const directText = node
      .contents()
      .filter((_, c) => c.type === "text")
      .map((_, c) => (c as any).data)
      .get()
      .join("")
      .trim();

    if (!isTranslatable(directText)) return;

    // Skip script/style/code elements
    if (["script", "style", "code", "pre", "svg"].includes(el.tagName)) return;

    const key = generateKey(filePath, directText);
    report.addTransformed(filePath, 0, key, directText);
    node.attr("data-label", key);
    node.attr("data-label-desc", directText);
  });

  // 2. Translatable attributes
  $("*").each((_, el) => {
    if (el.type !== "tag") return;
    const node = $(el);
    for (const attr of TRANSLATABLE_ATTRS) {
      const val = node.attr(attr);
      if (!val || !isTranslatable(val)) continue;
      if (node.attr("data-label")) continue; // already labeled

      const key = generateKey(filePath, val);
      report.addTransformed(filePath, 0, key, val);
      node.attr("data-label", key);
      node.attr("data-label-attr", attr);
      node.attr("data-label-desc", `${attr}: ${val}`);
      break; // one label per element
    }
  });

  return $.html();
}
```

### 23f. Vue SFC codemod `packages/codemods/src/vue.ts`

Parses `<template>` block, applies HTML-like transforms, reassembles SFC.

```typescript
import { parse as parseSFC } from "@vue/compiler-sfc";
import * as cheerio from "cheerio";
import { generateKey, isTranslatable, TRANSLATABLE_ATTRS } from "./lib/keyGen.js";
import { CodemodReport } from "./lib/reporter.js";

export function vueCodemod(source: string, filePath: string, report: CodemodReport): string {
  const { descriptor } = parseSFC(source);
  if (!descriptor.template) return source;

  const templateContent = descriptor.template.content;
  const $ = cheerio.load(templateContent, { xmlMode: true, decodeEntities: false });

  $("*").each((_, el) => {
    if (el.type !== "tag") return;
    const node = $(el);
    if (node.attr("data-label")) return;
    if (["script", "style"].includes(el.tagName)) return;

    // Skip Vue dynamic text: {{ ... }}
    const directText = node
      .contents()
      .filter((_, c) => c.type === "text")
      .map((_, c) => (c as any).data)
      .get()
      .join("")
      .trim();

    // Skip if it's a Vue expression
    if (/\{\{.*\}\}/.test(directText)) {
      report.addSkipped(filePath, 0, directText, "dynamic_expression");
      return;
    }

    if (!isTranslatable(directText)) return;

    const key = generateKey(filePath, directText);
    report.addTransformed(filePath, 0, key, directText);
    node.attr("data-label", key);
    node.attr("data-label-desc", directText);
  });

  // Reassemble SFC — replace template block content
  const newTemplate = $.html("body").replace("<body>", "").replace("</body>", "").trim();
  return source.replace(descriptor.template.content, `\n${newTemplate}\n`);
}
```

### 23g. Rails ERB codemod `packages/codemods/src/rails.ts`

Strategy: extract static HTML (non-ERB) text nodes only. ERB expressions are always skipped.

```typescript
import * as cheerio from "cheerio";
import { generateKey, isTranslatable } from "./lib/keyGen.js";
import { CodemodReport } from "./lib/reporter.js";

export function railsCodemod(source: string, filePath: string, report: CodemodReport): string {
  // Temporarily replace ERB tags with placeholders to avoid cheerio mangling them
  const erbTokens: string[] = [];
  let masked = source.replace(/<%.*?%>/gs, (match) => {
    const idx = erbTokens.length;
    erbTokens.push(match);
    return `__ERB_${idx}__`;
  });

  const $ = cheerio.load(masked, { xmlMode: false, decodeEntities: false });

  $("*").each((_, el) => {
    if (el.type !== "tag") return;
    const node = $(el);
    if (node.attr("data-label")) return;
    if (["script", "style"].includes(el.tagName)) return;

    const directText = node
      .contents()
      .filter((_, c) => c.type === "text")
      .map((_, c) => (c as any).data)
      .get()
      .join("")
      .trim();

    // Skip anything containing ERB placeholder — it's dynamic
    if (/^__ERB_\d+__$/.test(directText) || directText.includes("__ERB_")) {
      if (isTranslatable(directText.replace(/__ERB_\d+__/g, "").trim())) {
        report.addSkipped(filePath, 0, directText, "dynamic_expression");
      }
      return;
    }

    if (!isTranslatable(directText)) return;

    const key = generateKey(filePath, directText);
    report.addTransformed(filePath, 0, key, directText);
    node.attr("data-label", key);
    node.attr("data-label-desc", directText);
  });

  // Restore ERB tags
  let result = $.html();
  erbTokens.forEach((token, idx) => {
    result = result.replace(`__ERB_${idx}__`, token);
  });
  return result;
}
```

### 23h. Angular template codemod `packages/codemods/src/angular.ts`

Similar to Vue — skip `{{ }}` expressions and `[attr]` bindings.

```typescript
import * as cheerio from "cheerio";
import { generateKey, isTranslatable, TRANSLATABLE_ATTRS } from "./lib/keyGen.js";
import { CodemodReport } from "./lib/reporter.js";

export function angularCodemod(source: string, filePath: string, report: CodemodReport): string {
  const $ = cheerio.load(source, { xmlMode: true, decodeEntities: false });

  $("*").each((_, el) => {
    if (el.type !== "tag") return;
    const node = $(el);
    if (node.attr("data-label")) return;

    const directText = node
      .contents()
      .filter((_, c) => c.type === "text")
      .map((_, c) => (c as any).data)
      .get()
      .join("")
      .trim();

    // Skip Angular interpolation {{ }} and *ngIf/*ngFor — dynamic
    if (/\{\{.*\}\}/.test(directText) || node.attr("*ngFor") || node.attr("*ngIf")) {
      if (isTranslatable(directText.replace(/\{\{.*?\}\}/g, "").trim())) {
        report.addSkipped(filePath, 0, directText, "dynamic_expression");
      }
      return;
    }

    if (!isTranslatable(directText)) return;

    const key = generateKey(filePath, directText);
    report.addTransformed(filePath, 0, key, directText);
    node.attr("data-label", key);
    node.attr("data-label-desc", directText);
  });

  // Handle [placeholder], [alt], [title] bound attributes — skip (dynamic)
  // Handle placeholder="...", alt="..." static attributes
  $("*").each((_, el) => {
    if (el.type !== "tag") return;
    const node = $(el);
    for (const attr of TRANSLATABLE_ATTRS) {
      const val = node.attr(attr);
      if (!val || !isTranslatable(val) || val.startsWith("{{") || node.attr("data-label")) continue;
      const key = generateKey(filePath, val);
      report.addTransformed(filePath, 0, key, val);
      node.attr("data-label", key);
      node.attr("data-label-attr", attr);
      break;
    }
    // Flag dynamic bindings as skipped
    for (const attr of TRANSLATABLE_ATTRS) {
      const bound = node.attr(`[${attr}]`);
      if (bound) report.addSkipped(filePath, 0, bound, "dynamic_expression");
    }
  });

  return $.html();
}
```

### 23i. Django/Jinja + Laravel/Blade codemods

Same ERB masking strategy — replace `{% %}`, `{{ }}`, `@blade` directives with placeholders
before Cheerio parse, restore after. Implementation mirrors `rails.ts`.

```
packages/codemods/src/
  django.ts    ← masks {% %} and {{ }} before Cheerio parse
  laravel.ts   ← masks @if, @foreach, {{ }}, {!! !!} before Cheerio parse
  svelte.ts    ← masks {#if}, {#each}, { expr } — then Cheerio on static HTML
```

### 23j. Tests `packages/codemods/src/react.test.ts`

```typescript
import { describe, it, expect, beforeEach } from "vitest";
import { reactCodemod } from "./react.js";
import { CodemodReport } from "./lib/reporter.js";
import { resetKeys } from "./lib/keyGen.js";

beforeEach(() => resetKeys());

describe("reactCodemod", () => {
  it("adds data-label to simple JSXText", () => {
    const input = `<button>Sign in</button>`;
    const report = new CodemodReport();
    const output = reactCodemod(input, "src/Auth.tsx", report);
    expect(output).toContain('data-label="auth.sign_in"');
    expect(output).toContain('data-label-desc="Sign in"');
    expect(report.transformed).toHaveLength(1);
  });

  it("handles placeholder attribute", () => {
    const input = `<input placeholder="Enter your email" />`;
    const report = new CodemodReport();
    const output = reactCodemod(input, "src/Form.tsx", report);
    expect(output).toContain('data-label-attr="placeholder"');
  });

  it("converts template literal with variable", () => {
    const input = "<p>{`Hello, ${name}!`}</p>";
    const report = new CodemodReport();
    const output = reactCodemod(input, "src/Greeting.tsx", report);
    expect(output).toContain("data-label=");
    expect(output).toContain("data-variables=");
    expect(report.transformed[0].value).toBe("Hello, {{name}}!");
  });

  it("skips ternary expressions with flag", () => {
    const input = `<p>{isAdmin ? 'Admin' : 'User'}</p>`;
    const report = new CodemodReport();
    reactCodemod(input, "src/Nav.tsx", report);
    expect(report.skipped[0].reason).toBe("conditional_ternary");
  });

  it("skips already-labeled elements", () => {
    const input = `<button data-label="auth.sign_in">Sign in</button>`;
    const report = new CodemodReport();
    reactCodemod(input, "src/Auth.tsx", report);
    expect(report.transformed).toHaveLength(0);
    expect(report.skipped[0].reason).toBe("already_translated");
  });

  it("handles key collisions with suffix", () => {
    const report = new CodemodReport();
    reactCodemod(`<p>Sign in</p>`, "src/Auth.tsx", report);
    reactCodemod(`<span>Sign in</span>`, "src/Auth.tsx", report);
    expect(report.transformed[1].key).toBe("auth.sign_in_2");
  });

  it("skips whitespace-only text", () => {
    const report = new CodemodReport();
    reactCodemod(`<div>  </div>`, "src/App.tsx", report);
    expect(report.transformed).toHaveLength(0);
  });

  it("skips numbers", () => {
    const report = new CodemodReport();
    reactCodemod(`<span>42</span>`, "src/App.tsx", report);
    expect(report.transformed).toHaveLength(0);
  });

  it("skips dangerouslySetInnerHTML elements", () => {
    const report = new CodemodReport();
    reactCodemod(
      `<div dangerouslySetInnerHTML={{__html: html}}>Hello</div>`,
      "src/App.tsx",
      report,
    );
    expect(report.skipped[0].reason).toBe("dangerous_html");
  });

  it("uses common.* key when commonMap is provided", () => {
    const commonMap = new Map([["cancel", "common.cancel"]]);
    const report = new CodemodReport();
    const output = reactCodemod(`<button>Cancel</button>`, "src/Modal.tsx", report, commonMap);
    expect(output).toContain('data-label="common.cancel"');
    expect(report.transformed[0].key).toBe("common.cancel");
  });

  it("uses file-specific key when string is not in commonMap", () => {
    const commonMap = new Map([["cancel", "common.cancel"]]);
    const report = new CodemodReport();
    const output = reactCodemod(
      `<button>Submit order</button>`,
      "src/Checkout.tsx",
      report,
      commonMap,
    );
    expect(output).toContain('data-label="checkout.submit_order"');
  });
});

describe("CommonStringDetector", () => {
  it("promotes dictionary strings regardless of frequency", () => {
    const { CommonStringDetector } = require("./lib/commonStrings.js");
    const detector = new CommonStringDetector();
    detector.record("Cancel", "src/A.tsx"); // only 1 file
    const map = detector.buildCommonMap(3);
    expect(map.get("cancel")).toBe("common.cancel");
  });

  it("promotes strings appearing in threshold+ files", () => {
    const { CommonStringDetector } = require("./lib/commonStrings.js");
    const detector = new CommonStringDetector();
    detector.record("Approve request", "src/A.tsx");
    detector.record("Approve request", "src/B.tsx");
    detector.record("Approve request", "src/C.tsx");
    const map = detector.buildCommonMap(3);
    expect(map.get("approve request")).toBe("common.approve_request");
  });

  it("does not promote strings below threshold", () => {
    const { CommonStringDetector } = require("./lib/commonStrings.js");
    const detector = new CommonStringDetector();
    detector.record("Specific label", "src/A.tsx");
    detector.record("Specific label", "src/B.tsx");
    const map = detector.buildCommonMap(3); // threshold=3, only 2 files
    expect(map.has("specific label")).toBe(false);
  });

  it("counts distinct files, not total occurrences", () => {
    const { CommonStringDetector } = require("./lib/commonStrings.js");
    const detector = new CommonStringDetector();
    // Same file 5 times — should NOT promote (only 1 distinct file)
    for (let i = 0; i < 5; i++) detector.record("Unique label", "src/A.tsx");
    const map = detector.buildCommonMap(3);
    expect(map.has("unique label")).toBe(false);
  });
});
```

```bash
cd packages/codemods && pnpm test
```

### 23k. CLI codemod command `packages/cli/src/commands/codemod.ts`

```typescript
import { Command } from "commander";
import { glob } from "glob";
import { readFile, writeFile } from "fs/promises";
import chalk from "chalk";
import ora from "ora";
import { CodemodReport } from "@i18n/codemods/dist/lib/reporter.js";
import { resetKeys } from "@i18n/codemods/dist/lib/keyGen.js";

const FRAMEWORK_EXTENSIONS: Record<string, string[]> = {
  react: [".tsx", ".jsx", ".ts"],
  vue: [".vue"],
  angular: [".html", ".component.html"],
  svelte: [".svelte"],
  html: [".html", ".htm"],
  rails: [".erb", ".html.erb"],
  django: [".html", ".jinja2"],
  laravel: [".blade.php"],
};

export const codemodsCommand = new Command("codemod")
  .description("Automatically add data-label attributes to your codebase")
  .argument("<framework>", `Framework: ${Object.keys(FRAMEWORK_EXTENSIONS).join(", ")}`)
  .option("--path <path>", "Path to transform", "src/")
  .option("--dry-run", "Preview changes without writing files")
  .option(
    "--ai",
    "Use Claude API for better key naming and descriptions (requires ANTHROPIC_API_KEY)",
  )
  .option("--output <path>", "Write review JSON to path", "i18n-codemod-review.json")
  .option(
    "--common-threshold <n>",
    "Min files a string must appear in to be extracted to common chunk (default: 3)",
    "3",
  )
  .option("--no-common", "Disable common string extraction entirely")
  .action(async (framework: string, opts) => {
    const exts = FRAMEWORK_EXTENSIONS[framework];
    if (!exts) {
      console.error(`Unknown framework: ${framework}`);
      process.exit(1);
    }

    console.log(chalk.bold(`\n  ShipEasyI18n codemod: ${framework}\n`));
    if (opts.dryRun) console.log(chalk.yellow("  Dry run — no files will be modified\n"));

    const commonThreshold = opts.common ? parseInt(opts.commonThreshold) : Infinity;

    const pattern = `${opts.path}/**/*{${exts.join(",")}}`;
    const files = await glob(pattern, { ignore: ["node_modules/**", "dist/**", ".git/**"] });
    console.log(chalk.gray(`  Scanning ${files.length} files...\n`));

    const report = new CodemodReport();
    resetKeys();

    const spinner = ora("Transforming...").start();

    if (opts.ai) {
      await runAICodemod(framework, files, opts.dryRun, report);
    } else {
      await runStaticCodemod(framework, files, opts.dryRun, report);
    }

    spinner.stop();
    report.print();

    // Write review file
    await writeFile(opts.output, JSON.stringify(report.toJSON(), null, 2));
    console.log(chalk.gray(`\n  Review file: ${opts.output}`));

    // Write keys-to-create file for i18n push
    const keysFile = "i18n-keys-to-create.json";
    await writeFile(
      keysFile,
      JSON.stringify(
        report.transformed.map((t) => ({ key: t.key, value: t.value })),
        null,
        2,
      ),
    );

    console.log(chalk.green("\n  Next steps:"));
    console.log(chalk.gray("  1. Review skipped strings: cat " + opts.output));
    console.log(chalk.gray("  2. Push new keys to ShipEasyI18n:   i18n push"));
    console.log(chalk.gray("  3. Validate:               i18n validate\n"));
  });

async function runStaticCodemod(
  framework: string,
  files: string[],
  dryRun: boolean,
  report: CodemodReport,
  commonThreshold = 3,
) {
  const { reactCodemod } = await import("@i18n/codemods/dist/react.js");
  const { htmlCodemod } = await import("@i18n/codemods/dist/html.js");
  const { vueCodemod } = await import("@i18n/codemods/dist/vue.js");
  const { angularCodemod } = await import("@i18n/codemods/dist/angular.js");
  const { railsCodemod } = await import("@i18n/codemods/dist/rails.js");
  const { CommonStringDetector } = await import("@i18n/codemods/dist/lib/commonStrings.js");

  const codemodFn =
    {
      react: reactCodemod,
      vue: vueCodemod,
      angular: angularCodemod,
      html: htmlCodemod,
      rails: railsCodemod,
    }[framework] ?? htmlCodemod;

  const detector = new CommonStringDetector();

  // ── Pass 1: collect all strings (scan-only, no transforms) ──────────────
  const scanReport = new (await import("@i18n/codemods/dist/lib/reporter.js")).CodemodReport();
  for (const file of files) {
    const source = await readFile(file, "utf8");
    codemodFn(source, file, scanReport); // collect strings into scanReport
    for (const t of scanReport.transformed) detector.record(t.value, file);
    scanReport.transformed.length = 0; // reset between files for this pass
  }

  // Build common key map from first-pass data
  const commonMap = detector.buildCommonMap(commonThreshold);
  const commonStrings = detector.getCommonStrings(commonThreshold);

  if (commonStrings.length > 0) {
    console.log(chalk.cyan(`\n  ✦ Common strings detected: ${commonStrings.length}`));
    const fromDict = commonStrings.filter((s) => s.fromDictionary).length;
    const fromFreq = commonStrings.length - fromDict;
    if (fromDict) console.log(chalk.gray(`    ${fromDict} from built-in dictionary`));
    if (fromFreq)
      console.log(
        chalk.gray(`    ${fromFreq} from frequency analysis (${commonThreshold}+ files)`),
      );
    console.log(
      chalk.gray("    These will be keyed as common.* and assigned to the common chunk\n"),
    );
  }

  // ── Pass 2: transform with commonMap, write files ───────────────────────
  const { generateKey, resetKeys } = await import("@i18n/codemods/dist/lib/keyGen.js");
  resetKeys();

  for (const file of files) {
    const source = await readFile(file, "utf8");
    // Pass commonMap so generateKey() returns common.* keys for shared strings
    const transformed = codemodFn(source, file, report, commonMap);
    if (!dryRun && transformed !== source) await writeFile(file, transformed);
  }

  // Add common strings to report for i18n push
  report.commonStrings = commonStrings;
}

async function runAICodemod(
  framework: string,
  files: string[],
  dryRun: boolean,
  report: CodemodReport,
) {
  // First run static codemod to handle 85% of cases
  await runStaticCodemod(framework, files, dryRun, report);

  // Then send skipped strings to Claude API for better handling
  if (report.skipped.length === 0) return;

  const Anthropic = (await import("@anthropic-ai/sdk")).default;
  const client = new Anthropic();

  const skippedByFile = new Map<string, typeof report.skipped>();
  for (const s of report.skipped) {
    const arr = skippedByFile.get(s.file) ?? [];
    arr.push(s);
    skippedByFile.set(s.file, arr);
  }

  for (const [file, skipped] of skippedByFile) {
    const source = await readFile(file, "utf8");
    const message = await client.messages.create({
      model: "claude-opus-4-6",
      max_tokens: 4096,
      messages: [
        {
          role: "user",
          content: `You are adding data-label attributes to a ${framework} file for the ShipEasyI18n translation service.
The static codemod already handled simple cases. These strings were skipped because they are complex (conditionals, props, map expressions):

${skipped.map((s) => `Line ${s.line}: "${s.text}" (reason: ${s.reason})`).join("\n")}

File content:
\`\`\`
${source}
\`\`\`

For each skipped string that IS user-visible UI text, add data-label attribute with:
- A meaningful key in snake_case format: filename_component_description
- data-label-desc with brief translator context

Return ONLY the modified file content, no explanation.
If a string should NOT be labeled (not user-visible), leave it as-is.`,
        },
      ],
    });
    const transformed = (message.content[0] as any).text;
    if (!dryRun) await writeFile(file, transformed);
  }
}
```

### 23l. Commit

```bash
git add . && git commit -m "feat: codemod scripts — AST-based React/Vue/Angular/Rails/Django/HTML with conservative skip strategy, collision detection, review output"
```

---

## Step 24: GitHub Action

**Files**: `packages/cli/action/action.yml`, `packages/cli/action/index.ts`

### 24a. `packages/cli/action/action.yml`

```yaml
name: "ShipEasyI18n Label Sync"
description: "Scan for new label keys, validate, push, and publish to ShipEasyI18n"
inputs:
  i18n-key:
    description: "ShipEasyI18n public key (i18n_pk_...)"
    required: true
  i18n-token:
    description: "ShipEasyI18n secret token for write operations"
    required: true
  profile:
    description: "Profile to publish (e.g. en:prod)"
    required: false
    default: "en:prod"
  mode:
    description: "check (PR), push (on merge), or full (push + translate + publish)"
    required: false
    default: "check"
runs:
  using: "node20"
  main: "dist/action.js"
```

### 24b. `packages/cli/action/index.ts`

```typescript
import * as core from "@actions/core";
import * as github from "@actions/github";
import { execSync } from "child_process";

const key = core.getInput("i18n-key");
const token = core.getInput("i18n-token");
const profile = core.getInput("profile");
const mode = core.getInput("mode");

process.env.ShipEasyI18n_KEY = key;
process.env.ShipEasyI18n_SECRET_TOKEN = token;

function i18n(cmd: string) {
  return execSync(`npx i18n-cli ${cmd}`, { encoding: "utf8", env: process.env });
}

if (mode === "check") {
  // Scan diff + validate
  const newKeys = i18n("scan --diff origin/main --json");
  const validation = i18n("validate");

  if (github.context.eventName === "pull_request") {
    const octokit = github.getOctokit(process.env.GITHUB_TOKEN!);
    await octokit.rest.issues.createComment({
      ...github.context.repo,
      issue_number: github.context.payload.pull_request!.number,
      body: formatComment(JSON.parse(newKeys)),
    });
  }
}

if (mode === "push" || mode === "full") {
  i18n("push");
  i18n(`publish --profile ${profile}`);
}

if (mode === "full") {
  i18n(`translate --from ${profile} --missing-only`);
  i18n("draft publish");
}

function formatComment(newKeys: any[]) {
  if (newKeys.length === 0) return "✅ **ShipEasyI18n**: No new label keys in this PR.";
  return `## 🏷️ ShipEasyI18n: ${newKeys.length} new label keys\n\n${newKeys.map((k) => `- \`${k.key}\` (${k.file}:${k.line})`).join("\n")}\n\nThese will be pushed to ShipEasyI18n on merge.`;
}
```

### 24c. Commit

```bash
git add . && git commit -m "feat: GitHub Action — check (PR comment), push (on merge), full (translate + publish)"
```

---

## Step 25: End-to-End Verification

### 25a. Smoke test: label delivery

```bash
# 1. Create account, profile, chunk, key via dashboard
# 2. Publish profile
# 3. Embed script tag in a test HTML page:
cat > /tmp/test.html << 'EOF'
<html>
<head>
  <script src="http://localhost:8787/loader.js"
          data-key="i18n_pk_test123"
          data-profile="en:prod"
          async></script>
</head>
<body>
  <h1 data-label="test.greeting" data-label-desc="Test greeting">Original text</h1>
</body>
</html>
EOF
open /tmp/test.html
# Verify: h1 text changes to label value within 100ms
```

### 25b. Smoke test: editor flow

```bash
# 1. Open test page
# 2. Press Alt+Shift+E → verify popup opens
# 3. Login → verify editor.js loads
# 4. Click h1 → verify popover appears with description
# 5. Edit value → Save draft → verify live preview updates
# 6. Publish → verify CDN serves updated value within 60s
curl https://cdn.i18n.shipeasy.ai/labels/test/en-prod/manifest.json
```

### 25c. Smoke test: CLI

```bash
cd /tmp/test-project
i18n init
i18n login
echo '<span data-label="checkout.total">Total</span>' > src/test.html
i18n scan          # should find checkout.total
i18n push          # should create in ShipEasyI18n
i18n validate      # should pass
i18n translate --from en:prod --to fr:prod
i18n publish
```

### 25d. Smoke test: MCP

```bash
npx i18n-mcp &
# In Claude Code: "list all label keys for the index chunk"
# Verify: i18n_list_keys tool called, returns keys
```

### 25e. Smoke test: codemod

```bash
cd /tmp/react-project
npx i18n-cli codemod react --dry-run
# Verify: shows proposed data-label additions without writing
npx i18n-cli codemod react --ai --dry-run
# Verify: AI-generated key names shown
```

### 25f. Final commit

```bash
git add . && git commit -m "chore: end-to-end verification — all surfaces confirmed working"
```

---

## Framework Packages (post-MVP)

After core is working, implement framework adapters in parallel:

| Package         | Key export                                                            | SSR adapter       |
| --------------- | --------------------------------------------------------------------- | ----------------- |
| `@i18n/react`   | `useShipEasyI18n()`, `<ShipEasyI18nProvider>`, `<ShipEasyI18nString>` | `@i18n/next`      |
| `@i18n/vue`     | `useShipEasyI18n()` composable + Vue plugin                           | `@i18n/nuxt`      |
| `@i18n/angular` | `ShipEasyI18nModule`, `TranslatePipe`, `ShipEasyI18nService`          | —                 |
| `@i18n/svelte`  | `i18nStore`, `t` readable                                             | `@i18n/sveltekit` |
| `@i18n/solid`   | `createShipEasyI18n()` signal                                         | —                 |
| `@i18n/qwik`    | `useTranslate$()`                                                     | —                 |
| `@i18n/fbt`     | `FbtTranslations` bridge                                              | —                 |
| `i18n-rails`    | `i18n_inline_data` view helper                                        | —                 |
