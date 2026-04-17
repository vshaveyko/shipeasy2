> **Historical design doc** (pre-shipeasy-unification, 2026-04-13). Assumes the custom RS256 JWT issuer + JWKS model; the unified app uses NextAuth v5 with same-origin cookie sessions. Threat model + CSP + rate-limit sections are still relevant. See [TODO.md](../TODO.md) for current architecture, and the **Post-unification delta** below for section-by-section supersedes.

---

## Post-unification delta (2026-04-13) — READ FIRST

This section supersedes the affected parts of the doc below. If something here conflicts with a numbered section, this wins.

### Supersedes §1 — Authentication

- **§1.1 (RS256 JWT issuer, JWKS)** → **obsolete**. The unified app uses [NextAuth v5](https://authjs.dev) with the D1 adapter. Sessions are httpOnly, Secure, SameSite=Lax cookies scoped to `shipeasy.ai`. No JWT issuance, no JWKS. No cross-service token verification (same origin = no need).
- **§1.2 (refresh token rotation)** → **obsolete**. NextAuth handles session lifecycle; no manual refresh endpoint.
- **§1.3 (email OTP)** → replaced by NextAuth **magic-link** (signed-token email). Keep the D1-based rate limit (3/15min per email, 5-attempt cap) as a wrapper around NextAuth's email provider — implement via a thin callback in `signIn` that checks and increments a `email_auth_attempts` row.
- **§1.4 (OAuth state)** → **obsolete**. NextAuth handles CSRF state on the OAuth callback; the `oauth_states` table is dropped.
- **§1.5 (session storage)** → superseded. Store sessions in the `sessions` table via `@auth/d1-adapter`. Keep httpOnly + Secure + SameSite=Lax. No localStorage/sessionStorage for auth material anywhere in the dashboard.

### NEW — §1.6 Device-code flow for CLI / MCP (`shipeasy login`)

Threat model: a terminal or MCP server needs a token. User must authenticate interactively in a browser. No passwords or tokens must transit the terminal; the short `user_code` must be phishing-resistant.

| Concern                                                                      | Mitigation                                                                                                                                                                                                                                                                                                                                                |
| ---------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Phished `user_code` tricks a logged-in user into approving an attacker's CLI | `user_code` has visible entropy (8 chars, `XXXX-XXXX`, base32 no-ambiguous-chars). `/sign-in/cli` page shows the CLI's claimed `hostname` (best-effort, untrusted — display as "This device says it's `<hostname>`"). Approval screen requires an explicit click with a 3-second cooldown before the button enables, to defeat clickjacking-style timing. |
| `device_code` brute-force on the poll endpoint                               | `device_code` is 256 bits of CSPRNG; stored as SHA-256 hash in `cli_auth_requests`. Poll endpoint rate-limited to 1 req / `interval` seconds per `device_code` (returns `slow_down` if faster). Row auto-expires after 10 min.                                                                                                                            |
| Token exfiltration via the poll response                                     | Access token returned **exactly once** on first successful poll; row is deleted immediately after. Subsequent polls with the same `device_code` return `expired`. Token is never logged.                                                                                                                                                                  |
| Stolen CLI token used indefinitely                                           | Token rows carry `expires_at` (90d default), `last_used_at`, `cli_label` (hostname + OS). Dashboard has a "CLI tokens" tab showing label + last-used + revoke. Revocation is immediate (server-side lookup on every API call against a hashed token column).                                                                                              |
| Code interception on shared machines                                         | `verification_uri_complete` (QR / deep link) is convenience only. The poll endpoint always requires the full `device_code`, which never leaves the originating CLI process.                                                                                                                                                                               |
| CSRF against `/api/auth/cli/approve`                                         | Standard NextAuth CSRF token on the approval POST.                                                                                                                                                                                                                                                                                                        |

Implementation notes:

- New D1 table: `cli_auth_requests (id, device_code_hash, user_code, cli_label, status, account_id NULL, created_user_id NULL, approved_at, expires_at)`. Purge expired rows via a cron route.
- Token prefix is `shipeasy_at_` (not `i18n_at_`). Stored as SHA-256 hash in `api_tokens` with `kind='cli'` to distinguish from long-lived CI secret tokens (`kind='api'`).
- Expose token management at `/dashboard/settings/tokens`; the `/sign-in/cli` approval flow is a thin wrapper that mints a row here.

### Supersedes §2 — postMessage

Still relevant. Only change: dashboard origin moves from `https://app.i18n.shipeasy.ai` → `https://shipeasy.ai`. Update the `EDITOR_ALLOWED_ORIGINS` allowlist accordingly and keep everything else (PKCE nonce, strict origin check, single-use).

### Supersedes §3 — API Keys

- Public loader key (`i18n_pk_*`) unchanged.
- Secret management token: prefix changes `i18n_at_*` → `shipeasy_at_*`. Two kinds now coexist in the `api_tokens` table:
  - `kind='api'` — long-lived, paste-into-CI, unchanged threat model (§3.2).
  - `kind='cli'` — minted only via the device-code flow, bound to a device label, shorter default TTL, revocable from the dashboard tokens page.
- Both are hashed-at-rest (SHA-256 + constant-time compare); only the bcrypt-style prefix + last 4 chars are stored in cleartext for UI display.

### Supersedes §7.4 / §12 — CORS & Security Headers

- CORS: the only cross-origin API surface is `loader-edge` at `cdn.i18n.shipeasy.ai` (or `loader.shipeasy.ai`). It stays permissive-by-domain-allowlist per account (unchanged). The Next.js API routes at `shipeasy.ai/api/*` are **same-origin only** — no CORS headers needed; reject cross-origin preflights.
- CSP (§12.2): rewrite the dashboard CSP for the unified app. Key changes:
  - `connect-src`: `'self' https://cdn.i18n.shipeasy.ai https://api.stripe.com` (no more `https://api.i18n.shipeasy.ai` or `https://auth.shipeasy.ai`).
  - `frame-ancestors 'none'` (unchanged).
  - `script-src 'self'` + NextAuth's nonce hook for any inline bootstrap script.
  - Marketing pages may need `script-src 'self' 'unsafe-inline'` relaxations if using third-party analytics; keep the dashboard CSP strict and separate via route-group middleware.

### Supersedes §11 — Secret Management

Cloudflare Pages env (not Worker secrets) is the new home for:
`AUTH_SECRET`, `GOOGLE_CLIENT_ID/SECRET`, `GITHUB_CLIENT_ID/SECRET`, `RESEND_API_KEY`, `EMAIL_FROM`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `CLOUDFLARE_PURGE_TOKEN`.
The `JWT_PRIVATE_JWK` / `JWT_PUBLIC_JWK` / JWKS-cache entries are **deleted**. The loader-edge Worker keeps only `CLOUDFLARE_PURGE_TOKEN` + `CLOUDFLARE_ZONE_ID`. Secret-scan pre-push hook stays; update its denylist to cover `AUTH_SECRET` and the new `shipeasy_at_` token prefix.

### Still relevant (no delta required)

§2 postMessage/PKCE (loader↔editor, origin-bound) · §3.3 domain whitelist threat model · §3.4 key revocation · §4 Stripe webhook signature verification · §5 admin + Cloudflare Access · §6 complimentary plan logic · §7.1–7.3 public-by-design label files, R2 bucket, purge token · §8 input validation (Zod schemas move to Route Handlers verbatim) · §9 data isolation (swap "JWT-derived account scoping" → "session-derived account scoping via `auth()`") · §10 rate limiting (D1-based OTP limit becomes magic-link limit; Workers RateLimiter binding moves to the loader-edge worker and to the Next.js routes via `getRequestContext()`) · §13 audit log.

---

# ShipEasyI18n Security Implementation Plan

**Date:** 2026-04-11
**Status:** Implementation-ready
**Scope:** Full security specification for the Label Rewrite Service — authentication, authorization, API key management, delivery, input validation, secret management, audit logging, and all supporting subsystems.

---

## Table of Contents

1. [Authentication Security](#1-authentication-security)
   - 1.1 JWT Signing and Payload Structure
   - 1.2 Refresh Token Rotation
   - 1.3 Email OTP
   - 1.4 OAuth State Parameter
   - 1.5 Session Storage Choice
2. [postMessage Security](#2-postmessage-security)
   - 2.1 PKCE Nonce Protocol
   - 2.2 Origin Validation
   - 2.3 Popup opener validation
   - 2.4 Replay Attack Prevention
3. [API Key Security](#3-api-key-security)
   - 3.1 Public Key (`i18n_pk_`)
   - 3.2 Secret API Token (`i18n_at_`)
   - 3.3 Domain Whitelist Threat Model
   - 3.4 Key Revocation
4. [Stripe Webhook Security](#4-stripe-webhook-security)
5. [Admin Security](#5-admin-security)
   - 5.1 Cloudflare Access
   - 5.2 ADMIN_TOKEN
   - 5.3 Impersonation Tokens
6. [Complimentary Plan Security](#6-complimentary-plan-security)
7. [CDN and Delivery Security](#7-cdn-and-delivery-security)
8. [Input Validation](#8-input-validation)
9. [Data Isolation](#9-data-isolation)
10. [Rate Limiting](#10-rate-limiting)
11. [Secret Management](#11-secret-management)
12. [Security Headers](#12-security-headers)
13. [Audit Log](#13-audit-log)

---

## 1. Authentication Security

### 1.1 JWT Signing and Payload Structure

JWTs are signed with HMAC-SHA256 using the Web Crypto API available natively in Cloudflare Workers. No third-party JWT library is used — the implementation is explicit and auditable.

**Signing implementation:**

```ts
// workers/src/lib/jwt.ts

const ALGORITHM = { name: "HMAC", hash: "SHA-256" };

async function importKey(secret: string): Promise<CryptoKey> {
  const encoded = new TextEncoder().encode(secret);
  return crypto.subtle.importKey("raw", encoded, ALGORITHM, false, ["sign", "verify"]);
}

function base64url(buf: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buf)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

export interface JwtPayload {
  sub: string; // user_id (UUID)
  account_id: string; // account UUID — for D1 scoping
  role: "owner" | "editor";
  iat: number; // issued-at Unix timestamp
  exp: number; // expiry Unix timestamp (iat + 28800 — 8 hours)
  jti: string; // unique token ID (crypto.randomUUID())
  // Optional — only present on impersonation tokens
  impersonated?: true;
  impersonated_by?: string; // admin user_id
}

export async function signJwt(payload: JwtPayload, secret: string): Promise<string> {
  const header = base64url(new TextEncoder().encode(JSON.stringify({ alg: "HS256", typ: "JWT" })));
  const body = base64url(new TextEncoder().encode(JSON.stringify(payload)));
  const key = await importKey(secret);
  const sig = await crypto.subtle.sign(
    ALGORITHM,
    key,
    new TextEncoder().encode(`${header}.${body}`),
  );
  return `${header}.${body}.${base64url(sig)}`;
}

export async function verifyJwt(token: string, secret: string): Promise<JwtPayload> {
  const parts = token.split(".");
  if (parts.length !== 3) throw new Error("malformed_jwt");
  const [header, body, sigB64] = parts;
  const key = await importKey(secret);
  const sigBytes = Uint8Array.from(atob(sigB64.replace(/-/g, "+").replace(/_/g, "/")), (c) =>
    c.charCodeAt(0),
  );
  const valid = await crypto.subtle.verify(
    ALGORITHM,
    key,
    sigBytes,
    new TextEncoder().encode(`${header}.${body}`),
  );
  if (!valid) throw new Error("invalid_signature");
  const payload: JwtPayload = JSON.parse(atob(body.replace(/-/g, "+").replace(/_/g, "/")));
  if (payload.exp < Math.floor(Date.now() / 1000)) throw new Error("token_expired");
  return payload;
}
```

**Token issuance:**

```ts
// workers/src/lib/auth.ts

export async function issueJwt(
  userId: string,
  accountId: string,
  role: "owner" | "editor",
  env: Env,
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const payload: JwtPayload = {
    sub: userId,
    account_id: accountId,
    role,
    iat: now,
    exp: now + 8 * 60 * 60, // 8 hours
    jti: crypto.randomUUID(),
  };
  return signJwt(payload, env.JWT_SECRET);
}
```

**Middleware (Hono):**

```ts
// workers/src/middleware/auth.ts

import { createMiddleware } from "hono/factory";

export const requireAuth = createMiddleware(async (c, next) => {
  const authHeader = c.req.header("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return c.json({ error: "unauthorized" }, 401);
  }
  const token = authHeader.slice(7);
  try {
    const payload = await verifyJwt(token, c.env.JWT_SECRET);
    c.set("jwtPayload", payload);
    await next();
  } catch (err: any) {
    return c.json({ error: err.message ?? "unauthorized" }, 401);
  }
});
```

**Key rotation:** When `JWT_SECRET` must be rotated, deploy the new secret as `JWT_SECRET_NEW`. Run a dual-verify middleware that tries the new secret first and falls back to the old one for a 15-minute grace window, then remove the old secret. Because JWTs are 8 hours max, all old tokens expire within one work day with no forced logouts.

---

### 1.2 Refresh Token Rotation

Refresh tokens are opaque 32-byte hex strings. They are single-use and automatically rotated on each exchange. The plain token is shown to the client exactly once; only the SHA-256 hash is persisted.

**D1 schema:**

```sql
CREATE TABLE refresh_tokens (
  id           TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id      TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash   TEXT NOT NULL UNIQUE,          -- SHA-256(raw_token), hex
  expires_at   INTEGER NOT NULL,              -- Unix timestamp, 30 days
  created_at   INTEGER NOT NULL DEFAULT (unixepoch()),
  revoked_at   INTEGER,
  replaced_by  TEXT REFERENCES refresh_tokens(id)  -- for audit trail
);
CREATE INDEX idx_refresh_tokens_user ON refresh_tokens(user_id);
```

**Issuance:**

```ts
export async function issueRefreshToken(userId: string, db: D1Database): Promise<string> {
  const raw = [...crypto.getRandomValues(new Uint8Array(32))]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  const hashBuf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(raw));
  const hash = [...new Uint8Array(hashBuf)].map((b) => b.toString(16).padStart(2, "0")).join("");
  const expiresAt = Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60;
  await db
    .prepare("INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES (?, ?, ?)")
    .bind(userId, hash, expiresAt)
    .run();
  return raw; // returned to client once, never stored plain
}
```

**Exchange (POST /auth/refresh):**

```ts
app.post("/auth/refresh", async (c) => {
  const { refresh_token } = await c.req.json<{ refresh_token: string }>();
  if (!refresh_token || typeof refresh_token !== "string") {
    return c.json({ error: "invalid_request" }, 400);
  }

  const hashBuf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(refresh_token));
  const hash = [...new Uint8Array(hashBuf)].map((b) => b.toString(16).padStart(2, "0")).join("");

  const row = await c.env.DB.prepare(
    `SELECT id, user_id, expires_at, revoked_at
       FROM refresh_tokens
      WHERE token_hash = ?`,
  )
    .bind(hash)
    .first<{ id: string; user_id: string; expires_at: number; revoked_at: number | null }>();

  if (!row) return c.json({ error: "invalid_token" }, 401);
  if (row.revoked_at) {
    // Token reuse detected — revoke entire family as a compromise signal
    await c.env.DB.prepare("UPDATE refresh_tokens SET revoked_at = ? WHERE user_id = ?")
      .bind(Math.floor(Date.now() / 1000), row.user_id)
      .run();
    return c.json({ error: "token_reuse_detected" }, 401);
  }
  if (row.expires_at < Math.floor(Date.now() / 1000)) {
    return c.json({ error: "token_expired" }, 401);
  }

  // Rotate: revoke old, issue new
  const newRefreshToken = await issueRefreshToken(row.user_id, c.env.DB);
  await c.env.DB.prepare(
    "UPDATE refresh_tokens SET revoked_at = ?, replaced_by = (SELECT id FROM refresh_tokens WHERE token_hash = ?) WHERE id = ?",
  )
    .bind(
      Math.floor(Date.now() / 1000),
      /* new hash would need a second query — simplify: */ null,
      row.id,
    )
    .run();

  const member = await c.env.DB.prepare(
    "SELECT account_id, role FROM members WHERE user_id = ? LIMIT 1",
  )
    .bind(row.user_id)
    .first<{ account_id: string; role: string }>();

  const jwt = await issueJwt(
    row.user_id,
    member!.account_id,
    member!.role as "owner" | "editor",
    c.env,
  );
  return c.json({ token: jwt, refresh_token: newRefreshToken });
});
```

**Revocation on logout:**

```ts
app.delete("/auth/logout", requireAuth, async (c) => {
  const { refresh_token } = await c.req.json<{ refresh_token?: string }>();
  if (refresh_token) {
    const hashBuf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(refresh_token));
    const hash = [...new Uint8Array(hashBuf)].map((b) => b.toString(16).padStart(2, "0")).join("");
    await c.env.DB.prepare("UPDATE refresh_tokens SET revoked_at = ? WHERE token_hash = ?")
      .bind(Math.floor(Date.now() / 1000), hash)
      .run();
  }
  return c.json({ ok: true });
});
```

---

### 1.3 Email OTP

**D1 schema:**

```sql
CREATE TABLE email_auth_codes (
  email         TEXT NOT NULL,
  code_hash     TEXT NOT NULL,          -- SHA-256(6-digit code), hex
  expires_at    INTEGER NOT NULL,       -- Unix timestamp, 15 minutes
  used_at       INTEGER,
  created_at    INTEGER NOT NULL DEFAULT (unixepoch()),
  attempt_count INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX idx_email_auth_codes_email ON email_auth_codes(email, expires_at);
```

**Rate limiting — D1 count query (3 requests per email per 15 minutes):**

```ts
async function checkOtpRateLimit(email: string, db: D1Database): Promise<boolean> {
  const window = Math.floor(Date.now() / 1000) - 15 * 60;
  const { count } = (await db
    .prepare("SELECT COUNT(*) as count FROM email_auth_codes WHERE email = ? AND created_at > ?")
    .bind(email, window)
    .first<{ count: number }>()) ?? { count: 0 };
  return count < 3;
}
```

**OTP request handler:**

```ts
app.post("/auth/email/request", async (c) => {
  const { email } = await c.req.json<{ email: string }>();

  // Always return same response body to prevent email enumeration
  const RESPONSE = { message: "If that email is registered, you'll receive a code." };

  if (!isValidEmailFormat(email)) return c.json(RESPONSE);

  const allowed = await checkOtpRateLimit(email, c.env.DB);
  if (!allowed) {
    // Still return 200 with same body — don't leak rate limit status
    return c.json(RESPONSE);
  }

  // Generate 6-digit code
  const code = String(crypto.getRandomValues(new Uint32Array(1))[0] % 1_000_000).padStart(6, "0");
  const hashBuf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(code));
  const hash = [...new Uint8Array(hashBuf)].map((b) => b.toString(16).padStart(2, "0")).join("");
  const expiresAt = Math.floor(Date.now() / 1000) + 15 * 60;

  await c.env.DB.prepare(
    "INSERT INTO email_auth_codes (email, code_hash, expires_at) VALUES (?, ?, ?)",
  )
    .bind(email, hash, expiresAt)
    .run();

  // Only send if user exists — still return same body regardless
  const user = await c.env.DB.prepare("SELECT id FROM users WHERE email = ?").bind(email).first();
  if (user) {
    await sendOtpEmail(email, code, c.env); // via Resend
  }

  return c.json(RESPONSE);
});
```

**OTP verification:**

```ts
app.post("/auth/email/verify", async (c) => {
  const { email, code } = await c.req.json<{ email: string; code: string }>();

  if (!email || !code || !/^\d{6}$/.test(code)) {
    return c.json({ error: "invalid_request" }, 400);
  }

  // Fetch most recent valid (unused, unexpired) code for this email
  const row = await c.env.DB.prepare(
    `SELECT rowid, code_hash, expires_at, used_at, attempt_count
       FROM email_auth_codes
      WHERE email = ? AND expires_at > ? AND used_at IS NULL
      ORDER BY created_at DESC LIMIT 1`,
  )
    .bind(email, Math.floor(Date.now() / 1000))
    .first<{
      rowid: number;
      code_hash: string;
      expires_at: number;
      used_at: number | null;
      attempt_count: number;
    }>();

  if (!row) return c.json({ error: "invalid_or_expired_code" }, 401);

  // Invalidated after 3 failed attempts
  if (row.attempt_count >= 3) return c.json({ error: "too_many_attempts" }, 401);

  const hashBuf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(code));
  const hash = [...new Uint8Array(hashBuf)].map((b) => b.toString(16).padStart(2, "0")).join("");

  if (hash !== row.code_hash) {
    await c.env.DB.prepare(
      "UPDATE email_auth_codes SET attempt_count = attempt_count + 1 WHERE rowid = ?",
    )
      .bind(row.rowid)
      .run();
    return c.json({ error: "invalid_or_expired_code" }, 401);
  }

  // Mark used — single-use
  await c.env.DB.prepare("UPDATE email_auth_codes SET used_at = ? WHERE rowid = ?")
    .bind(Math.floor(Date.now() / 1000), row.rowid)
    .run();

  // Upsert user, issue tokens
  const user = await upsertUserByEmail(email, c.env.DB);
  const member = await getOrCreateMember(user.id, c.env.DB);
  const jwt = await issueJwt(user.id, member.account_id, member.role, c.env);
  const refreshToken = await issueRefreshToken(user.id, c.env.DB);

  return c.json({ token: jwt, refresh_token: refreshToken });
});
```

---

### 1.4 OAuth State Parameter

The OAuth state parameter is a signed JWT (not a random opaque token) so it is self-verifying — no server-side state storage is required. This eliminates a CSRF attack surface while avoiding a D1 round-trip per OAuth initiation.

```ts
interface OAuthStatePayload {
  nonce: string; // crypto.randomUUID() — prevents CSRF
  flow: "dashboard" | "editor";
  // editor flow only:
  key?: string; // i18n_pk_ value
  origin?: string; // customer site origin
  popup_nonce?: string; // nonce echoed back to postMessage listener
  iat: number;
  exp: number; // short-lived: iat + 300 (5 minutes)
}

export async function createOAuthState(
  params: Omit<OAuthStatePayload, "nonce" | "iat" | "exp">,
  env: Env,
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const payload: OAuthStatePayload = {
    ...params,
    nonce: crypto.randomUUID(),
    iat: now,
    exp: now + 300,
  };
  // Reuse JWT signing — same key, short expiry
  return signJwt(payload as any, env.JWT_SECRET);
}

export async function verifyOAuthState(state: string, env: Env): Promise<OAuthStatePayload> {
  return verifyJwt(state, env.JWT_SECRET) as unknown as OAuthStatePayload;
}
```

**In the OAuth callback:**

```ts
app.get("/auth/google/callback", async (c) => {
  const { state, code } = c.req.query();
  if (!state || !code) return c.redirect("/login?error=missing_params");

  let statePayload: OAuthStatePayload;
  try {
    statePayload = await verifyOAuthState(state, c.env);
  } catch {
    return c.redirect("/login?error=invalid_state"); // CSRF or replay rejected
  }

  // Exchange code for tokens with Google...
  // ...
});
```

---

### 1.5 Session Storage Choice

Editor tokens (JWT + refresh token) are stored in `sessionStorage`, not `localStorage`.

**Rationale:**

| Property         | sessionStorage                                   | localStorage                                            |
| ---------------- | ------------------------------------------------ | ------------------------------------------------------- |
| Scope            | Single tab, cleared on tab close                 | Persists across all tabs and browser restarts           |
| XSS persistence  | Attacker must act in same tab and session        | Attacker exfiltrates token, uses it later from anywhere |
| Cross-tab access | Not accessible to other tabs                     | Accessible to all same-origin tabs                      |
| HIPAA relevance  | Not applicable (ShipEasyI18n handles UI strings) | Not applicable                                          |

For an editor tool embedded on third-party sites, `sessionStorage` is the correct choice. A stolen JWT has a maximum 8-hour window and is scoped to the single compromised tab. An attacker who can run XSS in a tab already has full DOM access regardless of where tokens are stored — `sessionStorage` limits the blast radius by preventing persistence and cross-tab propagation.

`localStorage` is explicitly not used. `sessionStorage` is not accessible across tabs or browser restarts, so refresh tokens are also stored there. On tab close, the session ends. Users re-authenticate on the next editing session, which is the intended UX — editing sessions are short-lived by design.

---

## 2. postMessage Security

### 2.1 PKCE Nonce Protocol

The full protocol, as implemented in `loader.js` and `editor-trigger.js`:

**Step 1 — editor-trigger.js generates nonce and opens popup:**

```js
// editor-trigger.js

function openEditorLogin() {
  const nonce = crypto.randomUUID(); // cryptographically random, browser-native
  sessionStorage.setItem("i18n_editor_nonce", nonce);

  const params = new URLSearchParams({
    key: ShipEasyI18n_KEY,
    origin: location.origin,
    nonce: nonce,
  });

  window.open(
    `https://app.i18n.shipeasy.ai/editor-auth?${params}`,
    "i18n_editor",
    "width=480,height=600,noopener=yes",
  );
}
```

**Step 2 — popup at `app.i18n.shipeasy.ai` echoes nonce on success:**

```ts
// app.i18n.shipeasy.ai/editor-auth (Next.js page, client component)

'use client';
import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';

export default function EditorAuthCallback({ token, refreshToken }: { token: string; refreshToken: string }) {
  const params = useSearchParams();

  useEffect(() => {
    const nonce = params.get('nonce');
    if (!nonce || !window.opener) {
      // No opener means this wasn't opened as a popup — abort
      return;
    }

    // Validate opener is not null and send message
    // `targetOrigin` is the customer's origin from the URL param — validated server-side
    const targetOrigin = params.get('origin');
    if (!targetOrigin) return;

    window.opener.postMessage(
      { type: 'i18n_auth_success', token, refreshToken, nonce },
      targetOrigin  // strict targetOrigin — not '*'
    );
    window.close();
  }, []);

  return <div>Authenticated. This window will close.</div>;
}
```

**Step 3 — editor-trigger.js validates the incoming message:**

```js
// editor-trigger.js — message listener (registered once on load)

window.addEventListener("message", (e) => {
  // 1. Strict origin check — only accept messages from our app domain
  if (e.origin !== "https://app.i18n.shipeasy.ai") return;
  if (!e.data || e.data.type !== "i18n_auth_success") return;

  // 2. Nonce verification — prevents injection from a forged message event
  const storedNonce = sessionStorage.getItem("i18n_editor_nonce");
  if (!storedNonce) return; // no active login flow
  if (e.data.nonce !== storedNonce) return; // nonce mismatch — reject

  // 3. Consume nonce — single-use, replay prevention
  sessionStorage.removeItem("i18n_editor_nonce");

  // 4. Validate token structure before storing
  if (typeof e.data.token !== "string" || !e.data.token.match(/^[\w-]+\.[\w-]+\.[\w-]+$/)) return;
  if (typeof e.data.refreshToken !== "string") return;

  // 5. Store tokens
  sessionStorage.setItem("i18n_token", e.data.token);
  sessionStorage.setItem("i18n_refresh_token", e.data.refreshToken);

  // 6. Load editor.js — only after all checks pass
  const script = document.createElement("script");
  script.src = "https://cdn.i18n.shipeasy.ai/editor.js";
  script.crossOrigin = "anonymous";
  script.dataset.token = e.data.token;
  document.head.appendChild(script);
});
```

---

### 2.2 Origin Validation

`e.origin` is validated as the very first check in the message listener. The value `'https://app.i18n.shipeasy.ai'` is hardcoded, not configurable — customers cannot change it, and it is never `'*'`.

The `postMessage` call in the popup also uses an explicit `targetOrigin` (the customer's `origin` param from the URL, validated server-side against allowed domains before the auth flow proceeds). This means even if an attacker can read memory from the popup window, the message is only delivered to the legitimate customer origin.

**Server-side origin validation before opening editor auth:**

```ts
// workers/src/routes/editor-auth.ts

app.get("/editor/auth/google", async (c) => {
  const key = c.req.query("key");
  const origin = c.req.query("origin");
  const nonce = c.req.query("nonce");

  if (!key || !origin || !nonce) return c.redirect("/editor-auth?error=missing_params");
  if (!isValidOrigin(origin)) return c.redirect("/editor-auth?error=invalid_origin");

  // Validate key exists and origin is in allowed_domains
  const keyRow = (await c.env.KV.get(`pk:${key}`, "json")) as {
    customer_id: string;
    domains: string[];
  } | null;
  if (!keyRow) return c.redirect("/editor-auth?error=invalid_key");

  const requestHostname = new URL(origin).hostname;
  if (!keyRow.domains.includes(requestHostname)) {
    return c.redirect("/editor-auth?error=domain_not_allowed");
  }

  const state = await createOAuthState({ flow: "editor", key, origin, popup_nonce: nonce }, c.env);
  // Redirect to Google OAuth with state...
});

function isValidOrigin(origin: string): boolean {
  try {
    const url = new URL(origin);
    return url.protocol === "https:" && url.hostname.length > 0 && url.pathname === "/";
  } catch {
    return false;
  }
}
```

---

### 2.3 Popup Window Opener Validation

The popup validates that `window.opener` is non-null before sending any postMessage. If the user navigates to `app.i18n.shipeasy.ai/editor-auth` directly in a regular browser tab (no opener), the popup auth flow short-circuits and displays a "Please use the editor shortcut on your site" message instead.

```ts
// In the EditorAuthCallback component (see section 2.1)
if (!window.opener) {
  // Render error UI — not a popup, do not postMessage
  return;
}
```

This prevents the completion page from being loaded directly by an attacker trying to harvest a token payload — without a real popup opener, the postMessage never fires.

---

### 2.4 Replay Attack Prevention

The nonce is single-use. Immediately upon a valid `i18n_auth_success` message, the nonce is deleted from `sessionStorage` (step 3 in section 2.1). A second message with the same nonce will fail the check `if (!storedNonce) return` because the nonce was already consumed.

If an attacker somehow captures the nonce from the URL (e.g., Referer header leakage), they cannot use it without:

1. Having the correct `e.origin` (`https://app.i18n.shipeasy.ai`) — impossible without controlling that domain.
2. Sending the message before the legitimate popup completes — a race condition the attacker cannot win reliably.
3. Having a valid JWT from ShipEasyI18n servers — which requires completing the OAuth flow.

All three conditions must hold simultaneously, making replay attacks structurally infeasible.

---

## 3. API Key Security

### 3.1 Public Key (`i18n_pk_`)

Public keys are embedded in the customer's script tag and are visible in the browser source. This is intentional by design — they are identifiers, not secrets.

**Key format:**

```
i18n_pk_[base62, 24 chars]
example: i18n_pk_a8f3Kx29mNqLpR7tYvZ4Bc
```

**Generation:**

```ts
function generatePublicKey(): string {
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  return "i18n_pk_" + [...bytes].map((b) => chars[b % 62]).join("");
}
```

**Storage — SHA-256 hash in D1:**

The public key is stored as a SHA-256 hash in D1. This is defensive-in-depth: if D1 is ever accessed by an unauthorized party, they cannot enumerate valid public keys from the hash list alone (they would need to brute-force the key space). However, because public keys are, by definition, publicly visible in HTML source, this protection is primarily against bulk harvesting of customer identifiers from a database dump.

```sql
-- D1
CREATE TABLE api_keys (
  id                    TEXT PRIMARY KEY,
  account_id            TEXT NOT NULL REFERENCES accounts(id),
  key_hash              TEXT NOT NULL UNIQUE,  -- SHA-256(i18n_pk_...), hex
  label                 TEXT NOT NULL,
  allowed_domains       TEXT NOT NULL DEFAULT '[]',  -- JSON array of hostnames
  quota_monthly         INTEGER NOT NULL DEFAULT 1000000,
  usage_current_month   INTEGER NOT NULL DEFAULT 0,
  created_at            INTEGER NOT NULL DEFAULT (unixepoch()),
  revoked_at            INTEGER
);
```

**KV mirror — unencrypted for edge lookups:**

```
KV namespace: ShipEasyI18n_KEYS
key:   pk:{i18n_pk_abc123}   (plain key, not hash)
value: { "customer_id": "uuid", "account_id": "uuid", "domains": ["example.com"], "quota": 1000000 }
TTL:   60 seconds
```

Why unencrypted in KV: The public key itself is the lookup key in KV, and it is already public. Hashing it in KV would provide no security benefit — an attacker who has the plain key from the script tag can compute the hash trivially. The KV value contains no secrets: `customer_id`, `account_id`, `domains`, and `quota` are non-sensitive account configuration data used for rate limiting and domain enforcement.

**Edge lookup on every request:**

```ts
// workers/src/middleware/resolveKey.ts

export const resolvePublicKey = createMiddleware(async (c, next) => {
  const key = c.req.header("X-ShipEasyI18n-Key") ?? c.req.query("key");
  if (!key || !key.startsWith("i18n_pk_")) {
    return c.json({ error: "missing_key" }, 400);
  }

  const cached = (await c.env.ShipEasyI18n_KEYS.get(`pk:${key}`, "json")) as KeyMeta | null;
  if (cached) {
    c.set("keyMeta", cached);
    return next();
  }

  // KV miss — fall back to D1 (hashed lookup)
  const hashBuf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(key));
  const hash = [...new Uint8Array(hashBuf)].map((b) => b.toString(16).padStart(2, "0")).join("");
  const row = await c.env.DB.prepare(
    "SELECT id, account_id, allowed_domains, quota_monthly FROM api_keys WHERE key_hash = ? AND revoked_at IS NULL",
  )
    .bind(hash)
    .first<{ id: string; account_id: string; allowed_domains: string; quota_monthly: number }>();

  if (!row) return c.json({ error: "invalid_key" }, 401);

  const meta: KeyMeta = {
    customer_id: row.id,
    account_id: row.account_id,
    domains: JSON.parse(row.allowed_domains),
    quota: row.quota_monthly,
  };

  // Warm KV cache
  await c.env.ShipEasyI18n_KEYS.put(`pk:${key}`, JSON.stringify(meta), { expirationTtl: 60 });
  c.set("keyMeta", meta);
  await next();
});
```

---

### 3.2 Secret API Token (`i18n_at_`)

Secret tokens are equivalent to passwords. They are shown to the customer exactly once at creation time and are never stored in plain text.

**Key format:**

```
i18n_sk_[base62, 40 chars]
example: i18n_sk_f8Kx29mNqR7tYvZ4BcA3pL6wH1eJsDu2nFoGyCi
```

**Generation and storage:**

```ts
app.post("/tokens", requireAuth, async (c) => {
  const { label, scopes } = await c.req.json<{ label: string; scopes: string[] }>();

  const raw = "i18n_sk_" + generateBase62(40);
  const hashBuf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(raw));
  const hash = [...new Uint8Array(hashBuf)].map((b) => b.toString(16).padStart(2, "0")).join("");

  const payload = c.get("jwtPayload");
  await c.env.DB.prepare(
    "INSERT INTO api_tokens (id, account_id, token_hash, label, scopes) VALUES (?, ?, ?, ?, ?)",
  )
    .bind(crypto.randomUUID(), payload.account_id, hash, label, JSON.stringify(scopes))
    .run();

  // Return raw token exactly once — never again
  return c.json({ token: raw, label, scopes }, 201);
});
```

**Verification on write requests:**

```ts
export const requireWriteAuth = createMiddleware(async (c, next) => {
  // Accept either a valid JWT (from editor) or a secret token (from MCP/CLI)
  const authHeader = c.req.header("Authorization") ?? "";

  if (authHeader.startsWith("Bearer i18n_sk_")) {
    const raw = authHeader.slice(7);
    const hashBuf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(raw));
    const hash = [...new Uint8Array(hashBuf)].map((b) => b.toString(16).padStart(2, "0")).join("");

    const row = await c.env.DB.prepare(
      `SELECT id, account_id, scopes, revoked_at
         FROM api_tokens
        WHERE token_hash = ?`,
    )
      .bind(hash)
      .first<{ id: string; account_id: string; scopes: string; revoked_at: number | null }>();

    if (!row || row.revoked_at) return c.json({ error: "invalid_token" }, 401);

    // Update last_used_at async (non-blocking)
    c.executionCtx.waitUntil(
      c.env.DB.prepare("UPDATE api_tokens SET last_used_at = ? WHERE id = ?")
        .bind(Math.floor(Date.now() / 1000), row.id)
        .run(),
    );

    c.set("authContext", {
      account_id: row.account_id,
      scopes: JSON.parse(row.scopes),
      type: "token",
    });
    return next();
  }

  if (authHeader.startsWith("Bearer ")) {
    // JWT path (editor session)
    try {
      const payload = await verifyJwt(authHeader.slice(7), c.env.JWT_SECRET);
      c.set("authContext", {
        account_id: payload.account_id,
        scopes: ["write", "publish"],
        type: "jwt",
      });
      return next();
    } catch {
      return c.json({ error: "unauthorized" }, 401);
    }
  }

  return c.json({ error: "unauthorized" }, 401);
});
```

---

### 3.3 Domain Whitelist Threat Model

The domain whitelist (`allowed_domains` on `api_keys`) has a precisely scoped purpose. Understanding what it does and does not protect against is critical.

**What the domain whitelist prevents:**

A competitor or bad actor cannot use your `i18n_pk_abc123` in their own website to make write operations against your account. The Worker validates the `Origin` header on write paths — if the origin's hostname is not in `allowed_domains`, the request is rejected.

**What the domain whitelist does not prevent:**

Label file reads from CDN are unconditionally public and do not check the domain whitelist. Label files are UI strings (button text, placeholders, navigation labels) — they are not sensitive data. Requiring authentication on CDN reads would collapse the cache hit rate from ~99% to 0%, making the service economically unviable. This is an intentional design decision.

**Why domain whitelist is not a sufficient protection on its own for writes:**

The `Origin` header is set by browsers and cannot be spoofed in browser-originated requests. However, server-side HTTP clients (curl, Python, Node.js) can set any `Origin` value. This means:

- Browser write requests: domain whitelist + JWT is effective
- Server-side write requests: must rely on JWT or `i18n_sk_` secret token

The `i18n_sk_` secret token is the real protection for server-side write operations. The domain whitelist is an additional friction layer for browser-originated abuse, not a standalone access control mechanism.

**Enforcement implementation:**

```ts
export const enforceDomainWhitelist = createMiddleware(async (c, next) => {
  const keyMeta = c.get("keyMeta");
  const origin = c.req.header("Origin");

  // No origin header — server-side request — must have i18n_sk_ token (checked elsewhere)
  if (!origin) return next();

  const hostname = new URL(origin).hostname;
  if (!keyMeta.domains.includes(hostname)) {
    return c.json({ error: "domain_not_allowed" }, 403);
  }
  return next();
});
```

---

### 3.4 Key Revocation

**Public key revocation:**

1. Delete from KV immediately: `await env.ShipEasyI18n_KEYS.delete('pk:' + key)`
2. Update D1: `UPDATE api_keys SET revoked_at = unixepoch() WHERE id = ?`
3. All new requests will miss KV and hit D1, where they will find `revoked_at IS NOT NULL` and be rejected
4. Any in-flight requests that have already passed the KV/D1 check will complete — this is a maximum ~100ms window and is acceptable

The 60-second KV TTL means revoked keys can continue serving cached responses for up to 60 seconds unless the KV key is explicitly deleted. Explicit deletion reduces the maximum propagation lag to the Cloudflare KV consistency window (~1 second globally).

**Secret token revocation:**

D1-only. No KV cache. Revocation is immediate: `UPDATE api_tokens SET revoked_at = ? WHERE id = ?`. The next request will hash the token, look it up in D1, find `revoked_at` set, and reject.

---

## 4. Stripe Webhook Security

Stripe sends a `Stripe-Signature` header with each webhook delivery. The signature is an HMAC-SHA256 of the raw request body combined with a timestamp, using the webhook signing secret as the key.

**Exact implementation:**

```ts
// workers/src/routes/webhooks/stripe.ts

app.post("/webhooks/stripe", async (c) => {
  const rawBody = await c.req.text();
  const sigHeader = c.req.header("Stripe-Signature") ?? "";
  const secret = c.env.STRIPE_WEBHOOK_SECRET;

  // Parse Stripe-Signature header
  const sigParams: Record<string, string> = {};
  for (const part of sigHeader.split(",")) {
    const [k, v] = part.split("=");
    sigParams[k] = v;
  }

  const timestamp = sigParams["t"];
  const v1sig = sigParams["v1"];

  if (!timestamp || !v1sig) return c.json({ error: "missing_signature" }, 400);

  // Replay window: reject if timestamp is more than 5 minutes old
  const ts = parseInt(timestamp, 10);
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - ts) > 300) {
    return c.json({ error: "timestamp_too_old" }, 400);
  }

  // Compute expected signature: HMAC-SHA256(timestamp + '.' + rawBody)
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const payload = `${timestamp}.${rawBody}`;
  const sigBytes = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  const computed = [...new Uint8Array(sigBytes)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  // Constant-time comparison to prevent timing attacks
  if (!constantTimeEqual(computed, v1sig)) {
    return c.json({ error: "invalid_signature" }, 400);
  }

  const event = JSON.parse(rawBody) as StripeEvent;

  // Idempotency: deduplicate by Stripe event ID
  const existing = await c.env.DB.prepare("SELECT id FROM stripe_events WHERE stripe_event_id = ?")
    .bind(event.id)
    .first();
  if (existing) return c.json({ received: true }); // already processed

  // Insert event record before processing (at-least-once with idempotency key)
  await c.env.DB.prepare(
    "INSERT INTO stripe_events (stripe_event_id, type, processed_at) VALUES (?, ?, ?)",
  )
    .bind(event.id, event.type, now)
    .run();

  // Process event
  await handleStripeEvent(event, c.env);

  return c.json({ received: true });
});

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}
```

**D1 schema for idempotency:**

```sql
CREATE TABLE stripe_events (
  stripe_event_id TEXT PRIMARY KEY,  -- e.g. "evt_1NqX..."
  type            TEXT NOT NULL,
  processed_at    INTEGER NOT NULL
);
```

The `PRIMARY KEY` constraint on `stripe_event_id` provides the unique constraint. If Stripe retries a delivery (which it does up to 7 days), the `INSERT` will fail with a unique constraint violation — which the Worker catches and responds with `200 { received: true }` to stop further retries.

---

## 5. Admin Security

### 5.1 Cloudflare Access

The admin dashboard at `admin.i18n.shipeasy.ai` is protected by Cloudflare Access at the network layer. No HTTP request reaches the origin Worker unless it has passed through Cloudflare Access authentication. This is zero-trust: no code in the Worker can be reached without a valid Access session.

**Configuration (Terraform / Cloudflare dashboard):**

```hcl
resource "cloudflare_access_application" "admin" {
  zone_id          = var.zone_id
  name             = "ShipEasyI18n Admin Dashboard"
  domain           = "admin.i18n.shipeasy.ai"
  type             = "self_hosted"
  session_duration = "8h"
}

resource "cloudflare_access_policy" "admin_email_allowlist" {
  application_id = cloudflare_access_application.admin.id
  zone_id        = var.zone_id
  name           = "Admin email allowlist"
  precedence     = 1
  decision       = "allow"

  include {
    email = [
      "founder@i18n.shipeasy.ai",
      "cto@i18n.shipeasy.ai",
    ]
  }
}
```

Cloudflare Access validates the user's identity via Google (or any configured IdP) and injects a signed JWT into the `Cf-Access-Jwt-Assertion` header on every request to the origin. The Worker can optionally validate this JWT, but because Cloudflare guarantees it is stripped from any request not coming through Access, the primary protection is at the edge.

**Worker-side validation (defense in depth):**

```ts
// workers/src/middleware/adminAccess.ts

export const requireCfAccess = createMiddleware(async (c, next) => {
  const cfJwt = c.req.header("Cf-Access-Jwt-Assertion");
  if (!cfJwt) return c.json({ error: "forbidden" }, 403);

  // Validate via Cloudflare Access public key (fetched from JWKS endpoint)
  // In production, cache the JWKS in KV for 1 hour
  const aud = c.env.CF_ACCESS_AUD; // Application Audience tag from CF Access
  try {
    await verifyCfAccessJwt(cfJwt, aud, c.env);
  } catch {
    return c.json({ error: "forbidden" }, 403);
  }

  await next();
});
```

### 5.2 ADMIN_TOKEN

Some admin operations (e.g., granting complimentary plans, triggering impersonation) are not available through the normal user auth flow. They require an additional `ADMIN_TOKEN` that is stored as a Workers Secret and never included in any codebase or configuration file.

```ts
export const requireAdminToken = createMiddleware(async (c, next) => {
  const token = c.req.header("X-Admin-Token");
  if (!token) return c.json({ error: "forbidden" }, 403);

  // Constant-time comparison against the Workers Secret
  if (!constantTimeEqual(token, c.env.ADMIN_TOKEN)) {
    return c.json({ error: "forbidden" }, 403);
  }

  await next();
});
```

Admin endpoints require both Cloudflare Access (`requireCfAccess`) AND `ADMIN_TOKEN`. Either check alone can be bypassed only if the attacker has compromised either the Cloudflare account or the Worker secret — both in the same attack is extremely unlikely.

### 5.3 Impersonation Tokens

Admins can issue short-lived impersonation tokens to debug customer issues.

**Endpoint (requires both CF Access + ADMIN_TOKEN):**

```ts
app.post("/admin/impersonate", requireCfAccess, requireAdminToken, async (c) => {
  const { account_id, reason } = await c.req.json<{ account_id: string; reason: string }>();
  const cfJwt = c.req.header("Cf-Access-Jwt-Assertion")!;
  const adminInfo = await parseCfAccessJwt(cfJwt);

  const now = Math.floor(Date.now() / 1000);
  const payload: JwtPayload = {
    sub: "admin-impersonation",
    account_id,
    role: "owner",
    iat: now,
    exp: now + 3600, // 1 hour maximum
    jti: crypto.randomUUID(),
    impersonated: true,
    impersonated_by: adminInfo.email,
  };

  const token = await signJwt(payload, c.env.JWT_SECRET);

  // Log to audit table — all impersonation is tracked
  await c.env.DB.prepare(
    `INSERT INTO audit_log (id, event, actor, account_id, metadata, created_at)
     VALUES (?, 'admin.impersonate', ?, ?, ?, ?)`,
  )
    .bind(
      crypto.randomUUID(),
      adminInfo.email,
      account_id,
      JSON.stringify({ reason, token_jti: payload.jti, expires_at: payload.exp }),
      now,
    )
    .run();

  return c.json({ token, expires_at: payload.exp });
});
```

**All API routes check for the `impersonated` flag in audit-sensitive contexts:**

```ts
// In the requireAuth middleware, after verifyJwt:
const payload = c.get("jwtPayload");
if (payload.impersonated) {
  // Log every request made with an impersonation token
  c.executionCtx.waitUntil(
    logAuditEvent(c.env.DB, {
      event: "admin.impersonation_request",
      actor: payload.impersonated_by!,
      account_id: payload.account_id,
      metadata: { method: c.req.method, path: new URL(c.req.url).pathname },
    }),
  );
}
```

---

## 6. Complimentary Plan Security

Complimentary plans are granted by admins to specific accounts (investors, press, early adopters). They behave like paid plans but are exempt from Stripe billing.

### 6.1 Admin-Only Grant Endpoint

```ts
app.post("/admin/accounts/:id/complimentary", requireCfAccess, requireAdminToken, async (c) => {
  const { id } = c.req.param();
  const { plan, reason } = await c.req.json<{ plan: string; reason: string }>();
  const cfJwt = c.req.header("Cf-Access-Jwt-Assertion")!;
  const adminInfo = await parseCfAccessJwt(cfJwt);
  const now = Math.floor(Date.now() / 1000);

  await c.env.DB.prepare(
    "UPDATE accounts SET complimentary_plan = ?, complimentary_granted_by = ?, complimentary_granted_at = ? WHERE id = ?",
  )
    .bind(plan, adminInfo.email, now, id)
    .run();

  await logAuditEvent(c.env.DB, {
    event: "admin.complimentary_granted",
    actor: adminInfo.email,
    account_id: id,
    metadata: { plan, reason },
  });

  return c.json({ ok: true });
});
```

### 6.2 Stripe Webhook Guard

When Stripe sends a `customer.subscription.deleted` or `customer.subscription.updated` event, the webhook handler must not downgrade a complimentary account:

```ts
async function handleStripeEvent(event: StripeEvent, env: Env): Promise<void> {
  if (
    event.type === "customer.subscription.deleted" ||
    event.type === "customer.subscription.updated"
  ) {
    const customerId = event.data.object.customer as string;
    const account = await env.DB.prepare(
      "SELECT id, complimentary_plan FROM accounts WHERE stripe_customer_id = ?",
    )
      .bind(customerId)
      .first<{ id: string; complimentary_plan: string | null }>();

    if (!account) return;

    // Guard: never downgrade a complimentary account via webhook
    if (account.complimentary_plan) {
      await logAuditEvent(env.DB, {
        event: "stripe.webhook_ignored_complimentary",
        actor: "stripe",
        account_id: account.id,
        metadata: { stripe_event_id: event.id, event_type: event.type },
      });
      return; // bail — do not process
    }

    // Normal downgrade path
    await env.DB.prepare("UPDATE accounts SET plan = ? WHERE id = ?")
      .bind("free", account.id)
      .run();
  }
}
```

### 6.3 getEffectivePlan

All plan enforcement throughout the codebase uses a single function that reads the complimentary flag:

```ts
export function getEffectivePlan(account: {
  plan: string;
  complimentary_plan: string | null;
}): string {
  return account.complimentary_plan ?? account.plan;
}
```

Feature gating:

```ts
const plan = getEffectivePlan(account);
if (plan !== "pro" && plan !== "business" && plan !== "enterprise") {
  return c.json({ error: "plan_required", required_plan: "pro" }, 402);
}
```

This ensures complimentary accounts are never accidentally locked out by a Stripe event or plan migration.

---

## 7. CDN and Delivery Security

### 7.1 Label Files Are Intentionally Public

Label files served from `cdn.i18n.shipeasy.ai/labels/` require no authentication. This is a deliberate design decision, not a security gap. Labels are UI strings (button text, navigation labels, form placeholders) — not PHI, PII, financial data, or any other sensitive category.

Requiring auth on CDN reads would mean:

- Every label fetch hits the origin Worker (no CDN caching possible)
- Edge caching is eliminated — cache-Control on auth-required responses is `no-store`
- Latency increases from <10ms (cache hit) to ~50-100ms (Worker execution)
- Cost increases by 100x at scale

The CDN delivery model is fundamental to the service's value proposition. Authenticated delivery is architecturally incompatible with Cloudflare CDN caching.

### 7.2 R2 Bucket Access Controls

R2 objects are written only via Workers service bindings — never through a public R2 endpoint. The R2 bucket has no public write endpoint:

```toml
# wrangler.toml (non-secret config only)
[[r2_buckets]]
binding  = "LABEL_STORAGE"
bucket_name = "i18n-labels"
```

The bucket is configured with public read access via a Cloudflare CDN routing rule (`cdn.i18n.shipeasy.ai/labels/*` → R2 bucket). Write access requires the Worker's service binding, which is only available inside the Worker runtime. There is no path for external parties to write to R2 directly.

### 7.3 Cloudflare Cache Purge Token

The purge token is scoped to cache purge operations only. It cannot be used to modify zone settings, DNS records, or Workers configuration.

```ts
// workers/src/lib/cdn.ts

export async function purgeManifest(
  customerId: string,
  profileHash: string,
  env: Env,
): Promise<void> {
  const url = `https://cdn.i18n.shipeasy.ai/labels/${customerId}/${profileHash}/manifest.json`;

  const res = await fetch(
    `https://api.cloudflare.com/client/v4/zones/${env.CF_ZONE_ID}/purge_cache`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.CLOUDFLARE_PURGE_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ files: [url] }),
    },
  );

  if (!res.ok) {
    // Log but do not fail the publish — 60s TTL serves as fallback
    console.error("Cache purge failed", await res.text());
  }
}
```

The `CLOUDFLARE_PURGE_TOKEN` is created in the Cloudflare dashboard under **My Profile > API Tokens** with the permissions: **Zone > Cache Purge > Purge**. It is scoped to the specific zone hosting `cdn.i18n.shipeasy.ai`. If the token is compromised, an attacker can only force-purge CDN cache entries — they cannot read data, modify settings, or make writes.

### 7.4 CORS Policy

`api.i18n.shipeasy.ai` accepts cross-origin requests only from known origins:

```ts
// workers/src/index.ts

import { cors } from "hono/cors";

app.use(
  "*",
  cors({
    origin: (origin) => {
      const allowed = ["https://app.i18n.shipeasy.ai", "https://admin.i18n.shipeasy.ai"];
      return allowed.includes(origin) ? origin : null;
    },
    allowMethods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allowHeaders: [
      "Authorization",
      "Content-Type",
      "X-ShipEasyI18n-Key",
      "X-Admin-Token",
      "If-None-Match",
    ],
    exposeHeaders: ["ETag"],
    maxAge: 86400,
    credentials: true,
  }),
);
```

Customer site origins (e.g., `https://customer.example.com`) are not included in the CORS allowlist for the management API. Browser requests from customer sites use only the CDN (CORS-open) and the public-key-identified read endpoints — they do not make authenticated management API calls.

---

## 8. Input Validation

All input validation is performed at the API boundary, before D1 queries or R2 writes. Validation failures return 400 with a structured error body.

### 8.1 Label Key Format

```ts
const LABEL_KEY_REGEX = /^[a-z][a-z0-9._-]*$/;
const LABEL_KEY_MAX_LENGTH = 100;

export function validateLabelKey(key: unknown): string {
  if (typeof key !== "string") throw new ValidationError("key must be a string");
  if (key.length === 0) throw new ValidationError("key must not be empty");
  if (key.length > LABEL_KEY_MAX_LENGTH)
    throw new ValidationError(`key must not exceed ${LABEL_KEY_MAX_LENGTH} characters`);
  if (!LABEL_KEY_REGEX.test(key)) throw new ValidationError("key must match ^[a-z][a-z0-9._-]*$");
  return key;
}
```

**Rationale:** Keys must start with a lowercase letter (no numerics or special chars as first character — prevents ambiguity when used in file paths and variable names). Only lowercase ASCII, digits, dots, underscores, and hyphens are allowed. This prevents path traversal in R2 key construction, injection into format strings, and XSS via key rendering in the dashboard.

### 8.2 Label Value

```ts
const LABEL_VALUE_MAX_LENGTH = 10_000;

export function validateLabelValue(value: unknown): string {
  if (typeof value !== "string") throw new ValidationError("value must be a string");
  if (value.length > LABEL_VALUE_MAX_LENGTH)
    throw new ValidationError(`value must not exceed ${LABEL_VALUE_MAX_LENGTH} characters`);
  // No further restriction — values are UI strings, may contain any Unicode
  return value;
}
```

All D1 queries use parameterized statements (D1's `.bind()` API). SQL injection via label values is structurally impossible.

### 8.3 Domain Allowlist Validation

```ts
const HOSTNAME_REGEX = /^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/;

export function validateHostname(hostname: unknown): string {
  if (typeof hostname !== "string") throw new ValidationError("domain must be a string");
  if (hostname.length > 253) throw new ValidationError("domain must not exceed 253 characters");
  if (!HOSTNAME_REGEX.test(hostname)) throw new ValidationError("invalid domain format");
  // Prevent adding i18n.shipeasy.ai or cloudflare.com as allowed domains
  const banned = ["i18n.shipeasy.ai", "cloudflare.com", "workers.dev"];
  if (banned.some((d) => hostname === d || hostname.endsWith("." + d))) {
    throw new ValidationError("this domain cannot be used as an allowed domain");
  }
  return hostname.toLowerCase();
}
```

### 8.4 Email Validation

```ts
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const EMAIL_MAX_LENGTH = 254; // RFC 5321

export function validateEmail(email: unknown): string {
  if (typeof email !== "string") throw new ValidationError("email must be a string");
  if (email.length > EMAIL_MAX_LENGTH) throw new ValidationError("email too long");
  if (!EMAIL_REGEX.test(email)) throw new ValidationError("invalid email format");
  return email.toLowerCase().trim();
}
```

Resend handles deliverability validation. ShipEasyI18n only performs format checking to prevent obviously malformed inputs from reaching Resend or D1.

### 8.5 Shared Validation Middleware

```ts
// workers/src/lib/validation.ts

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

export function withValidation<T>(fn: () => T): T {
  try {
    return fn();
  } catch (err) {
    if (err instanceof ValidationError) {
      throw err; // re-throw for handler to catch and return 400
    }
    throw err;
  }
}

// In route handlers:
app.post("/chunks/:id/keys", requireWriteAuth, async (c) => {
  try {
    const body = await c.req.json();
    const key = validateLabelKey(body.key);
    const value = validateLabelValue(body.value);
    // ...
  } catch (err) {
    if (err instanceof ValidationError) return c.json({ error: err.message }, 400);
    throw err;
  }
});
```

---

## 9. Data Isolation

All D1 queries are scoped to `account_id` extracted from the verified JWT or API token. Client-supplied `account_id` values in request bodies are ignored entirely.

### 9.1 JWT-Derived Account Scoping

```ts
// Every authenticated route uses account_id from the JWT — never from the request body

app.get("/profiles", requireAuth, async (c) => {
  const { account_id } = c.get("jwtPayload"); // from verified JWT

  const profiles = await c.env.DB.prepare(
    "SELECT id, name, created_at FROM label_profiles WHERE account_id = ? ORDER BY created_at DESC",
  )
    .bind(account_id)
    .all();

  return c.json(profiles.results);
});
```

### 9.2 Resource Ownership Verification

Before any write operation on a specific resource, ownership is verified by joining the resource's `account_id` against the JWT's `account_id`:

```ts
// Example: PATCH /label-keys/:id
app.patch("/label-keys/:id", requireWriteAuth, async (c) => {
  const { id } = c.req.param();
  const { account_id } = c.get("authContext");

  // Verify ownership — join through profile to account
  const key = await c.env.DB.prepare(
    `SELECT lk.id, lk.updated_at
       FROM label_keys lk
       JOIN label_profiles lp ON lp.id = lk.profile_id
      WHERE lk.id = ? AND lp.account_id = ?`,
  )
    .bind(id, account_id)
    .first<{ id: string; updated_at: string }>();

  if (!key) return c.json({ error: "not_found" }, 404);

  // Optimistic locking: check updated_at
  const { value, description, updated_at: clientUpdatedAt } = await c.req.json();
  if (clientUpdatedAt && key.updated_at !== clientUpdatedAt) {
    const current = await c.env.DB.prepare(
      "SELECT value, updated_by, updated_at FROM label_keys WHERE id = ?",
    )
      .bind(id)
      .first<{ value: string; updated_by: string; updated_at: string }>();
    return c.json(
      {
        conflict: true,
        current_value: current!.value,
        updated_by: current!.updated_by,
        updated_at: current!.updated_at,
      },
      409,
    );
  }

  // Safe to update
  await c.env.DB.prepare(
    "UPDATE label_keys SET value = ?, description = ?, updated_by = ?, updated_at = datetime() WHERE id = ?",
  )
    .bind(value, description, account_id, id)
    .run();

  return c.json({ ok: true });
});
```

### 9.3 Draft Ownership

Draft access follows the same pattern — always join through the account:

```ts
app.post("/drafts/:id/keys", requireWriteAuth, async (c) => {
  const { id } = c.req.param();
  const { account_id } = c.get("authContext");

  // Verify draft belongs to the caller's account
  const draft = await c.env.DB.prepare(
    "SELECT id FROM label_drafts WHERE id = ? AND account_id = ?",
  )
    .bind(id, account_id)
    .first();

  if (!draft) return c.json({ error: "not_found" }, 404);

  // Safe to write to draft
  // ...
});
```

No route trusts `account_id` from the client. The pattern is enforced in code review — any query against a user-owned resource must include `AND account_id = ?` bound to the JWT-derived value.

---

## 10. Rate Limiting

### 10.1 Email OTP Rate Limiting (D1-based)

See section 1.3 — `checkOtpRateLimit` performs a D1 count query. This is intentionally D1-based (not Workers rate limiter) because OTP requests must be counted globally across all edge nodes, not per-PoP.

### 10.2 Management API Rate Limiting (Workers RateLimiter)

```toml
# wrangler.toml
[[rate_limiting]]
binding    = "RATE_LIMITER"
namespace_id = "..."
```

```ts
// Per-JWT user rate limiting on management API write endpoints

export const rateLimitWrites = createMiddleware(async (c, next) => {
  const { account_id } = c.get("authContext");

  const { success } = await c.env.RATE_LIMITER.limit({ key: `write:${account_id}` });
  if (!success) return c.json({ error: "rate_limit_exceeded" }, 429);

  await next();
});
```

Rate limits are configured in the Cloudflare dashboard. Default write limit: 60 requests per minute per account.

### 10.3 Label Delivery Rate Limiting (Per Public Key)

```ts
export const rateLimitDelivery = createMiddleware(async (c, next) => {
  const keyMeta = c.get("keyMeta");

  // Per-key rate limiting
  const { success } = await c.env.RATE_LIMITER.limit({ key: `delivery:${keyMeta.customer_id}` });
  if (!success) return c.json({ error: "quota_exceeded" }, 429);

  // Quota check (monthly): async — don't block the response
  c.executionCtx.waitUntil(checkAndIncrementQuota(keyMeta, c.env));

  await next();
});

async function checkAndIncrementQuota(keyMeta: KeyMeta, env: Env): Promise<void> {
  // Write to Queue for batch processing — never synchronous D1 on the hot path
  await env.USAGE_QUEUE.send({
    customer_id: keyMeta.customer_id,
    date: new Date().toISOString().slice(0, 10),
  });
}
```

Monthly quota enforcement: a background Queue consumer batches usage increments into D1. If `usage_current_month >= quota_monthly`, the next delivery request is blocked. This check happens at the Worker level via KV-cached quota state — not on every request to D1.

---

## 11. Secret Management

All secrets are stored as **Cloudflare Workers Secrets** (`wrangler secret put`). Workers Secrets are:

- Encrypted at rest using AES-256-GCM
- Decrypted only at Worker startup in a Cloudflare-managed secure enclave
- Never visible in logs, exception traces, or Cloudflare dashboard UI
- Never included in the Worker bundle deployed to the edge

**Complete secrets inventory:**

| Secret name              | Purpose                                     | Rotation frequency                               |
| ------------------------ | ------------------------------------------- | ------------------------------------------------ |
| `JWT_SECRET`             | Signs all user JWTs                         | Annually or on compromise                        |
| `STRIPE_SECRET_KEY`      | Stripe API calls (subscriptions, customers) | On Stripe key rotation                           |
| `STRIPE_WEBHOOK_SECRET`  | Verifies Stripe webhook signatures          | On webhook endpoint rotation                     |
| `ADMIN_TOKEN`            | Protects admin-only endpoints               | Quarterly                                        |
| `RESEND_API_KEY`         | Sends OTP emails                            | Annually or on compromise                        |
| `CLOUDFLARE_PURGE_TOKEN` | CDN cache purge API                         | Annually                                         |
| `GOOGLE_CLIENT_SECRET`   | Google OAuth                                | Annually                                         |
| `GITHUB_CLIENT_SECRET`   | GitHub OAuth                                | Annually                                         |
| `CF_ACCESS_AUD`          | Cloudflare Access audience tag              | Static — only changes if Access app is recreated |
| `CF_ZONE_ID`             | Cloudflare zone for purge API calls         | Static                                           |

**Provisioning (one-time per secret):**

```bash
# Run in the workers/ directory
wrangler secret put JWT_SECRET
wrangler secret put STRIPE_SECRET_KEY
wrangler secret put STRIPE_WEBHOOK_SECRET
wrangler secret put ADMIN_TOKEN
wrangler secret put RESEND_API_KEY
wrangler secret put CLOUDFLARE_PURGE_TOKEN
wrangler secret put GOOGLE_CLIENT_SECRET
wrangler secret put GITHUB_CLIENT_SECRET
```

**Prohibited patterns:**

- No secrets in `wrangler.toml` — only non-sensitive configuration (`[vars]`)
- No secrets in `.env` files — these are not Workers Secrets and are not encrypted
- No secrets in code comments, README files, or commit messages
- No `console.log(env.JWT_SECRET)` or similar — Cloudflare logs are semi-public in the dashboard
- No secrets in error messages returned to clients

**Verification — pre-deploy check script:**

```bash
# scripts/check-secrets.sh
# Run as part of CI before wrangler deploy

required_secrets=(
  JWT_SECRET
  STRIPE_SECRET_KEY
  STRIPE_WEBHOOK_SECRET
  ADMIN_TOKEN
  RESEND_API_KEY
  CLOUDFLARE_PURGE_TOKEN
  GOOGLE_CLIENT_SECRET
  GITHUB_CLIENT_SECRET
)

for secret in "${required_secrets[@]}"; do
  if ! wrangler secret list | grep -q "$secret"; then
    echo "ERROR: Missing Workers Secret: $secret"
    exit 1
  fi
done
echo "All required secrets are present."
```

---

## 12. Security Headers

### 12.1 Global Headers (all responses from api.i18n.shipeasy.ai)

```ts
// workers/src/middleware/securityHeaders.ts

export const securityHeaders = createMiddleware(async (c, next) => {
  await next();
  c.header("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload");
  c.header("X-Content-Type-Options", "nosniff");
  c.header("X-Frame-Options", "DENY");
  c.header("Referrer-Policy", "strict-origin-when-cross-origin");
  c.header("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
});
```

### 12.2 Content Security Policy for Dashboard (app.i18n.shipeasy.ai)

The dashboard is a Next.js app on Cloudflare Pages. CSP is applied via `next.config.ts` using a per-request nonce for `strict-dynamic`:

```ts
// app.i18n.shipeasy.ai/next.config.ts

import { NextConfig } from "next";
import crypto from "crypto";

function generateCspNonce(): string {
  return crypto.randomBytes(16).toString("base64");
}

function buildCsp(nonce: string): string {
  const directives: Record<string, string[]> = {
    "default-src": ["'self'"],
    "script-src": [`'nonce-${nonce}'`, "'strict-dynamic'", "https://cdn.i18n.shipeasy.ai"],
    "style-src": ["'self'", "'unsafe-inline'"], // required for MUI/emotion
    "img-src": [
      "'self'",
      "data:",
      "https://avatars.githubusercontent.com",
      "https://lh3.googleusercontent.com",
    ],
    "connect-src": ["'self'", "https://api.i18n.shipeasy.ai"],
    "font-src": ["'self'"],
    "object-src": ["'none'"],
    "base-uri": ["'self'"],
    "form-action": ["'self'", "https://api.i18n.shipeasy.ai"],
    "frame-ancestors": ["'none'"],
    "upgrade-insecure-requests": [],
  };

  return Object.entries(directives)
    .map(([k, v]) => (v.length ? `${k} ${v.join(" ")}` : k))
    .join("; ");
}

const nextConfig: NextConfig = {
  headers: async () => [
    {
      source: "/(.*)",
      headers: [
        { key: "X-Frame-Options", value: "DENY" },
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains; preload" },
        // CSP with nonce is injected per-request in middleware.ts
      ],
    },
  ],
};

export default nextConfig;
```

```ts
// app.i18n.shipeasy.ai/middleware.ts (Next.js edge middleware)

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import crypto from "crypto";

export function middleware(request: NextRequest) {
  const nonce = crypto.randomBytes(16).toString("base64");
  const csp = buildCsp(nonce);

  const response = NextResponse.next({
    request: { headers: new Headers({ ...Object.fromEntries(request.headers), "x-nonce": nonce }) },
  });
  response.headers.set("Content-Security-Policy", csp);
  return response;
}
```

### 12.3 editor.js Shadow DOM Isolation

`editor.js` injects the editor overlay using Shadow DOM to prevent:

- Host page CSS leaking into the editor UI (visual corruption)
- Editor CSS leaking into the host page (layout breakage)
- XSS via CSS injection from host page stylesheets

```js
// editor.js

function createEditorHost() {
  const host = document.createElement("div");
  host.id = "i18n-editor-root";
  // Position outside normal flow — no layout impact
  Object.assign(host.style, {
    position: "fixed",
    top: "0",
    left: "0",
    width: "0",
    height: "0",
    zIndex: "2147483647",
    contain: "strict",
  });
  document.body.appendChild(host);

  const shadow = host.attachShadow({ mode: "closed" }); // closed: no external JS access to shadow root
  // Inject editor UI into shadow root — fully isolated from host page styles
  return shadow;
}
```

The shadow root uses `mode: 'closed'` to prevent host page scripts from accessing `host.shadowRoot`. This is a defense-in-depth measure: even if the host page runs malicious JavaScript, it cannot inspect or mutate the editor DOM, which contains the editor JWT in `dataset.token`.

---

## 13. Audit Log

The audit log is an Enterprise feature providing a complete, tamper-evident record of every significant action.

### 13.1 D1 Schema

```sql
CREATE TABLE audit_log (
  id         TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  event      TEXT NOT NULL,       -- e.g. 'label_key.updated', 'draft.published', 'admin.impersonate'
  actor      TEXT NOT NULL,       -- user_id, admin email, or 'stripe', 'system'
  account_id TEXT NOT NULL REFERENCES accounts(id),
  resource   TEXT,                -- resource type + id, e.g. 'label_key:uuid'
  metadata   TEXT NOT NULL DEFAULT '{}',  -- JSON: before/after values, IP, user agent, etc.
  ip         TEXT,                -- client IP from CF-Connecting-IP header
  user_agent TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE INDEX idx_audit_log_account ON audit_log(account_id, created_at DESC);
CREATE INDEX idx_audit_log_actor ON audit_log(actor, created_at DESC);
```

### 13.2 Event Taxonomy

Every write operation emits an audit event. The event name follows the format `<resource>.<action>`:

| Event                                  | Trigger                                            |
| -------------------------------------- | -------------------------------------------------- |
| `label_key.created`                    | New key added                                      |
| `label_key.updated`                    | Key value or description changed                   |
| `label_key.deleted`                    | Key deleted                                        |
| `label_key.moved`                      | Key moved to different chunk                       |
| `draft.created`                        | New draft created                                  |
| `draft.updated`                        | Draft metadata changed                             |
| `draft.published`                      | Draft merged and published                         |
| `draft.deleted`                        | Draft deleted                                      |
| `profile.published`                    | Profile published to CDN                           |
| `api_key.created`                      | New public key created                             |
| `api_key.revoked`                      | Public key revoked                                 |
| `api_token.created`                    | New secret token created                           |
| `api_token.revoked`                    | Secret token revoked                               |
| `member.invited`                       | Team member invited                                |
| `member.removed`                       | Team member removed                                |
| `member.role_changed`                  | Member role changed                                |
| `auth.login`                           | Successful login (any method)                      |
| `auth.logout`                          | Explicit logout                                    |
| `auth.otp_failed`                      | OTP verification failed                            |
| `admin.impersonate`                    | Admin opened impersonation session                 |
| `admin.impersonation_request`          | Request made within impersonation session          |
| `admin.complimentary_granted`          | Complimentary plan granted                         |
| `admin.complimentary_revoked`          | Complimentary plan revoked                         |
| `stripe.webhook_ignored_complimentary` | Stripe downgrade blocked for complimentary account |

### 13.3 Logging Implementation

```ts
// workers/src/lib/audit.ts

export interface AuditEvent {
  event: string;
  actor: string; // user_id or admin email
  account_id: string;
  resource?: string; // e.g. 'label_key:550e8400-e29b-41d4-a716-446655440000'
  metadata: Record<string, unknown>;
  ip?: string;
  user_agent?: string;
}

export async function logAuditEvent(db: D1Database, audit: AuditEvent): Promise<void> {
  await db
    .prepare(
      `INSERT INTO audit_log (id, event, actor, account_id, resource, metadata, ip, user_agent, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      crypto.randomUUID(),
      audit.event,
      audit.actor,
      audit.account_id,
      audit.resource ?? null,
      JSON.stringify(audit.metadata),
      audit.ip ?? null,
      audit.user_agent ?? null,
      Math.floor(Date.now() / 1000),
    )
    .run();
}
```

**Usage in route handlers:**

```ts
app.delete("/label-keys/:id", requireWriteAuth, async (c) => {
  const { id } = c.req.param();
  const { account_id } = c.get("authContext");
  const actor = c.get("jwtPayload")?.sub ?? "api_token";

  // Fetch before deleting for audit metadata
  const key = await c.env.DB.prepare(
    "SELECT key, value, chunk_id FROM label_keys WHERE id = ? AND ...",
  )
    .bind(id)
    .first<{ key: string; value: string; chunk_id: string }>();

  if (!key) return c.json({ error: "not_found" }, 404);

  await c.env.DB.prepare("DELETE FROM label_keys WHERE id = ?").bind(id).run();

  // Log async — don't block the response
  c.executionCtx.waitUntil(
    logAuditEvent(c.env.DB, {
      event: "label_key.deleted",
      actor,
      account_id,
      resource: `label_key:${id}`,
      metadata: { key: key.key, value: key.value, chunk_id: key.chunk_id },
      ip: c.req.header("CF-Connecting-IP"),
      user_agent: c.req.header("User-Agent"),
    }),
  );

  return c.json({ ok: true });
});
```

### 13.4 Audit Log API (Enterprise only)

```ts
app.get("/audit", requireAuth, requirePlan("enterprise"), async (c) => {
  const { account_id } = c.get("jwtPayload");
  const { limit = "50", before, event, actor } = c.req.query();

  let query = "SELECT * FROM audit_log WHERE account_id = ?";
  const bindings: (string | number)[] = [account_id];

  if (before) {
    query += " AND created_at < ?";
    bindings.push(parseInt(before, 10));
  }
  if (event) {
    query += " AND event = ?";
    bindings.push(event);
  }
  if (actor) {
    query += " AND actor = ?";
    bindings.push(actor);
  }

  query += " ORDER BY created_at DESC LIMIT ?";
  bindings.push(Math.min(parseInt(limit, 10), 200));

  const rows = await c.env.DB.prepare(query)
    .bind(...bindings)
    .all();
  return c.json(rows.results);
});
```

### 13.5 Tamper-Evidence Properties

The audit log is append-only by D1 design — no `DELETE` or `UPDATE` statements are issued against `audit_log` anywhere in the codebase. This is enforced by code convention and should be enforced in CI via a grep check:

```bash
# .githooks/pre-push (add to existing hook)
if grep -rn "DELETE FROM audit_log\|UPDATE audit_log" workers/src/; then
  echo "ERROR: audit_log must be append-only. Mutations are not allowed."
  exit 1
fi
```

For Enterprise customers who need cryptographic tamper evidence, a hash chain can be added: each row stores `SHA-256(previous_row_id || event || actor || created_at)`. This is not in the initial implementation but is the natural extension path.

---

## Implementation Checklist

The following items must be completed before any public launch:

**Authentication**

- [ ] JWT signing implemented with Web Crypto API (no third-party library)
- [ ] JWT expiry set to 8 hours, verified on every request
- [ ] Refresh token rotation implemented with single-use enforcement
- [ ] Refresh token reuse detection triggers full session revocation
- [ ] Email OTP rate limited to 3/15min per email
- [ ] OTP invalidated after 3 failed attempts
- [ ] OTP single-use (used_at set on first successful verify)
- [ ] Email enumeration prevented (identical response for existing/non-existing)
- [ ] OAuth state param signed and verified (CSRF prevention)
- [ ] Tokens stored in sessionStorage, never localStorage

**postMessage**

- [ ] PKCE nonce generated with `crypto.randomUUID()`
- [ ] Nonce verified before loading editor.js
- [ ] Nonce deleted after use (single-use)
- [ ] `e.origin` strictly validated against `'https://app.i18n.shipeasy.ai'`
- [ ] postMessage uses explicit `targetOrigin`, never `'*'`
- [ ] `window.opener` checked in popup before sending message

**API Keys**

- [ ] Public key stored as SHA-256 hash in D1
- [ ] KV mirror populated on key creation, deleted on revocation
- [ ] Secret token stored as SHA-256 hash in D1
- [ ] Secret token shown exactly once at creation
- [ ] Domain whitelist enforced on write path
- [ ] Domain whitelist explicitly NOT enforced on CDN read path

**Stripe**

- [ ] Webhook signature verified with constant-time comparison
- [ ] Replay window enforced (5 minutes)
- [ ] Idempotency enforced via `stripe_event_id` unique constraint
- [ ] Complimentary accounts protected from Stripe-triggered downgrades

**Admin**

- [ ] `admin.i18n.shipeasy.ai` protected by Cloudflare Access (email allowlist)
- [ ] Worker validates `Cf-Access-Jwt-Assertion` header as defense-in-depth
- [ ] `ADMIN_TOKEN` required for admin-only endpoints
- [ ] Both CF Access AND ADMIN_TOKEN required for all admin operations
- [ ] Impersonation tokens expire in 1 hour
- [ ] Impersonation flagged in JWT payload (`impersonated: true`)
- [ ] All impersonation activity logged to audit_log

**CDN**

- [ ] R2 bucket has no public write endpoint (service binding only)
- [ ] Cloudflare purge token scoped to purge-only
- [ ] CORS allowlist includes only `app.i18n.shipeasy.ai` and `admin.i18n.shipeasy.ai`
- [ ] CDN reads unconditionally public (no auth) — documented as intentional

**Input validation**

- [ ] Label key validated against `^[a-z][a-z0-9._-]*$`, max 100 chars
- [ ] Label value max 10,000 chars
- [ ] Hostname validated before adding to domain allowlist
- [ ] All D1 queries use parameterized `.bind()` (no string interpolation)

**Data isolation**

- [ ] All D1 queries scoped to `account_id` from JWT — never from request body
- [ ] Ownership verified on every resource-specific query
- [ ] Draft ownership verified before merge/publish

**Secrets**

- [ ] All secrets provisioned via `wrangler secret put`
- [ ] No secrets in `wrangler.toml`, `.env`, or code
- [ ] Pre-deploy script verifies all required secrets are present

**Audit log**

- [ ] All write operations emit audit events
- [ ] Impersonation sessions fully logged
- [ ] Complimentary grant/revoke logged
- [ ] `audit_log` table is append-only (no DELETE/UPDATE in codebase)
- [ ] CI check prevents mutations to audit_log
