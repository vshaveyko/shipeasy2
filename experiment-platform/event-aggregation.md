Plan: Event Aggregation DSL for Cloudflare Analytics Engine

Goals

- One typed IR is the source of truth; UI form and text expression are two editors over it.
- Power-user text syntax that compiles to AE SQL — limited at grammar level so invalid syntax is unrepresentable.
- Lossless round-trip: UI → text → IR equals UI → IR directly. Saved queries can be edited in either editor.
- All AE footguns centralized in one compiler: \_sample_interval weighting, quantileWeighted, intDiv bucketing, string escaping.

Non-goals (v1)

- Formulas / cross-metric math.
- Arbitrary SQL escape hatch.
- Subqueries, range vectors, time shifts.
- Alerting / persistence layer.

Architecture

┌─────────────┐ ┌─────────────┐
│ UI form │ ──▶ │ serialize │ ──▶ ┐
└─────────────┘ └─────────────┘ │
▼
┌──────────┐ ┌─────────┐ ┌──────────┐
│ text │ ─▶ │ Lezer │ ─▶ │ IR │
│ (DSL) │ │ parser │ │ (typed) │
└──────────┘ └─────────┘ └──────────┘
│
┌─────────────┐ ▼
│ envelope: │ ┌──────────┐
│ window, │ ─────────────▶ │ compile │ ─▶ AE SQL
│ bucket, │ └──────────┘
│ time range │
└─────────────┘

                                    ┌──────────┐
                                    │ metric   │ ─────────────────────┘
                                    │ registry │  (logical metric → dataset, column, dimension map)
                                    └──────────┘

The text DSL is the persisted form. The IR exists only at runtime — derived from text via parsing or from UI via serialization. Storing text (not IR) keeps the
system honest: there's no way for "text" to drift from "what runs."

Repository layout

packages/
query-dsl/
src/
grammar/
query.grammar # Lezer grammar (source)
query.terms.js # generated
query.parser.js # generated
ir.ts # IR types
parse.ts # Lezer tree → IR
render.ts # IR → text (round-trip)
compile.ts # IR → AE SQL
registry.ts # MetricDef registry types
codemirror.ts # CodeMirror language pack
test/
roundtrip.test.ts # property tests
compile.test.ts # snapshot SQL tests

Data model

// ir.ts

export type AggKind =
| { kind: "sum" }
| { kind: "count" }
| { kind: "avg" }
| { kind: "min" }
| { kind: "max" }
| { kind: "unique" }
| { kind: "quantile"; p: number }; // p ∈ {0.50, 0.75, 0.90, 0.95, 0.99, 0.999}

export type MatchOp = "=" | "!=" | "=~" | "!~";

export type Filter = { label: string; op: MatchOp; value: string };

export type GroupBy = { op: "by" | "without"; labels: string[] };

export type Query = {
agg: AggKind;
metric: string;
filters: Filter[];
groupBy?: GroupBy;
};

// envelope is separate — not in the expression
export type Envelope = {
bucket: number; // seconds
timeRange: { from: number; to: number }; // unix seconds
};

// registry.ts
export type MetricDef = {
dataset: string;
// "counter" = event count; "value" = numeric column on each event
type: "counter" | "value";
valueColumn?: string; // e.g. "double1"; required if type === "value"
// logical label name → AE column name
dimensions: Record<string, string>;
};

export type Registry = Record<string, MetricDef>;

Grammar

// packages/query-dsl/src/grammar/query.grammar

@top Query { Aggregation }

Aggregation {
AggFunc "(" Selector ")" GroupBy?
}

AggFunc {
Sum | Count | Avg | Min | Max | Unique |
P50 | P75 | P90 | P95 | P99 | P999
}

Sum { kw<"sum"> }
Count { kw<"count"> }
Avg { kw<"avg"> }
Min { kw<"min"> }
Max { kw<"max"> }
Unique { kw<"unique"> }
P50 { kw<"p50"> }
P75 { kw<"p75"> }
P90 { kw<"p90"> }
P95 { kw<"p95"> }
P99 { kw<"p99"> }
P999 { kw<"p999"> }

Selector {
Metric ("{" FilterList? "}")?
}

Metric { Identifier }

FilterList { Filter ("," Filter)\* ","? }
Filter { Label MatchOp StringLiteral }
Label { Identifier }
MatchOp { "=" | "!=" | "=~" | "!~" }

GroupBy { GroupOp "(" Label ("," Label)\* ","? ")" }
GroupOp { By | Without }
By { kw<"by"> }
Without { kw<"without"> }

kw<term> { @specialize<Identifier, term> }

@tokens {
Identifier { $[a-zA-Z_] $[a-zA-Z_0-9]_ }
StringLiteral { '"' (!["\\n] | "\\" \_)_ '"' }

    "(" ")" "{" "}" ","
    "=" "!=" "=~" "!~"

    whitespace { $[ \t\n\r]+ }

}

@skip { whitespace }

@detectDelim

Build: lezer-generator src/grammar/query.grammar -o src/grammar/query.parser.js

What this grammar refuses to parse (by construction):

- arithmetic operators (+ - \* /)
- multiple selectors in one expression (no sum(a) / sum(b))
- subqueries / range selectors ([5m])
- arbitrary quantiles (p97) — only the six listed
- bare identifiers as filter RHS (must be quoted strings)
- vector matching (on(), ignoring(), group_left)
- function calls other than the 12 aggregations

When you later want rate(), you add one production and one compiler case. That's the whole change.

Parser (Lezer tree → IR)

// packages/query-dsl/src/parse.ts
import { parser } from "./grammar/query.parser.js";
import type { Query, AggKind, Filter, GroupBy, MatchOp } from "./ir";

export class ParseError extends Error {
constructor(msg: string, public from: number, public to: number) {
super(msg);
}
}

const QUANTILE_MAP: Record<string, number> = {
P50: 0.5, P75: 0.75, P90: 0.9, P95: 0.95, P99: 0.99, P999: 0.999,
};

const AGG_KIND_MAP: Record<string, AggKind["kind"]> = {
Sum: "sum", Count: "count", Avg: "avg",
Min: "min", Max: "max", Unique: "unique",
};

export function parse(input: string): Query {
const tree = parser.parse(input);
const cur = tree.cursor();
if (!cur.firstChild()) throw new ParseError("empty query", 0, 0);
// Query → Aggregation
if (cur.name !== "Aggregation") throw new ParseError(`expected Aggregation, got ${cur.name}`, cur.from, cur.to);

    return readAggregation(cur, input);

}

function readAggregation(cur: any, src: string): Query {
cur.firstChild(); // AggFunc
const agg = readAgg(cur, src);

    // Skip "(" and read Selector
    while (cur.nextSibling() && cur.name !== "Selector") {}
    if (cur.name !== "Selector") throw new ParseError("expected Selector", cur.from, cur.to);
    const { metric, filters } = readSelector(cur, src);

    // Optional GroupBy
    let groupBy: GroupBy | undefined;
    while (cur.nextSibling()) {
      if (cur.name === "GroupBy") {
        groupBy = readGroupBy(cur, src);
        break;
      }
    }
    cur.parent();
    return { agg, metric, filters, groupBy };

}

function readAgg(cur: any, src: string): AggKind {
cur.firstChild(); // concrete agg node (Sum, P99, …)
const name = cur.name;
cur.parent();
if (name in QUANTILE_MAP) return { kind: "quantile", p: QUANTILE_MAP[name] };
const k = AGG_KIND_MAP[name];
if (!k) throw new ParseError(`unknown aggregation ${name}`, cur.from, cur.to);
return { kind: k };
}

function readSelector(cur: any, src: string): { metric: string; filters: Filter[] } {
cur.firstChild(); // Metric
const metric = src.slice(cur.from, cur.to);
const filters: Filter[] = [];
while (cur.nextSibling()) {
if (cur.name === "FilterList") {
cur.firstChild();
do {
if (cur.name === "Filter") filters.push(readFilter(cur, src));
} while (cur.nextSibling());
cur.parent();
}
}
cur.parent();
return { metric, filters };
}

function readFilter(cur: any, src: string): Filter {
cur.firstChild(); // Label
const label = src.slice(cur.from, cur.to);
cur.nextSibling(); // MatchOp
const op = src.slice(cur.from, cur.to) as MatchOp;
cur.nextSibling(); // StringLiteral
const raw = src.slice(cur.from + 1, cur.to - 1); // strip quotes
const value = raw.replace(/\\(.)/g, "$1");
cur.parent();
return { label, op, value };
}

function readGroupBy(cur: any, src: string): GroupBy {
cur.firstChild(); // GroupOp
cur.firstChild();
const op = (cur.name === "By" ? "by" : "without") as "by" | "without";
cur.parent();
const labels: string[] = [];
while (cur.nextSibling()) {
if (cur.name === "Label") labels.push(src.slice(cur.from, cur.to));
}
cur.parent();
return { op, labels };
}

Renderer (IR → text, for round-trip)

// packages/query-dsl/src/render.ts
import type { Query, Filter, AggKind } from "./ir";

const QUANTILE_NAME: Record<string, string> = {
"0.5": "p50", "0.75": "p75", "0.9": "p90",
"0.95": "p95", "0.99": "p99", "0.999": "p999",
};

export function render(q: Query): string {
const agg = renderAgg(q.agg);
const filters = q.filters.length
? `{${q.filters.map(renderFilter).join(", ")}}`
: "";
const groupBy = q.groupBy
? ` ${q.groupBy.op} (${q.groupBy.labels.join(", ")})`
: "";
return `${agg}(${q.metric}${filters})${groupBy}`;
}

function renderAgg(a: AggKind): string {
if (a.kind === "quantile") {
const name = QUANTILE_NAME[String(a.p)];
if (!name) throw new Error(`unsupported quantile ${a.p}`);
return name;
}
return a.kind;
}

function renderFilter(f: Filter): string {
return `${f.label}${f.op}${quoteString(f.value)}`;
}

function quoteString(s: string): string {
return `"${s.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

Compiler (IR → AE SQL)

// packages/query-dsl/src/compile.ts
import type { Query, Envelope, AggKind, Filter } from "./ir";
import type { Registry, MetricDef } from "./registry";

export class CompileError extends Error {}

export function compile(q: Query, env: Envelope, reg: Registry): string {
const def = reg[q.metric];
if (!def) throw new CompileError(`unknown metric: ${q.metric}`);

    const aggExpr = aggSql(q.agg, def);
    const whereParts = [
      `timestamp >= toDateTime(${Math.floor(env.timeRange.from)})`,
      `timestamp <  toDateTime(${Math.floor(env.timeRange.to)})`,
      ...q.filters.map((f) => filterSql(f, def)),
    ];
    const groupCols = resolveGroupBy(q, def);
    const selectGroup = groupCols.map(([label, col]) => `  ${col} AS ${label}`);
    const groupClause = ["t", ...groupCols.map(([label]) => label)].join(", ");

    return [
      `SELECT`,
      `  intDiv(toUInt32(timestamp), ${env.bucket}) * ${env.bucket} AS t,`,
      ...selectGroup.map((s) => s + ","),
      `  ${aggExpr} AS v`,
      `FROM ${ident(def.dataset)}`,
      `WHERE ${whereParts.join("\n  AND ")}`,
      `GROUP BY ${groupClause}`,
      `ORDER BY t`,
    ].join("\n");

}

function aggSql(a: AggKind, def: MetricDef): string {
const needsValue = a.kind !== "count" && a.kind !== "sum" || def.type === "value";
if (needsValue && def.type !== "value") {
throw new CompileError(`aggregation ${a.kind} requires a value metric`);
}
const v = def.valueColumn;

    switch (a.kind) {
      case "count":
        // count of events, sampling-corrected
        return `toUInt64(sum(_sample_interval))`;
      case "sum":
        return def.type === "counter"
          ? `toUInt64(sum(_sample_interval))`
          : `sum(${v} * _sample_interval)`;
      case "avg":
        return `sum(${v} * _sample_interval) / sum(_sample_interval)`;
      case "min":
        return `min(${v})`;
      case "max":
        return `max(${v})`;
      case "unique":
        return `uniq(${v})`;
      case "quantile":
        return `quantileWeighted(${a.p})(${v}, toUInt64(_sample_interval))`;
    }

}

function filterSql(f: Filter, def: MetricDef): string {
const col = def.dimensions[f.label];
if (!col) throw new CompileError(`unknown label: ${f.label}`);
const lit = quote(f.value);
switch (f.op) {
case "=": return `${col} = ${lit}`;
case "!=": return `${col} != ${lit}`;
case "=~": return `match(${col}, ${lit})`;
case "!~": return `NOT match(${col}, ${lit})`;
}
}

function resolveGroupBy(q: Query, def: MetricDef): [string, string][] {
const all = Object.entries(def.dimensions); // [label, col][]
if (!q.groupBy) return [];
if (q.groupBy.op === "by") {
return q.groupBy.labels.map((l) => {
const col = def.dimensions[l];
if (!col) throw new CompileError(`unknown label: ${l}`);
return [l, col];
});
}
const drop = new Set(q.groupBy.labels);
return all.filter(([l]) => !drop.has(l));
}

// SQL string escape — AE SQL API has no parameter binding
function quote(s: string): string {
return `'${s.replace(/\\/g, "\\\\").replace(/'/g, "\\'")}'`;
}

function ident(name: string): string {
if (!/^[a-zA-Z\_][a-zA-Z_0-9]\*$/.test(name)) {
throw new CompileError(`invalid identifier: ${name}`);
}
return name;
}

Worked example

Input:

p99(http_request_duration_ms{env="prod", route=~"/api/v.\*"}) by (route, status)

Registry:

{
http_request_duration_ms: {
dataset: "requests",
type: "value",
valueColumn: "double1",
dimensions: { env: "blob1", route: "blob2", status: "blob3" },
},
}

Envelope: { bucket: 60, timeRange: { from: 1700000000, to: 1700003600 } }

Output:

SELECT
intDiv(toUInt32(timestamp), 60) _ 60 AS t,
blob2 AS route,
blob3 AS status,
quantileWeighted(0.99)(double1, toUInt64(\_sample_interval)) AS v
FROM requests
WHERE timestamp >= toDateTime(1700000000)
AND timestamp < toDateTime(1700003600)
AND blob1 = 'prod'
AND match(blob2, '/api/v._')
GROUP BY t, route, status
ORDER BY t

CodeMirror integration

// packages/query-dsl/src/codemirror.ts
import { parser } from "./grammar/query.parser.js";
import { LRLanguage, LanguageSupport, syntaxTree } from "@codemirror/language";
import { styleTags, tags as t } from "@lezer/highlight";
import { completeFromList } from "@codemirror/autocomplete";

const language = LRLanguage.define({
parser: parser.configure({
props: [
styleTags({
"Sum Count Avg Min Max Unique P50 P75 P90 P95 P99 P999": t.function(t.variableName),
"By Without": t.keyword,
Metric: t.typeName,
Label: t.propertyName,
StringLiteral: t.string,
MatchOp: t.operator,
"( ) { } ,": t.punctuation,
}),
],
}),
languageData: { commentTokens: { line: "#" } },
});

export function queryLanguage(registry: Record<string, unknown>) {
return new LanguageSupport(language, [
language.data.of({
autocomplete: completeFromList([
// aggregations
...["sum", "count", "avg", "min", "max", "unique",
"p50", "p75", "p90", "p95", "p99", "p999"]
.map((label) => ({ label, type: "function" })),
// group ops
{ label: "by", type: "keyword" },
{ label: "without", type: "keyword" },
// known metric names
...Object.keys(registry).map((label) => ({ label, type: "type" })),
]),
}),
]);
}

UI form ↔ text round-trip

The UI form has fields that map 1‑to‑1 to Query. The serializer is just render(query); the deserializer is parse(text). Property test it:

// test/roundtrip.test.ts
import fc from "fast-check";
import { parse, render } from "../src";

const arbQuery = /_ fast-check arbitrary that yields valid Query objects _/;

test("parse(render(q)) === q", () => {
fc.assert(fc.property(arbQuery, (q) => {
expect(parse(render(q))).toEqual(q);
}));
});

If this test passes, the UI editor and text editor are guaranteed interchangeable for every saved query.

Compiler tests (snapshot)

// test/compile.test.ts
const registry = { /_ fixture _/ };
const env = { bucket: 60, timeRange: { from: 0, to: 3600 } };

const cases = [
`count(http_requests_total{env="prod"}) by (route)`,
`p99(http_request_duration_ms{}) by (route, status)`,
`unique(http_requests_total{}) by (user_id)`,
`avg(http_request_duration_ms{route!~"/health"}) without (env)`,
];

test.each(cases)("compile snapshot: %s", (input) => {
expect(compile(parse(input), env, registry)).toMatchSnapshot();
});

Milestones

┌─────┬────────────────────────────────────────────────────────────────────────────────┬──────────────────────────────────────────────────────────┐
│ # │ Deliverable │ Notes │
├─────┼────────────────────────────────────────────────────────────────────────────────┼──────────────────────────────────────────────────────────┤
│ 1 │ query.grammar + lezer-generator build │ Compiles, parses example inputs, rejects everything else │
├─────┼────────────────────────────────────────────────────────────────────────────────┼──────────────────────────────────────────────────────────┤
│ 2 │ parse.ts + IR types │ Lezer tree → Query │
├─────┼────────────────────────────────────────────────────────────────────────────────┼──────────────────────────────────────────────────────────┤
│ 3 │ render.ts │ Round-trip property test green │
├─────┼────────────────────────────────────────────────────────────────────────────────┼──────────────────────────────────────────────────────────┤
│ 4 │ compile.ts + registry types │ Snapshot tests against handcrafted SQL │
├─────┼────────────────────────────────────────────────────────────────────────────────┼──────────────────────────────────────────────────────────┤
│ 5 │ Integration test: run compiled SQL against a seeded AE dataset; assert results │ Catches \_sample_interval regressions │
├─────┼────────────────────────────────────────────────────────────────────────────────┼──────────────────────────────────────────────────────────┤
│ 6 │ codemirror.ts language pack │ Syntax highlight + autocomplete in the UI textarea │
├─────┼────────────────────────────────────────────────────────────────────────────────┼──────────────────────────────────────────────────────────┤
│ 7 │ UI form serializer (Query → form fields and back) │ Same package, no parser involved │
├─────┼────────────────────────────────────────────────────────────────────────────────┼──────────────────────────────────────────────────────────┤
│ 8 │ Saved-query storage (KV / D1): persist text + envelope │ Text is canonical; IR is recomputed on demand │
└─────┴────────────────────────────────────────────────────────────────────────────────┴──────────────────────────────────────────────────────────┘

Things worth being explicit about

- The grammar is the contract. Any change to syntax is a grammar edit + compiler edit + a new round-trip test case. Don't add behavior in the parser.
- The registry is the only place that knows AE column names. The DSL talks about logical labels (route), the SQL talks about AE columns (blob2). If you change
  AE schema, you change the registry — not the queries.
- String escape is the only injection surface. AE has no parameter binding, so quote() in compile.ts is load-bearing. Fuzz it.
- \_sample_interval handling is in exactly one function (aggSql). Any new aggregation must be added there with explicit sampling logic, or it's wrong.
- Time window is not in the DSL. timeRange and bucket come from the UI / API call envelope. This keeps the saved expression stable as users change the visible
  window.
