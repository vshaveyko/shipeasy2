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

Detect the target framework once and reuse the result:

```bash
shipeasy-mcp call detect_project    # if MCP already registered
# OR equivalent inline node script reading package.json
```

Decision tree from `detect_project` output:

| Framework signal                                      | Treat as           |
| ----------------------------------------------------- | ------------------ |
| `next` dep + `src/app/layout.tsx` or `app/layout.tsx` | `nextjs-app`       |
| `next` dep, no app dir                                | `nextjs-pages`     |
| Vite/CRA + `index.html`                               | `react-vite`       |
| Other                                                 | `unknown` (manual) |

---

## 1. Install runtime packages in the target app

The published packages (npm registry):

| Package           | Why                                                                 |
| ----------------- | ------------------------------------------------------------------- |
| `@shipeasy/sdk`   | Flags + experiments + i18n runtime (vanilla JS, framework-agnostic) |
| `@shipeasy/react` | Optional thin React wrapper (only if React is detected)             |

```bash
# Use the project's package manager — detect via package-manager-detector
pnpm add @shipeasy/sdk
pnpm add @shipeasy/react        # only if React is present
# or npm install / yarn add / bun add
```

Verify:

```bash
node -e "console.log(require('@shipeasy/sdk/package.json').version)"
```

Self-heal: if the package manager command fails because of a stale lockfile,
run `pnpm install` (or equivalent) once and retry.

### Recommended dev installs

Install the CLI and the unified MCP server **globally per machine** (not per
project), so future projects reuse the same auth token:

```bash
npm i -g @shipeasy/cli @shipeasy/mcp
shipeasy --version
shipeasy-mcp --version
```

If global install is blocked (e.g. corporate npm), fall back to
`npx -y @shipeasy/cli@latest <cmd>` and `npx -y @shipeasy/mcp@latest`.

---

## 2. Authenticate (browser, PKCE device flow)

```bash
shipeasy login
```

What happens:

1. CLI generates a PKCE verifier + challenge.
2. CLI calls `POST {api_base}/auth/device/start`.
3. Default browser opens at `{app_base}/cli-auth?state=…&source=cli`.
4. The user signs in / signs up (GitHub, Google, magic link).
5. The dashboard prompts the user to **pick or create a project**.
6. CLI polls `/auth/device/poll` until it gets `{ token, project_id }`.
7. Token written to `~/.config/shipeasy/config.json` (mode 0600).

Verify:

```bash
shipeasy whoami
# Project:    proj_…
# Email:      …
```

Self-heal:

- `Not logged in` → re-run `shipeasy login`. Don't loop more than twice.
- Headless / SSH session → re-run with `--no-browser` and surface the URL to
  the user verbatim. Do not paste tokens or codes back to chat.
- Stale token (`401` from any later step) → `shipeasy logout && shipeasy login`.

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

| Detected store                                 | Action                                                  |
| ---------------------------------------------- | ------------------------------------------------------- |
| `wrangler.toml` / `wrangler.jsonc`             | `wrangler secret put SHIPEASY_SERVER_KEY` (interactive) |
| `.env.local` exists or `.gitignore` lists it   | append to `.env.local`                                  |
| Vercel project (`vercel.json` / `.vercel/`)    | `vercel env add SHIPEASY_SERVER_KEY production`         |
| Netlify (`netlify.toml`)                       | `netlify env:set SHIPEASY_SERVER_KEY …`                 |
| Doppler / Infisical / 1Password CLI configured | use their CLI                                           |
| Nothing detected                               | create `.env.local`, add to `.gitignore`                |

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

```ts
// src/app/layout.tsx
import { shipeasy } from "@shipeasy/sdk/server";

await shipeasy({ apiKey: process.env.SHIPEASY_SERVER_KEY ?? "" });
```

### Client (root client component or app entry)

```ts
import { shipeasy } from "@shipeasy/sdk/client";
shipeasy({ apiKey: process.env.NEXT_PUBLIC_SHIPEASY_CLIENT_KEY ?? "" });
```

For Vite / plain HTML, use the loader script tag instead of a JS import — see
the next step.

---

## 6. Inject the i18n loader script (optional but recommended)

Only do this if the target app will display user-visible copy. The CLI
auto-injects into the right file based on framework:

```bash
shipeasy i18n install-loader --profile default
```

Effect:

- `nextjs-app` → adds `<script>` to `src/app/layout.tsx` `<head>`.
- `nextjs-pages` → adds to `pages/_document.tsx`.
- `react-vite` / static → adds to `index.html`.
- A new client SDK key is auto-created if not passed via `--data-key` and
  saved to `.shipeasy/` in the project root.

Verify:

```bash
git diff --stat
grep -r 'data-key=' --include='*.tsx' --include='*.html' src .
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

### Install agent skills

```bash
shipeasy skills list                      # show bundled skills
shipeasy skills install                   # all of them, project-scope
shipeasy skills install shipeasy-setup shipeasy-i18n --scope user
```

Available skills (shipped with `@shipeasy/cli`):

| Skill                  | Triggers on                                                  |
| ---------------------- | ------------------------------------------------------------ |
| `shipeasy-setup`       | "set up shipeasy", "install shipeasy", first-time onboarding |
| `shipeasy-i18n`        | "translate", "add a key", "make this translatable"           |
| `shipeasy-flags`       | "feature flag", "kill switch", "rollout"                     |
| `shipeasy-experiments` | "A/B test", "experiment", "variant"                          |

### Install the Claude plugin (slash commands + bundled skills)

```bash
shipeasy plugin install                   # to .claude/plugins/shipeasy/ (project)
shipeasy plugin install --scope user      # to ~/.claude/plugins/shipeasy/
```

Contributes:

- Slash commands: `/shipeasy-setup`, `/shipeasy-i18n-extract`,
  `/shipeasy-i18n-migrate`, `/shipeasy-flag`, `/shipeasy-experiment`.
- A `.mcp.json` registering `@shipeasy/mcp` (so plugin alone is enough — you
  do not also need `shipeasy mcp install` if the plugin is installed).
- A copy of the four skills above.

Restart Claude Code (or reload its plugin/skill index) to pick up the new
contributions.

---

## 8. Find or create the first translation keys

Discovery first — never invent keys blindly:

```bash
shipeasy i18n scan src --json > /tmp/scan.json
```

Output rows fall into two kinds:

- `wrapped` — already a `t('key', …)` call. Make sure those keys exist on
  the server.
- `candidate` — looks translatable but isn't wrapped. The agent decides
  which to wrap (usually anything visible in JSX text or `aria-label` /
  `placeholder` / `title` attributes).

For each chosen candidate, either:

a. **Wrap in code** with the `i18n` skill's `t()` pattern, then push the
key/value pair, **or**
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

Verify (MCP only — there is no CLI wrapper for validate):

```
mcp tool: i18n_validate_keys { "profile": "default" }
```

Self-heal:

- `409 key exists` → fine, leave it.
- `401` → token expired, re-run `shipeasy login`, retry once.
- `429` plan-limit → surface to user; do not auto-upgrade plan.
- Profile missing → `mcp tool i18n_create_profile { "name": "default", "locales": ["en"] }`.

Publish the profile so the CDN picks it up:

```
mcp tool: i18n_publish_profile { "profile": "default", "chunk": "default" }
```

Verify in the browser: load any page that uses the loader script — the
devtools panel (`?se=1`) should list the new keys under the Translations tab.

---

## 9. Final verification gate

Run these in order. All must pass before reporting "done":

```bash
shipeasy whoami                         # auth OK
shipeasy keys list                      # >= 1 server, >= 1 client key
git diff --stat                         # expected files: layout.tsx, .env.local, .gitignore, .shipeasy/
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
  • Wrap user-visible copy with i18n.t('<key>', '<fallback>')
  • Run `shipeasy i18n scan src` to find unwrapped strings
  • Open the dashboard:  https://app.shipeasy.ai/projects/<project_id>
```

### Cheat sheet — commands the user will reach for

| Goal                                | Command                                            |
| ----------------------------------- | -------------------------------------------------- |
| Who am I logged in as?              | `shipeasy whoami`                                  |
| Re-auth                             | `shipeasy logout && shipeasy login`                |
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

## Agent operating rules (read this if you are the agent)

1. **One configure call.** Never create custom `lib/shipeasy.ts` wrappers.
   The SDK has its own entry — `shipeasy({ apiKey })` from
   `@shipeasy/sdk/{server,client}`. Anything else is wrong.
2. **Vanilla JS surface.** Anything you build on top must work without React.
   `@shipeasy/react` is a thin wrapper, not a requirement.
3. **Confirm before destructive operations.** Revoking keys, rewriting an
   existing `mcpServers` config, or force-pushing always asks first.
4. **Never log server keys.** Strip them from any output you echo back.
5. **Self-heal once, then escalate.** If a step fails twice, stop and ask
   the user — do not loop.
6. **Verify, don't trust.** After every mutating step run the matching
   verification command above before proceeding.
