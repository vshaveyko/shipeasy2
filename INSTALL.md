# Shipeasy — Install

Shipeasy ships as a [Claude Code plugin marketplace](https://docs.claude.com/en/docs/claude-code/plugins).
One unified `shipeasy` plugin holds every feature. Install once, then
run the install slash commands for the features you want.

```bash
claude plugin marketplace add shipeasy-ai/shipeasy
claude plugin install shipeasy@shipeasy
```

Then, inside Claude Code:

```
/shipeasy:install                  # required first — SDK install, auth, project bind, keys, root-layout init, MCP
/shipeasy:experiments:install      # A/B tests + custom metrics
/shipeasy:flags:install            # feature gates + dynamic configs + kill switches
/shipeasy:i18n:install             # translations (i18n keys + CDN-served labels)
/shipeasy:bugs:install             # in-app bug reports + feature requests
```

Each install slash command does the actual wiring (SDK install for the
base command, module enable for the rest) **and drops a small pointer
skill into `<repo>/.claude/skills/shipeasy-<feature>/SKILL.md`**.
Commit those pointers — they're the breadcrumb new contributors follow
to re-onboard without already having the plugin loaded.

| Slash command                   | Module flipped on  | Skill installed        | Other slash commands                               |
| ------------------------------- | ------------------ | ---------------------- | -------------------------------------------------- |
| `/shipeasy:install`             | (base — no module) | `shipeasy-setup`       | —                                                  |
| `/shipeasy:experiments:install` | `experiments`      | `shipeasy-experiments` | `/shipeasy:experiments:experiment`                 |
| `/shipeasy:flags:install`       | `gates`, `configs` | `shipeasy-flags`       | `/shipeasy:flags:flag`                             |
| `/shipeasy:i18n:install`        | `translations`     | `shipeasy-i18n`        | `/shipeasy:i18n:extract`, `/shipeasy:i18n:migrate` |
| `/shipeasy:bugs:install`        | `feedback`         | `shipeasy-bugs`        | `/shipeasy:bugs:bug`, `/shipeasy:bugs:fix`         |

Modules are per-project flags toggled with
`shipeasy modules {enable,disable,list} <name>`. They're independent —
turn on any subset, in any order. Disabling a module is reversible;
existing keys / gates / experiments / translations stay intact.

The marketplace source lives at [`marketplace/`](./marketplace/) in this
repo and is mirrored to the public repo `shipeasy-ai/shipeasy`. The
agent-facing long-form runbooks each skill follows are under
[`install/`](./install/) — read those first if you're picking up an
in-flight install or debugging a step.

## What `/shipeasy:install` actually installs

- `@shipeasy/sdk` (+ `@shipeasy/react` when React is detected).
- `@shipeasy/cli` (`shipeasy` binary) and `@shipeasy/mcp` (`shipeasy-mcp`
  binary) — recommended as global installs so all your projects share one
  CLI session.
- `.shipeasy` binding file at the repo root (commit it; never gitignore).
- `SHIPEASY_SERVER_KEY` + the framework-appropriate
  `*_SHIPEASY_CLIENT_KEY` written to the project's secret store.
- An `await shipeasy({...})` call in the root layout, with
  `getBootstrapHtml()` rendered into `<head>`.
- MCP server registered for Claude Code (plugin-scoped `.mcp.json`).
- A `.claude/skills/shipeasy-setup/SKILL.md` pointer in the repo.

## Other assistants (Cursor, Windsurf, etc.) and offline installs

The marketplace flow is Claude-Code specific. For other assistants, fall
back to the CLI:

```bash
npm i -g @shipeasy/cli @shipeasy/mcp
shipeasy login
shipeasy plugin install                  # writes .claude/commands + .claude/skills (full plugin)
shipeasy mcp install --scope project     # writes .cursor/mcp.json + .windsurf/mcp.json
```

Per-feature pointer-only drops (for repos that don't want the full
plugin checked in, only the breadcrumbs):

```bash
shipeasy plugin install bugs flags experiments i18n setup
# or all features at once:
shipeasy plugin install --pointer-only
```

Then follow the matching runbook under [`install/`](./install/) by hand.

## Pre-flight (any install path)

```bash
node --version          # >= 20
git rev-parse --show-toplevel    # must be inside a repo
```

## When things go wrong

- `Not logged in` → re-run `shipeasy login`. Don't loop more than twice.
- `This command writes to a Shipeasy project, but no project is bound …`
  → `shipeasy projects upsert --domain <domain>` (writes `.shipeasy`).
- `403 module not enabled` → run the matching install slash command
  (e.g. `/shipeasy:flags:install`) or `shipeasy modules enable <name>`.
- A feature install refuses to run because base is missing → run
  `/shipeasy:install` first.

Every skill self-heals once, then escalates to the user. If you hit a
step twice in a row, stop and ask.
