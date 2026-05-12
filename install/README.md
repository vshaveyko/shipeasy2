# Shipeasy — Installation Guides

This directory is a set of procedural runbooks intended to be followed by an
AI coding agent (Claude Code, Cursor, Windsurf, Continue, Copilot CLI, …)
installing Shipeasy into a target application. Each guide is **verifiable** —
run the verification command and only proceed if it passes. Most steps
include a **self-heal** fallback the agent can apply without asking the user.

The "target app" below means whatever project the agent is working in
(`process.cwd()`), **not** this monorepo.

---

## Order of operations

1. **Always start here:** [`general.md`](./general.md) — installs the SDK,
   authenticates the machine, binds the repo to its own Shipeasy project,
   provisions server + client keys, wires the SDK into the root layout, and
   installs the MCP server, plugin, and shared skills. Every other guide
   assumes this completed cleanly (in particular: `.shipeasy` exists in the
   repo and `shipeasy whoami` shows a bound dir).

2. **Then pick the features the project actually needs.** Each feature lives
   behind a per-project module toggle (`shipeasy modules enable <name>`) so
   you only pay for what you turn on. Run any subset, in any order, as many
   times as you like — guides are idempotent.

| Feature                                             | Guide                                                              | Module flag        |
| --------------------------------------------------- | ------------------------------------------------------------------ | ------------------ |
| Experiments + metrics (A/B tests, event collection) | [`experiments-metrics.md`](./experiments-metrics.md)               | `experiments`      |
| Configs, feature gates, kill switches               | [`configs-gates-killswitches.md`](./configs-gates-killswitches.md) | `configs`, `gates` |
| Translations (i18n keys + CDN-served labels)        | [`translations.md`](./translations.md)                             | `translations`     |
| In-app bug reports + feature requests               | [`bugs-feature-requests.md`](./bugs-feature-requests.md)           | `feedback`         |

3. **Verify and commit.** The final section of `general.md` (verification
   gate + hand-off report + commit checklist) applies to every install,
   regardless of which features you turned on.

---

## Agent operating rules — read before starting any guide

1. **One project per app, always bound.** Every fresh install runs
   `shipeasy projects upsert --domain <production-domain>` (general step 2),
   which is idempotent on `(owner_email, domain)` and writes `.shipeasy`.
   Never reuse a project across two unrelated apps; never skip the bind. If
   `.shipeasy` is missing or wrong, _fix that first_ — every subsequent step
   depends on it. Commit `.shipeasy` to the repo; do not gitignore it.

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
   verification command before proceeding.
