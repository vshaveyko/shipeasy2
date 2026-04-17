# Monorepo Package Structure & Dependencies

pnpm workspaces + Turborepo. All packages in TypeScript.

```
flaglab/
  apps/
    ui/           — Next.js admin dashboard + admin API (Cloudflare Pages)
  packages/
    core/         — @flaglab/core (shared: DB schema, KV rebuild, eval, plans, limits, Zod schemas)
    worker/       — Cloudflare Worker (SDK hot path + background jobs + CLI device auth)
    sdk/          — unified SDK for server + client (conditional exports)
    cli/          — @flaglab/cli (distributed to customers)
    mcp-server/   — @flaglab/mcp-server (AI assistant integration)
  package.json    — workspace root
  pnpm-workspace.yaml
  turbo.json
```

---

## Auth.js (NextAuth v5) Integration

Auth.js handles the web app session. The CLI device flow piggybacks on it:

```typescript
// apps/ui/app/cli-auth/page.tsx — server component
import { auth }     from '@/auth'          // Auth.js v5
import { redirect } from 'next/navigation'

export default async function CliAuthPage({ searchParams }) {
  const session = await auth()
  const state         = searchParams.state
  const codeChallenge = searchParams.code_challenge

  if (!session) {
    // Preserve CLI params through the OAuth redirect
    const callbackUrl = `/cli-auth?state=${state}&code_challenge=${encodeURIComponent(codeChallenge)}`
    redirect(`/api/auth/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`)
  }

  // User is authenticated — complete the CLI auth session
  return <CliAuthComplete session={session} state={state} codeChallenge={codeChallenge} />
}
```

```typescript
// apps/ui/app/cli-auth/complete/route.ts — API route called by CliAuthComplete component
import { auth } from "@/auth";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.project_id)
    return Response.json({ error: "Not authenticated" }, { status: 401 });

  const { state, code_verifier } = await req.json();

  const res = await fetch(`${process.env.WORKER_URL}/auth/device/complete`, {
    method: "POST",
    headers: { "X-Service-Key": process.env.CLI_SERVICE_SECRET! },
    body: JSON.stringify({
      state,
      project_id: session.user.project_id,
      code_verifier,
    }),
  });

  return Response.json(await res.json(), { status: res.status });
}
```

```typescript
// apps/ui/lib/auth.ts — Auth.js config
import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";
import Google from "next-auth/providers/google";
import Resend from "next-auth/providers/resend"; // email magic link
import { getDb } from "@flaglab/core";
import { projects, sdkKeys } from "@flaglab/core/db/schema";
import { sha256, rebuildFlags, rebuildExperiments } from "@flaglab/core";
import { eq } from "drizzle-orm";
import { getCloudflareContext } from "@cloudflare/next-on-pages";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    GitHub,
    Google,
    Resend({ from: "noreply@yourdomain.com" }), // magic link fallback
  ],
  session: {
    strategy: "jwt", // JWT — no database session, works on CF Pages edge
    maxAge: 15 * 60, // 15 minutes — stateless, short-lived
  },
  callbacks: {
    async jwt({ token, user }) {
      // First sign-in: provision project directly in D1 (no Worker call)
      if (user?.email && !token.project_id) {
        const env = getCloudflareContext().env;
        const db = getDb(env.DB);

        const existing = await db
          .select({ id: projects.id })
          .from(projects)
          .where(eq(projects.ownerEmail, user.email))
          .get();

        if (existing) {
          token.project_id = existing.id;
        } else {
          const projectId = crypto.randomUUID();
          const now = new Date().toISOString();
          const serverKey = `sdk_server_${crypto.randomUUID().replace(/-/g, "")}`;
          const clientKey = `sdk_client_${crypto.randomUUID().replace(/-/g, "")}`;
          const [serverHash, clientHash] = await Promise.all([
            sha256(serverKey),
            sha256(clientKey),
          ]);

          await db.batch([
            db.insert(projects).values({
              id: projectId,
              name: user.name ?? user.email!.split("@")[0],
              ownerEmail: user.email!,
              plan: "free",
              status: "active",
              createdAt: now,
              updatedAt: now,
            }),
            db.insert(sdkKeys).values({
              id: crypto.randomUUID(),
              projectId,
              keyHash: serverHash,
              type: "server",
              createdAt: now,
            }),
            db.insert(sdkKeys).values({
              id: crypto.randomUUID(),
              projectId,
              keyHash: clientHash,
              type: "client",
              createdAt: now,
            }),
          ]);

          await rebuildFlags(env, projectId, "free");
          await rebuildExperiments(env, projectId);

          // Provision per-project rate limiting rules via CF API.
          // Without this, the project has no daily event limit until manually configured.
          await provisionRateLimitRule(env, projectId, "free");

          token.project_id = projectId;
        }
      }
      return token;
    },
    async session({ session, token }) {
      session.user.project_id = token.project_id as string;
      return session;
    },
  },
});
```

```typescript
// apps/ui/lib/rate-limit.ts — provision per-project rate limiting rule via CF API
// Called once during project provisioning and on plan changes.
// Creates a CF Rate Limiting rule keyed on project_id for /collect daily budget.
export async function provisionRateLimitRule(
  env: Env,
  projectId: string,
  planName: string,
): Promise<void> {
  const plan = getPlan(planName);
  if (plan.max_events_per_day === -1) return; // enterprise unlimited — no rule needed

  const reqPerMin = Math.ceil(plan.max_events_per_day / 1440); // daily budget ÷ minutes/day
  try {
    await fetch(`https://api.cloudflare.com/client/v4/zones/${env.CF_ZONE_ID}/rate_limits`, {
      method: "POST",
      headers: { Authorization: `Bearer ${env.CF_API_TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        match: { request: { url: `*${env.FLAGS_DOMAIN}/collect*`, methods: ["POST"] } },
        threshold: reqPerMin,
        period: 60,
        action: { mode: "simulate", timeout: 60 }, // start in simulate mode; switch to 'ban' after verification
        description: `[FlagLab] Daily event limit for project ${projectId}`,
      }),
    });
  } catch (err) {
    // Non-fatal: global per-IP and per-key limits still apply.
    // Log for operator follow-up.
    console.error(
      JSON.stringify({ event: "rate_limit_provision_failed", projectId, error: String(err) }),
    );
  }
}
```

Auth.js on Cloudflare Pages requires the Edge Runtime. Use `@auth/core` directly
or the upcoming `@auth/cloudflare-pages` adapter. JWT sessions avoid the D1 adapter
complexity and work natively on the edge. No `PROVISION_SERVICE_SECRET` needed —
provisioning is an inline D1 write, not a service-to-service call.

---

---

## package.json files

### Root — `package.json`

```json
{
  "name": "flaglab",
  "private": true,
  "version": "0.0.1",
  "engines": { "node": ">=20", "pnpm": ">=9" },
  "packageManager": "pnpm@9.0.0",
  "scripts": {
    "build": "turbo build",
    "dev": "turbo dev",
    "lint": "turbo lint",
    "test": "turbo test",
    "type-check": "turbo type-check"
  },
  "devDependencies": {
    "turbo": "^2.0.0",
    "typescript": "^5.5.0",
    "@types/node": "^20.0.0",
    "prettier": "^3.0.0",
    "eslint": "^9.0.0"
  }
}
```

### `pnpm-workspace.yaml`

```yaml
packages:
  - "apps/*"
  - "packages/*"
```

### `turbo.json`

```json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": { "dependsOn": ["^build"], "outputs": ["dist/**", ".next/**"] },
    "dev": { "persistent": true, "cache": false },
    "lint": {},
    "type-check": { "dependsOn": ["^build"] },
    "test": { "dependsOn": ["^build"] }
  }
}
```

---

### `apps/ui/package.json` — Next.js Admin UI

```json
{
  "name": "@flaglab/ui",
  "version": "0.0.1",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "type-check": "tsc --noEmit"
  },
  "dependencies": {
    "@flaglab/core": "workspace:*",

    "next": "15.x",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",

    "next-auth": "^5.0.0",
    "@auth/core": "^0.35.0",

    "@mui/material": "^7.0.0",
    "@mui/icons-material": "^7.0.0",
    "@emotion/react": "^11.0.0",
    "@emotion/styled": "^11.0.0",

    "apexcharts": "^3.0.0",
    "react-apexcharts": "^1.0.0",

    "swr": "^2.0.0",
    "zod": "^3.0.0",

    "@conform-to/react": "^1.0.0",
    "@conform-to/zod": "^1.0.0",

    "date-fns": "^4.0.0"
  },
  "devDependencies": {
    "@cloudflare/next-on-pages": "^1.0.0",
    "wrangler": "^3.0.0",
    "typescript": "^5.5.0",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "eslint": "^9.0.0",
    "eslint-config-next": "15.x"
  }
}
```

**Key library choices:**

- `next-auth@5` (Auth.js v5) — OAuth + JWT sessions, Edge Runtime compatible
- `@conform-to/react` + `@conform-to/zod` — progressive-enhancement forms with Zod validation, works with Next.js Server Actions
- `swr` — data fetching; simpler than React Query for this use case (mostly admin reads)
- `date-fns@4` — tree-shakeable date utilities, replaces moment
- `@cloudflare/next-on-pages` — Next.js adapter for Cloudflare Pages (alternatively `@opennextjs/cloudflare` for full OpenNext support)

---

### `packages/core/package.json` — Shared Core

```json
{
  "name": "@flaglab/core",
  "version": "1.0.0",
  "private": true,
  "exports": {
    ".": "./src/index.ts",
    "./db/schema": "./src/db/schema.ts",
    "./db/scoped": "./src/db/scoped.ts",
    "./schemas/*": "./src/schemas/*.ts",
    "./config/plans": "./src/config/plans.ts"
  },
  "scripts": {
    "type-check": "tsc --noEmit"
  },
  "dependencies": {
    "drizzle-orm": "^0.30.0",
    "zod": "^3.0.0"
  },
  "devDependencies": {
    "typescript": "^5.5.0"
  }
}
```

**What lives here:**

- Drizzle schema (`db/schema.ts`) — single source of truth for all D1 tables
- `scopedDb()` — project-scoped query builder, used by Next.js and Worker
- KV helpers (`kv/rebuild.ts`, `kv/cache.ts`, `kv/purge.ts`) — rebuildFlags, rebuildExperiments, purgeCache
- Eval logic (`eval/gate.ts`, `eval/experiment.ts`) — shared with Worker SDK endpoints
- Plans config (`config/plans.ts` + `config/plans.yaml`) — compiled at build time
- `checkLimit()` — plan enforcement before every INSERT
- SDK key validation (`auth/sdk-key.ts`) — KV lookup + module cache
- Zod input schemas (`schemas/*.ts`) — validation for all admin operations

---

### `packages/worker/package.json` — Cloudflare Worker

```json
{
  "name": "@flaglab/worker",
  "version": "0.0.1",
  "private": true,
  "scripts": {
    "dev": "wrangler dev",
    "deploy": "wrangler deploy",
    "type-check": "tsc --noEmit",
    "test": "vitest"
  },
  "dependencies": {
    "@flaglab/core": "workspace:*",
    "hono": "^4.0.0",
    "murmurhash-js": "^1.0.0"
  },
  "devDependencies": {
    "wrangler": "^3.0.0",
    "@cloudflare/workers-types": "^4.0.0",
    "typescript": "^5.5.0",
    "vitest": "^2.0.0",
    "@cloudflare/vitest-pool-workers": "^0.5.0",
    "drizzle-kit": "^0.20.0"
  }
}
```

**Key library choices:**

- `hono` — ultralight (~14KB) router built for Cloudflare Workers. TypeScript-first, Zod middleware, RPC mode for type-safe client. Replaces the manual router in index.ts.
- `drizzle-orm` — type-safe ORM with native D1 support. No binary dependencies, tiny bundle, edge-compatible. Replaces all raw `env.DB.prepare().bind().run()` calls with typed query builder. Schema defined in TypeScript; `drizzle-kit` generates SQL migrations from it.
- `drizzle-kit` (dev) — generates migration files from schema changes. Run `drizzle-kit generate` then `wrangler d1 migrations apply`.
- `murmurhash-js` — MurmurHash3 implementation matching the SDK. Cross-language bucketing consistency requires the same hash function.
- `@cloudflare/vitest-pool-workers` — runs Vitest tests inside actual Workers runtime (D1, KV, AE available in tests). Essential for testing the analysis cron.

**What Hono adds:**

```typescript
// Instead of the manual switch(pathname) router:
import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";

const app = new Hono<{ Bindings: Env }>();

app.post(
  "/admin/gates",
  zValidator(
    "json",
    z.object({
      name: z.string().regex(/^[a-z0-9][a-z0-9_-]{0,63}$/),
      rollout_pct: z.number().int().min(0).max(10000), // basis points: 5000 = 50%
      rules: z.array(ruleSchema).default([]),
      killswitch: z.boolean().default(false),
    }),
  ),
  authMiddleware("admin"),
  createGate,
);

export default app;
```

Hono handles routing, middleware chaining, Zod validation, and JSON serialization.
The `zValidator` middleware auto-returns 422 with structured errors on invalid input.

---

### `packages/sdk/package.json` — Unified SDK

```json
{
  "name": "@flaglab/sdk",
  "version": "1.0.0",
  "description": "Feature flag and experimentation SDK",
  "main": "./dist/server/index.js",
  "module": "./dist/server/index.mjs",
  "browser": "./dist/client/index.js",
  "exports": {
    ".": {
      "node": "./dist/server/index.js",
      "browser": "./dist/client/index.js",
      "default": "./dist/server/index.js"
    },
    "./server": "./dist/server/index.js",
    "./client": "./dist/client/index.js",
    "./templates/*": "./templates/*.js"
  },
  "files": ["dist/", "templates/"],
  "scripts": {
    "build": "tsup",
    "type-check": "tsc --noEmit",
    "test": "vitest"
  },
  "dependencies": {
    "murmurhash-js": "^1.0.0"
  },
  "devDependencies": {
    "tsup": "^8.0.0",
    "typescript": "^5.5.0",
    "vitest": "^2.0.0"
  },
  "peerDependencies": {
    "zod": "^3.0.0"
  },
  "peerDependenciesMeta": {
    "zod": { "optional": true }
  }
}
```

**Key decisions:**

- `tsup` — bundles both ESM and CJS from one source in one command. Also bundles the `browser` conditional export (client SDK) separately.
- Conditional exports: `./server` for Node/Go/Python server SDKs, `./client` for browser, `./templates/*` for MCP server to import language templates at the installed SDK version.
- Zod as optional peer dep — used for `getConfig()` decoder pattern; not required if customer uses their own validator.

---

### `packages/cli/package.json`

**Note:** The CLI binary name (`flaglab`) is a working name — final name TBD before public launch. All docs use `flaglab` consistently.

```json
{
  "name": "@flaglab/cli",
  "version": "1.0.0",
  "description": "CLI for the FlagLab experiment platform",
  "bin": { "flaglab": "./bin/flaglab.js" },
  "files": ["dist/", "bin/"],
  "scripts": {
    "build": "tsup src/index.ts --format cjs --dts",
    "dev": "ts-node src/index.ts",
    "type-check": "tsc --noEmit"
  },
  "dependencies": {
    "commander": "^12.0.0",
    "cli-table3": "^0.6.0",
    "ora": "^8.0.0",
    "chalk": "^5.0.0",
    "open": "^10.0.0",
    "conf": "^13.0.0",
    "zod": "^3.0.0"
  },
  "devDependencies": {
    "tsup": "^8.0.0",
    "typescript": "^5.5.0",
    "@types/node": "^20.0.0",
    "ts-node": "^10.0.0"
  },
  "engines": { "node": ">=18" }
}
```

**`conf` vs manual credentials file:** `conf` handles cross-platform config storage with proper file permissions, atomic writes, and type safety. See `09-cli.md` § Key Implementations for the credentials storage pattern (`saveCredentials`, `loadCredentials`, `clearCredentials`).

---

### `packages/mcp-server/package.json`

```json
{
  "name": "@flaglab/mcp-server",
  "version": "1.0.0",
  "description": "MCP server for AI-assisted experiment setup",
  "bin": { "flaglab-mcp": "./bin/mcp.js" },
  "files": ["dist/", "bin/"],
  "type": "module",
  "scripts": {
    "build": "tsup src/index.ts --format esm",
    "type-check": "tsc --noEmit"
  },
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.0.0",
    "@flaglab/sdk": "workspace:*",
    "zod": "^3.0.0",
    "semver": "^7.0.0"
  },
  "devDependencies": {
    "tsup": "^8.0.0",
    "typescript": "^5.5.0",
    "@types/node": "^20.0.0",
    "@types/semver": "^7.0.0"
  },
  "engines": { "node": ">=20" }
}
```

**`semver`** — checks compatibility between installed SDK version and MCP template version. The MCP server uses `@flaglab/sdk` as a workspace dependency to import code-gen templates directly from the SDK package.

---

## SDK v2.0 — Breaking changes

`@flaglab/sdk` bumps to `v2.0.0` due to two breaking API changes:

1. **`getConfig(name, decode)`** — decoder argument is now required
2. **`getExperiment(name, defaultParams, decode)`** — decoder argument is now required

Both changes prevent the "type lie" where TypeScript types didn't match runtime server
response shapes, causing silent `undefined` access bugs.

**Migration codemod (jscodeshift):**

```bash
npx jscodeshift -t @flaglab/codemod/v2 src/
```

Transforms `getConfig<T>(name)` → `getConfig(name, v => v as T)` as a safe intermediate
(still unsafe at runtime but builds pass; teams can add proper decoders incrementally).

**Deprecation period in v1.x:**
Both old signatures emit `console.warn('deprecated, will be removed in v2')` so teams
get advance notice without a breaking build.

## Library Decision Summary

| Need               | Library                            | Why not X                                                                                                                                                                                              |
| ------------------ | ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Web app auth       | `next-auth@5`                      | Building from scratch wastes weeks; Auth.js covers OAuth, sessions, CSRF, token rotation                                                                                                               |
| Worker routing     | `hono`                             | itty-router lacks Zod middleware and TS inference; express doesn't run on Workers                                                                                                                      |
| D1 ORM (shared)    | `drizzle-orm` (in `@flaglab/core`) | Prisma requires a query engine binary incompatible with Workers; Kysely is query-builder only (no schema/migrations); Drizzle is native D1, typed, edge-compatible. Shared between Next.js and Worker. |
| Form validation    | `@conform-to/zod`                  | react-hook-form doesn't work with Server Actions; conform does                                                                                                                                         |
| CLI arg parsing    | `commander`                        | yargs is heavier; oclif is overkill for this scope                                                                                                                                                     |
| CLI config storage | `conf`                             | Manual JSON file misses platform-specific paths, atomic writes, permissions                                                                                                                            |
| Data fetching (UI) | `swr`                              | React Query is more powerful but overkill for an admin dashboard                                                                                                                                       |
| Monorepo build     | `turbo`                            | nx is heavier; turbo's caching is good enough and simpler to configure                                                                                                                                 |
| SDK bundler        | `tsup`                             | rollup is manual; tsup wraps esbuild with sensible defaults for library output                                                                                                                         |
| Worker testing     | `@cloudflare/vitest-pool-workers`  | Regular Vitest can't test D1/KV/AE bindings; this one runs inside the actual runtime                                                                                                                   |
| Hashing            | `murmurhash-js`                    | Need identical murmur3 across JS/TS; other impls have different seeds                                                                                                                                  |
| MCP protocol       | `@modelcontextprotocol/sdk`        | It's the official SDK, no alternative                                                                                                                                                                  |

---

## What Auth.js Does NOT Handle

1. **CLI device auth** — custom `/cli-auth` page + `/auth/device/complete` Worker endpoint. Auth.js provides the web session; the relay completes the PKCE flow.
2. **SDK key management** — SDK keys (`sdk_keys` table) are managed by Next.js Server Actions. Auth.js sessions are for admin UI users; SDK keys are for customer applications.
3. **CLI admin auth** — CLI sends `X-SDK-Key` header; `authenticateAdmin()` in Next.js Route Handlers validates it via KV lookup. Auth.js is not involved.
4. **Billing / plan changes** — plan upgrades/downgrades happen through the admin dashboard billing flow. Auth.js just checks "is this user authenticated?" — the Next.js Server Actions check project ownership.
