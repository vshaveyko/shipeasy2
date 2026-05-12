# Shipeasy — Install

Shipeasy ships as a [Claude Code plugin marketplace](https://docs.claude.com/en/docs/claude-code/plugins). One required `base` plugin + four
independent feature plugins. Install any combination — `base` first.

```bash
claude plugin marketplace add shipeasy-ai/shipeasy
claude plugin install shipeasy@base                       # required first
claude plugin install shipeasy@experiments-metrics        # A/B tests + custom metrics
claude plugin install shipeasy@configs-gates              # feature gates + dynamic configs + kill switches
claude plugin install shipeasy@polylang                   # translations (i18n keys + CDN-served labels)
claude plugin install shipeasy@bugs                       # in-app bug reports + feature requests
```

After each plugin installs, Claude Code picks up its skills + slash
commands. Run the matching setup command **once** per plugin to do the
actual wiring (SDK install for `base`, module enable for the rest):

| After installing               | Run                           | What it does                                                              |
| ------------------------------ | ----------------------------- | ------------------------------------------------------------------------- |
| `shipeasy@base`                | `/shipeasy-setup`             | SDK install, auth, project bind, keys, root-layout init, MCP registration |
| `shipeasy@experiments-metrics` | `/shipeasy-experiments-setup` | Enable `experiments` module; smoke-test `experiments.assign(...)`         |
| `shipeasy@configs-gates`       | `/shipeasy-flags-setup`       | Enable `gates` + `configs` modules; smoke-test `gates.check(...)`         |
| `shipeasy@polylang`            | `/shipeasy-polylang-setup`    | Enable `translations` module, create `en:prod` profile, push a smoke key  |
| `shipeasy@bugs`                | `/shipeasy-bugs-setup`        | Enable `feedback` module; verify the devtools overlay loads               |

The marketplace source lives at [`marketplace/`](./marketplace/) in this
repo and is mirrored to the public repo `shipeasy-ai/shipeasy`. The
agent-facing long-form runbooks each skill follows are under
[`install/`](./install/) — read those first if you're picking up an
in-flight install or debugging a step.

## What `base` actually installs

- `@shipeasy/sdk` (+ `@shipeasy/react` when React is detected).
- `@shipeasy/cli` (`shipeasy` binary) and `@shipeasy/mcp` (`shipeasy-mcp`
  binary) — recommended as global installs so all your projects share one
  CLI session.
- `.shipeasy` binding file at the repo root (commit it; never gitignore).
- `SHIPEASY_SERVER_KEY` + the framework-appropriate
  `*_SHIPEASY_CLIENT_KEY` written to the project's secret store.
- An `await shipeasy({...})` call in the root layout, with
  `getBootstrapHtml()` rendered into `<head>`.
- MCP server registered for Claude Code (project-scoped `.mcp.json`).

## What each feature plugin adds on top

| Plugin                         | Module flipped on  | Skills installed       | Slash commands                                                                 |
| ------------------------------ | ------------------ | ---------------------- | ------------------------------------------------------------------------------ |
| `shipeasy@experiments-metrics` | `experiments`      | `shipeasy-experiments` | `/shipeasy-experiments-setup`, `/shipeasy-experiment`                          |
| `shipeasy@configs-gates`       | `gates`, `configs` | `shipeasy-flags`       | `/shipeasy-flags-setup`, `/shipeasy-flag`                                      |
| `shipeasy@polylang`            | `translations`     | `shipeasy-i18n`        | `/shipeasy-polylang-setup`, `/shipeasy-i18n-extract`, `/shipeasy-i18n-migrate` |
| `shipeasy@bugs`                | `feedback`         | `shipeasy-bugs`        | `/shipeasy-bugs-setup`, `/shipeasy-bug`                                        |

Modules are per-project flags toggled with
`shipeasy modules {enable,disable,list} <name>`. They're independent —
turn on any subset, in any order. Disabling a module is reversible;
existing keys / gates / experiments / translations stay intact.

## Other assistants (Cursor, Windsurf, etc.) and offline installs

The marketplace flow is Claude-Code specific. For other assistants, fall
back to the CLI:

```bash
npm i -g @shipeasy/cli @shipeasy/mcp
shipeasy login
shipeasy projects upsert --domain <production-domain>
shipeasy plugin install            # writes .claude/commands + .claude/skills
shipeasy mcp install --scope project   # writes .cursor/mcp.json + .windsurf/mcp.json
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
- `403 module not enabled` → run the matching plugin's `*-setup` slash
  command (or `shipeasy modules enable <name>` directly).
- A feature plugin's setup refuses to run because base is missing → run
  `claude plugin install shipeasy@base` + `/shipeasy-setup` first.

Every skill self-heals once, then escalates to the user. If you hit a
step twice in a row, stop and ask.
