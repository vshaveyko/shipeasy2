# Shipeasy — Agent Installation Guide

This file is a procedural runbook intended to be followed by an AI coding agent
(Claude Code, Cursor, Windsurf, Continue, Copilot CLI, …) to install Shipeasy
into a target application. Each step is **verifiable** — run the verification
command and only proceed if it passes. Most steps include a **self-heal**
fallback the agent can apply without asking the user.

The "target app" below means whatever project the agent is working in
(`process.cwd()`), **not** this monorepo.

---

## 0. Preconditions

Run before doing anything else:

```bash
node --version          # >= 20
corepack --version      # any
git rev-parse --show-toplevel    # must be inside a repo
```

Self-heal:

- Node `<20` → tell the user; do not auto-upgrade.
- Not in a repo → `git init` (only with user confirmation if the directory is
  non-empty; safe in a freshly scaffolded app).

Detect the target framework once and reuse the result. There is no CLI
wrapper — read `package.json` and the file layout directly:

```bash
cat package.json | grep -E '"next"|"react"|"vite"' || true
test -f src/app/layout.tsx && echo "→ nextjs-app (src/app)"
test -f app/layout.tsx     && echo "→ nextjs-app (app)"
test -f pages/_document.tsx && echo "→ nextjs-pages"
test -f index.html         && echo "→ react-vite (or static HTML)"
```

Decision tree:

| Framework signal                                      | Treat as           |
| ----------------------------------------------------- | ------------------ |
| `next` dep + `src/app/layout.tsx` or `app/layout.tsx` | `nextjs-app`       |
| `next` dep, no app dir                                | `nextjs-pages`     |
| Vite/CRA + `index.html`                               | `react-vite`       |
| Other                                                 | `unknown` (manual) |

If the MCP server is registered and active in your assistant, the
`detect_project` MCP tool returns the same information in structured form —
prefer it for richer detection (it also reports installed Shipeasy packages,
existing env vars, and SDK version skew). The MCP server has **no** `call`
shell wrapper; invocations go through the assistant's MCP client.

---

## 1. Install runtime packages in the target app

The published packages (npm registry):

| Package           | Why                                                                 |
| ----------------- | ------------------------------------------------------------------- |
| `@shipeasy/sdk`   | Flags + experiments + i18n runtime (vanilla JS, framework-agnostic) |
| `@shipeasy/react` | Optional thin React wrapper (only if React is detected)             |

```bash
# Detect the package manager via package-manager-detector (or by lockfile),
# then install BOTH packages in a single command. Installing them separately
# can cause npm to drop @shipeasy/sdk from package.json once @shipeasy/react
# is added (since @shipeasy/react also depends on the SDK), which surfaces
# as a build-time "Module not found" several steps later.
pnpm add @shipeasy/sdk @shipeasy/react       # always install both together
# or: npm install @shipeasy/sdk @shipeasy/react
# or: yarn add @shipeasy/sdk @shipeasy/react
# Skip @shipeasy/react if the project has no React.
```

**Pre-flight: zod peer dep.** The SDK declares `zod ^4.0.0` as a peerOptional
dep. Despite "optional", **npm always errors with `ERESOLVE`** when the
project pins `zod` major `< 4` (most projects do today — pnpm and yarn
handle peerOptional correctly, npm doesn't). Check first and pick the right
install command:

```bash
npm ls zod                                          # or: pnpm why zod
# zod major 4.x → use the plain command:
pnpm add @shipeasy/sdk @shipeasy/react
# zod major 3.x or anything else (the common case with npm) → override:
npm install --legacy-peer-deps @shipeasy/sdk @shipeasy/react
# pnpm: --strict-peer-dependencies=false
```

Verify both packages are pinned in `package.json` and resolved in the
lockfile:

```bash
npm ls @shipeasy/sdk @shipeasy/react
# or: test -d node_modules/@shipeasy/sdk && test -d node_modules/@shipeasy/react && echo OK
```

(Don't `require('@shipeasy/sdk/package.json')` — that subpath isn't in
`exports`.)

Self-heal:

- Stale lockfile / version conflicts → `pnpm install` (or equivalent) once,
  then retry.
- `@shipeasy/sdk` missing from `package.json` after the install (npm
  pruning quirk) → re-run the **combined** install command above.

### Recommended dev installs

Install the CLI and the unified MCP server **globally per machine** (not per
project), so future projects reuse the same auth token:

```bash
npm i -g @shipeasy/cli @shipeasy/mcp
shipeasy --version            # confirm on PATH
shipeasy-mcp --version
```

If global install is blocked (e.g. corporate npm), fall back to
`npx -y @shipeasy/cli@latest <cmd>` and `npx -y @shipeasy/mcp@latest`.

The CLI and MCP server share `~/.config/shipeasy/config.json` — log in once
(step 2) and both pick up the same session.

---

## 2. Authenticate AND connect to a dedicated project (required)

This is one logical step in two parts: authenticate the machine, then
**bind this repo to its own Shipeasy project**. Both must complete or
later steps will refuse to run. **Skipping the binding is not an option** —
the CLI and MCP tools refuse all mutating operations until `.shipeasy`
exists.

> **Hard rule: one Shipeasy project per website / repo / app.** Never reuse
> a project across two unrelated apps. The whole point of the binding is
> to isolate i18n keys, flags, experiments, and SDK keys per app — sharing
> projects collapses that isolation and corrupts every consumer's data.
> If you find yourself about to bind two unrelated apps to the same
> `project_id`, stop and create a new project instead.

### 2a. Log in

```bash
shipeasy login
```

What happens:

1. CLI generates a PKCE verifier + challenge.
2. CLI calls `POST {api_base}/auth/device/start`.
3. Default browser opens at `{app_base}/cli-auth?state=…&source=cli`.
4. The user signs in / signs up (GitHub, Google, magic link).
5. The dashboard prompts the user to **pick or create a project**. Pick
   _any_ project you already own — it doesn't have to be the project you
   want this app to use; the next sub-step (2b) creates the right one
   programmatically. If this is your first time, the dashboard creates an
   initial scratch project for you here. Either way is fine.
6. CLI polls `/auth/device/poll` until it gets `{ token, project_id }`.
7. Token written to `~/.config/shipeasy/config.json` (mode 0600).

Verify:

```bash
shipeasy whoami
# Project:    <uuid>            ← the project you picked/created above
# Worker URL: https://cdn.shipeasy.ai
# App URL:    https://shipeasy.ai
# Saved at:   <iso-timestamp>
# Bound dir:  — (run `shipeasy bind` to bind this directory)   ← still empty
```

Self-heal:

- `Not logged in` → re-run `shipeasy login`. Don't loop more than twice.
- Stale token (`401` from any later step) → `shipeasy logout && shipeasy login`.
- Headless / SSH session → re-run with `--no-browser` and surface the URL
  to the user verbatim. Do not paste tokens or codes back to chat.
- Browser already had a session for the _wrong_ user → `shipeasy logout`,
  open the dashboard URL in a private/incognito window, and re-run
  `shipeasy login`.

### 2b. Upsert this app's project, keyed by domain — **MANDATORY**

```bash
# Idempotent: creates the project on first run, no-ops on later runs.
# Bind happens automatically (writes .shipeasy in cwd).
shipeasy projects upsert --domain <domain>
# Optional human-readable name (defaults to <domain> on first create):
shipeasy projects upsert --domain shouks.app --name shouks
```

The CLI session in `~/.config/shipeasy/config.json` is **per-machine, not
per-repo**. Without a `.shipeasy` binding, every push from this directory
would silently route to whatever project the machine was last logged
into — even if that's a _completely unrelated_ app. This is the single
biggest source of "why did my keys land on the wrong project?"
incidents.

`projects upsert` solves the bootstrap in one shot:

1. Looks up `(owner_email, domain)` against your account. The owner is
   inferred from the project the CLI session token is currently scoped
   to, so step 2a's "any project you already own" really is fine — only
   the email matters.
2. If a project with that domain already exists under your account →
   returns it unchanged (`created: false`).
3. If not → creates a fresh project, named `--name` (or the domain),
   under the same owner, on the free plan.
4. Writes `.shipeasy` with `{ project_id, project_name }` at the cwd.
   Pass `--no-bind` if you really must skip step 4 (you almost never
   want to).

**Use the production domain, not a placeholder.** Domain is the natural
key, so `acme.com` is right; `localhost` or `app1` is wrong. Re-running
the same command on every developer's machine and in CI converges on the
same `project_id`, which is the whole point.

What `.shipeasy` carries:

- Public `project_id` only. No secrets.
- Optional `i18n.client_key` cache (a public `sdk_client_…` token,
  populated later by `install-loader`).
- Searched **walk-up like `.git`** — bind once at the repo root and every
  `cwd` underneath inherits it.
- **Checked in alongside the repo.** Do not gitignore it. Teammates and
  CI need the same binding.

**Manual fallback.** To bind to an existing `project_id` you already know
(e.g. recovering after someone deleted `.shipeasy`), the lower-level
command still exists:

```bash
shipeasy bind <project_id> --name <name>
```

`projects upsert` is the right command for fresh installs; `bind` is for
recovery.

Once bound, every mutating CLI/MCP operation enforces the binding:

- CLI: `keys create|revoke`, `flags create|enable|disable|delete`,
  `experiments create|start|stop`,
  `i18n push|publish|profiles create|install-loader` — all refuse to run
  unless `.shipeasy` (or an explicit `--project <id>`) supplies the
  target.
- MCP: `i18n_push_keys`, `i18n_create_key`, `i18n_create_profile`,
  `i18n_publish_profile`, `i18n_install_loader`, `exp_create_*`,
  `exp_start_*`, `exp_stop_*` — same. **MCP has no `--project` flag**, so
  binding is the only way to make the write tools work.
- If the bound project differs from the CLI session, the CLI prints a
  one-line notice and uses the bound project. The API rejects with 401 if
  the session token doesn't have access; that's the correct failure mode.

Verify:

```bash
shipeasy whoami        # last line: "Bound dir: <uuid> (<name>)"
cat .shipeasy          # has project_id; no secrets
git status             # .shipeasy should appear as new (commit it)
```

Self-heal:

- `This command writes to a Shipeasy project, but no project is bound …`
  → you skipped 2b; run `shipeasy projects upsert --domain <domain>` now.
- Bound `project_id` is wrong → re-edit `.shipeasy` directly or re-run
  `shipeasy bind <correct_id>`.
- A teammate's PR landed without `.shipeasy` → bind from the repo root
  and commit. Don't gitignore it.
- `.shipeasy` is in `.gitignore` from a stale install → remove it from
  `.gitignore` and commit `.shipeasy`. The legacy "auto-gitignored
  cache" behaviour was removed when binding became mandatory.

---

## 3. Create server + client SDK keys

The login flow created the project and an **admin** token (CLI-scoped). The
target app still needs a **server** key (for SSR / backend evaluation) and a
**client** key (for browser SDK and the i18n loader).

```bash
shipeasy keys create --type server --json > /tmp/shipeasy-server.json
shipeasy keys create --type client --json > /tmp/shipeasy-client.json
```

Extract the `key` field from each JSON blob. **The plaintext key is shown
once.** Persist it immediately (next step) and delete the temp files.

Verify:

```bash
shipeasy keys list
# Expect at least one row each for type=server and type=client
```

Self-heal: if the user already has keys (e.g. they ran this before) `keys
list` will show them, but the plaintext is unrecoverable. Always create
**new** keys rather than asking the user to dig up old ones; revoke unused
old keys with `shipeasy keys revoke <id>` only after confirming with the user.

---

## 4. Persist keys into the app's secret store

Write keys to whatever the **target app** already uses. Pick the first match:

| Detected store                                 | Action                                                                        |
| ---------------------------------------------- | ----------------------------------------------------------------------------- |
| `wrangler.toml` / `wrangler.jsonc`             | `wrangler secret put SHIPEASY_SERVER_KEY` (interactive)                       |
| Next.js / Vite / Astro / SvelteKit / Remix     | append to `.env.local` (create if missing — already gitignored by convention) |
| Vercel project (`vercel.json` / `.vercel/`)    | `vercel env add SHIPEASY_SERVER_KEY production`                               |
| Netlify (`netlify.toml`)                       | `netlify env:set SHIPEASY_SERVER_KEY …`                                       |
| Doppler / Infisical / 1Password CLI configured | use their CLI                                                                 |
| Nothing detected                               | create `.env.local`, ensure it's in `.gitignore`                              |

Variables to write:

```
SHIPEASY_SERVER_KEY=sdk_server_…
NEXT_PUBLIC_SHIPEASY_CLIENT_KEY=sdk_client_…   # Next.js
VITE_SHIPEASY_CLIENT_KEY=sdk_client_…          # Vite
PUBLIC_SHIPEASY_CLIENT_KEY=sdk_client_…        # Astro / SvelteKit / generic
```

Hard rules:

- **Never** commit a server key. Confirm `.env.local` is gitignored before
  writing.
- **Never** echo a server key back into chat output, PR descriptions, commit
  messages, or test fixtures.
- The client key prefix `sdk_client_…` is safe to expose in browser bundles
  by design — the server key prefix `sdk_server_…` is not.

Verify the app picks them up — for Next.js:

```bash
grep -l SHIPEASY .env.local && echo OK
```

---

## 5. Initialize the SDK (one configure call)

There is **one** entry point per runtime. Do not write wrappers in
`src/lib/`.

### Server (Next.js App Router root layout — once)

The layout file is at `src/app/layout.tsx` **or** `app/layout.tsx` (no `src/`
prefix) — both are valid. Edit whichever exists. The `shipeasy()` call uses
`await`, which means the layout function must be `async` — convert it if it
isn't already.

**Canonical pattern — render `getBootstrapHtml()` into `<head>`.** The return
value of `shipeasy()` is not optional: `getBootstrapHtml()` emits the inline
script that (a) seeds `window.__SE_BOOTSTRAP` with SSR'd flags + i18n
strings, (b) installs a synchronous `window.i18n` shim so `i18n.t()` works
on first paint, (c) appends the CDN i18n loader with the **correct profile +
client key**, and (d) lazily injects the `se-devtools.js` loader when
`?se` / `?se_devtools` is in the URL. If you discard the return value and
hand-roll a `<script src=".../loader.js">` tag, you skip all four — the
client renders untranslated keys until the loader hydrates, devtools never
appears in production, and you have to keep the `data-profile` /
`data-key` attributes in sync by hand.

**Profile defaults to `en:prod`.** Both the SSR string fetch and the
runtime loader script use `en:prod` unless you pass
`i18nDefaultProfile: "..."` to `shipeasy()`. Publish to `en:prod` unless
you have a reason to deviate — see step 8a.

```tsx
// app/layout.tsx (or src/app/layout.tsx)
import type { Metadata } from "next";
import { headers } from "next/headers";
import { shipeasy } from "@shipeasy/sdk/server";
import { i18n } from "@shipeasy/sdk/client"; // works on the server too — reads SSR ALS

async function configureShipeasy() {
  const h = await headers();
  return shipeasy({
    apiKey: process.env.SHIPEASY_SERVER_KEY ?? "",
    clientKey: process.env.NEXT_PUBLIC_SHIPEASY_CLIENT_KEY ?? "",
    urlOverrides: h.get("x-se-search") ?? undefined,
  });
}

// Translatable metadata MUST go through generateMetadata — the top-level
// `export const metadata` is evaluated at module import time, before any
// async server work runs, so `i18n.t()` would always return the raw key.
export async function generateMetadata(): Promise<Metadata> {
  await configureShipeasy();
  return {
    title: "My App",
    description: i18n.t("layout.description"),
  };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const seConfig = await configureShipeasy();
  return (
    <html lang="en">
      <head>
        {/* eslint-disable-next-line react/no-danger */}
        <script dangerouslySetInnerHTML={{ __html: seConfig.getBootstrapHtml() }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
```

`shipeasy()` is safe to call twice per request — `flags.configure` /
`flags.initOnce` / `i18n.init` are all idempotent (per-request ALS cache,
keyed by profile).

If you only need flags + experiments (no translatable copy anywhere), the
minimal form `await shipeasy({ apiKey: process.env.SHIPEASY_SERVER_KEY })`
still works — but **you should still render `getBootstrapHtml()`**,
otherwise client-side flag evaluation pays an extra network round-trip on
first paint and devtools won't load.

### Client (only needed for SPA-style projects)

For Next.js App Router using the canonical pattern above, you **don't**
need a separate client `shipeasy()` call — `getBootstrapHtml()` already
appends the i18n loader (which handles client-side flag/i18n init) and the
devtools loader. Skip ahead to step 6 only if you're publishing translation
keys; setup is otherwise complete.

For Vite / CRA / plain HTML / projects without an SSR root layout, add a
one-time client init at the app entry. In Next.js without the bootstrap
script, create a tiny `'use client'` wrapper and import it from your root
layout:

```ts
// app/_shipeasy-client.tsx
"use client";
import { shipeasy } from "@shipeasy/sdk/client";
import { useEffect } from "react";

export function ShipeasyClient() {
  useEffect(() => {
    shipeasy({ apiKey: process.env.NEXT_PUBLIC_SHIPEASY_CLIENT_KEY ?? "" });
  }, []);
  return null;
}
```

```tsx
// app/layout.tsx — add inside <body>
<ShipeasyClient />
```

For Vite / CRA / plain HTML, call `shipeasy({ apiKey: … })` once near the top
of `main.ts` / `main.tsx`.

---

## 6. Inject the i18n loader script (only if you skipped `getBootstrapHtml()`)

**Skip this step entirely for Next.js App Router projects that followed the
canonical pattern in step 5.** `getBootstrapHtml()` already inlines the
loader with the correct `data-key` / `data-profile`, plus the SSR string
payload and the devtools loader — running `install-loader` on top adds a
second `<script src=".../loader.js">` tag that races the inline one and
needs its profile kept in sync by hand.

This step exists for: (a) `nextjs-pages` (no root layout), (b) `react-vite`
/ static HTML (no SSR), (c) any framework where you can't render
`getBootstrapHtml()` into the document head.

The CLI auto-injects into the right file based on framework, and reuses the
existing client key from your `.env*` file (or from a previous run's
`.shipeasy` file) so it doesn't burn a new key on every install.

```bash
shipeasy i18n install-loader --profile <name>
```

Profile name:

- If you already have a profile (most projects start with `en:prod`), pass
  `--profile en:prod`. Confirm with `shipeasy i18n profiles list`.
- If you want a `default` profile for a fresh project, create it first:
  `shipeasy i18n profiles create default --locales en`.
- The CLI does **not** auto-create the profile — it must exist before
  publishing.

Effect:

- `nextjs-app` → adds `<script>` to `src/app/layout.tsx` or
  `app/layout.tsx` `<head>`. (Your layout must have a literal `<head>`
  element. With Next.js 13+ Metadata API there often isn't one — add an
  empty `<head />` or use `--print` and paste manually.)
- `nextjs-pages` → adds to `pages/_document.tsx`.
- `react-vite` / static → adds to `index.html`.
- The CLI resolves the client SDK key in this order: `--data-key` flag →
  `.shipeasy` file (cached from a prior run) →
  `NEXT_PUBLIC_SHIPEASY_CLIENT_KEY` /
  `VITE_SHIPEASY_CLIENT_KEY` /
  `PUBLIC_SHIPEASY_CLIENT_KEY` /
  `SHIPEASY_CLIENT_KEY` from the project's `.env*` file → finally, create a
  new key (last resort).
- The `.shipeasy` file (a single JSON file, not a directory) is **checked
  in** alongside the rest of the repo — it holds the project binding
  (step 2b) and the cached `i18n.client_key` (a public `sdk_client_…`
  token, safe to commit). Don't add it to `.gitignore`.

Verify:

```bash
git diff --stat
grep -r 'data-key=' --include='*.tsx' --include='*.html' src . app . index.html 2>/dev/null
```

Self-heal: if the file the CLI tried to edit doesn't exist, pass
`--path <file>` explicitly. If the framework is `unknown`, run with
`--print` to get the tag and ask the user where to paste it.

---

## 7. Register the MCP server, skills, and plugin

The CLI ships everything pre-bundled. One command per concern:

```bash
shipeasy mcp install --scope user        # writes ~/.claude/settings.json + ~/.cursor/mcp.json
# or:
shipeasy mcp install --scope project     # writes .mcp.json + .cursor/mcp.json + .windsurf/mcp.json
```

Flags:

| Flag                                     | Effect                                                      |
| ---------------------------------------- | ----------------------------------------------------------- |
| `--client claude\|cursor\|windsurf\|all` | Restrict to one assistant.                                  |
| `--scope user\|project`                  | Where to write the config. Default `user`.                  |
| `--force`                                | Replace an existing `shipeasy` MCP entry without prompting. |
| `--dry-run`                              | Print what would change without writing.                    |

Verify:

```bash
shipeasy mcp status                       # shows yes/no per config
shipeasy whoami                           # reads ~/.config/shipeasy/config.json
```

Self-heal: `shipeasy mcp install` skips any client whose config dir doesn't
exist (assistant not installed) and refuses to overwrite a malformed JSON
config — both visible in the output. Re-run with `--force` only after a human
confirms.

### Install skills + slash commands

`shipeasy plugin install` is the recommended command for Claude Code — it
drops slash commands into `.claude/commands/` and skills into
`.claude/skills/` (the canonical paths Claude Code reads natively, so they
work without a `/plugin` registration step). It also writes a plugin
manifest under `.claude/plugins/shipeasy/` for users who want the
marketplace-style layout.

`shipeasy skills install` is a subset — skills only, no slash commands. Use
it when slash commands aren't supported by your assistant (Cursor,
Windsurf, etc.) or when you want skills without commands.

| Command                   | Lands in                                                            |
| ------------------------- | ------------------------------------------------------------------- |
| `shipeasy plugin install` | `.claude/commands/`, `.claude/skills/`, `.claude/plugins/shipeasy/` |
| `shipeasy skills install` | `.claude/skills/`                                                   |

```bash
# Recommended for Claude Code (auto-picks up — no /plugin registration):
shipeasy plugin install

# Or, skills only:
shipeasy skills list                      # show bundled skills
shipeasy skills install                   # → .claude/skills/
```

Available skills (shipped with `@shipeasy/cli`):

| Skill                  | Triggers on                                                  |
| ---------------------- | ------------------------------------------------------------ |
| `shipeasy-setup`       | "set up shipeasy", "install shipeasy", first-time onboarding |
| `shipeasy-i18n`        | "translate", "add a key", "make this translatable"           |
| `shipeasy-flags`       | "feature flag", "kill switch", "rollout"                     |
| `shipeasy-experiments` | "A/B test", "experiment", "variant"                          |

The plugin also contributes slash commands — `/shipeasy-setup`,
`/shipeasy-i18n-extract`, `/shipeasy-i18n-migrate`, `/shipeasy-flag`,
`/shipeasy-experiment` — and a plugin-scoped `.mcp.json` registering
`@shipeasy/mcp`. If you used `shipeasy plugin install`, you can skip
`shipeasy mcp install` for Claude Code (the plugin's own `.mcp.json` covers
it). For Cursor / Windsurf you still want `shipeasy mcp install --scope
project`.

Restart Claude Code (or reload its plugin/skill index) to pick up the new
contributions.

---

## 8. Find or create the first translation keys

### 8a. Confirm the profile exists

Pick the profile name you'll use for new keys, and create it if missing:

```bash
shipeasy i18n profiles list
# If empty or your target name isn't there:
shipeasy i18n profiles create default --locales en
```

**Use `en:prod`.** It's what `getBootstrapHtml()` and the server SDK's SSR
fetch default to — picking anything else means every install needs a
manual override and is the most common reason translations look like they
"didn't take effect" after a deploy. Older guides mention `default`; that
was the CLI's pre-2.1 default and it no longer matches the SDK's runtime
defaults.

### 8b. Discover translatable strings

Never invent keys blindly:

```bash
shipeasy i18n scan src --json > /tmp/scan.json
# (use `app` instead of `src` for projects without a src/ root)
```

Each row has a `kind` field — the values you'll see most often:

| `kind`                                                         | Meaning                                   |
| -------------------------------------------------------------- | ----------------------------------------- |
| `jsx_text`                                                     | Visible JSX text — top extraction target. |
| `jsx_attr`                                                     | `aria-label`, `placeholder`, `title`, …   |
| `template_literal`                                             | Backtick string with interpolation.       |
| `wrapped` (only with `--keys-only`)                            | Already a `t('key', …)` call site.        |
| `call_arg` / `object_prop` / `variable_init` / `array_element` | Other string positions.                   |

The agent decides which `jsx_*` rows to wrap (usually all of them; skip
test fixtures, dev URLs, and class-name strings).

### 8c. Wrap and/or push keys

For each chosen candidate, either:

a. **Wrap in code** with the `i18n` skill's `t()` pattern (see skill
`shipeasy-i18n`), then push the key/value pair, **or**
b. **Push directly** as raw key/value if it's a label that has no code site
yet (rare).

Push via the MCP server (preferred — gives the agent structured errors):

```
mcp tool: i18n_create_key
  { "key": "landing.hero.title", "value": "Ship faster with Shipeasy", "profile": "default" }
```

Or via the CLI if MCP isn't wired up:

```bash
echo '{"landing.hero.title":"Ship faster with Shipeasy"}' > /tmp/keys.json
shipeasy i18n push /tmp/keys.json --profile default
```

### 8d. Validate and publish

CLI:

```bash
shipeasy i18n validate --profile default       # checks wrapped t(...) calls
shipeasy i18n publish  --profile default       # publishes chunk to CDN
```

Or via MCP (preferred — typed errors):

```
mcp tool: i18n_validate_keys { "profile": "default" }
mcp tool: i18n_publish_profile { "profile": "default", "chunk": "default" }
```

Note: `i18n_validate_keys` (and `shipeasy i18n validate`) only check that
wrapped `t(...)` references in code resolve to keys on the server — they do
**not** scan the discovery output. A "no i18n key references found" result
right after a 900-row scan is expected if no calls have been wrapped yet; it
is not an error.

Self-heal:

- `409 key exists` → fine, leave it.
- `401` → token expired, re-run `shipeasy login`, retry once.
- `429` plan-limit → surface to user; do not auto-upgrade plan.
- `Profile '<name>' not found` → run `shipeasy i18n profiles create <name>
--locales en` (or `mcp tool: i18n_create_profile { ... }`) and retry.

Verify in the browser: load any page that uses the loader script — the
devtools panel (`?se=1`) should list the new keys under the Translations tab.

---

## 9. Final verification gate

Run these in order. All must pass before reporting "done":

```bash
shipeasy whoami                         # auth OK; "Bound dir:" line shows project_id
test -f .shipeasy && grep project_id .shipeasy   # binding present
shipeasy keys list                      # >= 1 server, >= 1 client key
git diff --stat                         # expected: layout.tsx, .env.local, .gitignore, .shipeasy
pnpm build || npm run build             # target app still builds
```

If any step fails: surface the exact failing command and its stderr to the
user. Do not silently retry destructive operations.

---

## 10. Onboarded — hand-off report to the user

End the session with a short report (one screen). Template:

```
✅ Shipeasy installed

Project:   <project_id>           (whoami)
Keys:      server *…<last4>, client *…<last4>
Wired:     SDK init in <layout/file>, i18n loader in <head file>
Secrets:   <store name> ← SHIPEASY_SERVER_KEY, <PUBLIC|NEXT_PUBLIC|VITE>_SHIPEASY_CLIENT_KEY
Keys live: <N> i18n keys pushed to profile `default` (en)

Next:
  • Review `git status` / `git diff --stat` and commit (see step 11)
  • Run `shipeasy i18n scan src` to find unwrapped strings
  • Wrap user-visible copy with i18n.t('<key>')
  • Open the dashboard:  https://app.shipeasy.ai/projects/<project_id>
```

### Cheat sheet — commands the user will reach for

| Goal                                | Command                                            |
| ----------------------------------- | -------------------------------------------------- |
| Who am I logged in as?              | `shipeasy whoami`                                  |
| Re-auth                             | `shipeasy logout && shipeasy login`                |
| Create-or-get app's project + bind  | `shipeasy projects upsert --domain <domain>`       |
| Bind cwd to a known project         | `shipeasy bind <project_id> --name <name>`         |
| List / create / revoke keys         | `shipeasy keys {list,create,revoke}`               |
| Find translatable strings           | `shipeasy i18n scan [paths...]`                    |
| Push translations                   | `shipeasy i18n push <file.json> --profile default` |
| (Re)install loader script           | `shipeasy i18n install-loader`                     |
| Create/start/stop a flag            | `shipeasy flags …` (`--help` for surface)          |
| Create/start/stop an experiment     | `shipeasy experiments …`                           |
| Run codemods (e.g. extract-to-i18n) | `shipeasy codemod …`                               |

### Cheat sheet — MCP tools the agent will call

Auth / discovery: `auth_check`, `auth_login`, `auth_logout`, `detect_project`,
`list_resources`, `get_resource`, `get_sdk_snippet`.

Projects: `projects_upsert` (find-or-create by domain + auto-bind; the
right tool to call first on a fresh repo before any other write tool).

Experiments: `exp_create_gate`, `exp_create_config`, `exp_create_experiment`,
`exp_start_experiment`, `exp_stop_experiment`, `exp_experiment_status`.

i18n: `i18n_discover_site`, `i18n_install_loader`, `i18n_create_profile`,
`i18n_publish_profile`, `i18n_create_key`, `i18n_push_keys`,
`i18n_validate_keys`, `i18n_scan_code`, `i18n_codemod_preview`,
`i18n_codemod_apply`.

### Skills (Claude Code)

Bundled with `@shipeasy/cli` and installable via `shipeasy skills install`:

- `shipeasy-setup` — onboarding.
- `shipeasy-i18n` — wrapping copy, creating + publishing keys.
- `shipeasy-flags` — feature gates and rollouts.
- `shipeasy-experiments` — A/B tests.

---

## 11. Ask the user to commit the changes

Onboarding wrote real, lasting changes to the repo. Show the user the diff
footprint and propose a commit — **never run `git commit` yourself**.

```bash
git status
git diff --stat
```

Expected modified / untracked entries (skip any rows that don't apply):

| Path                                                           | What it is                             | Commit?                                                                                                                            |
| -------------------------------------------------------------- | -------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `package.json` + lockfile                                      | new SDK + React deps                   | yes                                                                                                                                |
| `app/layout.tsx` (or `src/app/layout.tsx`)                     | server SDK init + loader `<script>`    | yes                                                                                                                                |
| `<files modified by codemod>`                                  | wrapped strings + `i18n.t(...)` calls  | yes — best in a separate commit; the diff is large                                                                                 |
| `src/i18n/en.json` or `i18n/en.json`                           | seed translation keys (codemod output) | yes — pairs with the codemod commit                                                                                                |
| `.mcp.json`                                                    | project MCP server registration        | usually yes — teammates inherit the same MCP server                                                                                |
| `.cursor/mcp.json`, `.windsurf/mcp.json`                       | per-assistant MCP registration         | optional — commit if everyone uses that assistant, otherwise gitignore                                                             |
| `.claude/commands/shipeasy-*.md`, `.claude/skills/shipeasy-*/` | slash commands and skills              | check `.gitignore` — many repos gitignore `.claude/` entirely. If so, leave them local; teammates re-run `shipeasy plugin install` |
| `.shipeasy`                                                    | project binding + client-key cache     | **yes — required.** Carries the project_id every CLI/MCP write enforces against. Public-only fields, safe to commit.               |
| `.env.local`                                                   | server + client keys                   | **NEVER** — must remain gitignored                                                                                                 |

Hard rules:

- **Never commit `.env.local`.** It contains the server key. Confirm it
  appears in `.gitignore` before suggesting any `git add`.
- **Never `git add -A` / `git add .`.** Stage only the files above by name —
  the user may have other in-flight work in the tree.
- **Never run `git commit` or `git push` yourself** unless the user has
  explicitly authorised it for this session. The right pattern is to
  print the proposed command and let the user run it.

Suggest a single-commit message like the one below and ask the user to
proceed (or to split into multiple commits if they prefer):

```bash
git add <the paths from the table above>
git commit -m "chore: onboard Shipeasy (SDK + i18n loader + MCP)"
```

If the codemod modified many source files, suggest splitting into two
commits — one for the install plumbing (deps, layout, env, MCP) and one
for the codemod-applied i18n wrapping (rewritten files + `en.json`) — so
the diff stays reviewable.

---

## Agent operating rules (read this if you are the agent)

1. **One project per app, always bound.** Every fresh install runs
   `shipeasy projects upsert --domain <production-domain>` (step 2b),
   which is idempotent on `(owner_email, domain)` and writes
   `.shipeasy`. Never reuse a project across two unrelated apps; never
   skip the bind. If `.shipeasy` is missing or wrong, _fix that first_ —
   every subsequent step depends on it. Commit `.shipeasy` to the repo;
   do not gitignore it.
2. **One configure call.** Never create custom `lib/shipeasy.ts` wrappers.
   The SDK has its own entry — `shipeasy({ apiKey })` from
   `@shipeasy/sdk/{server,client}`. Anything else is wrong.
3. **Vanilla JS surface.** Anything you build on top must work without React.
   `@shipeasy/react` is a thin wrapper, not a requirement.
4. **Confirm before destructive operations.** Revoking keys, rewriting an
   existing `mcpServers` config, or force-pushing always asks first.
5. **Never log server keys.** Strip them from any output you echo back.
6. **Self-heal once, then escalate.** If a step fails twice, stop and ask
   the user — do not loop.
7. **Verify, don't trust.** After every mutating step run the matching
   verification command above before proceeding.
