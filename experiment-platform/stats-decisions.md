# Statistical Decisions & Tradeoffs

Every statistical choice in the analysis pipeline — what it solves, what it risks, real-world examples, and defaults. Read this before changing any analysis parameter.

---

## 1. Bucketing — MurmurHash3 with two independent hashes

**What it is.** Each user is assigned to an experiment via two separate hash calls:

- `murmur3(salt:alloc:uid) % 10000` — decides if the user is in the experiment at all
- `murmur3(salt:group:uid) % 10000` — decides which variant they see

**What problem it solves.** Using a single hash for both decisions would create correlation between allocation and group assignment. Users who land near the allocation boundary (e.g. hash = 999 when allocation is 10%) would always end up in the same variant — not because of a real effect, but because of hash geometry. Two independent hashes break this correlation.

**Real-world example (problem it solves).** Imagine `murmur3(salt:uid) % 10000 < 1000` allocates 10% of users, and those same users are assigned control/test by `hash % 2`. The 10% slice is not a random sample — it's a structured subset. Users with hash 0–499 always see control, 500–999 always see test. If your platform disproportionately assigns users with certain ID patterns to that slice, you get a biased comparison.

**What problem it could cause.** None known for the two-hash design. The theoretical risk is if both hashes happen to be correlated due to a bug in the hash implementation — caught by the 5-vector cross-language test suite.

**Default.** Two hashes always. Not configurable.

**Hash function decision: MurmurHash3_x86_32, seed 0, UTF-8. Final.**

MurmurHash3 is the industry-standard choice for experiment bucketing (used by Statsig, GrowthBook, and most open-source platforms). It has excellent avalanche properties, uniform distribution across the 0–10000 range, and well-tested implementations in every language we support. The cross-SDK divergence risk is mitigated by the mandatory test vector CI suite in `04-evaluation.md`. Do not change the hash function — mid-flight changes reassign users and invalidate all running experiments with no recovery path.

---

## 2. Integer weights and percentages — no floating-point bucketing

**What it is.** All bucketing parameters are stored as integers on a 0–10000 scale (basis points). Group weights must sum to exactly 10000. `rolloutPct = 5000` means 50%. `allocationPct = 1000` means 10%. `weight = 3333` means 33.33%.

Evaluations are pure integer comparisons:

```typescript
segment < gate.rolloutPct; // no float multiply
allocHash >= exp.allocationPct; // no float multiply
cumulative += group.weight; // integer addition, exact
```

**What problem it solves.** Float arithmetic makes `0.33 + 0.33 + 0.34 = 0.9999...998` on some hardware. Users whose hash falls in the gap match no group and are silently excluded from analysis. At 1M users this can be ~100 people missing — enough to trigger SRM detection.

**Real-world example (problem it solves).** A 3-way test at 33/33/34%. Float accumulation leaves `cumulative = 9999.999...998`. Users with `groupHash = 9999` fall through. They appear as exposed in AE but in neither arm. SRM fires on day 3. Investigation takes a week. Integer storage makes `3333 + 3333 + 3334 = 10000` exactly — no gap, no missing users.

**What problem it could cause.** API callers must use basis points, not fractions. A developer who passes `weight: 0.5` instead of `weight: 5000` creates a group with 0 weight — caught at insert time by the Zod validator which enforces `sum(weights) === 10000`. The admin UI converts "50%" to `5000` transparently.

**The last-group fallback** remains in `evalExperiment()` as a purely defensive guard. It is no longer load-bearing but costs nothing to keep.

**Default.** 0–10000 integer scale. API validation: `sum(group.weight) must === 10000`.

---

## 3. Allocation % — what fraction enters the experiment

**What it is.** A separate hash gate before group assignment. `murmur3(salt:alloc:uid) % 10000 < allocation_pct * 10000`. Users who fail the allocation check see no experiment and are never tracked.

**What problem it solves.** You want to test a risky change on 5% of users before scaling up. Allocation lets you start small and increase gradually without changing the experiment definition (the salt stays the same, so users who were in at 10% allocation stay in at 20% — they don't get re-randomized).

**Real-world example (problem it solves).** New checkout flow. Start at 5%, watch error rates for 24 hours, scale to 50% if clean. Without allocation control you'd have to create a new experiment with a new salt, losing the accumulated data.

**What problem it could cause.** Increasing allocation after the experiment starts admits new users who were never in the original cohort. Their pre-experiment baseline differs from early adopters (they may be more hesitant users, different timezone, etc.). This does not invalidate the experiment — new users are assigned to control/test with the same randomization — but it does mean your average treatment effect shifts over time. CUPED baselines are frozen at experiment start and only cover users who existed then; late entrants have no baseline and are excluded from CUPED adjustment.

**Default.** 10% (conservative). Recommended: start at 10%, scale after first clean daily analysis.

---

## 4. Universe holdout — cumulative impact measurement

**What it is.** A holdout is a fixed segment of users (e.g. 5%) excluded from ALL experiments in a universe. They see the world as it was at the start of the universe. After shipping several experiments, you compare holdout users to everyone else to measure cumulative impact.

**Why holdout is on the universe, not the experiment.** If holdout were per-experiment, the same user could be in the holdout for Experiment A but not for Experiment B. When you compare holdout vs exposed for Experiment A, some "holdout" users were actually exposed to Experiment B's changes. The cumulative impact measurement is contaminated.

**What problem it solves.** Individual experiments show local effects (this button change = +2% conversion). Holdouts measure whether shipping 10 such experiments compounds to +15% or only +5% (due to interaction effects). Essential for understanding true platform velocity.

**Real-world example.** You ship 8 checkout improvements over 6 months, each showing +1.5–2.5% individually. The holdout at 6 months shows only +8% total. Something is cannibalizing: probably experiments 3 and 6 targeted the same user segment, so their effects don't compound. Without a holdout you'd estimate +16% and be wrong.

**What problem it could cause.** Holdout users never receive improvements. At 5% holdout on a 10M user base, 500K users are permanently disadvantaged for measurement purposes. Long holdouts (>6 months) accumulate a meaningful experience gap. Plan to rotate holdouts and retire them.

**Default.** No holdout (null). Pro/Enterprise plans only. Holdout range is `[lo, hi]` on a 0–9999 segment scale.

---

## 5. Welch t-test — primary significance test

**What it is.** A two-sample t-test that does not assume equal variance between groups. Uses the Welch-Satterthwaite approximation for degrees of freedom. Applied to every metric type.

**What problem it solves.** Student's t-test assumes both groups have the same variance. In practice, a treatment that affects only high-value users (e.g. a premium feature) creates higher variance in the test arm. Student's t-test underestimates uncertainty in that case and produces falsely confident results. Welch handles unequal variance correctly.

**Real-world example (problem it solves).** Control group: 10,000 users, mean purchase value $12, std $8. Test group: 10,000 users, mean $13.50, std $15 (because the new feature attracts some very high spenders). Student's t-test sees the difference as highly significant. Welch's wider confidence interval correctly reflects that the test arm's high variance makes the estimate uncertain.

**What problem it could cause.** Welch assumes approximate normality (Central Limit Theorem). For binary metrics (`count_users`, `retention_Nd`), you get 0/1 values. At N < 200 per arm, the CLT approximation is weak and Welch p-values for binary metrics may be slightly off. At N > 500 this is negligible. For revenue (`sum`) with a heavy right tail, Welch at N < 500 may be anti-conservative (too many false positives) even after winsorization.

**Rule of thumb.** Binary metrics: need N ≥ 200 per arm. Revenue metrics: need N ≥ 500 per arm. `count_events`: generally fine at N ≥ 100.

**Default.** Welch for all metric types. Not configurable. α = 0.05 per experiment (configurable per-experiment on Pro+).

> **Option (Bayesian, Eppo/Statsig optional):** Bayesian credible intervals with a conjugate prior. A Bayesian model with an informative prior reaches a decision with 20–40% fewer samples in simulation when effects match prior expectations. Trade-off: credible intervals do not control frequentist Type I error — "95% CI excludes 0" is NOT the same as "5% false positive rate." This platform's guarantee-driven design (ship/hold verdicts with stated α) requires frequentist guarantees. Bayesian is appropriate as a supplementary display (show posterior probability of lift > MDE) alongside the primary Welch/mSPRT verdict.

---

## 6. Significance threshold (α) — per-experiment configurable

**What it is.** The p-value below which a metric is considered significant. Default 0.05 (5% false positive rate under the null hypothesis of no effect).

**What problem it solves.** Different experiments carry different risk profiles. A safety-critical guardrail (latency, error rate) might warrant α = 0.01 to reduce false negatives (shipping when you shouldn't). An exploratory feature might accept α = 0.10 to catch weaker signals.

**Real-world example.** You're testing a new payment processor. The primary goal metric (conversion rate) uses α = 0.05. But the guardrail (payment error rate) uses α = 0.01 — you want to be very sure you're not seeing a random noise dip before you ship.

**What problem it could cause.** Lowering α increases required sample size (longer run time) and increases the chance of false negatives (missing a real effect). Raising α inflates false positives. Per-experiment configurability creates inconsistency across the team — if different PMs use different thresholds, experiment results are not comparable.

**Default.** 0.05. Configurable on Pro+ plans.

---

## 7. Intersection test for goals — ALL goals must win to ship

**What it is.** The ship verdict requires every goal metric to be simultaneously significant and positive. If you register 3 goal metrics, all 3 must show p < α with a positive delta.

**What problem it solves.** A union test (any goal wins → ship) inflates Type I error dramatically. With 3 independent goal metrics at α = 0.05, the probability of at least one being spuriously significant is 1 − (0.95)³ = 14.3%. You'd ship 14% of neutral experiments by mistake. With 5 goals: 22.6%.

**Real-world example (problem it solves).** You register: conversion rate, session duration, and feature engagement as three goals. In a neutral experiment, by chance conversion shows p = 0.03 one day. Under a union test you'd ship. Under the intersection test, session duration (p = 0.6) and feature engagement (p = 0.4) block the verdict. You wait. The next week conversion regresses to p = 0.4. You avoided a bad ship.

**What problem it could cause.** The intersection test is conservative. It has lower power than the union test — you need all goals to move, not just one. If your primary goal is conversion and you added session duration as a secondary interest, now session duration can block shipping even if conversion is the only thing that matters.

**Recommendation.** Register exactly one goal metric — the single metric whose improvement would justify shipping. Use `secondary` role for everything else you want to observe. Secondary metrics never block the verdict.

> **Option (LaunchDarkly / Optimizely / Statsig):** Primary-metric model — one metric determines ship/no-ship; guardrails can block but secondary metrics are purely informational. This gives faster decisions when you have a clear primary metric. Trade-off: no protection against accidentally shipping on a spurious secondary signal. The intersection test is more appropriate for multi-metric experiments where all goals are genuinely required.

---

## 8. Guardrail regression — hold on ANY guardrail regression

**What it is.** If any guardrail metric shows a statistically significant negative delta (p < α, delta < 0), the verdict is `hold` regardless of goal metrics.

**What problem it solves.** Goal metrics measure your upside. Guardrails measure harm you must not cause. A new checkout flow that lifts conversion by 3% but increases server error rate by 0.5% (significant) should not ship.

**Real-world example.** New onboarding flow lifts activation (+4%, p = 0.02 — goal hit). But support ticket volume per user increased (+12%, p = 0.008 — guardrail broken). Ship verdict: `hold`. The new flow confuses users even as it activates more of them.

**What problem it could cause.** Guardrail significance is at the same α as goals. A guardrail with 0.001% real-world impact can trigger a hold if the experiment is large enough (high power). Over-sensitive guardrails block good experiments. Calibrate guardrail metrics to metrics that would constitute actual harm if they moved, not every metric you can measure.

**Default.** Hold on any significant guardrail regression. Not configurable. Threshold same as `significance_threshold`.

---

## 9. Min runtime days — peeking protection

**What it is.** The minimum number of days an experiment must run before a ship/hold verdict is emitted. Before this threshold, the verdict is forced to `wait` on Free/Pro plans (without sequential testing).

**What problem it solves.** Peeking — checking results before the planned end date and stopping early when p < 0.05 — inflates the false positive rate far beyond the stated α. Under repeated peeking at every daily analysis, the effective false positive rate approaches 100%. A feature that does nothing will eventually show p < 0.05 by chance if you check it every day.

**Real-world example (problem it solves).** Day 3 of a 14-day experiment: conversion shows p = 0.04. Under peeking, you ship. The next week, conversion regresses to p = 0.3 — it was noise. You've shipped a neutral change and attributed a fake lift to your roadmap. Your boss asks you to replicate it next quarter. You can't.

**What problem it could cause.** Forcing experiments to run their minimum duration delays decisions. If a treatment is obviously harmful (guardrail regression of 50%), you still have to wait `min_runtime_days` before the hold verdict is emitted. Workaround: ship verdict is suppressed, but nothing prevents the operator from manually stopping a clearly broken experiment based on monitoring.

**Default.** 0 days (no minimum). Recommended: 7 days for most experiments (covers day-of-week effects), 14 days for retention metrics.

---

## 10. Min sample size — power guard

**What it is.** The minimum number of users per group required before a ship/hold verdict is emitted. Applied to all groups simultaneously — the smallest group must hit the threshold.

**What problem it solves.** A very small experiment may show p < 0.05 with 50 users in each arm — but the confidence interval is enormous and the result is not reliable. Min sample size ensures you have enough statistical power to detect the effect size you care about.

**Real-world example (problem it solves).** Day 1: your experiment has 40 control, 38 test users. By chance, 4 of the 38 test users made a purchase vs 0 of the 40 control users. p = 0.02. Verdict: wait (sample too small). By day 7 with 2,000 users per arm, the conversion rates are nearly identical. The day-1 result was noise from a lucky early cohort.

**What problem it could cause.** For rare events (e.g. a metric that fires for 0.1% of users), you may need 100,000+ users per arm to hit the minimum for that metric. If you attach a rare metric as a goal, your experiment can never ship. Use rare events as secondary metrics, not goals.

**Default.** 100 users per group. Recommended: compute required N from the power calculator in the experiment creation UI using your baseline rate and minimum detectable effect.

---

## 11. CUPED — variance reduction via pre-experiment data

**What it is.** Controlled-experiment Using Pre-Experiment Data. Adjusts each user's outcome by their pre-experiment behavior: `adjusted = post - θ × (baseline - mean_baseline)`, where `θ = Cov(post, baseline) / Var(baseline)`. Reduces variance by 20–60%, equivalent to running the experiment 25–60% longer.

**What problem it solves.** Users vary enormously in baseline behavior. A high-spending user in the test arm inflates the test mean regardless of the treatment. CUPED removes this noise by subtracting how much of each user's outcome is predictable from their pre-experiment history.

**Real-world example (problem it solves).** Control mean: $12.00. Test mean: $13.20. Standard Welch: p = 0.08 (not significant). With CUPED adjusting for each user's 14-day average spend before the experiment: adjusted p = 0.03 (significant). The same data, the same real effect — CUPED just removed enough noise to see it.

**What problem it could cause.**

- **New users:** Users with no pre-experiment history (new signups during the experiment window) have no baseline and are excluded from CUPED adjustment. If the experiment attracts disproportionately many new users to the test arm, CUPED operates on a biased subsample. We check `overlap_pct` (fraction of users with baselines) — if below 50%, fall back to plain Welch.
- **Baseline window overlaps experiment:** If baselines are computed from a rolling window that overlaps the experiment period, CUPED's independence assumption is violated. Baselines are frozen once at experiment start and never updated.
- **Zero variance baseline:** All users have identical pre-experiment behavior (e.g. a new feature with no historical signal). CUPED provides no benefit and is skipped.

**Default.** Disabled (Free). Enabled on Pro+ plans. Baseline: 14-day average of the same metric, frozen at `started_at`. Overlap threshold: 50% (fall back to Welch below this).

---

## 12. Winsorization — outlier capping

**What it is.** Caps each user's metric value at the `winsorize_pct` percentile of the control group distribution. Applied before CUPED and the t-test.

**What problem it solves.** A single whale user who spends $50,000 in a week can dominate the mean of a 10,000-user group, making revenue experiments essentially measure "did we catch a whale in the test arm?" Winsorization limits the influence of any single user.

**Real-world example (problem it solves).** Control mean: $12, test mean: $14. Looks like +17% lift. But one test user spent $8,000. Exclude them: control $12, test $11.80. The apparent lift was entirely one whale. Winsorization caps the $8,000 at the 99th percentile of control (~$85), so the whale still contributes but doesn't dominate.

**What problem it could cause.**

- **Reverse-risk:** Cap is computed from control only. If control has the heavier tail (e.g. a paywall treatment removes high spenders from the test arm), the control-derived cap is higher than a combined cap — test values that would otherwise not be clipped get clipped. This under-estimates test performance. Log the cap and per-group clip rate per run; warn if any group's clip rate differs from control's by > 5pp.
- **Masks genuine large effects:** If the treatment genuinely helps high-value users (the goal), winsorization reduces the measured effect size. This is intentional — you want to measure the median-user effect, not the whale effect.

**Default.** 99th percentile. Configurable per metric (1–99). Lower percentiles remove more outliers but also reduce measured effect size.

> **Option (Statsig / Eppo):** Symmetric winsorization — derive the cap from the pooled distribution (both arms) and apply it to all arms at both tails (1st and 99th percentile). This eliminates the reverse-risk asymmetry (control's heavier tail inflating the cap) and is less sensitive to outlier concentration in a specific arm. Trade-off: loses the "control as baseline" interpretability; the cap is now influenced by treatment outliers, which re-introduces a small correlation between treatment composition and cap value. Eppo clips at both tails symmetrically; this additionally protects against extreme low outliers (negative revenue, negative session time from instrumentation bugs). See `06-analysis.md` § "Step 4 — Winsorize" for the implementation to switch.

---

## 13. SRM detection — sample ratio mismatch

**What it is.** A chi-squared goodness-of-fit test comparing observed group sizes to expected group sizes (based on group weights × total exposed). If p < 0.01, SRM is detected and the verdict is suppressed entirely.

**What problem it solves.** If users are not randomly assigned to groups in the expected proportions, the experiment is broken — the randomization failed, and any measured effect may be confounded with whatever caused the imbalance. SRM is the experiment equivalent of a failed randomization check.

**Real-world example.** 50/50 experiment. Expected: 5,000 control, 5,000 test. Actual: 4,950 control, 5,050 test. SRM chi-squared p = 0.18 — fine. But: 4,200 control, 5,800 test. SRM p < 0.001 — detected. The cause: the SDK was only initialized in one code path, so users who hit the other path always saw control. The "test" arm had self-selected users (those who hit the instrumented path). Any lift in test is partly a selection effect, not a treatment effect.

**Common causes.** SDK not initialized in all code paths, bot traffic concentrated in one group, floating-point weight gap (fixed by the last-group fallback), different SDK versions deployed to different server pods.

**What problem it could cause.** SRM threshold is p < 0.01 (not p < 0.05). This is intentional — you want to suppress verdicts only when imbalance is very unlikely to be chance. A 1% imbalance at 1M users will always trigger SRM detection even if it's random noise. Consider raising the threshold for very large experiments where small imbalances are expected by chance.

**Default.** Enabled on all plans. Threshold: p < 0.01. Verdict is `invalid` when detected.

---

## 14. Identity stitching — multi-device users

**What it is.** When a user logs in (anonymous → authenticated), the SDK sends an `identify` event: `{ anonymous_id, user_id }`. The analysis cron resolves anonymous IDs to canonical user IDs before aggregating, using `earliest exposure wins` for group assignment.

**What problem it solves.** A user who visits your site on their phone (anonymous) and then logs in on their laptop (different anonymous ID) appears as two users in AE exposure data. Without stitching, they could appear in both control and test simultaneously — violating Welch's independent-samples assumption and producing falsely significant results.

**Real-world example.** 10,000-user experiment. 8% of users use two devices. Without stitching: 10,800 apparent users (800 double-counted), with 400 appearing in both arms. The t-test's independence assumption is violated for those 400. With stitching: 10,000 canonical users, each in exactly one arm.

**What problem it could cause.** If a user's two devices are assigned to different groups before stitching (anon-A in control, anon-B in test), post-stitching they are assigned to whichever had the earlier exposure. Their metric events (post-login) are attributed only to that canonical arm. Their other arm's exposure becomes an orphan in AE — it exists in AE but has no matching canonical user in the analysis. This is correct behavior but means late-stitched users contribute fewer metric events than their actual behavior. At <10% multi-device users, the effect is negligible.

**Default.** Always on. Alias resolution happens once per project per cron run (one D1 query). Canonical: earliest exposure timestamp wins.

---

## 15. AE stable read horizon — snapshot consistency

**What it is.** The analysis cron captures `analysisStartTs = Date.now()` once at the start of each experiment analysis, and filters AE queries to `double2 < analysisStartTs`. Events written to AE after this timestamp are excluded from all pages of the paginated result.

**What problem it solves.** AE pagination uses cursors. If a new event is written to AE between page 1 and page 2 of a paginated query, and the cursor is offset-based, that event can shift the page boundary and cause a row to appear on both pages. A user's metric events would be double-counted, inflating their per-user aggregate.

**Real-world example.** 100,000-user experiment. AE returns 10,000 rows per page (10 pages). While fetching page 3, 200 new events arrive for users who are in pages 1–2's offset range. Pages 3–10 shift. Some users' aggregate rows appear again. Their purchase value is added twice. Mean revenue looks 0.3% higher in the test arm — not because of the treatment but because of the AE read race. Too small to detect in most experiments but non-zero and asymmetric if test users are more active.

**What problem it could cause.** Events written after `analysisStartTs` are excluded from today's analysis — they'll appear in tomorrow's run. For experiments stopped today, this means some last-day events miss the final analysis. At daily batch analysis cadence, losing a few hours of events from the final day is a minor known tradeoff.

**Default.** Always on. `analysisStartTs` captured once per `analyzeExperiment()` call.

---

## 16. CUPED baseline batch chunking — D1 write limits

**What it is.** `freezeCupedBaselines()` writes one row per user to `user_metric_baseline`. D1 batches are capped at 100 statements per call. Large experiments (>100 users with prior metric history) chunk the writes in loops of 100.

**What problem it solves.** A single `db.batch(rows.map(...))` call with >100 statements throws a D1 API error. The error is caught as non-fatal — `cuped_frozen_at` is never set, CUPED never runs, analysis silently falls back to plain Welch for the lifetime of the experiment. No error surfaces to the user.

**Real-world example.** You start an experiment on a product with 50,000 DAU and 30% baseline metric activity. At experiment start, `freezeCupedBaselines()` tries to batch 15,000 rows for the first metric. D1 throws. CUPED never runs. Your Pro plan entitlement is silently not delivered. All variance-reduction results show 0% CUPED effect because it was never applied.

**What problem it could cause.** Chunked writes are slower (150 round trips for 15,000 rows). At >10,000 users with baselines, `freezeCupedBaselines()` can take 30–60 seconds. This is inside the Queue consumer's 15-minute budget and inside the `startExperiment` handler's 30-second CPU limit — but only barely for very large projects. Monitor `cuped_freeze_duration` in structured logs.

**Default.** 100 statements per batch. Fallback: if 0 rows returned from AE (no pre-experiment history for this metric), log a warning and skip — CUPED cannot run without data.

---

## 17. CUPED overlap threshold — selection bias guard

**What it is.** `applyCuped()` computes `overlap_pct = users_with_baseline / total_users`. If below 50%, falls back to plain Welch and logs a structured warning with the overlap percentage.

**What problem it solves.** CUPED on a minority subset introduces selection bias. If only 30% of users have a baseline (the returning users), CUPED adjusts only for those users. The 70% of new users remain unadjusted and dominate the mean. The adjusted estimate measures the treatment effect for a different population (returning users) than the full sample, potentially reversing the sign of the effect.

**Real-world example.** New user onboarding experiment. 80% of users are brand new (no 14-day history). CUPED runs on the 20% returning users and adjusts their outcomes. The 80% new users are averaged in unadjusted. The CUPED-adjusted mean is a weighted average of two very different populations — not a valid estimate of the average treatment effect. Plain Welch on all users is more honest.

**What problem it could cause.** You lose the variance reduction benefit for experiments that run on mostly new users. This is intentional — the variance reduction isn't worth the bias.

**Default.** 50% overlap threshold. Fallback: plain Welch. Logged as `cuped_low_overlap` with the actual `overlap_pct`.

---

## 18. Retention metric — elapsed-ms semantics

**What it is.** `retention_Nd` returns 1 if any event occurred in `[first_ts + N×86400s, first_ts + (N+1)×86400s)` — measured from the user's exact exposure timestamp in milliseconds, not from the start of the calendar day.

**What problem it solves.** Elapsed-ms semantics are internally consistent and do not require timezone handling. Every user gets exactly the same measurement window length regardless of when they were exposed.

**Real-world example (problem it solves).** User A exposed at 06:00 UTC. User B exposed at 23:00 UTC. Both get a 7-day window of exactly 604,800 seconds. Fair comparison.

**What problem it could cause.** "D7 retention" to most product managers means "did the user come back within calendar week 1?" (i.e. on day 7 or earlier). Under elapsed-ms semantics, User B (exposed at 23:00) has their "day 7" window starting at 23:00 on day 7 and ending at 23:00 on day 8. A user who returns at 22:00 on calendar day 8 — which most people would call "returned on day 8, not retained" — is counted as retained. This is a 1-hour discrepancy. For D7 it's minor. For D1 retention it can matter (1 hour = 4% of the window).

**Default.** Elapsed-ms. Document this explicitly when presenting retention metrics to stakeholders. Mitigation: use `retention_7d` to mean "returned within exactly 7×24h of exposure" and communicate that definition clearly.

---

## 19. Sequential testing — mSPRT (Premium/Enterprise)

**What it is.** On Premium/Enterprise plans (`sequential_testing: true`), the analysis pipeline computes the mixture Sequential Probability Ratio Test (mSPRT) statistic in addition to the Welch t-test. The mSPRT lambda value is always valid regardless of when you look — it controls the false positive rate across ALL possible stopping times simultaneously.

**The formula.** For two samples with estimated effect δ̂ and squared standard error V, and a Gaussian mixing prior δ ~ N(0, τ²):

```
Lambda = sqrt(V / (V + τ²)) × exp(τ² × δ̂² / (2 × V × (V + τ²)))
```

Significant when Lambda > 1/α (e.g. at α=0.05, threshold = 20).

**Setting τ.** τ is the standard deviation of the prior over effect sizes. It is set automatically from each metric's `min_detectable_effect` (τ = MDE × 0.5). If no MDE is set, τ defaults to 20% of the control group standard deviation. See `06-analysis.md` § "Step 6.5" for the full implementation.

**What problem it solves.** You run a time-sensitive experiment (Black Friday). You need to decide in 3 days, not 14. Fixed-horizon Welch requires you to pick a stopping time in advance — peeking on day 3 inflates your Type I error to ~14% (at daily checks over 14 days). mSPRT gives you a valid significance test at every daily check.

**Real-world example.** Day 3 of a 14-day experiment: Welch p = 0.03 (not valid — peeking inflates FPR), mSPRT Lambda = 25 > 20 (threshold). The mSPRT result is valid. You can stop. Under plain Welch you should not have stopped.

**What problem it could cause.** τ calibration matters. A τ that is too small (e.g. τ = 0.01% for a metric with typical effects of 5%) makes the test very conservative — Lambda grows slowly. A τ that is too large makes it permissive for large effects but slow for small ones. Require users to set `min_detectable_effect` before enabling sequential testing; block sequential testing for metrics with no MDE.

**Default.** Disabled (Free/Pro). Enabled on Premium/Enterprise. Requires `min_detectable_effect` on goal metrics for proper τ calibration.

> **Option (Bayesian, Eppo/Statsig):** Bayesian credible intervals. A Bayesian model with an informative prior can reach a decision with 20–40% fewer samples in simulation. But Bayesian credible intervals do not control frequentist Type I error — "95% credible interval excludes 0" does not mean 5% false positive rate across repeated experiments. mSPRT is the better choice when frequentist guarantees matter (compliance, safety-critical decisions). Bayesian is better when you have strong priors and care about the posterior probability of a specific effect magnitude.

> **Option (SPRT with boundary):** Wald's original SPRT uses fixed H₀ and H₁ instead of a mixture prior. It is simpler to explain but requires specifying the exact alternative hypothesis effect size in advance. mSPRT's mixture prior is more practical — it works for unknown effect sizes.

---

## 20. Multiple testing — Bonferroni note

**What it is.** With N metrics tested at α = 0.05, expected false positives by chance = N × 5%. For >10 total metrics (goals + guardrails + secondary), apply Bonferroni correction: require p < 0.05/N per metric.

**What problem it solves.** If you add 20 secondary metrics to an experiment and one of them shows p = 0.04, that is expected by chance alone. Without correction, you might redesign your product around a noise signal.

**Real-world example.** You add 15 secondary metrics to a checkout experiment "just to see." One shows p = 0.03 — add-to-wishlist rate increased. You build a quarterly initiative around this. At 15 metrics and α = 0.05, you expect 0.75 false positives by chance. The wishlist result was likely one of them.

**What problem it could cause.** Bonferroni is conservative — it increases required p-value threshold as N grows. With 10 metrics, you need p < 0.005 to call anything significant. This can mask real effects in secondary metrics.

**Current behavior.** Bonferroni is not automatically applied. The verdict logic uses the per-experiment `significance_threshold` for all metrics. Manual correction is the operator's responsibility for >10 metrics. The intersection test on goals partially mitigates this for the ship decision.

**Recommendation.** Keep goal metrics to 1, guardrails to 2–3, secondary to <10. If secondary count exceeds 10, apply `α / N` manually when interpreting secondary results.

> **Option (Statsig / Eppo):** Automatic Benjamini-Hochberg FDR correction for secondary metrics. BH is less conservative than Bonferroni — it controls the expected proportion of false discoveries rather than the probability of any false discovery. At 15 secondary metrics it requires p < 0.017 for the most significant and p < 0.05/15 = 0.0033 for the least, adaptively. BH is the better choice when you care about discovery rate, not about controlling any individual false positive. Trade-off: adds UI complexity (users see adjusted p-values alongside raw p-values) and requires sorted ordering of metric results to compute. Could be added as a display-layer annotation without changing the verdict logic.

---

## Quick reference — defaults

| Parameter                  | Default                                        | Configurable          |
| -------------------------- | ---------------------------------------------- | --------------------- |
| Hash function              | MurmurHash3_x86_32, seed 0, UTF-8              | No                    |
| Allocation                 | 1000 (= 10%, basis points 0–10000)             | Yes, per experiment   |
| Group weights              | User-defined integers summing to exactly 10000 | Yes                   |
| Significance threshold (α) | 0.05                                           | Yes (Pro+)            |
| Min runtime                | 0 days                                         | Yes                   |
| Min sample size            | 100 per group                                  | Yes                   |
| Verdict goal logic         | ALL goals must win (intersection)              | No                    |
| Guardrail logic            | ANY regression blocks ship                     | No                    |
| Winsorization              | 99th percentile, control-only cap              | Yes per metric        |
| CUPED                      | Disabled (Free), enabled (Pro+)                | Plan-gated            |
| CUPED baseline window      | 14 days pre-experiment, frozen at start        | No                    |
| CUPED overlap threshold    | 50% fallback to Welch                          | No                    |
| SRM detection              | Enabled, p < 0.01                              | No — always on        |
| SRM threshold              | p < 0.01                                       | No                    |
| Retention semantics        | Elapsed-ms from exposure timestamp             | No                    |
| Sequential testing         | mSPRT (lambda > 1/α), τ from MDE               | Plan-gated (Premium+) |
| Peeking suppression        | Enforced for Free/Pro                          | Plan-gated            |
| Identity stitching         | Always on                                      | No                    |
| AE read horizon            | Snapshot at analysis start                     | No                    |
| D1 batch size (CUPED)      | 100 statements                                 | No                    |
