> **Historical design doc** (pre-shipeasy-unification, 2026-04-13). Describes the multi-worker deploy (`auth.shipeasy.ai` + `api.i18n.shipeasy.ai` + dashboard) that's being collapsed into one Next.js app on Cloudflare Pages plus a thin loader-edge Worker. See [TODO.md](../TODO.md) M6–M9 for current deploy plan.

# Deployment Implementation Plan — Label Rewrite Service (ShipEasyI18n)

**Date:** 2026-04-11
**Status:** Authoritative
**Design reference:** `docs/plans/2026-04-11-label-rewrite-service-design-v2.md`

---

## Overview

This document is the step-by-step deployment reference for every ShipEasyI18n infrastructure component. Execute sections in order on first deployment. Subsequent deploys follow the CI/CD workflows defined in section 10.

**Topology:**

| Package              | Runtime                               | Hostname               |
| -------------------- | ------------------------------------- | ---------------------- |
| `packages/api`       | Cloudflare Worker (Hono.js)           | api.i18n.shipeasy.ai   |
| `packages/dashboard` | Cloudflare Pages (Next.js App Router) | app.i18n.shipeasy.ai   |
| `packages/landing`   | Cloudflare Pages (Next.js static)     | i18n.shipeasy.ai       |
| `packages/docs`      | Cloudflare Pages (Starlight/Astro)    | docs.i18n.shipeasy.ai  |
| `packages/admin`     | Cloudflare Pages (Next.js)            | admin.i18n.shipeasy.ai |
| `packages/loader`    | R2 + CDN                              | cdn.i18n.shipeasy.ai   |
| `packages/cli`       | npm                                   | i18n-cli               |
| `packages/mcp`       | npm                                   | i18n-mcp               |

**Cloudflare resources:**

| Resource     | Name        |
| ------------ | ----------- |
| D1 database  | i18n-db     |
| KV namespace | i18n-keys   |
| R2 bucket    | i18n-labels |
| Queue        | i18n-usage  |

---

## 1. Initial Cloudflare Setup

### 1.1 Create Account and Enable Services

1. Create a Cloudflare account at https://dash.cloudflare.com.
2. Add a payment method (Workers Paid plan required for D1, Queues, and R2 production workloads).
3. Navigate to **Workers & Pages** and verify Workers is available.
4. Navigate to **R2** and click **Enable R2** — requires payment method.
5. Navigate to **Queues** and verify it is available under your plan.
6. D1 and KV are available on all plans.

### 1.2 Install Wrangler and Authenticate

```bash
npm install -g wrangler
wrangler login
# Opens browser — log in with the Cloudflare account owner credentials.
# Token is stored at ~/.wrangler/config/default.toml
wrangler whoami
# Confirm: "You are logged in with an API Token, associated with the email <you@example.com>"
```

Store the account ID — visible in the Cloudflare dashboard right sidebar on the Workers overview page, or via:

```bash
wrangler whoami
# Output includes: "account_id = <CLOUDFLARE_ACCOUNT_ID>"
```

### 1.3 Create D1 Database

```bash
wrangler d1 create i18n-db
```

Output includes the database ID. Record it — needed in `wrangler.toml`:

```
✅ Successfully created DB 'i18n-db'
database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
```

For staging, create a second database:

```bash
wrangler d1 create i18n-db-staging
```

### 1.4 Create KV Namespace

```bash
wrangler kv:namespace create KV_KEYS
# Output:
# id = "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"

wrangler kv:namespace create KV_KEYS --preview
# Creates a preview namespace for local dev (wrangler dev uses this)
# preview_id = "yyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyy"
```

For staging:

```bash
wrangler kv:namespace create KV_KEYS_STAGING
```

### 1.5 Create R2 Bucket

```bash
wrangler r2 bucket create i18n-labels
# For staging:
wrangler r2 bucket create i18n-labels-staging
```

Enable public access on the production bucket so `cdn.i18n.shipeasy.ai` can serve files:

In the Cloudflare dashboard: **R2 > i18n-labels > Settings > Public Access > Allow Access**.

### 1.6 Create Queue

```bash
wrangler queues create i18n-usage
# For staging:
wrangler queues create i18n-usage-staging
```

### 1.7 Custom Domain Registration

Add `i18n.shipeasy.ai` (or your chosen domain) to Cloudflare:

1. In the Cloudflare dashboard, click **Add a Site** and enter your domain.
2. Follow the nameserver update instructions at your registrar.
3. Wait for nameserver propagation (up to 24h, usually <1h).
4. Verify: `dig NS i18n.shipeasy.ai` should return Cloudflare nameservers.

---

## 2. DNS Setup

All records are managed in the Cloudflare DNS dashboard for `i18n.shipeasy.ai`. Proxy status (orange cloud) must be **enabled** on all records to route through Cloudflare.

### 2.1 API Worker

```
Type: AAAA
Name: api
Content: 100::  (placeholder — the Worker route overrides this)
Proxy:  Enabled (orange cloud)
```

The Worker route is configured in `wrangler.toml` (see section 7). The DNS record is required for Cloudflare to accept the hostname — the content value is irrelevant because traffic is intercepted by the Worker route before hitting origin.

### 2.2 Cloudflare Pages Subdomains

Each Pages project gets a custom domain assigned in the Pages dashboard under **Custom Domains**. Cloudflare automatically creates a `CNAME` pointing to the Pages project's `*.pages.dev` hostname.

| Subdomain               | Pages project name |
| ----------------------- | ------------------ |
| app.i18n.shipeasy.ai    | i18n-dashboard     |
| i18n.shipeasy.ai (apex) | i18n-landing       |
| docs.i18n.shipeasy.ai   | i18n-docs          |
| admin.i18n.shipeasy.ai  | i18n-admin         |

Steps for each:

1. Go to **Workers & Pages > [project] > Custom domains**.
2. Click **Set up a custom domain**.
3. Enter the subdomain (e.g., `app.i18n.shipeasy.ai`).
4. Cloudflare automatically adds a CNAME record. Accept it.

For the apex domain (`i18n.shipeasy.ai`), Cloudflare uses a flattened CNAME (ANAME/ALIAS behavior) automatically — no configuration needed.

### 2.3 CDN Subdomain for R2

In the Cloudflare dashboard: **R2 > i18n-labels > Settings > Custom Domains > Connect Domain**.

Enter `cdn.i18n.shipeasy.ai`. Cloudflare automatically:

- Creates a CNAME: `cdn.i18n.shipeasy.ai → i18n-labels.r2.cloudflarestorage.com`
- Enables the Cloudflare CDN cache in front of R2
- Proxy status is orange cloud by default

Verify public access is on (section 1.5). After this, files in `i18n-labels` are accessible at `https://cdn.i18n.shipeasy.ai/<object-key>`.

---

## 3. Cloudflare Access Setup for admin.i18n.shipeasy.ai

The admin panel must never be publicly accessible. Cloudflare Access provides identity-aware access control without any changes to the application code.

### 3.1 Enable Cloudflare Zero Trust

1. In the Cloudflare dashboard, click **Zero Trust** in the left sidebar.
2. Choose or create a team name (e.g., `i18n`). This sets `i18n.cloudflareaccess.com` as the SSO domain.
3. Choose a plan — Free tier supports up to 50 users, sufficient for internal team.

### 3.2 Create Access Application

1. Go to **Zero Trust > Access > Applications > Add an Application**.
2. Select **Self-hosted**.
3. Configure:
   - **Application name:** ShipEasyI18n Admin
   - **Session duration:** 24 hours
   - **Application domain:** `admin.i18n.shipeasy.ai`
4. Under **Policies**, add a policy:
   - **Policy name:** Internal Team
   - **Action:** Allow
   - **Rule — Include:** Emails ending in `@yourdomain.com`
     (Or use a specific email list if the team uses personal emails.)
5. Click Save.

### 3.3 Optional: GitHub Organization Policy

Instead of email domain, allow any member of your GitHub org:

- **Rule — Include:** GitHub organization → `your-org-name`

This requires a GitHub identity provider configured in **Zero Trust > Settings > Authentication > Add new**.

### 3.4 Result

Any request to `admin.i18n.shipeasy.ai` is intercepted by Cloudflare Access before it reaches the Pages deployment. Unauthenticated users see a login screen — not the admin app. No code changes, no middleware, no tokens to manage in the app.

---

## 4. Secrets Setup

All secrets are stored in Cloudflare Workers Secrets (encrypted at rest, injected as environment variables at runtime). Never commit secrets to version control.

### 4.1 Generate JWT Secret

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
# → e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
```

Store this value — it is used to sign and verify all editor session JWTs.

### 4.2 Get Cloudflare Zone ID

In the Cloudflare dashboard: **Websites > i18n.shipeasy.ai > Overview > API section (right sidebar)** — the **Zone ID** is listed there.

### 4.3 Create Scoped Cloudflare API Token for Cache Purge

The Worker needs to call the Cloudflare Cache Purge API on publish. Create a token with the minimum required permissions:

1. Go to **Cloudflare dashboard > My Profile > API Tokens > Create Token**.
2. Use **Custom token**.
3. Configure:
   - **Token name:** ShipEasyI18n Cache Purge
   - **Permissions:** Zone — Cache Purge — Purge
   - **Zone resources:** Include — Specific zone — i18n.shipeasy.ai
4. Click **Continue to summary**, then **Create Token**.
5. Copy the token value immediately — it is shown only once.

### 4.4 Set All Secrets

Run each of the following from the `packages/api` directory. Wrangler prompts for the value after each command.

```bash
cd packages/api

# Auth
wrangler secret put JWT_SECRET
# Paste the hex string from 4.1

wrangler secret put GOOGLE_CLIENT_ID
# From Google Cloud Console > APIs & Services > Credentials

wrangler secret put GOOGLE_CLIENT_SECRET

wrangler secret put GITHUB_CLIENT_ID
# From GitHub > Settings > Developer settings > OAuth Apps

wrangler secret put GITHUB_CLIENT_SECRET

# Email
wrangler secret put RESEND_API_KEY
# From https://resend.com/api-keys

# Stripe
wrangler secret put STRIPE_SECRET_KEY
# From Stripe dashboard > Developers > API keys > Secret key (sk_live_...)

wrangler secret put STRIPE_WEBHOOK_SECRET
# From Stripe dashboard after registering webhook (see section 9)

wrangler secret put STRIPE_PRICE_PRO
# Price ID for the Pro plan (price_...) from Stripe Products

wrangler secret put STRIPE_PRICE_BUSINESS
# Price ID for the Business plan

# Cloudflare
wrangler secret put CLOUDFLARE_ZONE_ID
# The Zone ID from 4.2

wrangler secret put CLOUDFLARE_PURGE_TOKEN
# The scoped API token from 4.3

# Admin API
wrangler secret put ADMIN_TOKEN
# Generate: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
# Used by internal admin panel to authenticate against the API
```

For the staging environment, set the same secrets under the staging environment name. Stripe staging secrets use test-mode keys (`sk_test_...`):

```bash
wrangler secret put JWT_SECRET --env staging
wrangler secret put STRIPE_SECRET_KEY --env staging
# ... repeat for all secrets with staging values
```

---

## 5. Database Migrations

Migrations live in `shared/schema/` and are numbered sequentially. Apply them in order. Never skip or reorder.

### 5.1 Migration Files

```
shared/schema/
  001_initial.sql          ← accounts, users, members, api_keys, api_tokens
  002_auth.sql             ← email_auth_codes, refresh_tokens
  003_labels.sql           ← label_profiles, label_chunks, label_keys
  004_drafts.sql           ← label_drafts, label_draft_keys
  005_usage.sql            ← usage_daily
  006_rate_limits.sql      ← rate_limiter helper tables (if not using native binding)
```

### 5.2 Apply to Production

```bash
wrangler d1 execute i18n-db --file=shared/schema/001_initial.sql
wrangler d1 execute i18n-db --file=shared/schema/002_auth.sql
wrangler d1 execute i18n-db --file=shared/schema/003_labels.sql
wrangler d1 execute i18n-db --file=shared/schema/004_drafts.sql
wrangler d1 execute i18n-db --file=shared/schema/005_usage.sql
wrangler d1 execute i18n-db --file=shared/schema/006_rate_limits.sql
```

Verify:

```bash
wrangler d1 execute i18n-db --command "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;"
```

Expected output includes: `accounts`, `api_keys`, `api_tokens`, `email_auth_codes`, `label_chunks`, `label_draft_keys`, `label_drafts`, `label_keys`, `label_profiles`, `members`, `refresh_tokens`, `usage_daily`, `users`.

### 5.3 Apply to Staging

```bash
wrangler d1 execute i18n-db-staging --file=shared/schema/001_initial.sql
# ... repeat for all migrations
```

### 5.4 Apply Locally (wrangler dev)

Wrangler creates a local SQLite file for `wrangler dev`. Apply migrations to the local instance:

```bash
wrangler d1 execute i18n-db --local --file=shared/schema/001_initial.sql
# ... repeat for all migrations
```

### 5.5 Future Migration Strategy

Every schema change must:

1. Be written as a new numbered `.sql` file (e.g., `007_add_glossary.sql`).
2. Be additive — add columns/tables, never drop or rename without a multi-step migration.
3. Be applied to staging first and verified before production.
4. Be committed to version control alongside the code change that requires it.
5. Be idempotent where possible (use `CREATE TABLE IF NOT EXISTS`, `ADD COLUMN IF NOT EXISTS`).

**Rollback:** D1 does not support automatic rollback. To reverse a migration:

1. Write a `007_rollback_glossary.sql` that reverses the changes (drop added columns/tables).
2. Apply it manually: `wrangler d1 execute i18n-db --file=shared/schema/007_rollback_glossary.sql`.
3. Never delete migration files from version control.

---

## 6. Loader Script Deployment to CDN

Loader scripts are static JS files served from R2 via `cdn.i18n.shipeasy.ai`. They are not deployed as Workers — they are uploaded as objects.

### 6.1 Build

```bash
cd packages/loader
pnpm build
# Output: dist/loader.js, dist/editor-trigger.js, dist/editor.js
# Each file should be minified + gzipped during build
```

Verify build output sizes (gzipped targets from design doc):

- `loader.js` — ~2KB gzipped
- `editor-trigger.js` — ~1KB gzipped
- `editor.js` — ~50KB gzipped

### 6.2 Upload Latest Versions (Short TTL)

These are the "latest" pointers referenced by customer script tags. They use a short TTL so customers pick up updates quickly:

```bash
# loader.js — 5 minute TTL, stale-while-revalidate 1 hour
wrangler r2 object put i18n-labels/loader.js \
  --file=dist/loader.js \
  --content-type="application/javascript; charset=utf-8" \
  --cache-control="public, max-age=300, stale-while-revalidate=3600"

# editor-trigger.js — same TTL
wrangler r2 object put i18n-labels/editor-trigger.js \
  --file=dist/editor-trigger.js \
  --content-type="application/javascript; charset=utf-8" \
  --cache-control="public, max-age=300, stale-while-revalidate=3600"

# editor.js — same TTL
wrangler r2 object put i18n-labels/editor.js \
  --file=dist/editor.js \
  --content-type="application/javascript; charset=utf-8" \
  --cache-control="public, max-age=300, stale-while-revalidate=3600"
```

### 6.3 Upload Versioned Copies (Immutable)

Each build produces a content-hash. Upload versioned copies for customers who pin to a specific version. These use year-long TTL because the content never changes:

```bash
# Compute hash from the build (build tooling should emit this)
HASH=$(sha256sum dist/loader.js | cut -c1-8)

wrangler r2 object put "i18n-labels/loader.${HASH}.js" \
  --file=dist/loader.js \
  --content-type="application/javascript; charset=utf-8" \
  --cache-control="public, max-age=31536000, immutable"

wrangler r2 object put "i18n-labels/editor-trigger.${HASH}.js" \
  --file=dist/editor-trigger.js \
  --content-type="application/javascript; charset=utf-8" \
  --cache-control="public, max-age=31536000, immutable"

wrangler r2 object put "i18n-labels/editor.${HASH}.js" \
  --file=dist/editor.js \
  --content-type="application/javascript; charset=utf-8" \
  --cache-control="public, max-age=31536000, immutable"
```

Versioned URLs are referenced in release notes and the changelog. Customers who need predictable loader behavior can pin: `data-version="a1b2c3d4"`.

### 6.4 Purge CDN Cache After Upload

After uploading the latest (non-versioned) files, purge the CDN cache so all PoPs serve the new version immediately. Use the scoped API token created in section 4.3:

```bash
curl -X POST "https://api.cloudflare.com/client/v4/zones/${CLOUDFLARE_ZONE_ID}/purge_cache" \
  -H "Authorization: Bearer ${CLOUDFLARE_PURGE_TOKEN}" \
  -H "Content-Type: application/json" \
  --data '{
    "files": [
      "https://cdn.i18n.shipeasy.ai/loader.js",
      "https://cdn.i18n.shipeasy.ai/editor-trigger.js",
      "https://cdn.i18n.shipeasy.ai/editor.js"
    ]
  }'
```

Expected response: `{"result":{"id":"..."},"success":true}`.

---

## 7. API Worker Deployment

### 7.1 wrangler.toml

Full configuration for `packages/api/wrangler.toml`:

```toml
name = "i18n-api"
main = "src/index.ts"
compatibility_date = "2024-09-23"
compatibility_flags = ["nodejs_compat"]

# ─── Production environment (default) ────────────────────────────────────────

[vars]
ENVIRONMENT = "production"
APP_URL = "https://app.i18n.shipeasy.ai"
CDN_URL = "https://cdn.i18n.shipeasy.ai"

[[routes]]
pattern = "api.i18n.shipeasy.ai/*"
zone_name = "i18n.shipeasy.ai"

[[d1_databases]]
binding = "DB"
database_name = "i18n-db"
database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"  # from wrangler d1 create

[[kv_namespaces]]
binding = "KV_KEYS"
id = "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"               # from wrangler kv:namespace create

[[r2_buckets]]
binding = "R2_LABELS"
bucket_name = "i18n-labels"

[[queues.producers]]
binding = "USAGE_QUEUE"
queue = "i18n-usage"

[[queues.consumers]]
queue = "i18n-usage"
max_batch_size = 100
max_batch_timeout = 5
max_retries = 3
dead_letter_queue = "i18n-usage-dlq"

# Secrets (set via `wrangler secret put`, NOT listed here):
# JWT_SECRET, STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, STRIPE_PRICE_PRO,
# STRIPE_PRICE_BUSINESS, ADMIN_TOKEN, RESEND_API_KEY, CLOUDFLARE_ZONE_ID,
# CLOUDFLARE_PURGE_TOKEN, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET,
# GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET

# ─── Staging environment ──────────────────────────────────────────────────────

[env.staging]
name = "i18n-api-staging"

[env.staging.vars]
ENVIRONMENT = "staging"
APP_URL = "https://staging.app.i18n.shipeasy.ai"
CDN_URL = "https://cdn.i18n.shipeasy.ai"

[[env.staging.routes]]
pattern = "staging.api.i18n.shipeasy.ai/*"
zone_name = "i18n.shipeasy.ai"

[[env.staging.d1_databases]]
binding = "DB"
database_name = "i18n-db-staging"
database_id = "yyyyyyyy-yyyy-yyyy-yyyy-yyyyyyyyyyyy"  # from wrangler d1 create i18n-db-staging

[[env.staging.kv_namespaces]]
binding = "KV_KEYS"
id = "zzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzz"              # KV_KEYS_STAGING id

[[env.staging.r2_buckets]]
binding = "R2_LABELS"
bucket_name = "i18n-labels-staging"

[[env.staging.queues.producers]]
binding = "USAGE_QUEUE"
queue = "i18n-usage-staging"

[[env.staging.queues.consumers]]
queue = "i18n-usage-staging"
max_batch_size = 100
max_batch_timeout = 5
max_retries = 3
```

### 7.2 Deploy to Production

```bash
cd packages/api
pnpm build       # TypeScript compile (if build step exists)
wrangler deploy
```

Output:

```
Total Upload: 142.3 KiB / gzip: 38.1 KiB
Uploaded i18n-api (1.23 sec)
Published i18n-api (0.42 sec)
  https://i18n-api.vadimsh.workers.dev
  https://api.i18n.shipeasy.ai/*
```

### 7.3 Deploy to Staging

```bash
wrangler deploy --env staging
```

### 7.4 Health Check

```bash
curl https://api.i18n.shipeasy.ai/health
# Expected: {"status":"ok","version":"1.0.0","env":"production"}

curl https://staging.api.i18n.shipeasy.ai/health
# Expected: {"status":"ok","version":"1.0.0","env":"staging"}
```

---

## 8. Cloudflare Pages Deployment

Each Pages project must be created once in the Cloudflare dashboard, then subsequent deploys use `wrangler pages deploy`.

### 8.1 Create Pages Projects (One Time)

For each package, create the project:

```bash
# dashboard
wrangler pages project create i18n-dashboard --production-branch main

# landing
wrangler pages project create i18n-landing --production-branch main

# docs
wrangler pages project create i18n-docs --production-branch main

# admin
wrangler pages project create i18n-admin --production-branch main
```

### 8.2 Dashboard (app.i18n.shipeasy.ai)

Next.js App Router with Cloudflare Pages adapter. Build output is `.next/standalone` (not `out` — this is SSR, not static export).

```bash
cd packages/dashboard
pnpm build
wrangler pages deploy .next/standalone \
  --project-name=i18n-dashboard \
  --branch=main
```

Environment variables for the dashboard Pages project (set in Cloudflare dashboard under **Pages > i18n-dashboard > Settings > Environment variables**):

```
NEXT_PUBLIC_API_URL=https://api.i18n.shipeasy.ai
NEXT_PUBLIC_CDN_URL=https://cdn.i18n.shipeasy.ai
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
```

### 8.3 Landing (i18n.shipeasy.ai)

Next.js static export:

```bash
cd packages/landing
pnpm build
# next.config.js must have: output: 'export'
wrangler pages deploy out \
  --project-name=i18n-landing \
  --branch=main
```

No environment variables needed (fully static).

### 8.4 Docs (docs.i18n.shipeasy.ai)

Starlight/Astro static build:

```bash
cd packages/docs
pnpm build
# Astro outputs to dist/
wrangler pages deploy dist \
  --project-name=i18n-docs \
  --branch=main
```

### 8.5 Admin (admin.i18n.shipeasy.ai)

Next.js App Router, protected by Cloudflare Access (section 3). The app itself has no auth — Access handles it:

```bash
cd packages/admin
pnpm build
wrangler pages deploy .next/standalone \
  --project-name=i18n-admin \
  --branch=main
```

Environment variables for the admin Pages project:

```
NEXT_PUBLIC_API_URL=https://api.i18n.shipeasy.ai
ADMIN_TOKEN=<same value set as Worker secret in section 4.4>
```

### 8.6 Assign Custom Domains

After creating each project and running the first deploy, assign custom domains in the Cloudflare dashboard:

1. **Workers & Pages > i18n-dashboard > Custom domains > Set up a custom domain** → `app.i18n.shipeasy.ai`
2. **Workers & Pages > i18n-landing > Custom domains** → `i18n.shipeasy.ai` and `www.i18n.shipeasy.ai`
3. **Workers & Pages > i18n-docs > Custom domains** → `docs.i18n.shipeasy.ai`
4. **Workers & Pages > i18n-admin > Custom domains** → `admin.i18n.shipeasy.ai`

Cloudflare automatically provisions SSL certificates for all custom domains.

---

## 9. Stripe Webhook Registration

### 9.1 Register the Webhook Endpoint

In the Stripe dashboard (https://dashboard.stripe.com/webhooks):

1. Click **Add endpoint**.
2. **Endpoint URL:** `https://api.i18n.shipeasy.ai/webhooks/stripe`
3. **Events to send** — select exactly these:

```
checkout.session.completed
customer.subscription.updated
customer.subscription.deleted
invoice.paid
invoice.payment_failed
```

4. Click **Add endpoint**.

### 9.2 Copy Webhook Secret

After creating the endpoint, Stripe shows a **Signing secret** (`whsec_...`). Copy it immediately.

```bash
cd packages/api
wrangler secret put STRIPE_WEBHOOK_SECRET
# Paste: whsec_...
```

For staging, use the Stripe test mode webhook (separate endpoint at `staging.api.i18n.shipeasy.ai/webhooks/stripe`) with test-mode event simulation via the Stripe CLI:

```bash
stripe listen --forward-to https://staging.api.i18n.shipeasy.ai/webhooks/stripe
```

### 9.3 Verify Webhook Delivery

After deploying the API (section 7), trigger a test event from the Stripe dashboard:

1. Go to the webhook endpoint in Stripe.
2. Click **Send test webhook**.
3. Select `checkout.session.completed`.
4. Verify the event appears in the endpoint's event log with a `200` response.

---

## 10. CI/CD with GitHub Actions

All workflows live in `.github/workflows/`. Secrets required in GitHub repository settings (**Settings > Secrets and variables > Actions**):

```
CLOUDFLARE_API_TOKEN    — Wrangler deploy token (zone:edit, workers:edit, pages:edit, r2:edit)
CLOUDFLARE_ACCOUNT_ID   — From wrangler whoami
CLOUDFLARE_ZONE_ID      — i18n.shipeasy.ai zone ID
CLOUDFLARE_PURGE_TOKEN  — Scoped cache purge token (from section 4.3)
```

Create the Wrangler deploy token:

1. **Cloudflare > My Profile > API Tokens > Create Token**.
2. Use the **Edit Cloudflare Workers** template.
3. Add permissions: **Cloudflare Pages — Edit**, **D1 — Edit**, **R2 — Edit**.
4. Scope to **i18n.shipeasy.ai** zone and your account.

### 10.1 API Worker Deploy

`.github/workflows/deploy-api.yml`:

```yaml
name: Deploy API Worker

on:
  push:
    branches: [main]
    paths:
      - "packages/api/**"
      - "shared/**"
      - ".github/workflows/deploy-api.yml"
  pull_request:
    branches: [main]
    paths:
      - "packages/api/**"
      - "shared/**"

concurrency:
  group: deploy-api-${{ github.ref }}
  cancel-in-progress: true

jobs:
  test:
    name: Test API
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v3
        with:
          version: 9

      - uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: "pnpm"

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Type check
        run: pnpm --filter api exec tsc --noEmit

      - name: Run tests
        run: pnpm --filter api test

  deploy-staging:
    name: Deploy to Staging
    runs-on: ubuntu-latest
    needs: test
    if: github.event_name == 'pull_request'
    environment: staging
    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v3
        with:
          version: 9

      - uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: "pnpm"

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Deploy to staging
        working-directory: packages/api
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          CLOUDFLARE_ACCOUNT_ID: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
        run: pnpm exec wrangler deploy --env staging

  deploy-production:
    name: Deploy to Production
    runs-on: ubuntu-latest
    needs: test
    if: github.ref == 'refs/heads/main' && github.event_name == 'push'
    environment: production
    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v3
        with:
          version: 9

      - uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: "pnpm"

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Deploy to production
        working-directory: packages/api
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          CLOUDFLARE_ACCOUNT_ID: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
        run: pnpm exec wrangler deploy

      - name: Verify health check
        run: |
          sleep 5
          curl --fail https://api.i18n.shipeasy.ai/health
```

### 10.2 Pages Deploy (All Packages)

`.github/workflows/deploy-pages.yml`:

```yaml
name: Deploy Pages

on:
  push:
    branches: [main]
    paths:
      - "packages/dashboard/**"
      - "packages/landing/**"
      - "packages/docs/**"
      - "packages/admin/**"
      - ".github/workflows/deploy-pages.yml"
  pull_request:
    branches: [main]
    paths:
      - "packages/dashboard/**"
      - "packages/landing/**"
      - "packages/docs/**"
      - "packages/admin/**"

concurrency:
  group: deploy-pages-${{ github.ref }}
  cancel-in-progress: true

jobs:
  build-and-deploy-dashboard:
    name: Dashboard (app.i18n.shipeasy.ai)
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v3
        with:
          version: 9

      - uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: "pnpm"

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Type check
        run: pnpm --filter dashboard exec tsc --noEmit

      - name: Build
        working-directory: packages/dashboard
        env:
          NEXT_PUBLIC_API_URL: ${{ github.ref == 'refs/heads/main' && 'https://api.i18n.shipeasy.ai' || 'https://staging.api.i18n.shipeasy.ai' }}
          NEXT_PUBLIC_CDN_URL: https://cdn.i18n.shipeasy.ai
          NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: ${{ github.ref == 'refs/heads/main' && secrets.STRIPE_PUBLISHABLE_KEY_LIVE || secrets.STRIPE_PUBLISHABLE_KEY_TEST }}
        run: pnpm build

      - name: Deploy to Pages
        working-directory: packages/dashboard
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          CLOUDFLARE_ACCOUNT_ID: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
        run: |
          BRANCH=${{ github.ref == 'refs/heads/main' && 'main' || github.head_ref }}
          pnpm exec wrangler pages deploy .next/standalone \
            --project-name=i18n-dashboard \
            --branch="${BRANCH}"

  build-and-deploy-landing:
    name: Landing (i18n.shipeasy.ai)
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v3
        with:
          version: 9

      - uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: "pnpm"

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Build
        working-directory: packages/landing
        run: pnpm build

      - name: Deploy to Pages
        working-directory: packages/landing
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          CLOUDFLARE_ACCOUNT_ID: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
        run: |
          BRANCH=${{ github.ref == 'refs/heads/main' && 'main' || github.head_ref }}
          pnpm exec wrangler pages deploy out \
            --project-name=i18n-landing \
            --branch="${BRANCH}"

  build-and-deploy-docs:
    name: Docs (docs.i18n.shipeasy.ai)
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v3
        with:
          version: 9

      - uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: "pnpm"

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Build
        working-directory: packages/docs
        run: pnpm build

      - name: Deploy to Pages
        working-directory: packages/docs
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          CLOUDFLARE_ACCOUNT_ID: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
        run: |
          BRANCH=${{ github.ref == 'refs/heads/main' && 'main' || github.head_ref }}
          pnpm exec wrangler pages deploy dist \
            --project-name=i18n-docs \
            --branch="${BRANCH}"

  build-and-deploy-admin:
    name: Admin (admin.i18n.shipeasy.ai)
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v3
        with:
          version: 9

      - uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: "pnpm"

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Type check
        run: pnpm --filter admin exec tsc --noEmit

      - name: Build
        working-directory: packages/admin
        env:
          NEXT_PUBLIC_API_URL: ${{ github.ref == 'refs/heads/main' && 'https://api.i18n.shipeasy.ai' || 'https://staging.api.i18n.shipeasy.ai' }}
        run: pnpm build

      - name: Deploy to Pages
        working-directory: packages/admin
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          CLOUDFLARE_ACCOUNT_ID: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
        run: |
          BRANCH=${{ github.ref == 'refs/heads/main' && 'main' || github.head_ref }}
          pnpm exec wrangler pages deploy .next/standalone \
            --project-name=i18n-admin \
            --branch="${BRANCH}"
```

### 10.3 Loader Deploy

`.github/workflows/deploy-loader.yml`:

```yaml
name: Deploy Loader Scripts

on:
  push:
    branches: [main]
    paths:
      - "packages/loader/**"
      - ".github/workflows/deploy-loader.yml"
  pull_request:
    branches: [main]
    paths:
      - "packages/loader/**"

concurrency:
  group: deploy-loader-${{ github.ref }}
  cancel-in-progress: true

jobs:
  build-and-deploy:
    name: Build and Deploy Loader to CDN
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v3
        with:
          version: 9

      - uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: "pnpm"

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Build loader
        working-directory: packages/loader
        run: pnpm build

      - name: Verify build sizes
        working-directory: packages/loader
        run: |
          echo "loader.js:         $(wc -c < dist/loader.js) bytes"
          echo "editor-trigger.js: $(wc -c < dist/editor-trigger.js) bytes"
          echo "editor.js:         $(wc -c < dist/editor.js) bytes"

      - name: Compute content hash
        id: hash
        working-directory: packages/loader
        run: |
          HASH=$(sha256sum dist/loader.js | cut -c1-8)
          echo "hash=${HASH}" >> $GITHUB_OUTPUT
          echo "Content hash: ${HASH}"

      # Only upload to R2 on main branch pushes (not PRs)
      - name: Upload versioned files (immutable)
        if: github.ref == 'refs/heads/main' && github.event_name == 'push'
        working-directory: packages/loader
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          CLOUDFLARE_ACCOUNT_ID: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
        run: |
          HASH=${{ steps.hash.outputs.hash }}
          pnpm exec wrangler r2 object put "i18n-labels/loader.${HASH}.js" \
            --file=dist/loader.js \
            --content-type="application/javascript; charset=utf-8" \
            --cache-control="public, max-age=31536000, immutable"
          pnpm exec wrangler r2 object put "i18n-labels/editor-trigger.${HASH}.js" \
            --file=dist/editor-trigger.js \
            --content-type="application/javascript; charset=utf-8" \
            --cache-control="public, max-age=31536000, immutable"
          pnpm exec wrangler r2 object put "i18n-labels/editor.${HASH}.js" \
            --file=dist/editor.js \
            --content-type="application/javascript; charset=utf-8" \
            --cache-control="public, max-age=31536000, immutable"

      - name: Upload latest files (short TTL)
        if: github.ref == 'refs/heads/main' && github.event_name == 'push'
        working-directory: packages/loader
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          CLOUDFLARE_ACCOUNT_ID: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
        run: |
          pnpm exec wrangler r2 object put i18n-labels/loader.js \
            --file=dist/loader.js \
            --content-type="application/javascript; charset=utf-8" \
            --cache-control="public, max-age=300, stale-while-revalidate=3600"
          pnpm exec wrangler r2 object put i18n-labels/editor-trigger.js \
            --file=dist/editor-trigger.js \
            --content-type="application/javascript; charset=utf-8" \
            --cache-control="public, max-age=300, stale-while-revalidate=3600"
          pnpm exec wrangler r2 object put i18n-labels/editor.js \
            --file=dist/editor.js \
            --content-type="application/javascript; charset=utf-8" \
            --cache-control="public, max-age=300, stale-while-revalidate=3600"

      - name: Purge CDN cache
        if: github.ref == 'refs/heads/main' && github.event_name == 'push'
        env:
          CLOUDFLARE_ZONE_ID: ${{ secrets.CLOUDFLARE_ZONE_ID }}
          CLOUDFLARE_PURGE_TOKEN: ${{ secrets.CLOUDFLARE_PURGE_TOKEN }}
        run: |
          curl --fail -X POST \
            "https://api.cloudflare.com/client/v4/zones/${CLOUDFLARE_ZONE_ID}/purge_cache" \
            -H "Authorization: Bearer ${CLOUDFLARE_PURGE_TOKEN}" \
            -H "Content-Type: application/json" \
            --data '{
              "files": [
                "https://cdn.i18n.shipeasy.ai/loader.js",
                "https://cdn.i18n.shipeasy.ai/editor-trigger.js",
                "https://cdn.i18n.shipeasy.ai/editor.js"
              ]
            }'
          echo "CDN cache purged successfully"
```

---

## 11. Staging Environment

### 11.1 Architecture

Staging mirrors production exactly but uses separate Cloudflare resources to prevent data cross-contamination.

| Resource | Production              | Staging                         |
| -------- | ----------------------- | ------------------------------- |
| Worker   | i18n-api                | i18n-api-staging                |
| Route    | api.i18n.shipeasy.ai/\* | staging.api.i18n.shipeasy.ai/\* |
| D1       | i18n-db                 | i18n-db-staging                 |
| KV       | i18n-keys (id: xxx)     | i18n-keys-staging (id: yyy)     |
| R2       | i18n-labels             | i18n-labels-staging             |
| Queue    | i18n-usage              | i18n-usage-staging              |
| Stripe   | Live mode keys          | Test mode keys (sk*test*...)    |
| Pages    | main branch             | Preview deployments             |

### 11.2 Deploy to Staging

```bash
# API Worker
cd packages/api
wrangler deploy --env staging

# Pages — staging deploys happen automatically on PR via the CI workflow.
# Preview URL format: https://<branch-hash>.i18n-dashboard.pages.dev
```

### 11.3 Staging DNS Records

Add to `i18n.shipeasy.ai` DNS:

```
staging.api.i18n.shipeasy.ai   → Worker route (via wrangler.toml [env.staging.routes])
staging.app.i18n.shipeasy.ai   → Pages preview deployment alias (set in Pages custom domains)
```

For the admin staging subdomain, create a separate Access application scoped to `staging.admin.i18n.shipeasy.ai` following the same steps as section 3.

### 11.4 Cloudflare Pages Preview URLs

On every pull request, the CI workflow deploys all Pages packages with the PR branch name. Cloudflare Pages generates a unique preview URL per branch:

```
https://<branch-slug>.i18n-dashboard.pages.dev
https://<branch-slug>.i18n-landing.pages.dev
https://<branch-slug>.i18n-docs.pages.dev
https://<branch-slug>.i18n-admin.pages.dev
```

Preview URLs are posted automatically by Cloudflare as GitHub commit status checks. No additional configuration needed.

---

## 12. Monitoring and Observability

### 12.1 Cloudflare Workers Analytics

Built-in metrics available at **Workers & Pages > i18n-api > Metrics**:

- Request count (per minute/hour/day)
- Error rate (4xx / 5xx breakdown)
- CPU time (p50, p99)
- Invocation duration

Set up alerts in **Notifications**:

1. **Error rate spike:** Go to **Cloudflare Notifications > Add Notification > Workers > Error Rate**.
   - Threshold: 5xx rate > 1% for 5 minutes.
   - Delivery: Email + PagerDuty webhook (if configured).

2. **CPU time spike:** Set threshold at p99 > 50ms for 5 minutes.

### 12.2 Cloudflare Logpush (External Log Streaming)

For persistent log storage and search, stream Worker logs to Axiom (recommended for Cloudflare-native stacks) or Datadog.

**Set up Logpush to Axiom:**

1. Create an Axiom account at https://axiom.co. The free tier includes 500MB/day.
2. Create an API key in Axiom: **Settings > API Tokens > New API Token** with ingest permissions.
3. In Cloudflare: **Analytics > Logs > Logpush > Create a Logpush job**.
4. Select **Workers Trace Events** as the dataset.
5. Select **Axiom** as the destination.
6. Provide the Axiom API key and dataset name (e.g., `i18n-api`).
7. Select fields to include: `EventTimestampMs`, `Outcome`, `Exceptions`, `Logs`, `Request.*`, `Response.*`.

After setup, all Worker invocations stream to Axiom with 1-2 second latency.

**Axiom dashboard queries to create:**

```
# Error rate over time
dataset: i18n-api | filter Outcome == "exception" | timechart count()

# Slow requests (>100ms)
dataset: i18n-api | filter WallTimeMs > 100 | timechart count()

# Errors by endpoint
dataset: i18n-api | filter Response.Status >= 500 | summarize count() by Request.URL
```

### 12.3 D1 Metrics

Available at **Storage & Databases > D1 > i18n-db > Metrics**:

- Query count
- Query latency (p50, p99)
- Rows read/written

Set alert: query latency p99 > 100ms for 5 minutes.

### 12.4 Queue Consumer Metrics

Available at **Workers & Pages > i18n-api > Queues > i18n-usage**:

- Messages delivered / failed
- Consumer lag (backlog size)
- Dead letter queue size

Set alert: dead letter queue depth > 0 (any failed usage message is worth investigating).

### 12.5 Uptime Monitoring

Use Cloudflare Health Checks or Better Uptime to monitor all public endpoints:

**Cloudflare Health Checks** (requires Business plan on zone):

Go to **Traffic > Health Checks > Create**:

| URL                                    | Alert threshold        |
| -------------------------------------- | ---------------------- |
| https://api.i18n.shipeasy.ai/health    | 2 consecutive failures |
| https://app.i18n.shipeasy.ai           | 2 consecutive failures |
| https://i18n.shipeasy.ai               | 2 consecutive failures |
| https://docs.i18n.shipeasy.ai          | 2 consecutive failures |
| https://cdn.i18n.shipeasy.ai/loader.js | 2 consecutive failures |

**Better Uptime (free tier alternative):**

1. Create account at https://betteruptime.com.
2. Add monitors for all 5 URLs above.
3. Set check interval to 1 minute.
4. Configure alert recipients (email + Slack webhook).

### 12.6 R2 and CDN Metrics

R2 metrics available at **R2 > i18n-labels > Metrics**:

- Object count
- Storage used
- Class A/B operations (billing)

CDN cache hit rate visible in **Analytics > Cache**. A healthy label file cache hit rate should be >95% in steady state.

---

## 13. Rollback Strategy

### 13.1 API Worker Rollback

Cloudflare keeps the previous 10 Worker deployments. Instant rollback:

```bash
cd packages/api
wrangler rollback
# Prompts: "Rolling back to deployment <id> from <timestamp>? [y/n]"
# Takes effect immediately — all requests route to the previous version within seconds.
```

To rollback to a specific version:

```bash
wrangler deployments list
wrangler rollback <deployment-id>
```

### 13.2 Pages Rollback

In the Cloudflare dashboard: **Workers & Pages > [project] > Deployments**.

All previous deployments are listed with timestamps. Click any previous deployment and select **Rollback to this deployment**. The custom domain routes to the selected deployment within 30 seconds.

There is no `wrangler` CLI equivalent — Pages rollback must be done via the dashboard.

### 13.3 Loader Script Rollback

Because both the current and previous versions are always in R2, rollback is a re-upload of the previous version to the `loader.js` key:

```bash
# Get previous hash from git (or release notes)
PREV_HASH=a1b2c3d4

# Re-upload previous version as latest
wrangler r2 object put i18n-labels/loader.js \
  --file=<(wrangler r2 object get "i18n-labels/loader.${PREV_HASH}.js" | cat) \
  --content-type="application/javascript; charset=utf-8" \
  --cache-control="public, max-age=300, stale-while-revalidate=3600"

# Purge CDN cache
curl -X POST "https://api.cloudflare.com/client/v4/zones/${CLOUDFLARE_ZONE_ID}/purge_cache" \
  -H "Authorization: Bearer ${CLOUDFLARE_PURGE_TOKEN}" \
  -H "Content-Type: application/json" \
  --data '{"files": ["https://cdn.i18n.shipeasy.ai/loader.js", "https://cdn.i18n.shipeasy.ai/editor-trigger.js", "https://cdn.i18n.shipeasy.ai/editor.js"]}'
```

Customers who pinned to versioned URLs (`loader.${HASH}.js`) are unaffected by rollbacks of the latest pointer.

### 13.4 Database Rollback

D1 does not support automatic rollback or point-in-time restore on the free/paid tiers. Rollback requires a manual reversal migration.

**Procedure:**

1. Write `00N_rollback_<feature>.sql` that reverses the forward migration (drop added columns with `ALTER TABLE ... DROP COLUMN`, drop added tables, etc.).
2. Apply: `wrangler d1 execute i18n-db --file=shared/schema/00N_rollback_<feature>.sql`
3. Roll back the Worker to the version that worked with the previous schema (section 13.1).
4. Commit the rollback migration file to version control.

**Prevention:** Always apply migrations to staging and run integration tests before applying to production. The CI pipeline should apply staging migrations and run tests on every PR.

---

## 14. CLI and MCP Publishing

### 14.1 npm Package Setup

Both packages must be published to the public npm registry under the `i18n-cli` and `i18n-mcp` package names.

Ensure `packages/cli/package.json` includes:

```json
{
  "name": "i18n-cli",
  "version": "1.0.0",
  "description": "CLI for Label Rewrite Service — manage, push, and publish label keys",
  "bin": {
    "i18n": "./dist/cli.js"
  },
  "files": ["dist/", "README.md"],
  "publishConfig": {
    "access": "public"
  },
  "engines": {
    "node": ">=18"
  }
}
```

Ensure `packages/mcp/package.json` includes:

```json
{
  "name": "i18n-mcp",
  "version": "1.0.0",
  "description": "MCP server for Label Rewrite Service — AI-native label management",
  "bin": {
    "i18n-mcp": "./dist/server.js"
  },
  "files": ["dist/", "README.md"],
  "publishConfig": {
    "access": "public"
  },
  "engines": {
    "node": ">=18"
  }
}
```

### 14.2 First Publish (Manual)

```bash
# CLI
cd packages/cli
pnpm build
npm publish --access public

# MCP
cd packages/mcp
pnpm build
npm publish --access public
```

Verify:

```bash
npx i18n-cli --version
npx i18n-mcp --version
```

### 14.3 Versioning Strategy

Semantic versioning:

- **Patch** (`1.0.x`) — bug fixes, no breaking changes, no new features
- **Minor** (`1.x.0`) — new non-breaking features (new CLI commands, new MCP tools)
- **Major** (`x.0.0`) — breaking changes (command renames, removed options, new required config)

Use [Changesets](https://github.com/changesets/changesets) for automated versioning:

```bash
pnpm add -D @changesets/cli -w
pnpm changeset init
```

On each PR that changes CLI or MCP behavior, add a changeset:

```bash
pnpm changeset
# Prompts for: affected packages, bump type (patch/minor/major), summary
```

Changesets accumulate on main until a release is cut.

### 14.4 GitHub Actions — Auto-publish on Tag

`.github/workflows/publish-npm.yml`:

```yaml
name: Publish npm Packages

on:
  push:
    tags:
      - "cli-v*" # e.g., cli-v1.2.3
      - "mcp-v*" # e.g., mcp-v1.2.3

jobs:
  publish-cli:
    name: Publish i18n-cli
    runs-on: ubuntu-latest
    if: startsWith(github.ref_name, 'cli-v')
    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v3
        with:
          version: 9

      - uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: "pnpm"
          registry-url: "https://registry.npmjs.org"

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Build
        working-directory: packages/cli
        run: pnpm build

      - name: Set version from tag
        working-directory: packages/cli
        run: |
          VERSION=${GITHUB_REF_NAME#cli-v}
          npm version "${VERSION}" --no-git-tag-version

      - name: Publish
        working-directory: packages/cli
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
        run: npm publish --access public

  publish-mcp:
    name: Publish i18n-mcp
    runs-on: ubuntu-latest
    if: startsWith(github.ref_name, 'mcp-v')
    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v3
        with:
          version: 9

      - uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: "pnpm"
          registry-url: "https://registry.npmjs.org"

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Build
        working-directory: packages/mcp
        run: pnpm build

      - name: Set version from tag
        working-directory: packages/mcp
        run: |
          VERSION=${GITHUB_REF_NAME#mcp-v}
          npm version "${VERSION}" --no-git-tag-version

      - name: Publish
        working-directory: packages/mcp
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
        run: npm publish --access public
```

**Tag format:**

```bash
# Release CLI 1.2.3
git tag cli-v1.2.3
git push origin cli-v1.2.3

# Release MCP 1.0.1
git tag mcp-v1.0.1
git push origin mcp-v1.0.1
```

**Required GitHub secret:** `NPM_TOKEN` — generate at https://www.npmjs.com/settings/<username>/tokens with **Automation** type (bypasses 2FA for CI).

### 14.5 Release Checklist

Before tagging a CLI or MCP release:

1. Run `pnpm --filter cli test` and `pnpm --filter mcp test` — both must pass.
2. Run `pnpm --filter cli exec tsc --noEmit` — no type errors.
3. Verify `pnpm --filter cli build` produces a valid `dist/cli.js` that runs.
4. Test the publish output locally: `npm pack` and inspect the tarball contents.
5. Update the CHANGELOG entry (generated by Changesets, or manual).
6. Tag and push.

---

## Appendix A: First-Deploy Checklist

Run this checklist in order on first deployment to a new environment.

- [ ] Cloudflare account created and payment method added
- [ ] `wrangler login` authenticated
- [ ] D1 database created: `i18n-db` (and `i18n-db-staging`)
- [ ] KV namespace created: `KV_KEYS` (and `KV_KEYS_STAGING`)
- [ ] R2 bucket created: `i18n-labels` (and `i18n-labels-staging`)
- [ ] R2 public access enabled on `i18n-labels`
- [ ] Queue created: `i18n-usage` (and `i18n-usage-staging`)
- [ ] Domain added to Cloudflare and nameservers propagated
- [ ] All DNS records configured (api, app, i18n.shipeasy.ai apex, docs, admin, cdn)
- [ ] Cloudflare Zero Trust enabled and Access application created for admin.i18n.shipeasy.ai
- [ ] JWT_SECRET generated and set via `wrangler secret put`
- [ ] All secrets set via `wrangler secret put` (see section 4.4 full list)
- [ ] All D1 migrations applied in order (001 through 006)
- [ ] `wrangler.toml` updated with correct database_id and KV namespace ids
- [ ] API Worker deployed: `wrangler deploy`
- [ ] Health check passing: `curl https://api.i18n.shipeasy.ai/health`
- [ ] Loader scripts built and uploaded to R2
- [ ] CDN cache purged after loader upload
- [ ] All Pages projects created via `wrangler pages project create`
- [ ] All Pages packages built and deployed
- [ ] Custom domains assigned to each Pages project
- [ ] Stripe webhook endpoint registered at `https://api.i18n.shipeasy.ai/webhooks/stripe`
- [ ] `STRIPE_WEBHOOK_SECRET` set via `wrangler secret put` after webhook registration
- [ ] Stripe test event sent and confirmed 200 response
- [ ] GitHub Actions secrets configured: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_ZONE_ID`, `CLOUDFLARE_PURGE_TOKEN`, `NPM_TOKEN`, Stripe publishable keys
- [ ] CI pipeline runs clean on a test PR
- [ ] Logpush configured to Axiom (or equivalent)
- [ ] Uptime monitors created for all 5 public URLs
- [ ] Cloudflare error-rate alert configured
- [ ] npm packages published: `i18n-cli`, `i18n-mcp`
- [ ] `npx i18n-cli --version` returns correct version
- [ ] `npx i18n-mcp --version` returns correct version

---

## Appendix B: Environment Variable Reference

### API Worker (set via `wrangler secret put`)

| Secret                   | Description                 | How to get                                          |
| ------------------------ | --------------------------- | --------------------------------------------------- |
| `JWT_SECRET`             | Signs editor session JWTs   | `crypto.randomBytes(32).toString('hex')`            |
| `GOOGLE_CLIENT_ID`       | Google OAuth                | GCP Console > APIs > Credentials                    |
| `GOOGLE_CLIENT_SECRET`   | Google OAuth                | Same as above                                       |
| `GITHUB_CLIENT_ID`       | GitHub OAuth                | GitHub > Settings > Developer settings > OAuth Apps |
| `GITHUB_CLIENT_SECRET`   | GitHub OAuth                | Same as above                                       |
| `RESEND_API_KEY`         | Email OTP delivery          | resend.com/api-keys                                 |
| `STRIPE_SECRET_KEY`      | Stripe billing              | Stripe Dashboard > Developers > API keys            |
| `STRIPE_WEBHOOK_SECRET`  | Stripe webhook verification | Stripe Dashboard after webhook registration         |
| `STRIPE_PRICE_PRO`       | Pro plan price ID           | Stripe Dashboard > Products                         |
| `STRIPE_PRICE_BUSINESS`  | Business plan price ID      | Stripe Dashboard > Products                         |
| `CLOUDFLARE_ZONE_ID`     | For cache purge API         | Cloudflare Dashboard > i18n.shipeasy.ai > Overview  |
| `CLOUDFLARE_PURGE_TOKEN` | Scoped cache purge token    | Cloudflare > My Profile > API Tokens                |
| `ADMIN_TOKEN`            | Internal admin panel auth   | `crypto.randomBytes(32).toString('hex')`            |

### API Worker (set via `wrangler.toml` [vars], non-secret)

| Var           | Value                          |
| ------------- | ------------------------------ |
| `ENVIRONMENT` | `production` or `staging`      |
| `APP_URL`     | `https://app.i18n.shipeasy.ai` |
| `CDN_URL`     | `https://cdn.i18n.shipeasy.ai` |

### Dashboard Pages (set in Pages environment variables UI)

| Var                                  | Value                          |
| ------------------------------------ | ------------------------------ |
| `NEXT_PUBLIC_API_URL`                | `https://api.i18n.shipeasy.ai` |
| `NEXT_PUBLIC_CDN_URL`                | `https://cdn.i18n.shipeasy.ai` |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | `pk_live_...` from Stripe      |

### Admin Pages (set in Pages environment variables UI)

| Var                   | Value                          |
| --------------------- | ------------------------------ |
| `NEXT_PUBLIC_API_URL` | `https://api.i18n.shipeasy.ai` |
| `ADMIN_TOKEN`         | Same value as Worker secret    |

### GitHub Actions Secrets

| Secret                        | Description                                       |
| ----------------------------- | ------------------------------------------------- |
| `CLOUDFLARE_API_TOKEN`        | Wrangler deploy token (Workers + Pages + R2 edit) |
| `CLOUDFLARE_ACCOUNT_ID`       | From `wrangler whoami`                            |
| `CLOUDFLARE_ZONE_ID`          | i18n.shipeasy.ai zone ID                          |
| `CLOUDFLARE_PURGE_TOKEN`      | Scoped cache purge token                          |
| `STRIPE_PUBLISHABLE_KEY_LIVE` | `pk_live_...` for production Pages builds         |
| `STRIPE_PUBLISHABLE_KEY_TEST` | `pk_test_...` for staging/PR Pages builds         |
| `NPM_TOKEN`                   | npm Automation token for publishing               |
