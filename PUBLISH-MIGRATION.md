# Phase B — Publish & Repo Migration Runbook

Goal: get four currently-private packages into public GitHub repos under
`shipeasy-ai`, published to npm via Trusted Publishing on tag, and
referenced as submodules from this monorepo — matching the pattern the
TypeScript SDK already follows (`packages/ts-sdk` → `shipeasy-ai/sdk`).

Decisions already made:

- `packages/admin-api` (`@shipeasy/admin-api`) → repo `shipeasy-ai/openapi`,
  rename npm package to `@shipeasy/openapi`.
- `packages/mcp-server` is a legacy duplicate of `packages/mcp` — delete
  during the migration.
- `marketplace/` (Claude Code plugin marketplace) → repo
  `shipeasy-ai/shipeasy`, no npm publish (consumers reach it via
  `claude plugin marketplace add shipeasy-ai/shipeasy`).

Execution model: bundled runbook. Run each phase yourself (you have npm +
gh creds). Each phase is reversible until the npm publish step (npm
versions are immutable).

---

## Phase 0 — Prep the monorepo (safe, local-only)

### 0a. Rename `@shipeasy/admin-api` → `@shipeasy/openapi`

Touches: `packages/admin-api/package.json`, plus six consumers:

```
packages/admin-api/package.json                         # name + main entry
packages/admin-api/scripts/emit-spec.ts                 # import path (if any)
packages/mcp/package.json                               # dep
packages/mcp/src/util/api-client.ts                     # import
packages/cli/package.json                               # dep
packages/cli/src/api/client.ts                          # import
packages/cli/src/commands/experiments.ts                # import
apps/docs/scripts/generate-api-reference.ts             # import
```

Workflow:

```bash
# In the monorepo root:
sd '"@shipeasy/admin-api"' '"@shipeasy/openapi"' $(grep -rl '@shipeasy/admin-api' packages apps --include='*.ts' --include='*.tsx' --include='*.json')
mv packages/admin-api packages/openapi
# Update pnpm-workspace.yaml only if it pins the path (it doesn't — uses globs).
pnpm install
pnpm --filter @shipeasy/openapi build
pnpm --filter @shipeasy/cli type-check
pnpm --filter @shipeasy/mcp type-check
```

Verify nothing imports the old name:

```bash
grep -r '@shipeasy/admin-api' --include='*.ts' --include='*.tsx' --include='*.json' . | grep -v node_modules | grep -v dist
# expect: no results
```

Commit: `refactor: rename @shipeasy/admin-api → @shipeasy/openapi`.

### 0b. Delete the legacy `packages/mcp-server`

```bash
git rm -r packages/mcp-server
pnpm install      # prunes lockfile
pnpm build        # ensures nothing else referenced it
```

Commit: `chore: drop legacy packages/mcp-server (superseded by @shipeasy/mcp)`.

### 0c. Add publish workflows + dependabot per package

Use `packages/ts-sdk/.github/workflows/publish.yml` as the template (it
already does Trusted Publishing with `--provenance` and a tag-triggered
release). Copy it into:

```
packages/cli/.github/workflows/publish.yml
packages/cli/.github/workflows/test.yml
packages/cli/.github/dependabot.yml
packages/mcp/.github/workflows/publish.yml
packages/mcp/.github/workflows/test.yml
packages/mcp/.github/dependabot.yml
packages/openapi/.github/workflows/publish.yml
packages/openapi/.github/workflows/test.yml
packages/openapi/.github/dependabot.yml
marketplace/.github/workflows/test.yml          # marketplace has no npm publish
```

In each `publish.yml`:

- Change `Publish @shipeasy/sdk to npm` job step's package name to match.
- Confirm `pnpm run build` / `pnpm run test` scripts exist in the target
  `package.json`. If missing, add no-op scripts so the workflow doesn't
  fail before the publish step.

Commit: `chore: add per-package publish/test workflows for CLI, MCP, openapi, marketplace`.

---

## Phase 1 — Create the four GitHub repos

```bash
gh repo create shipeasy-ai/cli       --public --description "Shipeasy CLI — shipeasy binary, codemods, plugin bundle"
gh repo create shipeasy-ai/mcp       --public --description "Shipeasy MCP server — shipeasy-mcp binary, agent tools"
gh repo create shipeasy-ai/openapi   --public --description "Shipeasy admin OpenAPI spec + typed client (@shipeasy/openapi)"
gh repo create shipeasy-ai/shipeasy  --public --description "Shipeasy Claude Code plugin marketplace"
```

Verify each: `gh repo view shipeasy-ai/<name>`.

---

## Phase 2 — Subtree-split each package out

`git subtree split` preserves the relevant history. Repeat for each path,
push to the matching repo's `main`, then verify.

```bash
# CLI
git subtree split -P packages/cli -b split/cli
git push git@github.com:shipeasy-ai/cli.git split/cli:main
git branch -D split/cli

# MCP
git subtree split -P packages/mcp -b split/mcp
git push git@github.com:shipeasy-ai/mcp.git split/mcp:main
git branch -D split/mcp

# openapi
git subtree split -P packages/openapi -b split/openapi
git push git@github.com:shipeasy-ai/openapi.git split/openapi:main
git branch -D split/openapi

# marketplace
git subtree split -P marketplace -b split/marketplace
git push git@github.com:shipeasy-ai/shipeasy.git split/marketplace:main
git branch -D split/marketplace
```

Verify on each repo (`gh repo view --web shipeasy-ai/<name>`):

- Default branch is `main`.
- `.github/workflows/publish.yml` is present.
- `package.json` `name` matches the npm package you intend to publish.

---

## Phase 3 — Configure Trusted Publishing on npm (one-time, per package)

For each of `@shipeasy/cli`, `@shipeasy/mcp`, `@shipeasy/openapi`:

1. Go to <https://www.npmjs.com/package/@shipeasy/cli/access> (and equivalents).
   Skip this for first-time-published packages — set up Trusted Publishing
   from the org settings instead.
2. Under **Trusted Publisher**, add a GitHub Actions publisher pinning:
   - Repository: `shipeasy-ai/cli` (or `mcp`, `openapi`).
   - Workflow filename: `publish.yml`.
   - Environment: leave blank.

The workflow already uses `id-token: write` and `npm publish --provenance`,
so the first tagged release will mint the package on npm and attach
provenance attestation. **No `NPM_TOKEN` secret is needed** — Trusted
Publishing replaces it.

Verify each Trusted Publisher entry is saved before tagging.

---

## Phase 4 — First publishes (irreversible)

Tag each new repo's `v1.0.0` to fire its `publish.yml`:

```bash
# CLI
git clone git@github.com:shipeasy-ai/cli.git /tmp/se-cli && cd /tmp/se-cli
gh release create v1.0.0 --generate-notes
# Watch the workflow:
gh run watch
cd - && rm -rf /tmp/se-cli

# Repeat for mcp and openapi.
```

Verify each is live on npm:

```bash
npm view @shipeasy/cli version       # 1.0.0
npm view @shipeasy/mcp version       # 1.0.0
npm view @shipeasy/openapi version   # 1.0.0
```

If a workflow fails: read the logs (`gh run view <run-id>`), fix in a
follow-up commit to the relevant repo, retag (`gh release delete v1.0.0
--cleanup-tag && gh release create v1.0.0 …`). Do **not** `npm publish`
manually — it bypasses provenance attestation and creates the kind of
drift documented in the SDK's CHANGELOG (2.1.2–2.1.7 manual publishes).

---

## Phase 5 — Convert monorepo paths to submodules

For each migrated package, replace the in-tree directory with a proper
`160000` gitlink (the `040000` inline-tree mistake the SDK currently has
in `packages/client-sdks/react` and `packages/server-sdks/sdk-ruby` is
what we're trying to avoid).

```bash
# Inside the monorepo root:
git rm -r packages/cli
git submodule add git@github.com:shipeasy-ai/cli.git packages/cli

git rm -r packages/mcp
git submodule add git@github.com:shipeasy-ai/mcp.git packages/mcp

git rm -r packages/openapi
git submodule add git@github.com:shipeasy-ai/openapi.git packages/openapi

# marketplace is not consumed inside the monorepo — drop it after the
# subtree split so we don't keep a divergent copy:
git rm -r marketplace
```

Confirm `.gitmodules` now has four entries (the existing `ts-sdk` + the
three new ones) and `git ls-files --stage packages/{cli,mcp,openapi}`
shows `160000` mode lines.

Update `pnpm-workspace.yaml` — submodule paths are still under
`packages/*`, so no change needed if the glob covers them. Run
`pnpm install` to refresh the lockfile against npm-resolved deps (the
workspace `:*` indirection is gone now that these packages live outside
the monorepo).

Update consumer pins. In `apps/ui/package.json` and any other consumer:

```diff
-"@shipeasy/admin-api": "workspace:*",
+"@shipeasy/openapi": "^1.0.0",
```

Commit: `chore: migrate cli/mcp/openapi to submodules; drop marketplace from monorepo`.

---

## Phase 6 — Wire the Claude marketplace

```bash
# As a Claude Code user:
claude plugin marketplace add shipeasy-ai/shipeasy
claude plugin install shipeasy@base
# … then any feature plugins.
```

Smoke-test on a fresh clone of a target app. If everything works,
update `INSTALL.md`'s `claude plugin marketplace add` line if the repo
ended up at a different slug than `shipeasy-ai/shipeasy`.

---

## Rollback

- Pre-Phase 4: every change above is reversible. Reset the local branch,
  delete the GitHub repos (`gh repo delete shipeasy-ai/<name> --yes`),
  revert the rename + delete commits.
- Post-Phase 4 (npm publish fired): you cannot unpublish npm versions
  older than 72 hours without losing the version number forever. Instead,
  publish a `v1.0.1` patch with the fix and pin consumers to `^1.0.1`.
- Post-Phase 5 (submodules in place): if you need to undo, `git rm` the
  submodule directories, drop entries from `.gitmodules`, and restore the
  in-tree copy from a pre-migration commit.

## Tech debt to clean up after the migration

- `packages/cli/skills/` and `marketplace/<plugin>/skills/` currently
  duplicate the same SKILL.md files. Pick one source of truth (probably
  `marketplace/`) and have the CLI's `shipeasy plugin install` /
  `shipeasy skills install` commands consume from there.
- `packages/cli/plugin/` similarly duplicates the marketplace structure.
  Once the CLI is updated to read from `marketplace/`, delete
  `packages/cli/plugin/`.
- The two broken submodules called out in `CLAUDE.md`
  (`packages/client-sdks/react`, `packages/server-sdks/sdk-ruby`) still
  need bidirectional-drift reconciliation before they can be converted to
  proper gitlinks. Not blocked on this migration, but the same procedure
  applies.
