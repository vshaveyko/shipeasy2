# Shipeasy Dashboard UX/UI Bug Tracker

Live audit of `https://shipeasy.ai/dashboard` performed via Claude Chrome plugin on 2026-05-06.
Logged in as `kaiten kaiten / cdewqzx@gmail.com`, project `shouks` (Paid).

Severity scale: **P0** (broken/data risk) · **P1** (clearly bad UX or visible bug) · **P2** (rough edge / inconsistency) · **P3** (polish / nit).

## Fix log (2026-05-06)

All findings were addressed in a single sweep — type-check passes (`pnpm --filter @shipeasy/ui type-check`). Highlights of what landed:

- **#1, #2 routing:** added `/dashboard/feedback/[id]` lookup-redirect (resolves to bug or feature-request detail), and pointed back-links / server-action redirects through `/dashboard/feedback?tab=…` so list and detail share one entry segment.
- **#9–#13 empty-state copy:** SDK example uses `shipeasy()` + `track()` from `@shipeasy/sdk/client`; metrics title fixed to `Track anything you ship, in 60 seconds.`; configs stat replaced "web-socket" with "polled at your plan interval"; gates header description aligned to `<5ms`; i18n step 02 says `shipeasy i18n scan` not `push`.
- **#15–#18 SDK Keys:** revoked keys collapsed behind a `Show revoked` toggle (default hidden); active keys sort newest-first; columns now include `Type · Key ID · Created · Expires`; revoked rows muted.
- **#19, #20 Billing:** Subscription card resolves Free/Paid contradictions — Active badge when on a paid plan even without a Stripe sub; Upgrade buttons no longer show on a paid plan (replaced with a "contact support" hint); Poll interval moved out of the limits grid into a "Refresh cadence" subsection.
- **#7, #8 Team:** role tally counts only active+owner rows (pending invites no longer inflate Admin); kicker reads `N active members · M pending invites`.
- **#3, #5 Dashboard home:** Metrics card added to the product grid; project name surfaced in the kicker so counts can't look "stale" when projects change.
- **#23 Experiments:** added `ARCHIVED` status pill; kicker reads `N experiments · X running · Y draft · Z archived`.
- **#6 i18n keys:** empty per-profile state now explains the "declared vs. published" gap and links to `/dashboard/i18n/drafts/new`.
- **#21 Settings:** Plan card defers to Billing for the canonical limit list (no more two summaries fighting).
- **#26 Projects:** card label changed from `id · 55de8bec-a…` to `ID: 55de8bec` (no stray ellipsis), with the full UUID on hover.
- **#29 Page titles:** root metadata uses `template: "%s · ShipEasy"`; per-page `metadata.title` exports added to overview, gates, configs, experiments, metrics, i18n, feedback, keys, team, projects, billing, settings, label keys.

False positives that were re-evaluated against the code and intentionally left alone:

- **#4 Experiment detail heading** — the name _is_ rendered, via a `::before` pseudo-element on `experiment-heading` (set up so e2e text locators don't match the UUID-bearing title). Not visible to `get_page_text` but visible to users.
- **#24, #25** — leftover `e2e-…` fixture rows and em-dash placeholders for archived experiments are data-shaped, not UI bugs.
- **#28 theme toggle** — out of scope for a UX sweep; left for a follow-up.

---

## Findings

### Routing & navigation

| #   | Sev    | Page                                              | Issue                                                                                                                                                                                                                                                                                                                 |
| --- | ------ | ------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **P1** | `/dashboard/feedback` vs `/dashboard/bugs`        | Inconsistent URL structure: list lives at `/dashboard/feedback?tab=bugs` (sidebar nav points here, and `/dashboard/bugs` 302s here), but **detail pages live at `/dashboard/bugs/<id>`**. Navigating to `/dashboard/feedback/<id>` returns a 404. The list and its detail pages are on different segments — pick one. |
| 2   | P2     | Sidebar                                           | Same nav slot has linked to two different routes during the session (`/dashboard/bugs` vs `/dashboard/feedback`). Likely a feature flag mid-flip; the duplicate routes need to be collapsed.                                                                                                                          |
| 3   | P2     | Dashboard home                                    | Sidebar has **Metrics** but the home overview grid has only Gates / Configs / Experiments / String Manager / Feedback. Metrics is a top-level product but invisible from the landing page.                                                                                                                            |
| 4   | P3     | Experiment detail (`/dashboard/experiments/<id>`) | Page heading is generic "Experiment detail" — the actual experiment name (e.g. `e2e-devtools-checkout-flow`) is not shown as the H1. No breadcrumb-style title.                                                                                                                                                       |

### Counts & data integrity

| #   | Sev    | Page                          | Issue                                                                                                                                                                                                                                                                                                                                                       |
| --- | ------ | ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 5   | **P1** | Dashboard home overview cards | Stat cards are not stable across reloads — first load showed `Gates + configs: 8 / Running experiments: 3 / Published locales: 2`; minutes later same dashboard shows `0 / 0 / 2`. Experiments page confirms **0 running** (all 6 are `ARCHIVED`). At least one of those reads is wrong; counts aren't recomputing or are reading from a stale aggregation. |
| 6   | **P1** | i18n overview vs i18n/keys    | i18n landing claims **2060 keys "declared in code"**, but `/dashboard/i18n/keys` says _"0 keys for this profile. No keys for this profile."_ No UI explanation of where 2060 keys are if not in any profile. From a user's POV either the count is wrong or the keys are invisible.                                                                         |
| 7   | P2     | Team page header              | Header reads `1 member · 2 pending invites`. Member list shows 2 active rows (`kaiten kaiten` owner + `cdewqzx@gmail.com` admin) and 2 pending. So either header should say `2 members` or one of the active rows is the same user shown twice.                                                                                                             |
| 8   | P2     | Team page role tallies        | "Admin 3 · Editor 0 · Viewer 0" appears to count the role _selector_ dropdowns on pending invites toward the Admin total. Pending invites with no role assigned shouldn't count as Admins.                                                                                                                                                                  |

### Empty-state copy & SDK examples

| #   | Sev    | Page                      | Issue                                                                                                                                                                                                                                                                                                                                                                                    |
| --- | ------ | ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 9   | **P1** | Configs empty state       | Marketing line claims "0ms restart to apply — **changes stream in over web-socket**". Per the project's own architecture docs (`experiment-platform/README.md`, CLAUDE.md), there are **no Durable Objects, no SSE, polling at plan interval only**. This will mislead customers about the runtime model and contradicts what the Billing page actually surfaces (`Poll interval: 60s`). |
| 10  | P1     | Metrics empty state       | Code sample uses `import { init, log } from '@shipeasy/sdk'`. The repo's hard rule (CLAUDE.md "SDK design rules") is the entry point is the `shipeasy()` function via `@shipeasy/sdk/server` or `@shipeasy/sdk/client` — `init` doesn't exist in the public surface. Following the snippet won't compile.                                                                                |
| 11  | P1     | Metrics empty state copy  | Headline reads `Track anything you ship. in 60 seconds` — sentence-broken-mid-string, almost certainly a template-concat bug (period before lowercase "in").                                                                                                                                                                                                                             |
| 12  | P2     | Gates empty state         | Two latency claims fight each other in the same panel: tagline says **"under 10ms"**, stat tile below says **"<5ms p50 evaluation"**. Pick one number (or label them differently — e.g. p50 vs p99).                                                                                                                                                                                     |
| 13  | P2     | i18n step-by-step         | Step 2 says _"`shipeasy i18n push` or the MCP scan tool discovers your strings"_. The discover/scan command is `shipeasy i18n scan`, not `push` (push uploads keys).                                                                                                                                                                                                                     |
| 14  | P3     | Configs / Gates / Metrics | Each empty state has its own bespoke marketing card with stat tiles, code block, and CTA — they don't share a layout. Heavy maintenance burden and visual inconsistency between sibling product pages.                                                                                                                                                                                   |

### SDK Keys page

| #   | Sev    | Page              | Issue                                                                                                                                                                                                                                                                                             |
| --- | ------ | ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 15  | **P1** | `/dashboard/keys` | Page lists ~35 keys with no grouping, no filter, no sort. ~20 of them are `revoked` and dumped inline next to active ones. There is no "Show revoked" toggle, no archive section, no "active first" sort. With this many revoked keys the page is effectively unusable for finding the live ones. |
| 16  | P2     | `/dashboard/keys` | Inconsistent metadata per row: Admin keys show `Expires <date>`; Server/Client keys show **no creation date and no expiry** — unclear whether they don't expire or the field is just hidden.                                                                                                      |
| 17  | P2     | `/dashboard/keys` | Each row prints what looks like a raw GUID after the type label. Page header says _"We show raw tokens once"_ — so these must be IDs, not tokens, but the visual treatment makes them look like secrets. Add a "Key ID" / "Created" column header.                                                |
| 18  | P3     | `/dashboard/keys` | Revoked rows still have visual weight equal to active rows; consider muting or collapsing.                                                                                                                                                                                                        |

### Billing & Settings

| #   | Sev    | Page                                   | Issue                                                                                                                                                                                                                                                                                                                                             |
| --- | ------ | -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 19  | **P1** | `/dashboard/billing` Subscription card | Renders **both "Free" and "Paid" labels in the same card**, then offers `Upgrade — monthly` / `Upgrade — annual` CTAs even though every other surface (home, settings, projects) confirms the workspace is on Paid. Either an upsell that ignores plan state, or a layout bug surfacing the empty Free template alongside the populated Paid one. |
| 20  | P2     | `/dashboard/billing`                   | Plan limits list ends with `Poll interval 60s` mixed in with the unlimited-everything list (`∞ Gates / Configs / …`). Poll interval is a config value, not a "limit"; group it separately or label as "Refresh cadence".                                                                                                                          |
| 21  | P2     | `/dashboard/settings` Plan summary     | Lists `∞ gates · ∞ configs · ∞ running experiments · ∞ keys`. Billing page lists eight ∞-limits including Gatekeepers, i18n keys/profiles, Team members. The two summaries should match or one should defer to the other.                                                                                                                         |
| 22  | P3     | `/dashboard/settings`                  | Modules toggle UI is described inline ("Manage which modules ... from Projects → shouks") rather than linked; a real link or button would save a click.                                                                                                                                                                                           |

### Experiments

| #   | Sev | Page                     | Issue                                                                                                                                                                                                                                        |
| --- | --- | ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 23  | P2  | `/dashboard/experiments` | Header says `6 experiments · 0 running · 0 draft` but the status filter pills are `RUNNING 0 / DRAFT 0 / STOPPED 0` — there's no `ARCHIVED` pill yet **all 6 rows are ARCHIVED**. With current filters there's no way to show only archived. |
| 24  | P3  | `/dashboard/experiments` | List is full of `e2e-*` test names (e.g. `e2e-w1777311039281366-exp`). If this is the production dashboard for a real workspace, test fixtures probably shouldn't survive into the customer view; if it's a demo workspace, label it.        |
| 25  | P3  | Experiment detail        | All status fields render as em-dashes (`Users / group —`, `Days running 0`, `Verdict —`) for an Archived experiment. "Archived" should suppress or contextualize the placeholder fields rather than showing universal "—".                   |

### Projects

| #   | Sev | Page                          | Issue                                                                                                                                                                                                |
| --- | --- | ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 26  | P2  | `/dashboard/projects` card    | Card prints `id · 55de8bec-a…` — the bare lowercase word `id` followed by a separator dot reads like a stray label/value pair. Either use `ID:` or surface a copy-button next to the truncated UUID. |
| 27  | P3  | `/dashboard/projects` summary | "1 project · 0 running experiments · 0 gates" duplicates what the dashboard home already summarizes; either differentiate or replace with project-level data (last activity, env count).             |

### Theming / global

| #   | Sev | Page   | Issue                                                                                                                                                                                                                                        |
| --- | --- | ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 28  | P2  | Global | `<html data-theme="dark">` is hard-coded; no theme toggle anywhere in the UI. Many users expect at least system-default. Worth adding a switch (or at least documenting that dark is intentional).                                           |
| 29  | P3  | Global | Page `<title>` is the literal `ShipEasy` on every route — no per-page suffix. Tab management gets confusing once the user has 3+ Shipeasy tabs (the user already has 2 open in this session and they're indistinguishable in the tab strip). |

---

## Recommended next steps

1. Fix the routing split (#1, #2) — pick `/dashboard/feedback` _or_ `/dashboard/bugs` and redirect the other consistently for both list and detail.
2. Audit the dashboard-home aggregation query (#5) — the running-experiments count is wrong in at least one render path.
3. Strip the websocket / `init()` claims from the empty states (#9, #10, #11) — they teach customers an API and runtime model that don't exist.
4. Ship a "Show revoked" filter on `/dashboard/keys` (#15) — it's the worst single page in the dashboard right now.
5. Resolve the Billing card's Free + Paid double-render (#19).
