# Shipeasy — Experiments + Metrics Install

Adds A/B testing and custom event collection to a project that already
finished [`general.md`](./general.md). Verify that first — `.shipeasy`
must exist, `shipeasy whoami` must show a bound dir, and the SDK must be
wired into the root layout.

---

## 1. Enable the module

```bash
shipeasy modules enable experiments
shipeasy modules list      # confirm `experiments` shows ✓
```

The `experiments` module gates both A/B assignment endpoints
(`/sdk/experiments`, `/sdk/evaluate`) and the analysis pipeline that
writes group statistics back to D1. With it off, every `experiments.assign`
call returns the default group and no metrics are aggregated.

Self-heal: `403 module not enabled` from the admin API means this step was
skipped. Re-run the command above.

---

## 2. Confirm the SDK is wired

Experiments use the same single `shipeasy()` configure call from
[`general.md` §5](./general.md). No additional client/server setup is
needed — `getBootstrapHtml()` already arranges SSR assignment and hands the
client SDK a hydrated payload.

Quick sanity check from a server component:

```ts
import { experiments } from "@shipeasy/sdk/server";

const { group, params } = await experiments.assign("smoke-test", {
  user_id: "anonymous",
});
console.log({ group, params }); // should return the default group while no experiment exists
```

---

## 3. Custom event collection (metrics)

Events are how Shipeasy measures experiment outcomes. The SDK has a
fire-and-forget `track()` API that sends to the edge worker's `/collect`
endpoint (Analytics Engine). No extra dependency, no schema to define
up-front — events are shape-validated server-side against the registered
metric catalogue at analysis time.

```ts
// Server (e.g. a route handler that records a purchase):
import { events } from "@shipeasy/sdk/server";
events.track("purchase_completed", {
  user_id,
  amount_cents: total,
  currency: "USD",
});

// Client (e.g. a button onClick):
import { events } from "@shipeasy/sdk/client";
events.track("cta_click", { surface: "hero" });
```

Auto-collected metrics (page views, click depth, time-on-page) ship out of
the box once the SDK is configured — nothing to wire. Inspect what's being
collected on the project's **Metrics** dashboard.

To register a custom metric for use as a success metric on an experiment:

```bash
shipeasy experiments metrics create purchase_completed --type count
# or MCP:
mcp tool: exp_create_metric { "name": "purchase_completed", "type": "count" }
```

(Types: `count`, `sum`, `mean`, `proportion`.)

---

## 4. Create an experiment

Follow the `shipeasy-experiments` skill (installed by
`shipeasy plugin install` during general step 6). The short version:

```
mcp tool: exp_create_experiment {
  "name": "checkout_button_v2",
  "universe": "default",
  "groups": [
    { "name": "control",   "allocation": 50, "params": { "variant": "v1" } },
    { "name": "treatment", "allocation": 50, "params": { "variant": "v2" } }
  ],
  "success_metric": "purchase_completed"
}
mcp tool: exp_start_experiment { "name": "checkout_button_v2" }
```

CLI equivalent: `shipeasy experiments create … && shipeasy experiments start <name>`.

Read from code:

```ts
import { experiments } from "@shipeasy/sdk/server"; // or /client
const { group, params } = await experiments.assign("checkout_button_v2", {
  user_id,
});
```

Sticky assignment is keyed by `user_id` — pass the same identifier every
time for that user.

---

## 5. Verify

```bash
shipeasy experiments list                       # row shows status=running
shipeasy experiments status checkout_button_v2  # enrolled counts trending up
```

Open the experiment in the dashboard and confirm:

- The assignment graph shows traffic flowing to both groups.
- The metrics tab shows events arriving (auto-collected + your custom
  `purchase_completed`).

If the assignment count stays at zero, the most common cause is the
experiment was never `start`-ed, or `shipeasy modules enable experiments`
was skipped.

---

## 6. Hand-off & commit

Add to the per-feature hand-off report:

```
Modules:   experiments ✓
Created:   1 experiment (checkout_button_v2), 1 custom metric (purchase_completed)
Wired:     experiments.assign(...) call in <file:line>
```

Commit footprint: only the SDK call sites you added (`experiments.assign(…)`,
`events.track(…)`). No new env vars, no new package deps — the SDK was
already installed by `general.md`.

---

## Hard rules (repeat from skill)

- One pre-registered success metric per experiment. Don't peek-and-rename.
- Don't restart an experiment under the same name after stopping — the
  assignment hash changes and bias your result. Pick a new name.
- Holdouts live on the **universe**, not on individual experiments.
- PII never goes into `experiments.assign` attributes. Use coarse buckets
  (country, plan, account-age bucket).
