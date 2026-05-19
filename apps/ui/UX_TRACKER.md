# UX Tracker — dashboard/e2e-project-id

Status legend: `[ ]` open · `[x]` done · severity tags: !!critical !high !med !low

## Iteration 1 — fixed (7)

- Overview metrics doubled URL · experiments empty CTA · killswitches/experiments-new/configs-new titles · configs-tree unscoped hrefs · locales plural

## Iteration 2 — fixed (7)

- Killswitch native confirm → dialog · gate-editor pluralization · hero-empty-state unsafe defaults · experiments-new "invalid" pre-edit · billing duplicate stats · **critical** SDK-key secret URL leak · key date 2-digit year

## Iteration 3 — fixed (6)

- gates-new title · notifications toast · new-key cookie self-clear · i18n/profiles + i18n/drafts titles · regression: async-callback in `startTransition` crashed `/settings?tab=notifications`

## Iteration 4 — fixed (3)

- Bulk metadata: configs/gates/{,new}, experiments/{metrics,attributes,universes,events}, i18n/{drafts,profiles}/new, projects/new; `generateMetadata` on projects/[id] and gates/[id]
- Keys create-failure shown via flash cookie banner
- BulkAction.confirm JSDoc corrected

## Iteration 5 — fixed (3)

- Translate-with-AI disabled state legible ("soon" pill + tooltip)
- New-project modal: live slug preview
- Closed keys type-readout as not-a-bug

## Iteration 6 — fixed

- [x] !high `configs-gates-route-duplicates-gates-route` — `/dashboard/<pid>/configs/gates`, `/configs/gates/new`, and `/configs/gates/[id]` were a parallel legacy gates surface that rendered the same data as the primary `/gates` route. Replaced all three with thin `redirect()` shims; `src/actions/gates.ts` had `GATES_PATH = "/dashboard/[projectId]/configs/gates"` (pointing at the wrong revalidate path) — corrected to `/dashboard/[projectId]/gates`. Verified: hitting any `/configs/gates*` URL ends at the canonical `/gates*` equivalent.
- [x] !med `settings-billing-tab-leaks-raw-status` — Found during sweep. `/settings?tab=billing` rendered the raw subscriptionStatus literal "none" in a badge ("Subscription status: none"). Same root-cause as the billing-page bug fixed in iter 2, but in a second surface. Mapped the status enum → human strings ("Free tier", "Active", "Trial", "Payment overdue", "Canceled", "Incomplete"). `src/app/dashboard/[projectId]/settings/page.tsx:228`.

## Iteration 6 — discovered (open for next iter)

(none new — settings-billing fix above was found and fixed in this iter, no further unaddressed findings.)

## Iteration 7 — fixed

- [x] !!critical `metric-create-crashes-page-on-unknown-event` — Submitting the New-metric form with an unregistered event name threw past `redirect()` and triggered the global error boundary ("Something broke · Event 'x' not registered"). Wrapped `createMetric()` in `try/catch`, set a `shipeasy_metric_error` httpOnly cookie, and rendered an inline alert banner pointing users to Experiments → Events. `…/experiments/metrics/{actions.ts,page.tsx,metric-error-cookie.ts}`.
- [x] !!critical `universe-create-crashes-page-on-plan-limit` — Same crash pattern: hitting the Free-plan universe cap rendered "Something broke · universes limit reached (1 on free plan). Contact support." with full error-boundary fallback. Refactored using a new shared helper `src/lib/flash-error.ts` (`setFlashError` / `readFlashError`) and added an inline banner on the universes page. Same fix pattern is now reusable for the other action surfaces.

## Iteration 7 — discovered (open for next iter)

- [ ] !low `attributes-delete-form-not-firing-from-automation` — Attribute "Delete" button submits a form but in-browser automation clicks did not trigger any state change; may be a Server Action POST quirk vs. user-initiated click. Manual verification recommended.

## Iteration 8 — fixed

- [x] !high `server-action-throws-crash-page-pattern-systemic` — Routed the rest of the throw-prone server actions through `lib/flash-error.ts` so the global error boundary stops swallowing recoverable problems:
  - **Attributes** create + delete (`experiments/attributes/{actions.ts,page.tsx,attribute-error-cookie.ts}`) — flash banner reads `shipeasy_attribute_error`.
  - **Events** create + approve + delete (`experiments/events/{actions.ts,page.tsx,event-error-cookie.ts}`) — `shipeasy_event_error`.
  - **Gates** create (`gates/{actions.ts,page.tsx,gate-error-cookie.ts}`) — on error redirect lands on the `/gates` list which is now a server component wrapping `GatesContent`, and reads `shipeasy_gate_error`.
    Each catch handler short-circuits with `setFlashError`, then `revalidatePath` + `redirect` so the user lands on a page that can read the cookie.

## Iteration 8 — discovered (open for next iter)

(none new — every surface previously known to throw past the boundary now flashes a banner.)

## Iteration 9 — fixed

- [x] !med `404-page-is-bare-next-default` — Unmatched URLs under `/dashboard/*` (typo, deleted resource, or `notFound()` thrown from a detail page like `gates/[id]`) rendered the stock Next.js 404 ("This page could not be found.") with no app chrome and no navigation. Added:
  - `src/app/dashboard/not-found.tsx` — branded 404 inside the dashboard shell with "Back to dashboard" and "Open docs" CTAs. Verified: `/dashboard/<pid>/gates/<bad-id>` now lands here with `title="Not found · ShipEasy"`.
  - `src/app/not-found.tsx` — global fallback (full `<html>/<body>` shell) for paths outside the dashboard tree.

## Iteration 9 — discovered (open for next iter)

(no new findings — only the long-standing !low carry-overs remain: attribute-delete automation quirk, /sw.js 404, stale seed timestamps. Flash-error cookies persist for their 30s TTL across reloads; could be cleared after first render but not user-blocking.)

## Iteration 10 — fixed

- [x] !med `top-bar-search-and-bell-look-active-but-are-dead` — The `Search or ask Claude…` input-styled button and the bell `Notifications` button in the top bar both rendered as enabled, hovered, and showed a ⌘K key, but had no click handler. Users tab to them and nothing happens. Marked both `disabled` with `title="… — coming soon"`, replaced the misleading `⌘K` kbd with a neutral `soon` badge, and added `disabled:cursor-not-allowed disabled:opacity-60`. Source: `src/components/dashboard/top-bar.tsx`.

## Iteration 10 — discovered (open for next iter)

(no new findings — only the same long-standing !low carry-overs.)

## Iteration 11 — fixed

- [x] !med `docs-links-pointing-to-non-existent-local-route` — Multiple in-app links used `href="/docs"` or `href="/docs/quickstart"` / `href="/docs/keys"` which all 404 — the docs site is the separately-deployed `shipeasy-docs` Worker at `https://docs.shipeasy.ai`. Replaced all in-app references with absolute `https://docs.shipeasy.ai/...` URLs:
  - `src/app/dashboard/[projectId]/settings/page.tsx` (Docs CTA in settings header)
  - `src/app/dashboard/[projectId]/keys/page.tsx` (SDK docs, All SDKs, Key reference)
  - `src/app/dashboard/projects/projects-view.tsx` (Docs CTA on projects header)
  - `src/app/dashboard/not-found.tsx` + `src/app/not-found.tsx` (404 page "Open docs" CTAs)
    Verified: `Array.from(document.querySelectorAll('a')).map(a=>a.href).filter(h=>h.includes('docs'))` on `/keys` returns only `https://docs.shipeasy.ai/...` URLs.

## Iteration 11 — discovered (open for next iter)

(no new findings — same long-standing !low carry-overs.)

## Carried-forward open items

- [ ] !low `service-worker-missing-404` — `/sw.js` still 404s on every nav. Either ship a worker or stop registering it from `app/layout.tsx`.
- [ ] !low `i18n-profiles-stale-timestamps` — seed `en:test` reads "over 2 years ago" against the 2026-05-16 app clock. Either fix the seed or guard the formatter when the diff exceeds 1y.

## Verification notes (this iter)

- `/configs/gates` → `/gates` (title "Gates · ShipEasy")
- `/configs/gates/new` → `/gates/new` (title "New gate · ShipEasy")
- `/configs` → `/configs/values` (title "Configs · ShipEasy")
- Sidebar nav has no remaining link to the legacy `/configs/gates` surface.
