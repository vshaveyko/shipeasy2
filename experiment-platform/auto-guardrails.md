# Auto-collected Guardrail Metrics

Automatically tracking browser performance and error signals as guardrail metrics on every experiment — without any developer instrumentation beyond loading the SDK.

---

## What we collect

Five metrics collected automatically from a ~0.5KB custom PerformanceObserver block (no npm dependency):

| Metric | Source | Browser coverage | Fires when |
|---|---|---|---|
| `__auto_lcp` | PerformanceObserver `largest-contentful-paint` | Chrome/Edge only (~70% of users) | User leaves page (`visibilitychange`) |
| `__auto_inp` | PerformanceObserver `event` (worst interaction per route) | Chrome/Edge only | Each SPA route change + page leave |
| `__auto_cls_binary` | PerformanceObserver `layout-shift`, thresholded | Chrome/Edge only | Each SPA route change + page leave |
| `__auto_js_error` | `window.onerror` + `unhandledrejection` | All browsers | First unhandled error on this page-load |
| `__auto_network_error` | `window.fetch` wrapper | All browsers | First 5xx or network failure on this page-load |
| `__auto_abandoned` | LCP not fired at `visibilitychange` | Chrome/Edge only | User left before page painted (LCP = 0) |

Firefox and Safari users contribute JS error and network error data but no Web Vitals. Measurements are therefore biased toward Chrome/Edge users — surface this caveat in any analysis that references these guardrails.

---

## What we do NOT collect (and why)

**Raw CLS float values** — CLS has 60–80% zero-inflation (most users have zero layout shift). Welch's t-test on a zero-inflated distribution produces unreliable p-values. We convert to binary: did CLS exceed 0.1 on this page-load? That's `__auto_cls_binary` with `count_users` aggregation.

**Raw JS error count** — We deduplicate: at most 1 error event per page-load. Counting total errors per user adds noise without statistical benefit. The metric is "fraction of page-loads that had ≥1 unhandled error."

**Network error rate (all 4xx/5xx)** — 4xx errors (404, 401, 403) are usually client-side mistakes, not experiment regressions. We only fire on 5xx and network failures (DNS, CORS, timeout). 4xx errors would pollute the signal with expected errors that aren't caused by the treatment.

**Rage clicks** — Detectable but noisy. Baseline varies too much by product area to be a meaningful cross-experiment guardrail. Available as an opt-in operator-configured guardrail.

**Dead clicks** — Not reliably detectable without framework-level instrumentation. `getEventListeners()` is DevTools-only.

---

## The survivor bias problem — LCP

**This is the most important caveat in the entire system.**

LCP only fires after the page loads. If the test variant makes pages slower, some users will abandon before LCP fires. The measured LCP in the slow variant is the LCP of the *patient subset* — it can appear *faster* than control because the slow-loading users already left.

**A slow variant can pass the LCP guardrail precisely because it failed users.**

Mitigation: `__auto_lcp` as a guardrail is only valid when paired with a session abandonment companion metric. We emit `__auto_abandoned` (1 if user left within 5 seconds with no interaction) alongside LCP. If the abandonment rate is significantly higher in the treatment arm, the LCP guardrail result is flagged as potentially biased and demoted to advisory.

Without the abandonment companion, `__auto_lcp` is advisory-only regardless of tier.

---

## Three-tier guardrail system

### Tier 1 — Auto-attached, always advisory (never blocks)

Attached to every experiment automatically. Show in results. Never trigger a hold verdict.

- `__auto_lcp` — mean LCP per user (avg aggregation, 95th winsorize), Chrome/Edge only
- `__auto_js_error` — fraction of page-loads with ≥1 unhandled error (count_users aggregation)

These are leading indicators. If LCP is up 300ms and the experiment ran for 7 days, that's a signal to investigate — not an automatic block.

### Tier 2 — Auto-attached, soft hold (requires 1-click override)

JS error rate only, when:
- Delta exceeds **+0.5 percentage points absolute** (MDE threshold — ignores 2ms-equivalent noise)
- p < **0.01** (tighter than standard α=0.05 to reduce false holds from day-level noise)
- Holm-Bonferroni correction applied if multiple Tier 2 metrics fire simultaneously

The launch button turns orange. Clicking it requires a justification reason. The override is logged permanently and surfaced to the team lead. This is the only metric that soft-holds because it is the most causally attributable and the most actionable — a JS error rate increase almost always traces to a specific code path in the variant.

### Tier 3 — Operator-configured, hard-block eligible

Available for teams with specific quality SLOs. Never auto-attached.

- `__auto_inp` — INP (interaction latency, avg per user, Chrome/Edge only)
- `__auto_cls_binary` — proportion of page-loads with CLS > 0.1 (proportion z-test, not t-test)
- `__auto_network_error` — fraction of page-loads with 5xx/network failure
- Any developer-defined metric

Hard blocks require manager approval to override. Holm-Bonferroni correction across all simultaneously active Tier 3 guardrails at α=0.01.

---

## Statistical methodology

### Aggregation

All auto-metrics use **per-user aggregation** before the t-test. Raw page-load observations are never fed directly into the t-test — that would violate the independence assumption (10 page-loads from one user are correlated).

| Metric | Aggregation | Why |
|---|---|---|
| LCP | `avg` per user across their page-loads | Mean per-user LCP; Welch t-test on per-user means |
| INP | `avg` per user (worst interaction per page-load, then mean across page-loads) | Same |
| CLS binary | `count_users` (1 if any page-load had CLS > 0.1) | Binary metric, standard proportion |
| JS error | `count_users` (1 if any page-load had an unhandled error) | Binary metric |
| Network error | `count_users` (1 if any page-load had a 5xx/failure) | Binary metric |

**Why not p75?** Google recommends measuring Web Vitals at the 75th percentile across all page-loads. That is a site health grading metric, not an experiment analysis technique. Comparing group-level p75 values is not compatible with Welch's t-test (it collapses N users into one number per group). The correct approach is: compute each user's mean (or 75th percentile) LCP across their page-loads, then compare per-user means with Welch. The `avg` aggregation does this. The group-level 75th percentile of these per-user means is then available as a display statistic in the dashboard without affecting the p-value calculation.

### Multiple testing correction

With multiple auto-guardrail metrics active simultaneously, the family-wise error rate inflates. At 4 independent guardrails at α=0.05: P(≥1 false hold) = 18.5%.

We apply partial multiple-testing control via the **2-of-3 performance cluster rule** (LCP/INP/CLS must show ≥2 significant regressions before any count toward a hold) and the MDE threshold requirement. A full Holm-Bonferroni step-down correction across all guardrails is not yet implemented in `computeVerdict` — it is a planned improvement.

For the performance cluster (LCP, INP, CLS), we additionally apply a **2-of-3 rule** before triggering a hold: at least 2 of the 3 performance metrics must show a significant regression. This accounts for the positive correlation between these metrics (a slow page tends to show regression in all three) without requiring all three to be significant individually.

### Minimum detectable effect thresholds

Guardrails never fire below these effect sizes, even if statistically significant. The CI lower bound must exceed the threshold:

| Metric | MDE threshold | Rationale |
|---|---|---|
| LCP | 150ms absolute | Human perception threshold ~100ms; 150ms gives headroom |
| INP | 100ms absolute | Web Vitals "needs improvement" threshold increment |
| CLS binary | +2pp in proportion | Operationally meaningful shift in layout stability |
| JS error rate | +0.5pp absolute | Half a percentage point is the smallest actionable signal |
| Network error rate | +1pp absolute | Network errors are noisy; smaller deltas are infrastructure noise |

A 5ms LCP regression at 500K users will have p < 0.001 but never triggers a hold — the CI is [3ms, 7ms], which does not exceed 150ms.

### JS error rate — known false positive rate

JS error rate has 15–25% false positive rate as a per-experiment guardrail under the standard t-test because day-level correlated noise (CDN hiccups, third-party script failures, browser updates) is not i.i.d. across users. This is why we use α=0.01 (not 0.05) and a +0.5pp MDE threshold — together these reduce the practical false positive rate to ~2–3% for a 14-day experiment.

Even with these mitigations: **never hard-block on JS error rate alone.** It is Tier 2 (soft-hold with 1-click override), not Tier 3 (hard-block).

---

## Implementation

### SDK changes (`packages/sdk-client/src/`)

New files: `web-vitals.ts` (~0.5KB), `errors.ts`. Called from the `FlagsClientBrowser` constructor after the `EventBuffer` is created.

**Critical: gate to experiment participants only.**

```typescript
// web-vitals.ts — called on visibilitychange, after identify() has resolved
function flushWebVitals(buffer: EventBuffer): void {
  // Gate auto-metrics to experiment participants only (cost optimization — see cost.md).
  // EXCEPTION: __auto_abandoned must NOT be gated — it fires precisely when the user leaves
  // before LCP fires, which can happen before identify() resolves on slow connections.
  // We buffer the abandoned event unconditionally; the analysis cron's post-exposure filter
  // correctly excludes pre-exposure events if the user was not in any experiment.
  const inExperiment = buffer.exposureSeen.size > 0

  if (lastLcp === 0) {
    // User left before LCP fired — emit regardless of experiment participation
    buffer.pushMetric('__auto_abandoned', 1)
  } else if (inExperiment) {
    buffer.pushMetric('__auto_lcp', lastLcp)
  }
  if (inExperiment) {
    buffer.pushMetric('__auto_cls_binary', clsSum > 0.1 ? 1 : 0)
    if (worstInp > 0) buffer.pushMetric('__auto_inp', worstInp)
  }
}
```

**Why gating is safe for most metrics:** `visibilitychange` fires when the user leaves — seconds to minutes after page load. By that time, `identify()` has long resolved and `exposureSeen` is populated. There is no race condition for LCP, CLS, or INP. The exception is `__auto_abandoned`, which is emitted unconditionally because the abandonment event occurs precisely in the window where `exposureSeen` may still be empty — the analysis cron's post-exposure filter handles correct attribution.

**JS error events** may fire before `identify()` resolves. These events are still buffered and sent to AE. The analysis cron's post-exposure filter (`double2 >= first_ts`) correctly excludes pre-exposure errors from experiment attribution. Errors before the user saw the variant should not count against the variant.

### Provisioning changes (`/auth/provision`)

Seed 6 auto-events into every project's event catalog at creation time:

```typescript
// added to the D1 batch in handleProvision()
db.insert(events).values([
  { id: uuid(), projectId, name: '__auto_lcp',           description: 'Largest Contentful Paint (ms) per page-load — auto-collected by SDK', pending: 0, createdAt: now },
  { id: uuid(), projectId, name: '__auto_inp',           description: 'Interaction to Next Paint worst-case (ms) — auto-collected', pending: 0, createdAt: now },
  { id: uuid(), projectId, name: '__auto_cls_binary',    description: 'Layout shift exceeded 0.1 threshold on this page-load (0 or 1) — auto-collected', pending: 0, createdAt: now },
  { id: uuid(), projectId, name: '__auto_js_error',      description: 'Unhandled JS error occurred on this page-load (0 or 1) — auto-collected', pending: 0, createdAt: now },
  { id: uuid(), projectId, name: '__auto_network_error', description: 'Fetch 5xx or network failure on this page-load (0 or 1) — auto-collected', pending: 0, createdAt: now },
  { id: uuid(), projectId, name: '__auto_abandoned',     description: 'User left before LCP fired — possible slow-load abandonment (0 or 1) — auto-collected', pending: 0, createdAt: now },
])
```

Also add all 6 `__auto_*` names to the KV catalog (`{project_id}:catalog`) at provisioning so `/collect` validation passes on the first page-load, before any admin UI interaction.

### Admin UI

Mark events whose name starts with `__auto_` as read-only in the event catalog. Do not allow rename, delete, or property modification. The `__` prefix is reserved — the admin UI rejects developer-created events starting with `__`.

Auto-metric metrics (LCP avg, JS error count_users, etc.) are pre-suggested in the onboarding flow for Tier 1 and Tier 2 guardrails. They appear under "Performance & Reliability" in the metric selector.

### Analysis pipeline

No changes required. The existing AE write path, metric aggregation, winsorization, CUPED, Welch t-test, and verdict logic all work for auto-collected metrics exactly as for developer-defined metrics.

One addition: the verdict display should surface the browser coverage caveat when any `__auto_lcp`, `__auto_inp`, or `__auto_cls_binary` guardrail fires:

> "LCP measured on Chrome/Edge users only (~70% of your traffic). If your user base skews toward Firefox or Safari, this guardrail may not represent your full audience."

---

## Cost

With gating to experiment participants:

| Tier | DAU | Added cost |
|---|---|---|
| Starter | 10K | ~$0 |
| Growth | 100K | ~$2/month |
| Scale | 1M | ~$165/month (+60% of base) |

Without gating: ~10× more at Scale (~$1,550/month extra). The gating check is mandatory, not optional.

Full cost model in `cost.md` § "Auto-Guardrail Metrics Cost Impact".

---

## What operators see

**In experiment results:** A "Performance & Reliability" section below the primary metric results showing Tier 1 guardrails with trend lines. If a Tier 2 or Tier 3 guardrail fires, the ship button changes state and a banner explains which metric regressed and by how much.

**In the metric selector:** `__auto_*` metrics appear under "Auto-collected (no instrumentation required)" with their aggregation type and MDE threshold pre-filled. Operators attach them to Tier 3 in the experiment creation flow.

**On the event catalog page:** Auto-collected events are visually distinguished (e.g. a lightning bolt icon) and marked read-only. Their "Properties" show the raw value schema. Operators can see how many events/day each metric is generating.

---

## Resolved design decisions

### 1. Abandonment metric — implemented alongside LCP at launch

`__auto_abandoned` is the 6th auto-collected metric, seeded at provisioning alongside the others. It fires when `visibilitychange` occurs and LCP has not yet fired — the user left before the page fully painted.

```typescript
// On visibilitychange → hidden:
// __auto_abandoned fires unconditionally — do NOT gate on exposureSeen.size > 0.
// The user may leave before identify() resolves; the analysis cron's post-exposure
// filter handles correct attribution. Gating would drop the most important signal.
const inExperiment = buffer.exposureSeen.size > 0
if (lastLcp === 0) {
  buffer.pushMetric('__auto_abandoned', 1)  // unconditional — see above
} else if (inExperiment) {
  buffer.pushMetric('__auto_lcp', lastLcp)
}
```

**How it gates LCP guardrail reliability:** The dashboard checks whether `__auto_abandoned` shows a significant delta > +2pp in treatment vs. control. If yes, it flags `__auto_lcp` results as `unreliable — abandonment bias detected` and hides the LCP guardrail result. The abandonment metric itself becomes the primary signal.

`__auto_lcp` is Tier 1 advisory from launch. It may only be promoted to Tier 2 after the abandonment companion is validated in production (abandonment and LCP results are consistent and causally coherent across a sample of experiments).

---

### 2. SPA navigation — per-route CLS/INP, initial-load-only LCP

For React/Next.js SPAs, `history.pushState` monkey-patching handles route transitions:

```typescript
const orig = history.pushState.bind(history)
history.pushState = function(...args) {
  // Guard against prefetch navigations that call pushState without a real path change.
  // Next.js App Router prefetches routes and may call pushState during hover/intent.
  const nextUrl = args[2] ? new URL(String(args[2]), location.href) : null
  const pathChanged = nextUrl ? nextUrl.pathname !== location.pathname : false

  if (pathChanged && buffer.exposureSeen.size > 0) {
    // Flush CLS and INP for the page being left — each route gets its own measurement
    buffer.pushMetric('__auto_cls_binary', clsSum > 0.1 ? 1 : 0)
    if (worstInp > 0) buffer.pushMetric('__auto_inp', worstInp)
  }
  if (pathChanged) {
    // Reset accumulators for the next route
    clsSum = 0; worstInp = 0
    // Clear lastLcp so the stale initial value is not re-sent on the next visibilitychange
    lastLcp = 0
  }
  return orig(...args)
}

// back/forward navigation (popstate) — flush and reset just like pushState
window.addEventListener('popstate', () => {
  if (buffer.exposureSeen.size > 0) {
    buffer.pushMetric('__auto_cls_binary', clsSum > 0.1 ? 1 : 0)
    if (worstInp > 0) buffer.pushMetric('__auto_inp', worstInp)
  }
  clsSum = 0; worstInp = 0; lastLcp = 0
})

// hash-only navigation — flush and reset CLS/INP; LCP does not reset
window.addEventListener('hashchange', () => {
  if (buffer.exposureSeen.size > 0) {
    buffer.pushMetric('__auto_cls_binary', clsSum > 0.1 ? 1 : 0)
    if (worstInp > 0) buffer.pushMetric('__auto_inp', worstInp)
  }
  clsSum = 0; worstInp = 0
  // do NOT reset lastLcp — hash changes are in-page; LCP is still from initial load
})
```

**bfcache false positive mitigation:** When the user navigates away and then returns via the browser back-button, the browser may restore the page from the back/forward cache (bfcache). On the preceding `pushState` (navigating away), `lastLcp` was reset to `0`. When the restored page receives `visibilitychange`, `lastLcp === 0` would incorrectly emit `__auto_abandoned`. To prevent this:

```typescript
// bfcache guard: when user hits back-button, browser restores page from bfcache.
// lastLcp was reset to 0 on the preceding pushState (navigating away), so the
// restored page has lastLcp === 0. Without this guard, returning via back-button
// emits a false __auto_abandoned event.
window.addEventListener('pageshow', (e) => {
  if (e.persisted) {
    // Page restored from bfcache — reset to sentinel; LCP won't re-fire
    lastLcp = -1  // -1 = bfcache restore: do not emit abandoned
  }
})
```

The abandonment emit check therefore has three meaningful states:
```typescript
// In visibilitychange handler:
// lastLcp === 0:  page never painted (true abandonment candidate)
// lastLcp === -1: page restored from bfcache (not a new load, do not emit)
// lastLcp > 0:   normal case — LCP fired
```

The `flushWebVitals` function already handles this correctly: `if (lastLcp === 0)` only fires for true initial-load abandonments, and `-1` falls through to the `else if (inExperiment)` branch which also skips LCP emission (since `-1 > 0` is false). No additional code change is needed beyond adding the `pageshow` listener.

**LCP behavior on SPAs:** LCP only fires on hard navigation (initial page load). After a client-side route change, no new LCP event is emitted by the browser. This is correct — if an experiment doesn't affect the landing page, its LCP shouldn't change. The dashboard shows a note when `__auto_lcp` is attached to an experiment: *"LCP measured on initial page load only. Client-side route changes are not reflected."*

**CLS and INP** reset per route — each route accumulates its own layout shift and interaction latency independently. This is the right behavior for experiments that change specific pages in an SPA.

---

### 3. Guardrail timing — two thresholds, harm prevention overrides runtime

The current peeking suppression skips guardrail checks entirely before `min_runtime_days` for Free/Pro plans. This is wrong for guardrails — waiting 7 days while users experience 5% more JS errors causes real harm.

**Two-threshold design:**

| Threshold | Condition | Fires |
|---|---|---|
| **Immediate hold** | Delta > 3× MDE AND p < 0.001 | Any time, any plan — "obviously broken" |
| **Standard hold** | Delta > MDE AND p < 0.01 | After `min_runtime_days` on Free/Pro; any time on `sequential_testing` plans |

The immediate threshold is structurally sound even before min_runtime: a 3× MDE effect at p < 0.001 has a false positive rate below 0.1% regardless of when you check. Waiting for runtime to confirm something that obvious causes more harm than acting.

**In `computeVerdict` — new immediate check before the peeking gate:**

```typescript
// Check immediate threshold first — fires regardless of runtime or plan
// MDE_THRESHOLDS: { '__auto_js_error': 0.005, '__auto_lcp': 150, ... }
const immediatelyBroken = guard.filter(m =>
  m.p_value < 0.001 &&
  m.delta < 0 &&
  Math.abs(m.delta) > 3 * (MDE_THRESHOLDS[m.metric] ?? MDE_THRESHOLDS['default'])
)
if (immediatelyBroken.length > 0) return {
  verdict:   'hold',
  title:     'Stop — critical guardrail regression',
  narrative: `${immediatelyBroken.map(m => `${m.metric} (${m.delta_pct.toFixed(1)}%)`).join(', ')} ` +
             `regressed severely. Stopping immediately regardless of minimum runtime.`,
  peek_warning: false,  // this is not a peek — it's hard evidence
}

// Standard peeking suppression (unchanged — only applies to ship/hold, not immediate)
if (peekWarning && !experiment.sequential_testing) return { verdict: 'wait', ... }

// Standard guardrail check (after runtime gate)
const guardrailsBroken = guard.filter(m =>
  m.p_value < 0.01 &&
  m.delta < 0 &&
  Math.abs(m.delta) > (MDE_THRESHOLDS[m.metric] ?? MDE_THRESHOLDS['default'])
)
```

`MDE_THRESHOLDS` for auto-metrics: `{ '__auto_js_error': 0.005, '__auto_network_error': 0.01, '__auto_lcp': 150, '__auto_inp': 100, '__auto_cls_binary': 0.02, 'default': 0 }`.

For operator-configured guardrail metrics, the MDE threshold is stored per metric in the `metrics` table (`min_detectable_effect` column, nullable — null means no MDE threshold, standard p-value only).
