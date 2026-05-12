# Shipeasy — Configs, Gates & Kill Switches Install

Adds feature gates (booleans / rollouts), dynamic configs (typed JSON
knobs), and kill switches to a project that already finished
[`general.md`](./general.md). Verify that first — `.shipeasy` must exist,
`shipeasy whoami` must show a bound dir, and the SDK must be wired into
the root layout.

The three primitives share one KV blob and one evaluation path:

| Primitive       | What it returns                                 | Default         | Typical use                      |
| --------------- | ----------------------------------------------- | --------------- | -------------------------------- |
| **Gate**        | `boolean` (with rollout % + targeting)          | `false`         | "Is feature X on?"               |
| **Config**      | typed JSON value (string / number / object / …) | `default_value` | Tunable knobs                    |
| **Kill switch** | `boolean` that defaults **on**                  | `true`          | Emergency-off for risky launches |

---

## 1. Enable the modules

Gates and configs are billed/toggled independently. Enable whichever you
need; you can re-run any time.

```bash
shipeasy modules enable gates
shipeasy modules enable configs
shipeasy modules list      # confirm both show ✓
```

Kill switches reuse the `gates` module — there's no separate toggle.

Self-heal: `403 module not enabled` on `flags.check` / `configs.get` means
this step was skipped. Re-run the matching command above.

---

## 2. Confirm the SDK is wired

Flags / configs use the same single `shipeasy()` call from
[`general.md` §5](./general.md). No additional client/server setup is
needed — KV is served from CDN and the SDK reads the cached blob.

Quick sanity check from a server component:

```ts
import { gates, configs } from "@shipeasy/sdk/server";
console.log(await gates.check("smoke-test")); // false (no such gate)
console.log(await configs.get("smoke-config", "fallback")); // "fallback"
```

---

## 3. Create gates / configs / kill switches

Follow the `shipeasy-flags` skill (installed by `shipeasy plugin install`
during general step 6).

### 3a. Feature gate (boolean with rollout)

Start dark. Ramp manually.

```
mcp tool: exp_create_gate {
  "name": "checkout_v2",
  "rollout_percent": 0,
  "targeting": [{ "attribute": "country", "op": "in", "values": ["US","CA"] }],
  "default": false
}
```

CLI: `shipeasy flags create --name checkout_v2 --percent 0`.

### 3b. Dynamic config (typed JSON)

```
mcp tool: exp_create_config {
  "name": "search_ranking",
  "value_type": "json",
  "default_value": { "boost": 1.0, "model": "v3" },
  "rules": [
    { "if": { "country": "DE" }, "value": { "boost": 1.2, "model": "v3" } }
  ]
}
```

CLI: `shipeasy configs create --help`.

### 3c. Kill switch (boolean defaulting **on**)

```bash
shipeasy killswitches create kill_checkout_v2 --description "Disable v2 path on first signal of breakage"
# or MCP:
mcp tool: exp_create_killswitch { "name": "kill_checkout_v2", "default": true }
```

Convention: prefix `kill_…` and gate the **old** code path on `true`.
Flip the switch to **off** to fall back to the old path during an
incident.

---

## 4. Read from code

Server (one configure call already done in `layout.tsx`):

```ts
import { gates, configs, killswitches } from "@shipeasy/sdk/server";

if (await gates.check("checkout_v2", { country: req.country })) {
  // new path
}

const ranking = await configs.get("search_ranking", { country: req.country });

if (await killswitches.check("kill_checkout_v2")) {
  // old path — switch is "on" by default; flip off to disable v2
}
```

Client:

```ts
import { gates, configs } from "@shipeasy/sdk/client";
const isOn = gates.check("checkout_v2"); // attributes pulled from session context
const ranking = configs.get("search_ranking");
```

---

## 5. Rollout playbook (gates)

1. Create the gate at `rollout_percent: 0` with the new code path gated on it.
2. Ship to production. Both code paths exist; nothing changes.
3. Ramp: `5 → 25 → 50 → 100`, watching error/latency dashboards.
4. Once at 100% for at least one full deploy cycle, **remove the gate from
   code**. Configs/gates are not a substitute for releases; leaving them in
   forever creates branching that rots.
5. Archive the gate after code removal.

```bash
shipeasy flags update checkout_v2 --percent 25
shipeasy flags update checkout_v2 --percent 100
shipeasy flags archive checkout_v2
```

---

## 6. Verify

```bash
shipeasy flags list                         # gates + their rollout %
shipeasy configs list                       # configs + default values
shipeasy killswitches list                  # kill switches + current state
```

Open the project in the dashboard and confirm the rules render. CDN cache
purges fire automatically on every write — give it ~2s and read back from
the SDK to confirm the new value lands.

---

## 7. Hand-off & commit

Per-feature hand-off snippet:

```
Modules:   gates ✓ configs ✓
Created:   <N> gates, <N> configs, <N> kill switches
Wired:     gates.check / configs.get / killswitches.check call sites in <file:line>
```

Commit footprint: only the SDK call sites you added. No new env vars, no new
package deps — the SDK was already installed by `general.md`.

---

## Hard rules (repeat from skill)

- Gate **new** behavior, not old behavior. The default value is what users
  see if KV is unreachable — make it the safe path.
- Don't gate on PII. Targeting attributes should be coarse-grained
  (country, plan, account age bucket).
- Kill switches default **on** and gate the **old** code path. Inverting
  this convention is a frequent footgun.
- Plan-level knobs (poll interval, etc.) live in
  `packages/core/src/config/plans.ts`, not in gates/configs. Those are
  server-side knobs, not customer-facing.
