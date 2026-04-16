# Results Dashboard & Experiment Creation UI

## Results Page — /app/experiments/[id]/results

### Admin API Endpoints (Next.js Route Handlers)

These endpoints live in `apps/ui/app/api/admin/` and are called by both the dashboard
(via SWR/fetch) and the CLI (via `X-SDK-Key` auth).

```
GET /api/admin/experiments/:id              → experiment metadata + group sizes
GET /api/admin/experiments/:id/results      → metric results from experiment_results D1
GET /api/admin/experiments/:id/timeseries   → daily rollup per metric (from experiment_results D1)
```

### Component Tree

```
ResultsPage (server component)
├── ExperimentHeader         name, question, success def, days running, users/group, status
├── SetupSection             split diagram: control users / test users / not-in-experiment
├── RawNumbers               control rate | test rate | Δ | relative lift (goal metric)
├── MetricResultsSection     [tabs: Goal | Guardrails | Secondary]
│   ├── CIChart              horizontal SVG bar per metric, coloured by significance
│   └── MetricInterpretation p-value + plain-English sentence per metric
├── VerdictBox               ship/hold/wait — auto-generated from computeVerdict()
├── TimeSeriesChart          ApexCharts line: daily metric value × group (14–30 days)
└── GuardrailSummary         pass/fail chip grid for all guardrail metrics
```

### CI Bar Chart (SVG, no library)

```typescript
// components/experiments/CIChart.tsx
// sigThreshold: use the experiment's configured significance_threshold (not hardcoded 0.05)
function CIBar({ metric, sigThreshold }: { metric: MetricResult; sigThreshold: number }) {
  const allVals = [metric.ci_95_low, metric.ci_95_high, metric.delta]
  const absMax  = Math.max(...allVals.map(Math.abs)) * 1.45
  const range   = absMax * 2
  const toX     = (v: number) => ((v + absMax) / range * 100).toFixed(2) + '%'
  const toW     = (lo: number, hi: number) => ((hi - lo) / range * 100).toFixed(2) + '%'

  const sig    = metric.p_value < sigThreshold  // use per-experiment threshold, never hardcoded
  const isPos  = metric.ci_95_low > 0
  const color  = !sig ? '#9e9e9e' : isPos ? '#2e7d32' : '#c62828'
  const fill   = !sig ? 'rgba(97,97,97,.12)' : isPos ? 'rgba(46,125,50,.18)' : 'rgba(198,40,40,.18)'

  return (
    <svg width="100%" viewBox="0 0 100 36" preserveAspectRatio="none" style={{ height: 44 }}>
      {/* Zero line */}
      <line x1={toX(0)} y1="0" x2={toX(0)} y2="28" stroke="#bdbdbd" strokeWidth="1" />
      {/* CI band */}
      <rect x={toX(metric.ci_95_low)} y="10" width={toW(metric.ci_95_low, metric.ci_95_high)}
            height="14" fill={fill} stroke={color} strokeWidth="1.2" rx="2" />
      {/* Point estimate */}
      <line x1={toX(metric.delta)} y1="5" x2={toX(metric.delta)} y2="25"
            stroke={color} strokeWidth="2.5" />
      {/* Scale labels */}
      <text x="0"    y="34" fontSize="3.5" fill="#9e9e9e">{fmt(-absMax, metric.unit)}</text>
      <text x={toX(0)} y="34" fontSize="3.5" fill="#9e9e9e" textAnchor="middle">0</text>
      <text x="100%" y="34" fontSize="3.5" fill="#9e9e9e" textAnchor="end">{fmt(absMax, metric.unit)}</text>
    </svg>
  )
}
```

Colors: green = CI entirely right of zero (improvement), red = entirely left (regression), gray = crosses zero (inconclusive).

### VerdictBox

Verdict semantics:
- **ship** — ALL goal metrics significant and positive; no guardrail regressions. Intersection test (not union) — register only your single most important goal to maximize power.
- **hold** — any guardrail metric significantly negative. Suppressed before `min_runtime_days` for Free/Pro plans (peeking inflates false positive rate).
- **wait** — min runtime not reached, or not enough users, or goals partially significant.
- **invalid** — SRM detected; results not trustworthy.

```typescript
// components/experiments/VerdictBox.tsx
const STYLES = {
  ship:    { bg: 'linear-gradient(135deg, #e8f5e9, #f1f8e9)', border: '#a5d6a7', color: '#2e7d32' },
  hold:    { bg: 'linear-gradient(135deg, #ffebee, #fce4ec)', border: '#ef9a9a', color: '#c62828' },
  wait:    { bg: 'linear-gradient(135deg, #fff3e0, #fff8e1)', border: '#ffcc02', color: '#e65100' },
  invalid: { bg: 'linear-gradient(135deg, #fce4ec, #f8bbd0)', border: '#f48fb1', color: '#880e4f' },
}

export function VerdictBox({ verdict }: { verdict: VerdictOutput }) {
  const { bg, border, color } = STYLES[verdict.verdict]
  return (
    <Box sx={{ background: bg, border: `1.5px solid ${border}`, borderRadius: 2, p: 3 }}>
      <Typography variant="h5" color={color}>{verdict.title}</Typography>
      <Typography variant="body2" lineHeight={1.8}>{verdict.narrative}</Typography>
    </Box>
  )
}
```

### TimeSeriesChart — read from D1 `experiment_results`

Do NOT query AE directly for the time-series chart. Two reasons:
1. AE SQL cannot produce a per-group breakdown of METRIC_EVENTS without joining EXPOSURES,
   and AE does not support cross-dataset JOINs.
2. The `experiment_results` table already contains per-group, per-day values written by the
   analysis cron — use those; no second AE query needed.

Route Handler `GET /api/admin/experiments/:id/timeseries`:
```typescript
// Returns daily delta (test − control) per metric, pulled from experiment_results
const db   = getDb(env.DB)
const rows = await db.select({
    ds:        experimentResults.ds,
    metric:    experimentResults.metric,
    groupName: experimentResults.groupName,
    mean:      experimentResults.mean,
    delta:     experimentResults.delta,
    pValue:    experimentResults.pValue,
  })
  .from(experimentResults)
  .where(and(
    eq(experimentResults.projectId, projectId),
    eq(experimentResults.experiment, experimentName),
  ))
  .orderBy(experimentResults.metric, experimentResults.groupName, experimentResults.ds)
```

Frontend groups rows by `(metric, group_name)` and plots one line per group.
`ds` is an ISO date string (`YYYY-MM-DD`), X axis is date, Y axis is `mean` per group.

The cron already writes one row per `(project_id, experiment, metric, group_name, ds)` — 
this is exactly the shape the chart needs. No additional AE queries required.

## Experiment Creation UI — /app/experiments/new

Full HTML prototype: `experiment-lab/new-experiment.html`

### Quick Setup Profiles

Pre-fill all fields for common experiment types:

| Profile | Goal metric | Aggregation | Notes |
|---|---|---|---|
| Conversion | purchase / signup | count_users | Binary: did user do X? |
| Revenue | purchase | sum | Total value per user |
| Retention | session_start | retention_7d | Did user return on day 7? |
| Performance | page_loaded | avg | Mean load time (lower = better) |
| Onboarding | user_activated | count_users | Activation + D7 retention as secondary |

### Form Sections

1. **Quick setup profiles** — select template to pre-fill all fields
2. **Basics** — experiment name (slug), question, success definition, change description
3. **Universe** — selector of existing universes (shows holdout range), or create new
4. **Traffic split** — allocation % slider + group weights + live preview
5. **Metrics** — table of goal/guardrail/secondary metrics with aggregation type reference
6. **Statistical power** — live calculator: daily users + MDE + baseline → days needed + power %
7. **Generated code** — auto-updates from form fields, shows exact `track()` calls needed

### Key UI Rules

- **Universe is a selector** (not freetext) — shows existing universes with holdout info
- **Holdout is read-only** on the experiment form — configured on the universe, not here
- **min_poll_interval is not shown** — determined by plan, not configurable by customer
- **Goal metric pre-registration** — callout warns if no goal metric defined before launch
- **Aggregation type reference** — inline cards explain count_users/sum/avg/retention_Nd with examples

### Statistical Power Calculator

```
n = (z_α/2 + z_β)² × (p1×(1-p1) + p2×(1-p2)) / (MDE)²
where z_α/2 = 1.96 (α=0.05), z_β = 0.842 (power=80%)

days = ceil(n / (daily_users × allocation_pct / 2))
```

Displayed as: users needed / days to run / power % with traffic preview bar.
