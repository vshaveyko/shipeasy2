# Shipeasy — Translations Install

Adds CDN-served translatable copy to a project that already finished
[`general.md`](./general.md). Verify that first — `.shipeasy` must exist,
`shipeasy whoami` must show a bound dir, and the SDK must be wired into
the root layout.

---

## 1. Enable the module

```bash
shipeasy modules enable translations
shipeasy modules list      # confirm `translations` shows ✓
```

The `translations` module gates both the `i18n_*` admin API surface and
the CDN loader's read path. With it off, every `i18n.t(...)` call returns
the raw key.

Self-heal: `403 module not enabled` from any `i18n_*` admin call or a
loader `403` in the browser network panel means this step was skipped.

---

## 2. Confirm the SDK + bootstrap script are wired

The canonical pattern from [`general.md` §5](./general.md) renders
`getBootstrapHtml()` into `<head>`, which already:

1. Seeds `window.__SE_BOOTSTRAP` with SSR'd i18n strings (no flash of
   untranslated keys on first paint).
2. Installs a synchronous `window.i18n` shim so `i18n.t()` works
   immediately.
3. Appends the CDN i18n loader with the correct `data-profile` +
   `data-key` attributes.

If you followed `general.md` to the letter, **skip step 3 below.**
The standalone `install-loader` command is only for projects that can't
render `getBootstrapHtml()` (Pages Router, plain HTML, etc.).

---

## 3. Inject the loader script (only when `getBootstrapHtml()` isn't an option)

Cases that need this:

- `nextjs-pages` (no root layout) — adds to `pages/_document.tsx`.
- `react-vite` / static HTML (no SSR) — adds to `index.html`.
- Any framework where you can't render `getBootstrapHtml()` into `<head>`.

```bash
shipeasy i18n install-loader --profile en:prod
```

The CLI auto-injects into the right file based on framework, and reuses
the existing client key from your `.env*` file (or from a previous run's
`.shipeasy` file) so it doesn't burn a new key on every install. The
client-key resolution order:

1. `--data-key` flag
2. `.shipeasy` file (cached from a prior run)
3. `NEXT_PUBLIC_SHIPEASY_CLIENT_KEY` / `VITE_SHIPEASY_CLIENT_KEY` /
   `PUBLIC_SHIPEASY_CLIENT_KEY` / `SHIPEASY_CLIENT_KEY`
4. Last resort: mint a new key.

Self-heal: if the file the CLI tried to edit doesn't exist, pass
`--path <file>` explicitly. If the framework is `unknown`, run with
`--print` to get the tag and ask the user where to paste it.

Verify:

```bash
git diff --stat
grep -r 'data-key=' --include='*.tsx' --include='*.html' src . app . index.html 2>/dev/null
```

---

## 4. Create the profile

A **profile** is a `<lang>:<channel>` tuple — e.g. `en:prod`, `en:staging`,
`fr:prod`. Keys are scoped per profile so you can iterate translations
without affecting production.

**Use `en:prod` for the primary profile.** It's what `getBootstrapHtml()`
and the server SDK's SSR fetch default to — picking anything else means
every install needs a manual override and is the most common reason
translations look like they "didn't take effect" after a deploy. Older
guides mention `default`; that was the CLI's pre-2.1 default and it no
longer matches the SDK's runtime defaults.

```bash
shipeasy i18n profiles list
# If empty or your target name isn't there:
shipeasy i18n profiles create en:prod --locales en
```

The CLI does **not** auto-create the profile — it must exist before
publishing.

---

## 5. Discover translatable strings

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

---

## 6. Wrap and/or push keys

Follow the `shipeasy-i18n` skill (installed by `shipeasy plugin install`
during general step 6). For each chosen candidate, either:

a. **Wrap in code** with `t('<key>')`, then push the key/value pair, **or**
b. **Push directly** as raw key/value if it's a label that has no code site
yet (rare).

Push via the MCP server (preferred — gives structured errors):

```
mcp tool: i18n_create_key
  { "key": "landing.hero.title", "value": "Ship faster with Shipeasy", "profile": "en:prod" }
```

Or via the CLI if MCP isn't wired up:

```bash
echo '{"landing.hero.title":"Ship faster with Shipeasy"}' > /tmp/keys.json
shipeasy i18n push /tmp/keys.json --profile en:prod
```

For bulk extraction across the codebase, the bundled codemod is faster
than wrapping by hand:

```bash
shipeasy codemod i18n-extract --profile en:prod          # rewrites JSX text → t(...)
```

---

## 7. Validate and publish

CLI:

```bash
shipeasy i18n validate --profile en:prod       # checks wrapped t(...) calls
shipeasy i18n publish  --profile en:prod       # publishes chunk to CDN
```

Or via MCP:

```
mcp tool: i18n_validate_keys { "profile": "en:prod" }
mcp tool: i18n_publish_profile { "profile": "en:prod", "chunk": "default" }
```

Note: `i18n_validate_keys` (and `shipeasy i18n validate`) only check that
wrapped `t(...)` references in code resolve to keys on the server — they do
**not** scan the discovery output. A "no i18n key references found" result
right after a 900-row scan is expected if no calls have been wrapped yet;
it is not an error.

Self-heal:

- `409 key exists` → fine, leave it.
- `401` → token expired, re-run `shipeasy login`, retry once.
- `429` plan-limit → surface to user; do not auto-upgrade plan.
- `Profile '<name>' not found` → run
  `shipeasy i18n profiles create <name> --locales en` and retry.

Verify in the browser: load any page that uses the loader script — the
devtools panel (`?se=1`) should list the new keys under the Translations
tab.

---

## 8. Hand-off & commit

Per-feature hand-off snippet:

```
Modules:   translations ✓
Profile:   en:prod (en)
Keys live: <N> i18n keys pushed
Wired:     i18n.t('<key>') call sites in <files modified by codemod>
```

Commit footprint:

| Path                                    | What it is                             | Commit?                                            |
| --------------------------------------- | -------------------------------------- | -------------------------------------------------- |
| `<files modified by codemod>`           | wrapped strings + `i18n.t(...)` calls  | yes — best in a separate commit; the diff is large |
| `src/i18n/en.json` or `i18n/en.json`    | seed translation keys (codemod output) | yes — pairs with the codemod commit                |
| Loader injection in layout/`index.html` | only if you ran step 3                 | yes                                                |

Split into two commits if the codemod modified many source files — one for
the install plumbing and one for the codemod-applied wrapping — so the
diff stays reviewable.
