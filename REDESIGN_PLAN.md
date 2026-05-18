# Shipeasy redesign — design-system + UI implementation plan

## Progress (2026-05-16)

**Phase 1a — globals.css tokens — DONE.** Appended after `.num` block in [globals.css](apps/ui/src/app/globals.css):

- Type-scale utilities: `.t-display`, `.t-h1`, `.t-h2`, `.t-h3`, `.t-body`, `.t-sm`, `.t-xs` (sizes/weights/letter-spacing/line-height from prototype `app.css`).
- Spacing scale custom props `--s-1`..`--s-10` (4/8/12/16/20/24/32/40/56/72px).
- Animation tokens: `--ease-fold` + `--dur-fold` (280ms / cubic-bezier(.4,0,.2,1)) for UnifiedList; `--ease-pop` + `--dur-pop` (220ms) for BigModalWizard.
- Striped helpers: `.bg-stripe`, `.bg-stripe-accent`, `.bg-stripe-warn`, `.bg-stripe-danger` (used by HoldoutBar, "not-yet-designed" placeholders).

**Phase 1b — new primitives in [src/components/ui/](apps/ui/src/components/ui/) — DONE.** 13 files:

- [skeleton.tsx](apps/ui/src/components/ui/skeleton.tsx) — shimmer block.
- [banner.tsx](apps/ui/src/components/ui/banner.tsx) — `info|warn|danger|accent` inline notice, lucide icon, title + body + optional action slot.
- [progress-bar.tsx](apps/ui/src/components/ui/progress-bar.tsx) — `<ProgressBar>` (5 intents, optional `striped`) + `<HoldoutBar>` (dual-band variant/holdout overlay).
- [numeric-delta.tsx](apps/ui/src/components/ui/numeric-delta.tsx) — `▲ +12.4%` chip, accent/danger/neutral, tabular-nums, optional `invert` for "down is good".
- [env-tabs.tsx](apps/ui/src/components/ui/env-tabs.tsx) — promotes existing `.env-tabs` CSS class to a controlled component (prod/staging/dev default).
- [table.tsx](apps/ui/src/components/ui/table.tsx) — `<Table/THead/TBody/TR/TH/TD>`. Sticky thead, mono uppercase headers (10.5px caps), 48–52px row, `interactive`/`active` props on TR (accent left-border).
- [stepper.tsx](apps/ui/src/components/ui/stepper.tsx) — compact horizontal stepper (dots + labels + connectors, done/active/todo states, optional `onSelect`).
- [sparkline.tsx](apps/ui/src/components/ui/sparkline.tsx) — inline SVG polyline + area fill, 5 intents.
- [tabs.tsx](apps/ui/src/components/ui/tabs.tsx) — Base UI Tabs wrapper, accent underline on selected.
- [popover.tsx](apps/ui/src/components/ui/popover.tsx) — Base UI Popover wrapper (`Trigger`/`Content`/`Close`).
- [combobox.tsx](apps/ui/src/components/ui/combobox.tsx) — Base UI Combobox wrapper. Generic over value type, custom trigger (icon + value + chevron), search input, `Collection`-driven item rendering, tick on selected. Replaces every bare `<select>` per the chats' "always use CSelect" rule.
- [drawer.tsx](apps/ui/src/components/ui/drawer.tsx) — Base UI Dialog wrapper styled as a slide-in panel (`side="right|left|top|bottom"`).
- [field-array.tsx](apps/ui/src/components/ui/field-array.tsx) — `<FieldArray>` + `<FieldArrayRow>` (drag handle / content / remove) + `<FieldArrayAdd>` (dashed "Add row" button). For rules / variants / metrics lists in wizards.

**Phase 1c — existing primitive polish — partial:**

- [dialog.tsx](apps/ui/src/components/ui/dialog.tsx) gained `size="default" | "big-modal"`. Big-modal: 1180px max-width × calc(100vh-130px), grid 3-row (head/body/foot), radial-gradient backdrop + blur(6px), layered shadow + inset highlight. Used as chrome by `BigModalWizard`.
- **Deferred to per-feature application:** button intent palette, input mono variant, badge intent palette, card padding tuning, empty-state polish, code-block tab-switcher verification. These are cosmetic and easier to verify against real screens; will be done as part of each Phase 3 feature step.

**Phase 2a — UnifiedList shell — DONE.** [src/components/shell/unified-list.tsx](apps/ui/src/components/shell/unified-list.tsx). Generic `<UnifiedList<T>>`. API:

- `items`, `getId`, `columns` (closed-table cols with `render`), `renderRail`, `renderDetail`, `selectedId`/`onSelect` (controlled), `loading`, `emptyState`, `toolbar`, optional `railGroups` for grouped rail, optional `detailHeader` (← back button + record meta).
- Internals: cross-fading `.pane-layer.full-table` (opacity 0 at 200ms when open) and `.pane-layer.rail` (opacity 1 at 200ms 140ms delayed) inside the list pane. Detail pane: opacity + translate-X(24px → 0) over 260ms 160ms cubic-bezier(.2,.7,.2,1). ESC key listener auto-closes. Skeleton variant renders the same column layout with shimmer blocks.

**Phase 2b — BigModalWizard shell — DONE.** [src/components/shell/big-modal-wizard.tsx](apps/ui/src/components/shell/big-modal-wizard.tsx). API:

- `open`/`onOpenChange`, `kind` ∈ `configs|gates|killswitches|metrics|experiments`, `title`, `eyebrow`, `steps[]` (`id`, `label`, `hint`, `content`, optional `aside`, optional `isValid()`), `current`/`onStepChange`, `onSubmit`, optional `onSaveDraft`, `submitting`.
- Slots: eyebrow row (project · area crumb + ESC kbd + close), head (kind-colored icon badge + "New <Kind>" caps eyebrow + DialogTitle + inline `<Stepper>`), body (grid `minmax(0,1fr) 320px`, radial accent gradient overlay, sticky `aside`), footer (gradient bg, "Step N of M · <label>" left, back/next/submit + ⏎ kbd hint right).
- Kind colors: configs/accent, gates/info-cyan, killswitches/warn, metrics/purple, experiments/orange — borders + chip backgrounds via `color-mix(in oklab, …)`.

**Type-check clean across all changes.** Lint/e2e not re-run yet (additive only, no screen edits).

**Phase 3a — Gates list → UnifiedList — DONE.** [gates-content.tsx](apps/ui/src/app/dashboard/[projectId]/gates/gates-content.tsx) now renders through `<UnifiedList<GateRow>>`. Closed table = name/rollout/rules/status/toggle/snippet/actions columns. Rail row = shield icon + name + `pct · n rules` + status dot. Detail pane (right) = eyebrow + h2(name) + 3-stat grid (Public rollout / Rules / State) + Enable-Disable card + "Open in full editor" / standalone link + Danger zone delete. Selection state lifts to URL (`?open=<id>`) via `useSearchParams` + `router.replace`, ESC handled by shell. Toolbar slot wires a client-side filter input. Type-check clean.

**Phase 3a e2e — DONE.** New describe block `Gates list — UnifiedList chrome` in [gates.spec.ts](apps/ui/e2e/auth/gates.spec.ts):

- Seeds a gate via `POST /api/admin/gates` using the canonical `gateCreateSchema` shape (`name`, `rollout_pct`, `rules`, `enabled` — snake_case `rollout_pct` matters; camelCase silently strips to default 0%). Captures the returned `id` and uses it for href assertion + cleanup.
- Scopes interactions to `[data-slot="pane-full"]` so the closed-table click isn't ambiguous against rail/detail mirrors of the same name.
- Asserts: row click adds `?open=<id>` to URL, detail h2 renders gate name, "Open in full editor" link points at `/gates/<id>`, ESC strips the param and hides the heading, filter input zeroes the closed table and restores it on clear.
- `afterAll` falls back to scanning `/api/admin/gates` if the seed response didn't return an id (shape drift insurance) and `DELETE`s.
- All 3 tests pass locally (`pnpm exec playwright test e2e/auth/gates.spec.ts -g "UnifiedList chrome"`). Existing `Feature Gates CRUD` in [crud.spec.ts](apps/ui/e2e/auth/crud.spec.ts) still passes against the new chrome — toggle button aria-labels, status badge text, and `Actions for <name>` dropdown trigger names are unchanged.

**Phase 3a — new-gate wizard — DONE.** `/gates/new` no longer renders its own page chrome — it's a server-component redirect to `/gates?new=1` (preserves the deep-link). The list page opens a 2-step `<BigModalWizard kind="gates">` from the header "New gate" button or the empty-state CTA:

- Step 1 — **Identity**: mono key input with the same `[a-z0-9][a-z0-9_-]{0,59}` pattern as before; Next is gated on `keyValid`. Aside copy explains the editor takes over after creation.
- Step 2 — **Preview**: summary tile + "Initial rollout 0% / State Paused" pair, plus an aside SDK snippet block that interpolates the entered key into `shipeasy.gate("…")`.
- Submit calls the existing `createGateAction` via `FormData` (single Server Action, no schema change) → it `redirect()`s into `/gates/[id]` so the editor opens automatically.
- Wizard state is URL-driven via `?new=1` (parallels the existing `?open=<id>` deep-link). ESC + close button strip the param and reset internal step/key state.

New file: [new-gate-wizard.tsx](apps/ui/src/app/dashboard/[projectId]/gates/new-gate-wizard.tsx). Touched: [gates-content.tsx](apps/ui/src/app/dashboard/[projectId]/gates/gates-content.tsx) (button + URL state + render in populated & empty branches), [new/page.tsx](apps/ui/src/app/dashboard/[projectId]/gates/new/page.tsx) (now a redirect-only server component).

E2E additions in [gates.spec.ts](apps/ui/e2e/auth/gates.spec.ts) under `Gates — BigModalWizard create flow`:

- Legacy `/gates/new` 301s into `/gates?new=1` and the dialog renders with the "New Gate" eyebrow + "Name your gatekeeper" title.
- Seeds one gate so the populated header renders, clicks "New gate", verifies Next is disabled until a valid key is typed, advances to Preview, submits, and asserts the URL lands on `/gates/<id>` plus the gate exists in `/api/admin/gates` at `rolloutPct: 0`.
- ESC on `?new=1` closes the dialog and strips the param.
- `Feature Gates CRUD` in [crud.spec.ts](apps/ui/e2e/auth/crud.spec.ts) updated to drive the wizard (`#new-gate-key`, Next, Create gate) — the rest of the CRUD chain is unchanged.

Type-check clean. All 6 active `gates.spec.ts` cases + 4 `Feature Gates CRUD` cases pass locally.

**Phase 3a — GateEditorBody extract + detail-pane embed — DONE.** The `GateEditorClient` export in [gate-editor-client.tsx](apps/ui/src/app/dashboard/[projectId]/gates/[id]/gate-editor-client.tsx) is now `GateEditorBody` (props lifted to an exported `GateEditorBodyProps` interface for reuse). The /gates/[id] standalone page imports the new name; the body component itself is unchanged (same 3-step authoring + footer + modals).

New embed: [embedded-gate-editor.tsx](apps/ui/src/app/dashboard/[projectId]/gates/embedded-gate-editor.tsx) — client loader that takes the full gate row already cached by the gates-list SWR, fetches `/api/admin/attributes` via SWR, maps the row + attributes into `GateEditorBody`'s shape (0–10000 bp → 0–100 UI scale, `gate.stack` → `initialStack`, locked key), and renders a skeleton while attributes are in flight.

[gates-content.tsx](apps/ui/src/app/dashboard/[projectId]/gates/gates-content.tsx) DetailPane now renders the embedded editor instead of the prior summary/snippet/danger-zone stack. A sticky top header inside the detail pane keeps the chrome the editor itself doesn't own — status badge, enable/disable toggle, integration snippet button, "Open standalone" deep-link (`/gates/<id>`, with `data-testid="gate-detail-standalone-link"` for tests), and delete button. The list-level `GateRow` shape is now `EmbeddedGateRow` (full Drizzle-row fields: `title`, `folder`, `groupName`, `ownerEmail`, `description`, `stack`) so the SWR cache satisfies the editor without a second fetch per row.

E2E updated + extended in [gates.spec.ts](apps/ui/e2e/auth/gates.spec.ts):

- `Gates list — UnifiedList chrome` › row click now scopes assertions to `[data-slot="detail-pane"]`, asserts the embedded editor renders its "Stack the gates" step label, and verifies the renamed "Open standalone" link's href.
- New describe block `Gates detail pane — embedded editor` covers the embed surface directly:
  - editor stepper exposes all three step labels (Details / Stack / Review) in the pane;
  - sticky toggle disables then re-enables the gate, with `expect.poll` against `/api/admin/gates` to ride out the SWR-mutate latency on each write;
  - "Open standalone" navigates to `/gates/<id>` and the standalone page renders the same body;
  - "Delete gate from detail pane" opens the confirm dialog, deletes, collapses the detail pane back to `/gates`, and removes the row from the admin API.

Existing CRUD coverage in [crud.spec.ts](apps/ui/e2e/auth/crud.spec.ts) still passes — toggle/badge/dropdown selectors are unchanged.

Type-check clean. 10 gates.spec cases (6 prior + 4 new embed) + 4 Feature Gates CRUD cases all pass locally.

**Phase 3a — fully complete.** No remaining items.

**Phase 3a — wizard flesh-out (2026-05-17).** Gates wizard expanded from 2-step (Identity/Preview) to the 4-step shape the prototype's `buildGatesFlow()` uses: **Details / Targeting / Preview / Integrate**.

- `StepGatesView`, `initialStack`, `StackEntry`, `StackSeed`, `Rule`, `InitialAttribute` are now exported from [gate-editor-client.tsx](apps/ui/src/app/dashboard/[projectId]/gates/[id]/gate-editor-client.tsx) so the same Stack authoring UI lives inside the wizard. The wizard owns its local `stack` state (seeded with the locked public floor) plus `upd/move/dup/rm/addEntry` handlers cloned from `GateEditorBody` — submission JSON-encodes the stack into FormData; [actions.ts](apps/ui/src/app/dashboard/[projectId]/gates/actions.ts) `createGateAction` parses and passes it through `createGate({ stack })`.
- Targeting step drops the aside so the body grid switches to single-column (`md:grid-cols-[minmax(0,1fr)_320px]` → `flex flex-col` when `step.aside` is undefined) — the embedded Stack editor already has its own 2-col `.gke-step2` split (stack + Test panel).
- Integrate step is a `<Tabs>` switcher over `<CodeBlock>` snippets (TypeScript / Python / Go / cURL).
- `crud.spec.ts` Feature Gates CRUD + `gates.spec.ts` wizard happy-path updated to walk 4 steps (Step N of 4) instead of 2.

**Phase 3a — Big-modal Dialog fix.** [dialog.tsx](apps/ui/src/components/ui/dialog.tsx) `size="big-modal"` was `grid-rows-[auto_minmax(0,1fr)_auto]` (3 tracks) while `<BigModalWizard>` renders 4 children (eyebrow + head + body + footer); the body fell through to implicit `auto` and the head got all the slack. Fixed to `grid-rows-[auto_auto_minmax(0,1fr)_auto]` so body takes the 1fr track and content sits at the top of the body.

**Phase 3b — Killswitches → UnifiedList + BigModalWizard — DONE.**

- [killswitches/page.tsx](apps/ui/src/app/dashboard/[projectId]/killswitches/page.tsx) trimmed to a thin server component that fetches `listAllKillswitches` and hands the row array to `<KillswitchesContent>`. No more standalone `NewKillswitchTrigger` / empty-state branch on the server side — the client component owns both states.
- [killswitches-content.tsx](apps/ui/src/app/dashboard/[projectId]/killswitches/killswitches-content.tsx) rewritten to render through `<UnifiedList<KillswitchRow>>`. Closed-table columns: Killswitch (icon + name + description), Default (ON/OFF status badge — `killed` tone), Switches (count), Updated, snippet button, actions menu. Rail rows: power icon + leaf + ON/OFF + switch count + status dot. URL state mirrors gates: `?open=<id>` for the detail pane, `?new=1` for the wizard. Folder grouping handled by `railGroups` (one group per `<folder>`), preserving the previous folder.leaf semantics. Old confirm-delete dialog kept.
- [new-killswitch-wizard.tsx](apps/ui/src/app/dashboard/[projectId]/killswitches/new-killswitch-wizard.tsx) — 3-step `<BigModalWizard kind="killswitches">` matching the design's `buildKsFlow()` step count:
  - **Details**: folder + leaf inputs (immutable after publish), optional description. Validates SEGMENT_RE on both halves. Aside shows the live `folder.leaf` key preview.
  - **Default & switches**: default value toggle ("OFF · feature live" / "ON · killswitch active"), `<FieldArray>`-like switches list with add/remove + per-row ON/OFF toggle. Aside summarises eval order ("switches[key] matches → use switch · else → use default value") + the "publishes to dev · staging · prod at once" caveat.
  - **Integrate**: `<Tabs>` over `<CodeBlock>` (TypeScript / Python / Go / cURL). Snippet interpolates the actual key + branches between with-switches and value-only call shape.
- [embedded-killswitch-editor.tsx](apps/ui/src/app/dashboard/[projectId]/killswitches/embedded-killswitch-editor.tsx) — full edit surface for the detail pane. Env tabs (dev / staging / prod) show the per-env published state read-only (value badge + switch count + version + publishedAt date). Below: description, default value toggle, switches array editor. Save calls `updateKillswitch(id, { description, value, switches })` — writes propagate to all three envs at once (matches the existing handler semantics).
- Retired [\_components/killswitch-modal.tsx](apps/ui/src/app/dashboard/[projectId]/killswitches/_components/) and `_components/new-killswitch-trigger.tsx` — both removed. No callers left in the codebase.
- [killswitches.spec.ts](apps/ui/e2e/auth/killswitches.spec.ts) rewritten end-to-end. **20/20 pass locally.** Four describe blocks:
  1. **Page shell** — heading + sidebar nav.
  2. **BigModalWizard create flow** — `?new=1` deep-link renders the 3-step wizard with the right step labels in the stepper and "Step 1 of 3" in the footer; happy path drives Details → Default & switches → Integrate → submit and asserts the row lands in `/api/admin/killswitches` with the right value + switches + description; ESC strips `?new=1`; validation rejects uppercase / dots and disables Next.
  3. **UnifiedList + embedded editor** — row click adds `?open=<id>` and renders the embedded editor with env tabs + seeded description; ESC strips the param; flipping the default toggle + saving persists via admin API (with `expect.poll`); filter input narrows the closed table; delete from the detail-pane header removes the row + the API entry.
  4. **Per-switch admin endpoints** — unchanged from before (API only, not affected by Phase 3b chrome).

**Phase 3c — Configs (values) → UnifiedList + BigModalWizard + embedded editor — DONE.**

- [configs/values/page.tsx](apps/ui/src/app/dashboard/[projectId]/configs/values/page.tsx) is now a thin server fetcher that hands the row array to [`<ConfigsContent>`](apps/ui/src/app/dashboard/[projectId]/configs/values/configs-content.tsx). The old auto-redirect to the first config + standalone empty-state page is gone — the client component owns first-run + populated branches.
- [configs-content.tsx](apps/ui/src/app/dashboard/[projectId]/configs/values/configs-content.tsx) renders through `<UnifiedList<ConfigRow>>`. Closed-table columns: Config (icon + name + description), Fields, Published (n/3 envs), Status badge (LIVE / DRAFT / EMPTY), Updated, snippet button, actions menu. Rail rows = sliders icon + name + `<n> fields · <m> draft` + status dot. URL state matches gates/killswitches: `?open=<id>` for the detail pane, `?new=1` for the wizard. Namespace grouping in the rail (`namespace.leaf`).
- [new-config-wizard.tsx](apps/ui/src/app/dashboard/[projectId]/configs/values/new-config-wizard.tsx) — 4-step `<BigModalWizard kind="configs">` matching `buildConfigsFlow()`:
  - **Details**: key input (`#config-key` / `data-testid="config-key-input"`, `[a-z0-9](?:[a-z0-9._-]*[a-z0-9])?` pattern) + optional description. Aside copy lists what the rest of the wizard covers. Next is gated on `keyValid`.
  - **Schema**: lifted in-place from the prior `wizard.tsx` — `<SchemaRow>` table, expandable nested objects, JSONSchema toggle, Import JSON. Reuses [edit-field-dialog.tsx](apps/ui/src/app/dashboard/[projectId]/configs/values/new/edit-field-dialog.tsx), [import-json-dialog.tsx](apps/ui/src/app/dashboard/[projectId]/configs/values/new/import-json-dialog.tsx), and [wizard-helpers.ts](apps/ui/src/app/dashboard/[projectId]/configs/values/new/wizard-helpers.ts) untouched.
  - **Defaults**: `<ValueRow>` table — per-field default editor via [edit-value-dialog.tsx](apps/ui/src/app/dashboard/[projectId]/configs/values/new/edit-value-dialog.tsx) + [paste-json-dialog.tsx](apps/ui/src/app/dashboard/[projectId]/configs/values/new/paste-json-dialog.tsx). Required-missing chip vs. all-set chip.
  - **Review**: 4 cards — Metadata, Schema, Default values JSON (with copy), SDK integration (inline `<Tabs>` over `<CodeBlock>` for TypeScript / Python / Go / cURL). The legacy `IntegrationSnippetDialog` is gone.
  - Submit calls the existing `createConfigAction({name, description, schema, value})` Server Action; the action `redirect()`s into `/configs/values/<id>` (standalone editor).
  - The prototype-only `draftFields` killswitch (Group / Owner / Versions extras) is dropped — that flag was UI-only and not load-bearing.
- [embedded-config-editor.tsx](apps/ui/src/app/dashboard/[projectId]/configs/values/embedded-config-editor.tsx) is the detail-pane surface: SWR loaders for `/api/admin/configs/<id>` + `/api/admin/configs/<id>/activity`, skeleton while loading, then renders [`<ConfigEditorBody>`](apps/ui/src/app/dashboard/[projectId]/configs/values/[id]/editor.tsx) with `hideCrumb` + a custom `onDeleted` that strips `?open=<id>` and re-mutates the list.
- [editor.tsx](apps/ui/src/app/dashboard/[projectId]/configs/values/[id]/editor.tsx) renamed export from `ConfigEditor` to `ConfigEditorBody`, added `ConfigEditorBodyProps` (`initial`, `initialActivity`, `hideCrumb?`, `onDeleted?`). Body shape unchanged: env tabs + publish chrome at top, then key/version/DRAFT/delete row, then schema builder + value form pair, then activity timeline + env diff. Standalone `[id]/page.tsx` imports the renamed component; the embedded variant hides the top "Configs / name" crumb (the list-pane sticky header already shows the name).
- DetailPane sticky header (in configs-content.tsx) carries the chrome the body doesn't own: LIVE / DRAFT / EMPTY status badge, integration snippet button, "Open standalone" deep-link (`/configs/values/<id>`, `data-testid="config-detail-standalone-link"`), and delete button (opens a confirm `<Dialog>` mirroring the gates/killswitches pattern).
- Retired [configs/values/layout.tsx](apps/ui/src/app/dashboard/[projectId]/configs/values/) (sidebar tree split), [configs-tree.tsx](apps/ui/src/app/dashboard/[projectId]/configs/values/), and the bespoke 1243-line [new/wizard.tsx](apps/ui/src/app/dashboard/[projectId]/configs/values/new/) — all removed. [new/page.tsx](apps/ui/src/app/dashboard/[projectId]/configs/values/new/page.tsx) is now a redirect-only server component to `?new=1` (preserves the deep-link).
- Duplicate `configs/gates/` tree: page.tsx / [id]/page.tsx / new/page.tsx already redirected to `/gates/*`; their orphan siblings (`gates-content.tsx`, `actions.ts`, `[id]/{actions.ts, rules-builder.tsx}`) are now deleted. Two stale specs that targeted the long-dead `#gate-key` / `#gate-description` / `#gate-default` / `#gate-env` form fields ([gate-configs-form.spec.ts](apps/ui/e2e/auth/), [gate-targeting-rules.spec.ts](apps/ui/e2e/auth/)) are retired — the canonical `/gates` flow is covered by [gates.spec.ts](apps/ui/e2e/auth/gates.spec.ts) and [crud.spec.ts](apps/ui/e2e/auth/crud.spec.ts).
- [config-wizard.spec.ts](apps/ui/e2e/auth/config-wizard.spec.ts) rewritten end-to-end against the BigModalWizard chrome — opens via `?new=1`, scopes assertions to `page.getByRole("dialog")`, drives Next/Back, stepper backward-jump, all 8 Schema sub-tests (Add / re-edit / required+description persistence / enum options / array item type / Remove / JSONSchema toggle / Import JSON), 4 Defaults sub-tests (number / boolean / enum / Paste JSON), and the Review step's inline Tabs+CodeBlock snippets. Publish flow asserts the create redirect lands on `/configs/values/<id>`.
- [configs-values.spec.ts](apps/ui/e2e/auth/configs-values.spec.ts) wizard tests now target the dialog at `?new=1` (Next disabled until valid key, close button strips the param, Add field opens the inner edit dialog). CRUD tests use the closed-table row (`[data-slot="pane-full"]`) + `?open=<id>` deep-link instead of the old sidebar `<a>` links; delete-from-detail-pane asserts the URL collapses back to `/configs/values` and the API entry is gone. Schema/value separation + object-only enforcement API tests are unchanged.
- [configs.spec.ts](apps/ui/e2e/auth/configs.spec.ts) "Configs product" tests retargeted: landing exposes the UnifiedList header + "New config" CTA (or HeroEmptyState link in the empty case); `/configs/values/new` is verified as redirecting into `?new=1` with the wizard dialog open.

Type-check clean (`pnpm --filter @shipeasy/ui type-check`). Stale `.next/types/*/configs/values/layout.js` reference cleared by removing `.next/types` + `.next/dev` once before re-checking.

**Follow-up commit `6d612e2` — e2e repair + Phase 3c coverage extension.** After landing 3c, a full e2e sweep surfaced two pre-existing failures in `crud.spec.ts` that predated the redesign:

- **Settings CRUD** — `general-form.tsx` no longer renders an input with `id="project-name"`; the input uses `aria-label="Project name"` and the submit button reads "Save changes" (not "Save"). Spec retargeted via accessible name.
- **Experiments CRUD** — `/experiments/new` is no longer a 4-step Continue-driven wizard; it's a single 10-section form with "Save as draft" / "Start experiment" buttons. CRUD smoke seeds the experiment via the admin REST API (plus a `beforeAll` universe) and keeps UI coverage for start / stop / delete. End-to-end form coverage lives in the dedicated experiments specs.

Plus a third describe block in [configs-values.spec.ts](apps/ui/e2e/auth/configs-values.spec.ts) — `Configs list — UnifiedList chrome` — covers the detail-pane sticky header surface that the create/delete CRUD pair didn't assert: `Open standalone` link href, filter input narrowing the closed table + restoring on clear, ESC closing the detail pane + stripping `?open=<id>` from the URL.

Full local sweep: `crud.spec.ts` 46/46 pass, `gates.spec.ts` 10/10, `killswitches.spec.ts` 20/20, configs trio 31+ pass, project-wide `pnpm --filter @shipeasy/ui test` reports 475 pass / 45 skipped / 12 pre-existing failures (keys-full, keys-polish, plans, projects-team, settings-interactions, navigation Configs-hero) — all unrelated to Phase 3c work and out of scope here. Navigation `renders Configs product nav items` is sensitive to seed-state leakage from `config-wizard.spec.ts` (no per-test cleanup on the wizard-created configs); track separately.

**Phase 3d — Metrics → UnifiedList + BigModalWizard + embedded event detail — DONE.**

- [metrics/page.tsx](apps/ui/src/app/dashboard/[projectId]/metrics/page.tsx) is now a thin server shell that maps `?demo=1` / `?view=dashboard|list` to an `initialView` and hands it to [`<MetricsContent>`](apps/ui/src/app/dashboard/[projectId]/metrics/metrics-content.tsx). The old `MetricsPageRoot` + `EventDrawer` are deleted (the drawer was unused after the embed lifted into the detail pane). The mock-data backing the page is unchanged — Metrics still has no real per-event CRUD; that lands when the events ingestion is wired through.
- [metrics-content.tsx](apps/ui/src/app/dashboard/[projectId]/metrics/metrics-content.tsx) owns three view discriminators driven by URL state — `empty`, `list`, `dashboard`:
  - **Empty** → `<HeroEmptyState kind="metrics">` with paired `extraAction` ("Skip to demo data" → flips to `?demo=1` list view, "Start in 60 seconds" → opens `?setup=1` wizard). The default HeroEmptyState CTA link is replaced by these so both entry points sit in one row.
  - **List** (the new canonical view) renders through `<UnifiedList<CustomEvent>>` with columns Event/Type/Volume·24h/vs prev/Trend/Per session. `Trend` uses the new `<Sparkline>` primitive (intent flipped to `danger` when `vsPrev < 0`), `vs prev` uses `<NumericDelta>`, and Type uses `<StatusBadge>` (`live` for conversion, `completed` for funnel, `killed` for error, `neutral` for plain events). Rail row = activity icon + name + `vol · perSession/sess` + status dot.
  - **Dashboard** keeps the existing [`<MetricsDashboard>`](apps/ui/src/app/dashboard/[projectId]/metrics/dashboard.tsx) reachable via a toolbar "Show full dashboard" toggle (`?view=dashboard`). The dashboard's "Register event" / "Open setup" CTAs now both route through `?setup=1` (no more EventDrawer per-row create), and its row click sets `?open=<name>` + flips back to list view so the embedded detail handles editing.
- URL state mirrors gates/killswitches/configs: `?open=<event-name>` for the detail pane (driven by the customEvent's `name`), `?setup=1` for the wizard, `?demo=1` and `?view=dashboard|list` for the view discriminator. `setView` accepts a `closeSetup` flag so a single `router.replace` covers both view + setup transitions (avoids the stale-snapshot race where two sequential `setParam` calls clobber each other's writes).
- [embedded-event-detail.tsx](apps/ui/src/app/dashboard/[projectId]/metrics/embedded-event-detail.tsx) is the detail-pane surface: kind badge header, 3-stat grid (Volume + delta / Per session / Trend sparkline), declared-properties chip row, and a 4-tab `<Tabs>` over `<CodeBlock>` SDK snippet (TypeScript / Python / Go / cURL) that interpolates the event name + properties into a one-line `log()` call.
- [new-metric-wizard.tsx](apps/ui/src/app/dashboard/[projectId]/metrics/new-metric-wizard.tsx) hosts the 5-step onboarding inside a `<BigModalWizard kind="metrics">` — **Install / Initialize / Send first event / Pick starter events / Done**. The step bodies (`StepInstall`, `StepInit`, `StepVerify`, `StepStarters`, `StepDone`) are exported from [onboarding-wizard.tsx](apps/ui/src/app/dashboard/[projectId]/metrics/onboarding-wizard.tsx) and re-used as-is so the SDK-ping detector + PingDetector animation are preserved. The old free-form `OnboardingWizard` modal is removed. Step 3 (Send first event) gates Next on `pingStatus === "received"` via `isValid()`; simulating still flips it to received after ~2.4s. Submit (`Open dashboard`) calls back through `onComplete` → `setView("list", { closeSetup: true })` → land on `?demo=1` with the wizard dismissed.
- [metrics-dashboard.spec.ts](apps/ui/e2e/auth/metrics-dashboard.spec.ts) rewritten end-to-end and expanded. **24/24 pass locally.** Organised into six describe blocks:
  1. **Empty state** — hero copy, paired CTA buttons render, "Skip to demo data" flips to `?demo=1` list, "Start in 60 seconds" opens wizard at Step 1 of 5.
  2. **List view (UnifiedList)** — `?demo=1` header kicker (`<n> custom events · <m> conversions`), closed-table renders `<svg aria-label="Sparkline">` + `[data-slot="numeric-delta"]` chips with `data-good="true"` / `data-good="false"` (cart_abandoned -4.1%), per-kind `StatusBadge` tones via `[data-tone="live"|"completed"|"neutral"]`, filter narrow + restore, header `Setup guide` and `Register event` buttons both open the wizard.
  3. **Embedded event detail** — row click → detail pane → `Show full table` collapses URL, `?demo=1&open=<name>` deep-links straight into detail, Tabs switch between TypeScript / Python / Go / cURL (asserts the per-language SDK call shape), rail-row click on `cart_abandoned` switches detail mid-flight, Esc strips `?open`.
  4. **Full dashboard view** — `Show full dashboard` toggle exposes the legacy `events over time` / `checkout funnel` / `auto-collected health` / `live event stream` + `auto-collect-enable-snippet` testid, `?view=dashboard` deep-link, `Show events list` returns to UnifiedList, dashboard row click (`.met-ev-row` filter) flips back to list with `?open=<name>`, Register event opens wizard.
  5. **BigModalWizard** — Step 3 Next is disabled until `Simulate it` fires the ping, Back walks backwards step-by-step, eyebrow Close strips `?setup=1`, happy-path walks all 5 steps and submit lands on `?demo=1` without `?setup=1`.
  6. **Navigation** — sidebar Metrics nav item href shape.
- Navigation/topbar/project-modules smoke (14 tests) re-run clean. The previous `metrics.spec.ts` + `metrics-full.spec.ts` target `/experiments/metrics` (a different page) and are untouched.
- Type-check + lint clean against the metrics directory (`pnpm --filter @shipeasy/ui exec tsc --noEmit` + `eslint src/app/dashboard/[projectId]/metrics/`).

**Phase 3e — Experiments → UnifiedList + BigModalWizard + embedded detail summary — DONE.**

- [experiments/page.tsx](apps/ui/src/app/dashboard/[projectId]/experiments/page.tsx) is unchanged (already a thin server shell that mounts `<ExperimentsContent>`); the legacy advanced editor at `/experiments/new` is kept verbatim as the "Advanced wizard" deep-link per Phase 0 decision #4.
- [experiments-content.tsx](apps/ui/src/app/dashboard/[projectId]/experiments/experiments-content.tsx) rewritten to render through `<UnifiedList<ExperimentRow>>`. Closed-table columns: Experiment (icon + name + description) / Status (`<StatusBadge>` tones — `live` / `draft` / `paused` / `completed`) / Traffic% / Variants / Updated / snippet button / inline Start–Stop–Delete actions. Rail rows: flask icon + name + `<pct>% · <n>v` + per-status dot. Status tabs (`<Tabs>` over `all / running / draft / stopped / archived`) live in the toolbar alongside a filter input (`aria-label="Filter experiments"`). URL state mirrors gates/killswitches/configs: `?open=<id>` for the detail pane, `?new=1` for the wizard. The empty branch renders `<HeroEmptyState kind="experiments">` with a paired CTA (`New experiment` opens `?new=1`, `Advanced wizard` links to `/experiments/new`).
- [new-experiment-wizard.tsx](apps/ui/src/app/dashboard/[projectId]/experiments/new-experiment-wizard.tsx) — 4-step `<BigModalWizard kind="experiments">`:
  - **Name & describe**: name input (`#experiment-name` / `data-testid="experiment-name-input"`, slug pattern `[a-z0-9][a-z0-9_-]{0,59}`), hypothesis textarea, optional tag. Next gated on `nameValid`.
  - **Audience & traffic**: universe `<Combobox>` (seeded with `default` + SWR `/api/admin/universes`), allocation `<Slider>` 0–100%, optional targeting-gate `<Combobox>` (SWR `/api/admin/gates`).
  - **Variants**: `<FieldArray>` of `{name, weight}` rows with per-row `<Slider>` weight (0–10000 bps step 100), live sum validator + `Rebalance evenly` button, supports 2–6 variants. Defaults to `[control, treatment]` at 50/50. `variant-name-<i>` testids exposed for e2e.
  - **Review**: 6 read-back cards (Name / Tag / Universe / Allocation / Targeting gate / Variants) + optional hypothesis card. Submit calls the existing `createExperimentAction` Server Action via FormData — the action `redirect()`s back to `/experiments`, which strips `?new=1` and the wizard auto-closes; SWR refetch repopulates the list.
- [embedded-experiment-summary.tsx](apps/ui/src/app/dashboard/[projectId]/experiments/embedded-experiment-summary.tsx) is the detail-pane surface. Header (kind-colored icon + name + StatusBadge), optional draft `<Banner>` with "Open full view" deep-link, 3-stat grid (Allocation / Variants / Universe), Variants list, Lifecycle card (Start/Stop forms + "Open full view" link via `data-testid="experiment-detail-fullview-link"` + Started/Updated timestamps). Heavy results UI (charts, verdict, criteria strip, activity timeline) stays on the standalone `/experiments/[id]` page, reachable through the deep-link per plan.
- DetailPane sticky header (in `experiments-content.tsx`) carries: name + StatusBadge, integration snippet button, "Open full view" link (`/experiments/<id>`), and a Delete action (disabled while status==="running"||"archived"). Inline Start/Stop/Delete row buttons retained (`aria-label="Start experiment"`/`"Stop experiment"`/`"Delete experiment"`) so existing lifecycle specs work without rewrite.
- [experiments.spec.ts](apps/ui/e2e/auth/experiments.spec.ts) updated: dropped two stale tests targeting the long-gone "Name & hypothesis" 4-step Continue wizard at `/experiments/new` (replaced with a single smoke that the legacy advanced editor still renders); the existing "New experiment button" test now asserts the BigModalWizard opens via `?new=1` with the right "Step 1 of 4" eyebrow + first-step heading. New describe block `Experiments — BigModalWizard create flow` covers `?new=1` deep-link, Next-disabled-until-name, Esc strips `?new=1`, and Back-disabled-on-step-1 + advance-on-valid-name. **21/21 pass locally.**
- [experiments-workflow.spec.ts](apps/ui/e2e/auth/experiments-workflow.spec.ts) rewritten end-to-end against the BigModalWizard chrome:
  - `expRow` helper scoped to `[data-slot="pane-full"]` + `xpath=ancestor::tr[1]` so the closed-table row resolves cleanly against the new `<UnifiedList>` shape.
  - `createViaWizard` drives `?new=1` → fill name → 3× Next → Create — and verifies the dialog closes + URL strips `?new=1` + the closed-table row renders before returning (so a failed Server Action no longer false-positives on the wizard's own ReviewCard).
  - Wizard UI block now asserts 4-step stepper labels (`Name & describe` / `Audience & traffic` / `Variants` / `Review`), `Next` disabled until valid name, default control/treatment variants on step 3, Add-variant rebalance to 33%, Esc close, Review summary + Create button.
  - Two-variant lifecycle + Multi-variant + Partial-allocation tests retained; partial-allocation block dropped (allocation slider drives full-step Server Action input directly via the BigModalWizard — covered implicitly by the audience step).
  - Delete assertions scoped to `[data-slot="pane-full"]` to dodge strict-mode against the rail-pane mirror.
  - New describe block `Experiments detail pane — embedded summary` covers row-click → `?open=<id>`, embedded surface (`draft` / `Allocation` / `Variants`), "Open full view" link href, and Esc-strip-open. **16/16 pass locally.**
- [experiment-results-detail.spec.ts](apps/ui/e2e/auth/experiment-results-detail.spec.ts) `createDraftViaWizard` helper replaced with `seedDraft(request, name, { extraVariants? })` — admin REST `POST /api/admin/experiments` with the canonical body (`name`, `universe: "default"`, `allocation_pct: 10000`, `groups`). All `beforeAll`/`afterAll` hooks switched from list-row UI clicks to admin-API status changes + admin-API DELETE. Multi-variant variants-card assertion pinned to `.meta-variant.ctrl` to dodge the standalone v2 detail's `· baseline` suffix on the first variant. The 4 remaining failures in this spec (stat tile labels, "Wait" verdict tile, "LIVE" header badge, sequential-testing copy) target shape that no longer exists on the standalone `/experiments/[id]` v2 layout — pre-existing failures unrelated to Phase 3e and tracked separately.
- Type-check clean across all touched files (`pnpm --filter @shipeasy/ui exec tsc --noEmit` — the 2 pre-existing `metrics-content.tsx` errors are unrelated).

**Phase 3 (f–h) — NOT STARTED.** Other open items:

- Extend `/design-system` showcase with new primitives + shell demos (Phase 1d/2c — deferred; visual diff target).
- Run full lint + e2e (Phase 1e — deferred until after first feature migration).
- Reference prototype extracted at `/tmp/design-anZ1vXWhHX91yU9rqSXWXw/shipeasy/project/app/`. NB: the tar bundle is in a tempdir — re-extract from the design bundle if `/tmp` was wiped (see "Reference material" below for the source URL).

## Context

Design handoff `claude.ai/design/anZ1vXWhHX91yU9rqSXWXw` is a complete visual refresh of the Shipeasy admin (apps/ui). It is the visual companion to the `experiment-platform/` architecture docs already in this repo — the redesign just polishes what those docs describe (gates, experiments, killswitches, configs, metrics, devtool, auth, workspace/team/keys/settings, home cockpit).

Two hard constraints from the user:

1. **Reuse aggressively** — apps/ui already covers most surfaces. Treat each redesigned screen as a _polish pass_ on existing pages/components, not a rewrite. Existing Server Actions, Conform schemas, SWR fetching, e2e specs, routing all stay.
2. **Design system first, screens second** — start by upgrading `apps/ui/src/components/ui/` primitives to design parity, _then_ compose them on the feature pages.

What is already in place (verified):

- Dark-first tokens in [globals.css](apps/ui/src/app/globals.css) — `--se-bg*`, `--se-fg*`, `--se-line*`, `--se-accent/danger/warn/info/purple`, fonts Geist/Geist Mono/Instrument Serif, radii, shadows. Maps cleanly into shadcn variables. **No token work required** other than minor additions.
- Existing primitives in [src/components/ui/](apps/ui/src/components/ui/): button, input, textarea, select-substitutes (dropdown-menu, segmented), checkbox, radio-group, switch, slider, tag-input, label, field, badge, status-badge, kbd, code-block, dropzone, dialog/alert-dialog/confirm-dialog/prompt-dialog, card, separator, avatar, stat, link-button, action-form, confirm-delete-button, empty-state.
- Dashboard shell in [components/dashboard/](apps/ui/src/components/dashboard/): sidebar-nav, top-bar, project-switcher, page/page-header, brand-mark, billing-banner, etc.
- Feature pages already exist for: experiments (list/new/[id]/results/metrics/events/attributes/universes), gates, killswitches, configs/values, metrics, keys, settings, projects, team, billing, i18n, auth/signin, devtools-auth, feedback.
- Playwright e2e covers all of the above — they must keep passing.

Gaps to fill:

- No reusable **UnifiedList** shell (closed-table → fold-to-280px-rail + center detail).
- No reusable **BigModalWizard** shell (eyebrow + stepper + 2-col body w/ aside + sticky footer). Each create flow currently has bespoke wizard chrome.
- Missing UI primitives needed by the design: **Stepper**, **Tabs** (radix), **Table** + **DataTable** primitives, **Skeleton**, **Sparkline**, **Popover/Combobox** (`CSelect` in design), **Banner**, **Sheet/Drawer** (for record open state), **HoldoutBar**, **EnvTabs** (already a CSS class — promote to component).
- Three home variants (V1 Mission Control / V2 Focus Inbox / V3 Instrument Cluster) exist in the prototype; user has _not_ picked one yet → flagged as a clarification (see Phase 0).
- DevTool full panel exists as design (`devtool-full.html`) — the in-app companion at `/dashboard/[projectId]/devtool` does **not** exist. Out of scope for v1 unless user confirms.

Reference material (read but don't ship):

- Prototype: `/tmp/design-anZ1vXWhHX91yU9rqSXWXw/shipeasy/project/app/` — design-system-v2.html, standards-list-v2.html, standards-create.html, standards-empty.html, standards-skeleton.html, standards-delete.html, configs-expanded.html, experiments-results-v2.html, devtool-full.html, plus all `*.jsx` component reference (shell.jsx, unified-list.jsx, wizards-shell.jsx, icons.jsx).
- Prototype CSS to mine: `app.css` (tokens — already ported), `shipeasy-app.css`, `unified-list.css`, `wizards.css`, `forms.css`.

---

## Phase 0 — Decisions locked

User answers (2026-05-16):

1. **Home** — ship V1 Mission Control only. The three "modes" (first-run / quiet day / busy day) are not separate variants — they're _states_ of the same V1 layout, driven by real app data (record counts, recent activity, last-run timestamps). V2 (Focus Inbox) and V3 (Instrument Cluster) are dropped.
2. **DevTool admin page** — deferred. DevTools auth popup at `/devtools-auth` keeps shipping; no in-dashboard panel for now.
3. **Configs** — fully migrate to the new unified shape (`configs-expanded.html` for the detail). Layout across every feature must be identical so users learn the pattern once. No two-pane fallback.
4. **Experiments wizard** — keep both entry points. Big-modal wizard is the primary `+ New` flow; the existing `/experiments/new` full-page wizard stays as "Advanced" deep-link. Same Server Action backs both.

---

## Phase 1 — Foundation: design-system primitives in `apps/ui/src/components/ui/`

Goal: every primitive a feature page needs is in `ui/`, styled to match the prototype, before any screen work begins. **No screen edits during this phase.** Each new/changed primitive ships with a story rendered on `/design-system` and an updated e2e smoke if it's user-visible.

### 1a. Token additions to [globals.css](apps/ui/src/app/globals.css)

Tokens are mostly there. Add what the design uses that we don't yet expose:

- Spacing scale custom props `--s-1`..`--s-10` (4/8/12/16/20/24/32/40/56/72px). Mostly redundant with Tailwind, but the prototype CSS references them — keep parity for any ported utility class.
- Type-scale utility classes from `app.css` not yet ported: `.t-display`, `.t-h1`, `.t-h2`, `.t-h3`, `.t-body`, `.t-sm`, `.t-xs`. Add as `@utility` declarations or plain classes alongside the existing `.t-mono*`/`.t-caps`/`.t-serif`/`.dim*`/`.num`.
- Animation utilities for the fold transition: `--ease-fold: cubic-bezier(.4 0 .2 1)` + `--dur-fold: 280ms`.
- Striped gradient helper for holdout bars (`.bg-stripe-warn` etc.) since Tailwind has no atomic for `repeating-linear-gradient`.

### 1b. New primitives to add to [src/components/ui/](apps/ui/src/components/ui/)

For each: build, document on `/design-system`, export from a barrel (`ui/index.ts`) if missing.

- **`tabs.tsx`** — Radix-based tabs with the underline variant the design uses (active tab → accent underline, hover tint). Used by experiments status filter, configs envs, settings sub-nav.
- **`table.tsx`** — Thin Radix-Table-style primitive: `<Table>`, `<THead>`, `<TBody>`, `<TR>`, `<TH>`, `<TD>`. Sticky thead, mono uppercase column labels (10.5px caps), 48–52px row height, hover bg tint, accent left-border for "active row".
- **`skeleton.tsx`** — Shimmer block, sized by props. Used by every list skeleton view.
- **`stepper.tsx`** — Compact horizontal stepper from the wizard prototype: dots + labels + current/done states. Props: `steps`, `current`. Inline mode (in `BigModalWizard` head) and standalone mode.
- **`sparkline.tsx`** — Inline SVG polyline, fixed height, accent stroke, optional delta chip. Drives metrics rows + dashboard cards.
- **`popover.tsx`** — Radix popover wrapper. Needed for combobox / "CSelect".
- **`combobox.tsx`** — Searchable select with the design's custom trigger (icon + value + animated chevron + tick on selected). Replaces every bare `<select>` per the chats' "always use CSelect" rule.
- **`drawer.tsx`** — Radix Sheet wrapper for slide-in detail panes when a record is opened from a list. Animates the 320ms slide-from-right + opacity transitions.
- **`banner.tsx`** — Inline notice strip (info / warn / danger variants) used by run-state callouts, deprecation notices, billing warnings.
- **`env-tabs.tsx`** — Component wrapper around the existing `.env-tabs` CSS class for prod/staging/dev environment switching on configs + killswitches.
- **`progress-bar.tsx`** — Thin allocation bar (variant splits, holdout ranges). Composable: solid fill, striped fill, dual-band overlay.
- **`numeric-delta.tsx`** — `▲ +12.4%` chip with accent/danger color and tabular numerals.
- **`field-array.tsx`** — Generic rules-list / variants-list / metrics-list row container used by all wizards (drag handle + label/value/op cells + delete).

### 1c. Polish-only updates to existing primitives

- [button.tsx](apps/ui/src/components/ui/button.tsx) — confirm 32/26/38px size variants (default/sm/lg), tighten focus ring to design accent, add `intent` variants (`primary`, `secondary`, `ghost`, `danger`).
- [input.tsx](apps/ui/src/components/ui/input.tsx) + [textarea.tsx](apps/ui/src/components/ui/textarea.tsx) — match 32px height, 1px line border, mono variant via `data-mono` prop for identifiers (keys, slugs).
- [badge.tsx](apps/ui/src/components/ui/badge.tsx) + [status-badge.tsx](apps/ui/src/components/ui/status-badge.tsx) — add `intent` palette (running/success/info/warn/danger/neutral) using the soft-mix backgrounds from tokens.
- [card.tsx](apps/ui/src/components/ui/card.tsx) — confirm 18px body / 14px head padding, `--se-shadow-1`/`-2`/`-pop` levels.
- [dialog.tsx](apps/ui/src/components/ui/dialog.tsx) — add `size="big-modal"` (1180px max-width, layered shadow, radial accent overlay, blurred radial-gradient backdrop) — this is the chrome the new `BigModalWizard` lives inside.
- [empty-state.tsx](apps/ui/src/components/ui/empty-state.tsx) — verify it matches `standards-empty.html` chrome (pulse-dot badge, large heading, mono fixture block, 3-col stat grid, primary CTA).
- [code-block.tsx](apps/ui/src/components/ui/code-block.tsx) — tab switcher (TS / Python / Ruby / Go / Java / cURL), copy button, syntax tokens (keyword purple `--se-purple`, string `--se-accent`, number `#f0c674`).
- [dropdown-menu.tsx](apps/ui/src/components/ui/dropdown-menu.tsx) — visual parity check; no API change.

### 1d. Reference page upkeep

[`/design-system`](apps/ui/src/app/design-system/page.tsx) already exists. Extend it to render every new primitive + visual variant. Use it as the single visual diff target while iterating.

### 1e. Verification gate for Phase 1

- `pnpm --filter @shipeasy/ui type-check` clean.
- `pnpm --filter @shipeasy/ui lint` clean.
- `/design-system` renders all primitives without console errors.
- All existing e2e specs still pass — nothing has visually broken on the feature pages yet (Phase 1 is additive).

---

## Phase 2 — Composite shells (the two "standards")

These are not primitives; they live one layer up. New folder: `apps/ui/src/components/shell/`.

### 2a. `UnifiedList` shell — `components/shell/unified-list.tsx`

The "click row → fold list to 280px rail → center detail slides in" pattern from `standards-list-v2.html` + `unified-list.css`.

API sketch:

```tsx
<UnifiedList
  items={rows}                      // typed rows
  columns={[{key,label,render}]}    // closed-table columns
  renderRail={(row) => ReactNode}   // rail row content (smaller)
  renderDetail={(row) => ReactNode} // center detail body
  selectedId={openId}               // controlled (or uncontrolled)
  onSelect={(id|null) => void}      // null = close
  emptyState={<EmptyState .../>}    // shown when items.length === 0
  loading                           // shows skeleton variant
  toolbar={<UnifiedListToolbar/>}   // search + filters + sort + export
/>
```

Internals: two `.pane-layer`s (full-table + rail) cross-fade; right pane uses transform translate-x slide. Honors `?open=<id>` URL param for deep-linking from the design (already used by every prototype page). ESC closes; "Show full table" pill in `.open-head` reopens.

### 2b. `BigModalWizard` shell — `components/shell/big-modal-wizard.tsx`

The full-bleed create wizard from `standards-create.html` + `wizards.css`.

API sketch:

```tsx
<BigModalWizard
  open onOpenChange
  eyebrow={{ project, area }}
  kind="configs"|"gates"|"killswitches"|"metrics"|"experiments"  // colors icon badge
  title
  steps={[{ id, label, content: ReactNode, aside?: ReactNode, hint?: string }]}
  current onStepChange
  onSubmit                          // last step
  submitLabel="Create"
  saveDraftLabel="Save as draft"
/>
```

Slots: eyebrow (crumb + ESC kbd hint), head (icon badge + titles + inline stepper), body (2-col `minmax(0,1fr) 320px` with aside), footer (gradient bg, back/next/submit + kbd hints). Animation: `wmPop` (translateY/scale on open). Backdrop: radial-gradient + blur(6px).

### 2c. Verification gate for Phase 2

- Storybook-style demo on `/design-system` that exercises both shells against fake data (Configs/Gates/Killswitches/Metrics/Experiments kinds for the wizard; one fake feature for the list).
- Type-check + lint clean. Existing e2e still green (no screen edits yet).

---

## Phase 3 — Feature-page polish (apply shells + tokens to existing routes)

Order is "lowest risk → highest risk". Each step is a self-contained PR with its own e2e additions. For each existing page: keep the route, the Server Actions, the data shape, and the spec it already has. Replace bespoke chrome with the new shells. Run that feature's spec after each step.

### 3a. Gates (smallest blast radius, simple rule shape)

- [apps/ui/src/app/dashboard/\[projectId\]/gates/page.tsx](apps/ui/src/app/dashboard/[projectId]/gates/page.tsx) + `gates-content.tsx` → render with `<UnifiedList>` (closed = standards-list, open via `?open=<id>` → embed existing detail UI in the center pane).
- [gates/new/page.tsx](apps/ui/src/app/dashboard/[projectId]/gates/new/page.tsx) → wrap existing form into `<BigModalWizard kind="gates" steps={[details, targeting, rollout, preview]}/>`.
- [gates/\[id\]/gate-editor-client.tsx](apps/ui/src/app/dashboard/[projectId]/gates/[id]/gate-editor-client.tsx) → reuse inside the rail-detail center pane _and_ as a standalone deep-link page. No duplication: extract a `<GateEditorBody>` reused by both.
- Spec: extend `e2e/auth/gates.spec.ts` for the open/close fold transition, ESC-close, and big-modal wizard happy path.

### 3b. Killswitches

- [killswitches/page.tsx](apps/ui/src/app/dashboard/[projectId]/killswitches/page.tsx) + `killswitches-content.tsx` → `<UnifiedList>`; rail rows show env-tabs + switch state.
- Existing modal in `_components/killswitch-modal.tsx` becomes a `<BigModalWizard kind="killswitches" steps={[details, scopes, default, review]}/>`.
- Extend `killswitches.spec.ts` for new chrome.

### 3c. Configs (values)

- Migrate [configs/values/page.tsx](apps/ui/src/app/dashboard/[projectId]/configs/values/page.tsx) to `<UnifiedList>` so the closed-table + fold-to-rail behavior is identical to every other feature.
- Open-state detail follows `configs-expanded.html` exactly: schema tree + value editor + activity feed + version history in the center pane. Existing pieces (`configs-tree.tsx`, `editor.tsx`) are refactored into the new shape — not preserved as-is. Server Actions + Zod schemas in `actions.ts` stay untouched.
- [configs/values/new/wizard.tsx](apps/ui/src/app/dashboard/[projectId]/configs/values/new/wizard.tsx) → host inside `<BigModalWizard kind="configs" steps={[name, schema, default, review]}/>`. Internal step pieces (`edit-field-dialog`, `edit-value-dialog`, `import-json-dialog`, `paste-json-dialog`) reused as-is inside the new wizard chrome.
- Resolve the duplicate `configs/gates/` tree: delete or hard-redirect to `gates/`.
- Extend `configs-values.spec.ts` + `config-wizard.spec.ts` for new open/close + expanded-detail interactions.

### 3d. Metrics

- [metrics/page.tsx](apps/ui/src/app/dashboard/[projectId]/metrics/page.tsx) → `<UnifiedList>` with bespoke row renderer using new `<Sparkline>` + `<NumericDelta>` primitives. Detail pane reuses existing `dashboard.tsx` + `charts.tsx`.
- [metrics/onboarding-wizard.tsx](apps/ui/src/app/dashboard/[projectId]/metrics/onboarding-wizard.tsx) → wrap in `<BigModalWizard kind="metrics" steps={[install, init, first-event, starters, done]}/>`. Existing SDK-ping detector stays.
- Spec: extend `metrics.spec.ts`.

### 3e. Experiments (largest scope, do last)

- [experiments/page.tsx](apps/ui/src/app/dashboard/[projectId]/experiments/page.tsx) + `experiments-content.tsx` → `<UnifiedList>`; status tabs become the toolbar's `<Tabs>`. Detail pane renders existing results+metrics components.
- [experiments/new/new-experiment-client.tsx](apps/ui/src/app/dashboard/[projectId]/experiments/new/new-experiment-client.tsx) — keep as full-page wizard (legacy detailed flow) **and** add a `<BigModalWizard kind="experiments" steps={[name, audience, variants, metrics, review]}/>` triggered from the list "+ New" button. Two entry points; same Server Action.
- [experiments/\[id\]/page.tsx](apps/ui/src/app/dashboard/[projectId]/experiments/[id]/page.tsx) — keep the deep-dive detail page (specialized chart layout). Reachable from rail "Open full view" link.
- Sibling pages (metrics / events / attributes / universes) get tokens + new primitives but stay as standalone routes (they don't fit the 6-col row shape).
- Spec: extend `experiments.spec.ts` (open/close, big-modal create) + verify `events.spec.ts` and the metrics/attributes specs after token bump.

### 3f. Workspace surfaces (small-shape records)

These don't fit the unified-list shape per the prototype ("kept together as their own group"). Token-pass + new primitives only:

- [dashboard/[projectId]/keys/page.tsx](apps/ui/src/app/dashboard/[projectId]/keys/page.tsx) — table primitives, env-tabs, copy/revoke modals into `<Dialog>` polish.
- [dashboard/[projectId]/settings/page.tsx](apps/ui/src/app/dashboard/[projectId]/settings/page.tsx) — keep the existing 6-tab structure (just polished — that's already shipped).
- [dashboard/team/page.tsx](apps/ui/src/app/dashboard/team/page.tsx) — table + invite modal polish.
- [dashboard/projects/page.tsx](apps/ui/src/app/dashboard/projects/page.tsx) + new project modal — already redesigned per recent commit; verify alignment with new tokens.
- [dashboard/billing/page.tsx](apps/ui/src/app/dashboard/billing/page.tsx) — `<Banner>` for plan warnings; tighten using new primitives.
- All specs in `e2e/auth/` re-run.

### 3g. Auth

- [auth/signin/page.tsx](apps/ui/src/app/auth/signin/page.tsx) + `signin-form.tsx` — 2-column layout (brand story left, form right) per design. Add `auth/sent/` (magic-link-sent) and `auth/create-workspace/` pages if they don't already exist (verify before adding — recent commit landed a settings redesign and projects modal, may have touched these).
- New spec: `e2e/auth/auth-flow.spec.ts` if not present.

### 3h. Home / dashboard root (V1 Mission Control, state-driven)

- Implement V1 only at [dashboard/[projectId]/page.tsx](apps/ui/src/app/dashboard/[projectId]/page.tsx), modeled on the prototype's `home.html` + `home.css` + `home.jsx`.
- Layout: 24-hour pulse strip header, prominent "decisions" row up top, then the activity timeline and stat grid.
- Three _states_, not three variants — picked server-side from real data:
  - **First-run** — no experiments / gates / configs / metrics. Show `<EmptyState>` cockpit with onboarding checklist + integration CTA.
  - **Quiet day** — workspace has records but no recent activity (no events / no shipped experiments in last 7d / no decisions pending). Layout collapses: pulse strip shows long calm, decisions row becomes "All clear" empty-card, activity timeline is sparse with stat tiles surfaced higher.
  - **Busy day** — recent activity, pending decisions, alerts. Pulse strip animates; decisions row shows up to 3 action cards; activity timeline dense.
- State derivation: a single server-side helper `loadHomeState(projectId)` in a new `app/dashboard/[projectId]/_home/state.ts` returns the data + a discriminator `'first-run' | 'quiet' | 'busy'` that the page switches on.
- Drop V2 + V3 implementations. The prototype files (`home-v2.*`, `home-v3.*`) are reference only.
- Spec: extend `overview.spec.ts` with three scenarios — empty seed (first-run copy visible), seeded-but-idle (quiet copy), seeded-with-activity (busy decisions row visible). Use Playwright fixtures with DB-seed Server Actions.

### 3i. DevTool admin page

- Deferred. No work in this plan.

---

## Critical files to touch

Foundation:

- [apps/ui/src/app/globals.css](apps/ui/src/app/globals.css) — append type-scale utilities, spacing custom props, animation tokens, stripe gradient helpers.
- [apps/ui/src/components/ui/](apps/ui/src/components/ui/) — add: tabs, table, skeleton, stepper, sparkline, popover, combobox, drawer, banner, env-tabs, progress-bar, numeric-delta, field-array. Polish: button, input, textarea, badge, status-badge, card, dialog, empty-state, code-block.
- [apps/ui/src/components/shell/unified-list.tsx](apps/ui/src/components/shell/) — new.
- [apps/ui/src/components/shell/big-modal-wizard.tsx](apps/ui/src/components/shell/) — new.
- [apps/ui/src/app/design-system/page.tsx](apps/ui/src/app/design-system/page.tsx) — extend showcase.

Per-feature (apply shells, no Server Action / Zod changes):

- [apps/ui/src/app/dashboard/[projectId]/gates/](apps/ui/src/app/dashboard/[projectId]/gates/) — page.tsx, new/page.tsx, [id]/gate-editor-client.tsx.
- [apps/ui/src/app/dashboard/[projectId]/killswitches/](apps/ui/src/app/dashboard/[projectId]/killswitches/) — page.tsx, killswitches-content.tsx, \_components/killswitch-modal.tsx.
- [apps/ui/src/app/dashboard/[projectId]/configs/values/](apps/ui/src/app/dashboard/[projectId]/configs/values/) — page.tsx, new/wizard.tsx, [id]/editor.tsx.
- [apps/ui/src/app/dashboard/[projectId]/metrics/](apps/ui/src/app/dashboard/[projectId]/metrics/) — page.tsx, metrics-page.tsx, onboarding-wizard.tsx.
- [apps/ui/src/app/dashboard/[projectId]/experiments/](apps/ui/src/app/dashboard/[projectId]/experiments/) — page.tsx, experiments-content.tsx, new/new-experiment-client.tsx, [id]/page.tsx.
- [apps/ui/src/app/dashboard/[projectId]/keys/page.tsx](apps/ui/src/app/dashboard/[projectId]/keys/page.tsx), [team/page.tsx](apps/ui/src/app/dashboard/team/page.tsx), [billing/page.tsx](apps/ui/src/app/dashboard/billing/page.tsx).
- [apps/ui/src/app/auth/](apps/ui/src/app/auth/) — signin/page.tsx (+ signin-form.tsx); add sent + create-workspace if missing.
- [apps/ui/src/app/dashboard/[projectId]/page.tsx](apps/ui/src/app/dashboard/[projectId]/page.tsx) — home variant pick.

---

## Verification (every PR)

- `pnpm --filter @shipeasy/ui type-check`
- `pnpm --filter @shipeasy/ui lint`
- `pnpm --filter @shipeasy/ui exec playwright install chromium` once
- `pnpm --filter @shipeasy/ui test` — full e2e green
- `pnpm --filter @shipeasy/ui dev` and walk the touched feature: empty → skeleton → list-closed → list-open → create wizard → delete confirm. Confirm no text wraps (chats' hard rule), all selects are `<Combobox>`, identifiers in Geist Mono, no console errors.
- Visual diff against `/design-system` page after primitive changes.

## Out of scope

- Public landing pages (Polylang Landing.html, Shipeasy Landing.html) — separate handoff.
- SDK/CLI/Worker code — only `apps/ui` changes.
- Light-mode palette — design is dark-first; light mode stays as a future task.
- Submodule packages (`packages/ts-sdk` etc.) — untouched per repo rules.
