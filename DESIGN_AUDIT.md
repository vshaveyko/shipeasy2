# Design Audit & Implementation Tracker

Source of truth: design bundle `v3TqZxMPM_58G_VTGckBGg` (Claude Design export).
Extracted at `/tmp/designfile/extracted/shipeasy/` during the May 2026 audit
session. Canonical screen map = `project/app/index.html` ("coverage matrix").

---

## Scope decision

User confirmed: **audit only first, then implement page-by-page, report each
before moving on**. No mass rebuild. `index.html` is the canonical source for
the latest iteration of each screen.

---

## Audit (initial pass, full repo)

Severity legend: **P0** blocks the canonical pattern · **P1** visible delta ·
**P2** polish.

### Cross-cutting chrome

- **P0** Topbar: no breadcrumbs. Design renders `Workspace / [project chip with
color dot] / Section [ / Record ]`. Current shows only `projectName` muted
  span.
- **P0** Project switcher placement: design = bottom of sidebar with avatar +
  `name / env · evals/day` + chevron, opens 300px popover with search +
  per-project counts + "New project" / "Browse all" footer. Current = top of
  sidebar with shadcn dropdown.
- **P1** Sidebar order: design = Home / Experiments / Gates / Killswitches /
  Configs / Metrics. Current = Home / Gates / Killswitches / Configs /
  Experiments / Metrics / String Manager / Feedback.
- **P1** Sidebar groups: design = unlabeled top + **Connect** (API keys, MCP &
  Claude, SDK, Events) + **Workspace** (Team, Settings). Current = `In this
project` + `Workspace` (Projects, Team, Billing, Docs). Missing: MCP & Claude,
  SDK, Events.
- **P2** Per-item count chips (Experiments 24, Gates 12, ...) — not rendered.
- **P1** Brand row: design has `Shipeasy v0.9` version badge; current omits.
- **P1** Topbar search: disabled `coming soon`; design = interactive with
  `⌘ K` kbd.

### 01 · Design System

- **P1** Showcase covers ~90% of `design-system-v2.html`. Recommend focused
  side-by-side diff later.

### 02 · Auth

- **P1** Sub copy on signin differs. Design: "Sign in to your workspace. No
  passwords — just OAuth or a magic link." Current: "Sign in to your account
  to continue."
- **P1** Magic-link section: disabled `coming soon` vs. design's live form.
- **P1** Terms block: design adds "New to Shipeasy? Create an account ·
  protected by passkey-first auth."
- **P0** `/auth/sent` ("Check your inbox") screen missing. Required when
  magic-link ships.
- **P1** Workspace create (auth-create.html) uses the auth split-shell with
  workspace name + URL slug + "What are you shipping?" select + Step 1 of 2
  indicator. Current `/dashboard/projects/new` uses dashboard chrome, only
  has name + domain.

### 03 · Home / Cockpit

- **P0** Three variants in design (V1 Mission Control / V2 Focus Inbox / V3
  Instrument Cluster). User scoped to **V1 only**.
- See "V1 Mission Control implementation" section below.

### 04 · Standards (unified list pattern)

The canonical pattern. Reference: `standards-list-v2.html`.

- **P0** Verify `UnifiedList` does the list↔rail fold (table → 280px rail +
  detail slide-in). `head-cluster` collapse, `open-head` bar with back +
  "Show full table Esc" pill + record name + status + key + actions.
- **P0** Press-feedback (`tr.row-pressing` 60ms tinted bg + translateX(2px))
  before fold.
- **P0** Detail anatomy spec: hero (caps key·tag·last-update / h2 / desc /
  status+owner+env) + SDK reference card right + 4-col det-stats grid +
  chart card + activity timeline.

### 05 · Experiments

- **P1** Kicker: `Running · 24 total · 5.2M events / day`.
- **P1** Tabs: `All · Running · Draft · Stopped · Archived` with mono count
  chip per tab.
- **P0** Deep-dive detail (`experiment-detail.html` referenced but missing
  from bundle); `experiments-results-v2.html` is embedded in list-open
  state at 1720px height.
- **P1** Two create paths: big-modal wizard (5 steps) OR legacy full-page
  wizard (1619 lines, with universe hash-range + holdout warnings).

### 06 · Gates

- **P1** Kicker: `12 gates · 118.6M checks/day · p50 3.4ms`.
- **P1** Description: "Enable or disable features per user based on rules.
  Built-in gates work out of the box; custom gates run your own predicates
  on request context."
- **P1** Open-detail copy: "Rules · 3 active" + "Default when no rule
  matches" + "Evaluation" + "SDK usage" caps blocks.

### 07 · Killswitches

- **P1** Kicker: `8 switches · p50 latency 5ms · 55.3M evaluations / day`.
- **P1** Description: "Instant feature shutoffs with audit history. Propagate
  globally in under a second."
- **P1** Columns: Switch / Scope / p50 latency / Evaluations / State.

### 08 · Configs

- **P1** Two-pane existing layout (`configs.html`) — predates unified-list.
- **P1** Detail = fully expanded schema + value editor with activity feed
  (1100px tall).
- **P1** Big-modal wizard (kind=configs, 4 steps) vs. legacy full-page wizard.

### 09 · Metrics

- **P1** Custom row content: sparkline + value + delta + SLA bar (bespoke,
  not generic columns).
- **P1** Delete = **Archive** ("Metrics never hard-delete").
- **P1** Copy: "Web vitals and errors are auto-collected by the SDK."

### 10 · Workspace

#### Projects

- **P1** Kicker matches. Description matches. Card grid: mark + colored
  swatch + members + counts.

#### Projects switcher

- **P1** 300px popover (sidebar dropdown spec'd in `shell.jsx`): search +
  project rows w/ mark + env + counts + footer ("New project" + "Browse all
  projects"). Sidebar bottom anchor.

#### Team

- **P1** Kicker: `{members.length} members · 2 pending invites · 3 seats
remaining`. Current omits.
- **P1** Description differs (design = workspace framing).
- **P1** Role cards Admin/Editor/Viewer descriptions match.
- **P1** Invite form: Emails + Default role + Personal note (optional).

#### API keys

- **P1** Kicker: `{active} active · 1 revoked · last rotated 12d ago`.
- **P0** Two side panels missing: **Quick install** snippet + **Security &
  rotation** explainer.
- **P1** Create-key caps labels: Name / Type / Environment / Scopes.

#### Settings

- **P1** Design kicker = `WORKSPACE · acme.shipeasy.dev`. Current scopes to
  project. Decision needed: workspace-level Settings + per-project elsewhere
  vs. current project-scoped Settings.

### 11 · DevTool

- **P1** `devtool-full.html` lives at `localhost:8765/devtools-preview.html`
  (separate Worker). Out of scope for `apps/ui` audit. Compare against
  `packages/devtools` source in follow-up.

---

## Top-10 gaps (prioritized)

1. **P0** Topbar breadcrumbs with color-dotted project chip.
2. **P0** Move project switcher to sidebar bottom with eval/day + env, open
   300px popover.
3. **P0** Verify `UnifiedList` list↔rail fold + open-head bar + Esc-close.
4. **P0** Consolidate Create flows behind one big-modal `WizardModal` across
   configs / gates / killswitches / metrics / experiments.
5. **P0** Consolidate Delete behind typed-confirm 520px danger modal.
   `Archive` label for metrics.
6. **P0** Add `/auth/sent` screen. Reuse `AuthShell`. Decide on workspace
   create chrome.
7. **P1** Quick install + Security & rotation panels on API keys page.
8. **P1** Sidebar reorder + Connect group + version badge.
9. **P1** Copy alignment: Team description, Settings scope kicker, signin
   sub.
10. **P1** Home variants: keep V1 only OR implement V2 + V3.

---

## Implementation log

### ✅ Done — Home V1 (Mission Control)

Commit: **`35d5207` feat(home): wire cockpit to real verdict data + redesign
charts**

#### Visual rebuild

- Full-bleed hero with radial-gradient bg, mode-aware copy (first-run /
  quiet / busy), 4-stat connected grid, 24-hour pulse strip with experiment
  bars + activity-event pings + animated now-line.
- Decision cards with left accent stripe, verdict tag (READY TO SHIP / RUN
  LONGER / NEEDS REVIEW / SRM DETECTED / PEEK WARNING / COMPLETED), 3-stat
  grid (PRIMARY LIFT / SIGNIFICANCE / SAMPLE), CI bar w/ axis ticks +
  accent-glow mean dot, foot meta + owner avatar + ghost+primary actions.
- Live tiles with kind icon + name + primary metric + status dot
  (accent/warn/danger) + lift number + sparkline + days running + sample
  count + owner avatar.
- Stream rows: 96px when col + 22px tone-tinted icon + line w/ bold + mono
  record id + meta + owner avatar.
- Launchpad: 4-col grid w/ 30px icon tile + h4 + description + kbd-tag
  top-right.
- Right rail: System health (4 donut rings, 2×2), Alerts (real signals),
  Pinned (client localStorage), Ask Claude (3 prompt chips).
- Onboarding checklist (first-run): progress bar + 6 steps w/ done/cur/todo
  states.

#### Data wiring (real)

| Surface                              | Source                                                                         |
| ------------------------------------ | ------------------------------------------------------------------------------ |
| Hero stats                           | `state.counts` from listAll handlers + plan                                    |
| Pulse bars                           | `experiments.startedAt` → 24h window position                                  |
| Pulse events                         | `audit_log` last 24h, tone-mapped by action+resource                           |
| Decision lift / CI / pValue / sample | `experimentResults` latest ds × primary metric (`experimentMetrics.role=goal`) |
| Verdict tag                          | Real logic: SRM > peek > final > sig≥95+sign(lift) > sig≥80 trending           |
| Live tile sparkline                  | Real `deltaPct` daily series last 12d                                          |
| Owner avatar                         | `audit_log` last-actor per resource                                            |
| Alerts                               | Killswitch armed (any env `value=true`), SRM detected, peek warning            |
| Pinned                               | Client localStorage scoped by projectId (8 max)                                |
| Stream                               | Real `audit_log` last 24h                                                      |
| Health rings counts                  | Real counts (uptime placeholder remains)                                       |

#### Charts

- **Sparkline**: Recharts `AreaChart` (gradient fill, monotone, end-dot).
- **Health rings**: pure SVG donut (Tailwind `.ring` utility collision
  caused white square halo — class renamed `.ring` → `.donut`).
- **CI bar**: hand-rolled w/ axis ticks, 0-marker in gap, accent glow on
  mean dot.

#### Files

New:

- `apps/ui/src/app/dashboard/[projectId]/_home/charts.tsx` — client island,
  Recharts.
- `apps/ui/src/app/dashboard/[projectId]/_home/home.css` — design tokens
  scoped to home, mapped `--bg/--fg` to `--se-*`.
- `apps/ui/src/app/dashboard/[projectId]/_home/pinned.tsx` — client
  localStorage pins, `addPin()` helper exported for list pages.
- `apps/ui/src/app/dashboard/[projectId]/_home/demo-state.ts` — `?demo=1` /
  `?demo=quiet` mock state.
- `apps/ui/src/app/preview/cockpit/page.tsx` — auth-bypassing dev preview.
  **Delete before prod or gate behind dev env.**

Modified:

- `apps/ui/src/app/dashboard/[projectId]/_home/cockpit.tsx` — full rewrite.
- `apps/ui/src/app/dashboard/[projectId]/_home/state.ts` — adds
  `ExperimentSummary[]` + `AlertItem[]`; queries `experimentResults`,
  `experimentMetrics`, `auditLog`, `killswitches`.
- `apps/ui/src/app/dashboard/[projectId]/page.tsx` — reads `?demo` flag,
  passes mock state when set.

Recharts `^3.8` added to `apps/ui/package.json`.

#### Empty states

All sections (Decisions / Live Now / Stream / Alerts / Pinned) render
actionable empty copy with CTAs when no data.

### ✅ Done — Landing CTA rename

- Hero primary CTA: "Install with Claude" → **Get started**
- Nav CTA: "Install with Claude" → **Sign in**
- Bottom section CTA: "Install with Claude" → **Get started**

Caveat: strings live behind `i18n.t(key, fallback)`. Production picks
translation profile (`en:prod`) — push updated keys via i18n dashboard before
deploy or fallback wins only when key missing.

### ✅ Done — Empty states + skeletons pass

Audit vs `standards-empty.html`, `standards-skeleton.html`, `empty-states.jsx`.

Findings:

- HeroEmptyState already wired on metrics, gates, experiments, configs, team, keys.
- Killswitches list used the generic `EmptyState` (basic card). Design spec
  has a `killswitches` kind. Gap.
- No `loading.tsx` files anywhere — server-rendered pages blocked on the DB
  fetch with no streaming skeleton.
- `Skeleton` primitive used `animate-pulse` opacity, not the design's
  sliding linear-gradient shimmer.

Fixes shipped:

- `Skeleton` primitive switched to a global `.se-skeleton` class with
  `@keyframes se-shimmer` (1.6s, gradient slides across `--se-bg-3`).
  Also added `.se-skeleton-page` (saturate .85) helper for whole-page
  loading desaturation.
- Added `killswitches` kind to `HeroEmptyState` CONFIGS (copy + terminal
  preview + 3 KPIs from `empty-states.jsx`). Replaced inline `EmptyState`
  in `killswitches-content.tsx` with `HeroEmptyState`.
- New `components/dashboard/list-skeleton.tsx` — reusable
  `ListPageSkeleton` matching the design anatomy: real PageHeader (title +
  description stay readable), shimmer kicker, shimmer actions, real card
  outline, toolbar row with shimmer search/chips/buttons, real table
  column count with shimmer column headers and shimmer row cells (icon,
  title+sub, badge, value, mono, avatar — chosen by column index), and
  shimmer card-foot pagination.
- Route-level `loading.tsx` added for: gates, killswitches, configs/values,
  experiments, metrics, keys (keys turns toolbar off).

Files:

- New: `apps/ui/src/components/dashboard/list-skeleton.tsx`
- New: `apps/ui/src/app/dashboard/[projectId]/{gates,killswitches,configs/values,experiments,metrics,keys}/loading.tsx`
- Modified: `apps/ui/src/components/ui/skeleton.tsx`,
  `apps/ui/src/app/globals.css` (+ `@keyframes se-shimmer`, `.se-skeleton`,
  `.se-skeleton-page`),
  `apps/ui/src/components/dashboard/hero-empty-state.tsx` (added
  `killswitches`),
  `apps/ui/src/app/dashboard/[projectId]/killswitches/killswitches-content.tsx`.

Verified: `pnpm --filter @shipeasy/ui exec tsc --noEmit` clean. Visual
shimmer confirmed in design-system showcase (`/design-system#skeleton`).
Auth-gated dashboard routes not visually verified — couldn't sign in
locally; trust HeroEmptyState parity since it reuses the same primitive
already shipped for gates/configs/experiments.

### 🟡 In progress — Remove Claude-specific mentions

Replace with generic AI / agent / harness wording. **1 of 8 strings** changed:

- `apps/ui/src/app/landing/hero.tsx` badge: "Shipeasy speaks MCP — installs
  in Claude in 12 seconds" → "Shipeasy speaks MCP — installs in any AI
  agent in 12 seconds".

Remaining strings:

- `apps/ui/src/app/landing/hero.tsx` title suffix: "faster, just by asking
  Claude."
- `apps/ui/src/app/landing/pricing.tsx`: "MCP + Claude integration".
- `apps/ui/src/app/landing/sections-static.tsx` (4 strings): "Claude picks
  up the server...", "tell Claude what you want to try", "Claude pings you",
  "First dev tool where Claude actually does the boring half", FAQ "What if
  Claude makes a mistake?", `claude mcp add shipeasy` code block, footer
  "Built with Claude".
- `apps/ui/src/app/landing/sticky-features.tsx` (2 strings): config "Edit
  from Claude, the dashboard, or a PR", experiments "Claude writes the
  wrapper", terminal prompt `claude >`.

Decision needed: keep literal install command `claude mcp add shipeasy`
(real CLI, generic version doesn't exist) or replace with generic install.

---

## Outstanding work (next pages, ordered)

Per top-10 priorities, order to attack page-by-page:

1. **Topbar breadcrumbs** — cross-cutting, unblocks all dashboard pages.
2. **Project switcher** — sidebar bottom + popover spec.
3. **Sidebar reorder + Connect group + version badge**.
4. **Auth screens** — `/auth/sent` + workspace-create chrome decision.
5. **Standards / UnifiedList verification** — confirm fold animation +
   open-head bar. Audit any feature page diverging from canonical pattern.
6. **Create wizard consolidation** — one `WizardModal` shell, per-kind step
   contents.
7. **Delete confirm consolidation** — 520px typed-confirm danger modal.
8. **Experiments**, **Gates**, **Killswitches**, **Configs**, **Metrics**
   pages — copy alignment + open-state detail anatomy.
9. **API keys** — Quick install + Security & rotation side panels.
10. **Settings** — workspace-level vs. project-level scope decision.
11. **Team** — kicker + description copy alignment.

---

## Known outstanding within Home V1

- **Health telemetry**: uptime ring still hardcoded `99.96%`. Others use
  count-presence (0% or 100%). Needs `/collect` aggregate pipeline in
  `packages/worker` — multi-session work, not started.
- **`addPin()` wiring**: helper exported from `_home/pinned.tsx` but no
  list-page integrations yet. Each `*-content.tsx` needs a pin button that
  calls `addPin(projectId, { id, kind, label, meta })`.
- **`/preview/cockpit` route**: public, auth-bypassing. Dev tool only.
  Delete before merging to prod or gate behind `process.env.NODE_ENV !==
"production"`.

---

## Reference

- Design bundle (extracted): `/tmp/designfile/extracted/shipeasy/`
- Canonical matrix: `project/app/index.html`
- Chat transcripts (16 files, not yet read): `chats/chat1.md` … `chat16.md`
  — recommended pass before deep V2/V3 work.
- Audit source: this repo's earlier session output (also visible in commit
  context).
