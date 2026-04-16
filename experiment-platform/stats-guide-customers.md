# Experimentation Guide — How It Works and Why

A practical guide to running experiments on the platform. No statistics degree required. Written for product managers, growth teams, and analysts who want to understand what the numbers mean and how to get trustworthy results.

---

## How users get assigned to experiments

When your experiment is running, every user who visits your product is evaluated against it. Here's what happens:

1. A fingerprint is computed from the user's ID (or an anonymous session ID before they log in) and your experiment's name. This fingerprint is a number between 0 and 9,999.

2. If the fingerprint falls within your **allocation** (e.g. the first 1,000 out of 10,000 = 10%), the user enters the experiment.

3. A second, independent fingerprint assigns them to control or test.

**Why two separate steps?** If the same fingerprint controlled both "in or out" and "which variant," users near the edge of your allocation window would always land in the same group — not because of random chance, but because of how the math works. Separating the two decisions removes that correlation.

**What this means for you:** Assignment is deterministic. If you pause an experiment and restart it without changing the configuration, the same users will be in the same groups. If you change the allocation percentage upward, existing users stay in their groups — only new users are added.

---

## Allocation — starting small and scaling up

Allocation controls what fraction of your total eligible traffic enters the experiment at all. A 10% allocation means 10% of users see either control or test; the other 90% are completely unaffected.

**When to start small.** For risky changes (new payment flows, major UI overhauls), start at 5–10%. Watch error rates and support tickets for 24 hours. If clean, scale to 50%+. You can increase allocation without restarting the experiment — users already in keep their assignments, new users join.

**What you cannot do safely.** You cannot *decrease* allocation or change group weights (the control/test split) mid-experiment without invalidating results. Users who were previously in the experiment would drop out, and the remaining users would be a biased subset of the original cohort. If you need to do this, stop the experiment, record its state, and start a new one.

**Why not just run on 100% of traffic?** Because if something goes wrong (a bug in the test variant, a performance regression), you've affected everyone. Small allocations limit blast radius.

---

## Group weights — splitting traffic between variants

By default experiments are 50% control / 50% test. You can run multi-variant tests (A/B/C) by adding more groups with custom splits. All groups must add up to 100%.

**Common configurations:**
- 50/50: standard A/B test
- 34/33/33: three-way test
- 10/90: cautious rollout — 10% see the new experience, 90% stay on control

**The math is exact.** Group splits are stored as whole numbers (e.g. 5000/5000 for 50/50, not 0.5/0.5) to avoid rounding errors. A 33/33/34 split means exactly those proportions — no user is assigned to "the gap between groups."

**Rule of thumb.** More variants means slower results. A three-way test at equal split needs roughly 1.5× as many users as a two-way test to detect the same effect size, and takes proportionally longer to run.

---

## What "statistically significant" actually means

A p-value is the probability of seeing a result at least this extreme *if the treatment had no real effect*. When p < 0.05 (our default threshold), we say the result is significant.

**Plain English:** If the treatment does nothing, we'd see this big a difference by chance fewer than 5% of the time. That's low enough for us to believe the difference is real.

**What it does NOT mean:**
- It does not mean the effect is large or practically important (a 0.01% improvement can be statistically significant with enough users)
- It does not mean there's a 95% chance the treatment is better (that's a common misreading)
- It does not mean you should definitely ship — check the confidence interval width, the guardrail metrics, and whether the effect is meaningful for your business

**The confidence interval** (the bar in the results chart) shows the range of plausible true effects. A wide CI means high uncertainty. A narrow CI means you have a precise estimate. The CI being entirely above zero (green) is more informative than the p-value alone — it tells you both that the effect is significant AND that even the pessimistic estimate is positive.

---

## Why we require minimum run time before showing verdicts

Before the minimum runtime is reached, you won't see a Ship or Hold verdict — only the raw numbers and a note that it's too early to conclude.

**The problem this solves: peeking.** Checking results every day and stopping when p < 0.05 inflates your false positive rate dramatically. An experiment that does *nothing* will eventually show p < 0.05 by chance if you check it often enough and stop when it does. This is how teams end up shipping neutral changes and attributing imaginary lifts to their roadmap.

**Real example.** Day 3 of a 14-day experiment: conversion shows p = 0.03. Exciting! But by day 14, conversion is p = 0.4. What happened? It was noise. A lucky early cohort (maybe a specific timezone, or users who happened to visit in the first 3 days) skewed the early numbers. The minimum runtime prevents you from acting on this.

**What minimum runtime does NOT do.** It does not make your experiment run for exactly that long. Once minimum runtime and minimum sample size are both met, the verdict engine evaluates daily. If results are significant on day 8 and your minimum was 7 days, you'll see a Ship verdict on day 8.

**Recommended minimums:**
- Conversion / engagement metrics: 7 days (covers day-of-week variation)
- Revenue / purchase metrics: 14 days (high variance, needs more data)
- Retention metrics (D7, D30): minimum runtime must be at least N+1 days

---

## Minimum sample size — why more users matter

Even if your experiment has been running a week, you need enough users in each group before results are meaningful. The minimum sample size (default: 100 per group) is a floor — in practice you need far more for most metrics.

**Use the power calculator** when creating your experiment. Enter your baseline metric rate and the smallest improvement you'd care about (the minimum detectable effect). The calculator will tell you how many users per group you need and how many days that will take at your current traffic.

**Common mistake.** Setting the minimum sample size to 100 and launching on 1% of traffic. Your experiment will take months to conclude because only 100 users per group enter per week.

**Rule of thumb for sample size:**
- Binary metrics (conversion, activation): N = 16 × (baseline_rate × (1 - baseline_rate)) / (MDE)²
- Revenue metrics: need at least 2–3× more than binary metrics due to high variance

---

## How we reduce the number of users you need — CUPED

CUPED (Controlled-experiment Using Pre-Experiment Data) is a variance reduction technique that makes your results more precise without requiring more users. It's available on Pro and Enterprise plans.

**What it does.** Before the experiment, each user has a history — how often they've purchased, how much they've spent, how engaged they've been. Users with high baseline activity will tend to have high post-experiment activity regardless of which group they're in. CUPED removes this predictable component so the comparison between groups is cleaner.

**Concrete example.** You're testing a new checkout flow. Your heavy buyers (who spend $500/month) are split between control and test. Whichever group got more heavy buyers by chance will look better — not because of your change, but because of who happened to land there. CUPED adjusts each user's outcome by their own history, so the heavy buyers in both groups contribute equally. The result: depending on how correlated users' histories are with their outcomes, you may need 20–40% fewer users than without CUPED.

**When CUPED doesn't help:**
- New users (no pre-experiment history) — CUPED only adjusts users it has baseline data for. If your experiment is primarily on new signups, CUPED has little data to work with and we'll automatically fall back to the standard analysis.
- New metrics (no historical data for that event) — same situation.

**What you don't need to do.** Nothing. CUPED runs automatically when enabled on your plan. Baselines are frozen at the moment you start the experiment and never updated, so there's no risk of the baseline being contaminated by the experiment itself.

---

## Winsorization — what we do about big spenders

Outliers can dominate revenue experiments. One user who spends $10,000 in a week can move your test group's mean by a dollar or more, making it look like your treatment helped when really you just got lucky with one whale.

**What winsorization does.** We cap each user's metric value at the 99th percentile of the control group. A user who spent $10,000 is treated as if they spent the cap (e.g. $250). They still count — they're just not allowed to single-handedly determine the result.

**What it does NOT do.** It doesn't remove outlier users from your experiment. It only limits how much weight they have in the analysis.

**When to adjust the cap.** The default 99th percentile is appropriate for most revenue metrics. If your product has extremely long-tailed revenue (enterprise SaaS where one deal can be $1M), consider a lower percentile (95th) to reduce whale influence. If your revenue distribution is relatively uniform, the default is fine.

**A subtle risk.** The cap is computed from the control group. If the treatment removes high-spending users from the test arm (e.g. a pricing change that causes heavy buyers to churn), the control group has a heavier tail, the cap is set high, and the clipping may be asymmetric. In this case, look at the raw (pre-winsorization) means alongside the adjusted ones.

---

## SRM — when your experiment is invalid

SRM stands for Sample Ratio Mismatch. It means the number of users in each group is significantly different from what the group weights specified. When SRM is detected, the verdict is **Invalid** and results are not shown.

**Why this matters.** If control should have 50% of users and test should have 50%, but you actually have 42% in control and 58% in test, *something went wrong with the randomization*. The test group isn't a random sample — it's self-selected in some way. Any measured difference between the groups could be caused by this selection bias, not your treatment. Showing results in this state would be misleading.

**Common causes:**
- The SDK or feature flag check is only in some code paths (users who hit the other path always get control)
- A bot-blocking rule is filtering more aggressively in one group
- A caching layer serves the same response to multiple users, breaking individual assignment
- The experiment was duplicated with the same salt (users were double-assigned)

**How to fix it.** Identify which code path doesn't apply the variant, fix it, and restart the experiment with a new salt. Do not attempt to correct for SRM in analysis — the data is tainted and cannot be salvaged.

**The threshold.** SRM is detected when the probability of seeing this imbalance by chance is less than 1%. A small imbalance (50.2% vs 49.8%) at 10,000 users is expected noise — not SRM. A 42%/58% split at any sample size is almost certainly real.

---

## Identity stitching — users who weren't logged in

Users often visit your product before they have an account. They browse anonymously, get bucketed into a group, and then sign up or log in. At that point, we link their anonymous session to their user ID.

**Why this matters for your results.** Without stitching, the same person appears twice — once as an anonymous user (who was exposed to the experiment) and once as an authenticated user (whose purchase you're trying to measure). The analysis would see an exposed anonymous user with no purchase, and a new authenticated user with a purchase. The conversion rate looks worse than it is.

**What we do.** When a user logs in, their client SDK sends a signal linking their old anonymous ID to their new user ID. The analysis cron resolves these links before aggregating results. The user is counted once, in whichever group they were originally assigned to.

**What you need to do.** Your developers need to call `client.identify({ user_id, anonymous_id })` on login. This is typically a one-time setup, not something you do per-experiment.

**Edge case.** If the same person logs in on two different devices (phone as anonymous, laptop as authenticated), they may have been assigned to different groups. We use the earliest exposure's group assignment as the canonical one. Their metric events after login are attributed to that group regardless of which device they came from.

---

## Goal metrics — register just one

When creating an experiment, you choose metrics and assign them a role: **goal**, **guardrail**, or **secondary**.

**Goal metrics** determine the ship verdict. For a Ship recommendation, every goal metric must be significantly positive. This is why you should register only the single metric that, if it improved, would justify shipping the change.

**The common mistake.** Registering conversion, revenue, AND session duration as three goals because you "want to see all of them improve." With three goals, all three must be significant for Ship. If revenue is up 3% (significant) but session duration shows p = 0.08 (not significant), the verdict is Wait — even though you'd probably ship for a 3% revenue lift. You've made the bar harder to clear without a good reason.

**What secondary metrics are for.** Understanding, not deciding. Add session duration, page depth, support tickets, and anything else you're curious about as secondary metrics. They show up in the results but never block or trigger a ship decision.

**Multiple goals inflate false positives.** If you register 5 goal metrics and any one of them being significant triggers Ship (which older platforms do), the probability that at least one is a false positive is 23% — far higher than the stated 5% threshold. Our platform requires ALL goals to be significant, which prevents this problem. The tradeoff: lower power (harder to ship). The solution: fewer goals.

---

## Guardrail metrics — what you must not break

Guardrail metrics are metrics you must not regress. If any guardrail shows a statistically significant negative movement, the verdict is **Hold** — even if all your goals improved.

**Common guardrails:**
- Page load time (don't slow the product down)
- Error rate (don't introduce bugs)
- Support ticket volume (don't confuse users)
- Unsubscribe rate (for email experiments)

**How to set guardrails.** Add metrics with the Guardrail role. When a guardrail metric regresses significantly (p < your threshold, negative delta), the Hold verdict appears with the specific metric that regressed and by how much.

**Calibration.** A well-chosen guardrail is something that, if it moved in the negative direction, you'd genuinely not ship regardless of goal performance. If you wouldn't actually block a ship for a 0.1% increase in error rate, don't add error rate as a guardrail — you're just adding noise that could delay shipping good experiments.

**Guardrails and sample size.** Guardrails with very low baseline rates (e.g. 0.01% error rate) need enormous sample sizes to detect meaningful changes. A 20% increase in a 0.01% error rate (to 0.012%) is very hard to detect statistically and probably not worth guarding against explicitly. Focus guardrails on metrics with baseline rates high enough to be measurable.

---

## Holdout groups — measuring cumulative impact

A holdout is a fixed group of users (typically 5%) who are excluded from every experiment in a product area for an extended period (3–6 months). At the end, you compare holdout users to everyone else to measure the total impact of everything you shipped.

**Why holdouts exist.** Individual experiments show local effects. Holdouts measure whether your shipped experiments compound. You might ship 8 experiments each showing +2% conversion, then look at the holdout and see only +8% total — not +16%. Something is cannibalizing: experiments 3 and 6 targeted the same users, or the effects are mutually exclusive, or novelty effects inflated early results.

**When to use holdouts.** When you're shipping multiple experiments in the same product area simultaneously. When you want to validate that your experiment program is actually creating value. When you're preparing a quarterly or annual business review.

**The cost.** Holdout users never receive your improvements. At 5% holdout on 1 million users, 50,000 users are permanently in the "old world" for the duration of the holdout. This is a deliberate ethical and business tradeoff — weigh it against the value of the measurement.

**Holdout setup.** Holdouts are configured at the universe level (a product area), not per-experiment. All experiments in that universe automatically exclude holdout users. You set the holdout range once and it stays fixed for the holdout's duration.

---

## Retention metrics — what D7 really means

D7 retention means: did the user come back within exactly 7 × 24 hours of their experiment exposure?

**This is not the same as calendar day 7.** A user exposed at 11pm on a Tuesday has their "day 7 window" starting at 11pm the following Tuesday. A user who returns at 10pm on that Tuesday — which most people would call "came back on day 7" — would not be counted as retained under this definition (they returned 47 hours before the window opened).

**Why we use this definition.** It's internally consistent. Every user gets exactly the same window length regardless of when they were exposed. It avoids timezone complexity and daylight saving time edge cases.

**What you should know.** When you tell stakeholders "D7 retention improved by 3%," clarify that D7 means "returned within the 7th–8th 24-hour period after first exposure," not "returned on calendar day 7." The difference is usually small (a few percent of users are near the boundary) but worth knowing.

**For D1 retention specifically**, the difference matters more. A user exposed at 10pm has only 2 hours of calendar day 1 remaining. Their "day 1 window" (hours 24–48 from exposure) may feel like "day 2" to them. Be cautious interpreting D1 retention for experiments that run at varying times of day.

---

## Why results are hidden before minimum runtime (Free and Pro plans)

On Free and Pro plans, Ship and Hold verdicts are suppressed until the minimum runtime is reached. You can see the raw data but no verdict.

**This is intentional.** Checking results before the planned run time and stopping early when you see p < 0.05 is called "peeking" and it dramatically inflates your false positive rate. With daily checks over 14 days, a completely neutral experiment has roughly a 40% chance of showing p < 0.05 at some point — even though the truth is no effect.

**Premium and Enterprise plans** use mSPRT (mixture Sequential Probability Ratio Test) for always-valid sequential testing. This allows safe continuous monitoring — you can check results at any time without inflating false positive rates. When `sequential_testing` is enabled, the dashboard shows both the standard p-value and the sequential confidence, and the verdict uses mSPRT thresholds instead of fixed-horizon Welch.

**What to do instead of peeking.** Set your experiment duration in advance based on the power calculation. Commit to not making a decision until that date. Review results once at the end, not daily.

---

## The four verdicts

**Ship** — All goal metrics are significantly positive. No guardrail regressions. Minimum runtime and sample size both met. Recommended action: merge the test variant as the new default and remove the experiment code.

**Hold** — At least one guardrail metric regressed significantly. Even if goals are positive, you should not ship until you understand and fix the regression. Recommended action: investigate the regressing metric, fix the root cause, and either restart the experiment or roll back the change.

**Wait** — Not enough data yet, or goals haven't reached significance. The experiment is working correctly — it just needs more time. Recommended action: do nothing. Check back when the minimum runtime is met.

**Invalid** — Sample Ratio Mismatch detected. The randomization is broken. Results are not trustworthy. Recommended action: stop the experiment, identify why groups are imbalanced (see SRM section above), fix the root cause, and restart with a new configuration.

---

## Quick checklist before launching an experiment

- [ ] Single goal metric registered (the one metric that would justify shipping)
- [ ] 2–3 guardrail metrics registered (metrics you must not break)
- [ ] Minimum runtime set (7 days minimum; 14+ for retention or revenue)
- [ ] Sample size checked with the power calculator (is your traffic sufficient to detect your target effect in that time?)
- [ ] SDK initialized in ALL code paths that show the experiment (SRM prevention)
- [ ] `identify()` called on login if the experiment affects logged-out users
- [ ] Starting at ≤10% allocation for high-risk changes
- [ ] Only one experiment per universe per product area active at a time (or holdout configured if running multiple)
