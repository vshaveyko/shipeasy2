# Shipeasy — Bugs + Feature Requests Install

Adds the in-browser bug-report / feature-request widget (and the CLI
mirror) to a project that already finished [`general.md`](./general.md).
Verify that first — `.shipeasy` must exist, `shipeasy whoami` must show
a bound dir, and the SDK must be wired into the root layout.

This is the lightest of the per-feature installs: there's no SDK call to
add, no key catalogue, no rollout playbook. Enable the module, confirm
the devtools overlay loads, and you're done.

---

## 1. Enable the module

```bash
shipeasy modules enable feedback
shipeasy modules list      # confirm `feedback` shows ✓
```

The `feedback` module gates the admin API surface (`/api/admin/bugs`,
`/api/admin/features`) and the devtools overlay's "Report" panel. With it
off, the panel is hidden and CLI `feedback` writes return `403`.

Self-heal: `403 module not enabled` on `shipeasy feedback bugs create`
means this step was skipped. Re-run the command above.

---

## 2. Confirm the devtools overlay is wired

The `getBootstrapHtml()` call from [`general.md` §5](./general.md) already
lazily injects `se-devtools.js` whenever the page URL contains
`?se` / `?se_devtools`. The same overlay is what end users use to submit
bug reports.

Quick sanity check:

1. Boot the dev server: `pnpm dev` (or equivalent).
2. Visit any page with `?se=1` appended, e.g.
   `http://localhost:3000/?se=1`.
3. Confirm the devtools panel renders at the bottom-right.
4. Click the **Report** tab — you should see a form with title +
   description + page-URL fields.

If the panel never appears, the most common cause is that
`getBootstrapHtml()` isn't rendered into `<head>` — see general step 5.

For production access, the same `?se=1` query param works for anyone with
access to the project's session — the loader bundle is public, the API
gate is the project's `feedback` module flag.

---

## 3. File from the CLI (optional)

Same admin surface as the overlay, useful in CI scripts and triage flows.

```bash
shipeasy feedback bugs create "Checkout button is unresponsive on mobile" \
  --description "Tapping 'Pay' on iOS Safari does nothing on slow 3G." \
  --page-url "https://acme.com/checkout"

shipeasy feedback features create "Bulk-archive in dashboard" \
  --description "Lets ops clear stale gates without opening each row."
```

Listing & triage:

```bash
shipeasy feedback bugs list
shipeasy feedback bugs delete <id-or-prefix>

shipeasy feedback features list
shipeasy feedback features delete <id-or-prefix>
```

Pipe through `--json` for scripted triage.

Slash command: `/shipeasy-bug` (installed by `shipeasy plugin install`
during general step 6) — wraps the same flow with arg-hint completion.

---

## 4. Verify

```bash
shipeasy feedback bugs list           # smoke: no API error
shipeasy feedback features list       # smoke: no API error
```

Open the project in the dashboard and confirm the **Feedback** tab is
visible (it stays hidden when the module is off). Both bug reports and
feature requests render there for triage.

---

## 5. Hand-off & commit

Per-feature hand-off snippet:

```
Modules:   feedback ✓
Wired:     devtools overlay (`?se=1` on any page rendering getBootstrapHtml)
CLI:       `shipeasy feedback bugs|features {list,create,delete}`
```

Commit footprint: **none.** This guide does not modify any code — the
module toggle is server-side state on the project record, and the
devtools overlay was already wired in `general.md`. Nothing new to stage.

---

## When to use the `shipeasy-bugs` skill

The skill triggers on phrases like "the customer reported a bug", "log a
feature request", "show me open feedback". It wraps the same CLI/MCP
surface above. If a teammate's assistant fires the skill but feedback
writes return `403`, they skipped step 1 — point them here.

---

## Hard rules

- The CLI/SDK does **not** expose a read API for triage; the dashboard
  and the admin API are the consumer surface. Don't build a custom
  `/feedback` view on top of an SDK helper that doesn't exist.
- Don't `delete` reports without the user asking — triage happens in the
  dashboard, not from a script.
- The `feedback` module is independent of `experiments` / `gates` /
  `configs` / `translations`. Enabling it has no effect on the SDK's hot
  path or KV blobs.
