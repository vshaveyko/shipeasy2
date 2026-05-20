# Metrics DSL — what shipped

Plain summary of features added across this branch. For design rationale see
`event-aggregation.md` (data model) and `06-analysis.md` (per-user reducers).

## TL;DR

- Metrics are now defined by a typed IR persisted on `metrics.query_ir` (JSON).
- The IR is editable two ways: the metric wizard (form) and the lexical DSL
  text. Server parses either form; both round-trip through `render(parse(s)) === s`.
- The AE column layout for `shipeasy_metric_events` was extended to carry up
  to 5 string + 5 numeric event properties; `/collect` packs them by
  per-event slot order.
- Dashboards: a new `POST /api/admin/metrics/:id/series` endpoint compiles
  the IR → AE SQL and powers a chart on the metric detail page.
- Experiment create/update now takes inline `goal_metric` + `guardrail_metrics`
  (DSL strings), auto-upserting the event and metric.
- Worker analyzer reads the IR via `compilePerUser`; legacy
  `aggregation`/`value_path` columns retained as derived projections.
- All AE `FROM` clauses switched from the binding name to the dataset name
  (verified: the binding form silently returned zero rows in prod).
- CLI gains `shipeasy metrics list|show|create|delete|grammar`.
- Dashboard dogfoods itself: every admin action emits an `admin_*` event;
  `POST /api/admin/dogfood/seed` registers the matching event catalog +
  count metrics in one shot.

## Code layout

| Area            | Path                                                                                                                                         |
| --------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| DSL package     | `packages/query-dsl/`                                                                                                                        |
| Drizzle column  | `packages/core/src/db/schema.ts` (`metrics.queryIr`)                                                                                         |
| Migration       | `packages/worker/migrations/0026_metric_query_ir.sql`                                                                                        |
| Zod             | `packages/core/src/schemas/metrics.ts`, `…/experiments.ts`                                                                                   |
| Metric handlers | `apps/ui/src/lib/handlers/metrics.ts`                                                                                                        |
| Metric series   | `apps/ui/src/lib/handlers/metric-series.ts` + `…/api/admin/metrics/[id]/series/route.ts`                                                     |
| Wizard          | `apps/ui/src/app/dashboard/[projectId]/metrics/new-metric-wizard.tsx`                                                                        |
| Detail chart    | `apps/ui/src/app/dashboard/[projectId]/metrics/[id]/series-chart.tsx` + `page.tsx`                                                           |
| Worker collect  | `packages/worker/src/sdk/collect.ts`                                                                                                         |
| Worker analyzer | `packages/worker/src/analysis/consumer.ts`                                                                                                   |
| AE archival     | `packages/worker/src/analysis/archival.ts`                                                                                                   |
| CLI             | `packages/cli/src/commands/metrics.ts`                                                                                                       |
| Dogfood         | `apps/ui/src/lib/dogfood.ts`, `…/handlers/dogfood-seed.ts`, `…/api/admin/dogfood/seed/route.ts`                                              |
| Skills          | `marketplace/shipeasy/skills/shipeasy-experiments/SKILL.md`, `~/.claude/plugins/marketplaces/shipeasy/experiments-metrics/{skills,commands}` |
| Docs            | `DEPLOY.md` (`CF_API_TOKEN` requirement)                                                                                                     |
| E2E             | `apps/ui/e2e/auth/metric-wizard.spec.ts`                                                                                                     |

## Query DSL

Hand-rolled parser, no Lezer dependency. Grammar:

```
Query        := AggFunc "(" Selector ("," Identifier)? ")" GroupBy?
AggFunc      := count_users | count | sum | avg | min | max | unique |
                p50 | p75 | p90 | p95 | p99 | p999 | retention_<N>d
Selector     := Identifier ("{" Filter ("," Filter)* ","? "}")?
Filter       := Identifier MatchOp StringLiteral
MatchOp      := "=" | "!=" | "=~" | "!~"
GroupBy      := ("by" | "without") "(" Identifier ("," Identifier)* ","? ")"
```

Examples:

```
count_users(checkout_completed)
sum(purchase{country="US"}, amount)
p99(req_dur{route=~"/api/.*"}, ms) by (route, status)
retention_7d(session_start)
```

Print at any time: `shipeasy metrics grammar`.

## API

### `POST /api/admin/metrics`

```jsonc
{
  "name": "purchase.amount",
  "event_name": "purchase",
  // exactly one of:
  "query": "sum(purchase, amount)",
  "query_ir": {
    /* typed IR */
  },
  "winsorize_pct": 99,
  "min_detectable_effect": 0.02,
}
```

### `GET /api/admin/metrics/:id`

Response now includes `query` (rendered DSL string) in addition to `query_ir`:

```jsonc
{
  "id": "…",
  "name": "purchase.amount",
  "eventName": "purchase",
  "aggregation": "sum",
  "valuePath": "amount",
  "queryIr": {
    /* IR */
  },
  "query": "sum(purchase, amount)",
}
```

### `POST /api/admin/metrics/:id/series`

```jsonc
{ "from": 1700000000, "to": 1700604800, "bucket": 3600 }
```

Returns `{ sql, rows: [{ t, v, ...groupByLabels }] }`. Requires the
`CF_API_TOKEN` secret on the UI Worker.

### `POST /api/admin/experiments` (new fields)

```jsonc
{
  "name": "checkout_v2",
  "universe": "default",
  "groups": [...],
  "goal_metric":       { "query": "count_users(checkout_completed)" },
  "guardrail_metrics": [
    { "query": "p99(req_dur{route=\"/api/checkout\"}, ms)" },
    { "query": "avg(refund, amount)" }
  ]
}
```

For each inline metric: parse DSL → upsert event (empty-props if new) →
upsert metric (auto-name `<event>.<agg>` if `name` omitted) → attach with
the role. Existing `secondary` attachments are preserved.

### `POST /api/admin/dogfood/seed`

Idempotently registers 10 `admin_*` events + 7 count metrics in the
caller's project. Re-running is safe (409s are treated as no-op).

## CLI

```bash
shipeasy metrics grammar
shipeasy metrics list
shipeasy metrics show <id>
shipeasy metrics create purchase.amount \
  --event purchase \
  --query 'sum(purchase, amount)'
shipeasy metrics delete <id>
```

`--query` is parsed locally for fast feedback before posting. `--query-ir`
takes a raw IR JSON for programmatic callers.

## Wizard

`Aggregation & shape` step now:

- 9-button agg picker (`count_users`, `count`, `sum`, `avg`, `min`, `max`,
  `unique`, `quantile`, `retention_Nd`).
- Quantile chips (`p50`..`p999`) when `quantile` selected.
- Day-count input when `retention_Nd` selected.
- Value-property chip strip drawn from the event's numeric properties.
- Filter rows: label dropdown (event properties), op, value. Regex ops
  hidden on numeric labels.
- GroupBy chip toggle with `by` / `without`.
- Read-only DSL preview (rendered from IR live).

## AE layout

`shipeasy_metric_events` row schema (writes from `/collect`):

```
indexes  = [project_id]
blobs    = [event_name, user_id, anonymous_id, str_prop_0..str_prop_4]
doubles  = [value, ts, num_prop_0..num_prop_4]
```

Properties land in the trailing slots in the order declared on the
`events.properties` row. Booleans coerce to numeric (0/1). Sending
more than 5 of either type is a 422 from `/collect`.

## Worker analyzer

`packages/worker/src/analysis/consumer.ts` builds a per-event registry
from `events.properties` and calls `compilePerUser(ir, …)` to assemble
the SQL. It splices `index1 = '<project_id>'` into the compiled `WHERE`
so per-project scoping survives. Per-user reducer enum
(`metric.aggregation`) still selects between event count, sum, and avg
for the t-test.

## Migrations

`0026_metric_query_ir.sql` adds `metrics.query_ir TEXT (JSON)` and
backfills it from the legacy `aggregation` + `value_path` columns.
Legacy columns are retained as derived projections written by the
handler on every create/update.

## AE FROM-clause fix

Verified against the live AE SQL API:

```
FROM METRIC_EVENTS           → 200, 0 rows   (binding name; silent empty)
FROM shipeasy_metric_events  → 200, 134 rows (dataset name; real data)
```

All `FROM` clauses switched to the dataset name in
`consumer.ts`, `archival.ts`, `metric-series.ts`, the compiler's default
`MetricDef.dataset`, and the wizard's snapshot tests.

## Required secret

UI Worker (`shipeasy`) needs `CF_API_TOKEN` (Account Analytics read scope)
for the series endpoint:

```
wrangler secret put CF_API_TOKEN
```

See `DEPLOY.md` § "Secrets required on `shipeasy`".

## Known gaps

- MCP server has no `exp_create_metric` tool yet.
- `packages/openapi` has no `metrics` resource descriptor → public OpenAPI
  doesn't list these endpoints.
- Dogfood seed must be run once per environment (no auto-bootstrap).
