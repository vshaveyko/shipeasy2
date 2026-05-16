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

**Phase 3 (feature migration) — NOT STARTED.** Where to start: recommend **Gates** (smallest blast radius). Other open items:

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
