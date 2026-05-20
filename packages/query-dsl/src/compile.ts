// IR → Analytics Engine SQL.
//
// All AE footguns centralized here:
//   - _sample_interval weighting on every aggregation
//   - quantileWeighted for percentiles
//   - intDiv bucketing on timestamp
//   - SQL string escape (AE has no parameter binding)
//
// Two compile paths share the same SQL builder:
//   compile()        — display path. Returns time-series rows grouped by `t` + groupBy labels.
//   compilePerUser() — experiment path. Forces `by (user_id)` and drops time bucketing;
//                      consumer collapses per user into a single value for Welch t-test.

import type { Query, Envelope, AggKind, Filter } from "./ir";
import type { Registry, MetricDef } from "./registry";
import { aggNeedsValue } from "./ir";
import { resolveLabel, resolveValueColumn } from "./registry";

export class CompileError extends Error {}

const EVENT_NAME_COL = "blob1";

export function compile(q: Query, env: Envelope, reg: Registry): string {
  const def = lookup(q, reg);
  const aggExpr = aggSql(q, def);
  const whereParts = baseWhere(def, env, q.filters);
  const groupCols = resolveGroupBy(q, def);
  const selectGroup = groupCols.map(([label, col]) => `  ${col} AS ${label}`);
  const groupClause = ["t", ...groupCols.map(([label]) => label)].join(", ");

  const lines: string[] = [
    `SELECT`,
    `  intDiv(toUInt32(double2), ${env.bucket}) * ${env.bucket} AS t,`,
    ...selectGroup.map((s) => s + ","),
    `  ${aggExpr} AS v`,
    `FROM ${ident(def.dataset)}`,
    `WHERE ${whereParts.join("\n  AND ")}`,
    `GROUP BY ${groupClause}`,
    `ORDER BY t`,
  ];
  return lines.join("\n");
}

// Per-user collapse query for experiment analysis.
// Returns rows of: user_id, total_value, event_count, first_ts, last_ts.
// Caller applies the per-user reducer (count_users/sum/avg/retention_Nd).
export function compilePerUser(
  q: Query,
  timeRange: { from: number; to: number },
  reg: Registry,
): string {
  const def = lookup(q, reg);
  const valueCol = aggNeedsValue(q.agg) ? resolveValueColumn(q.valueLabel, def) : "1";
  const whereParts = baseWhere(def, { bucket: 60, timeRange }, q.filters);
  return [
    `SELECT`,
    `  blob2 AS user_id,`,
    `  SUM(${valueCol} * _sample_interval) AS total_value,`,
    `  toUInt64(SUM(_sample_interval)) AS event_count,`,
    `  MIN(double2) AS first_ts,`,
    `  MAX(double2) AS last_ts`,
    `FROM ${ident(def.dataset)}`,
    `WHERE ${whereParts.join("\n  AND ")}`,
    `GROUP BY blob2`,
  ].join("\n");
}

function lookup(q: Query, reg: Registry): MetricDef {
  const def = reg[q.metric];
  if (!def) throw new CompileError(`unknown metric: ${q.metric}`);
  return def;
}

function baseWhere(def: MetricDef, env: Envelope, filters: Filter[]): string[] {
  return [
    `${EVENT_NAME_COL} = ${quote(def.eventName)}`,
    `double2 >= ${Math.floor(env.timeRange.from)}`,
    `double2 <  ${Math.floor(env.timeRange.to)}`,
    ...filters.map((f) => filterSql(f, def)),
  ];
}

function aggSql(q: Query, def: MetricDef): string {
  const a = q.agg;
  switch (a.kind) {
    case "count_users":
      return `uniq(blob2)`;
    case "count_events":
      return `toUInt64(sum(_sample_interval))`;
    case "sum":
      return `sum(${resolveValueColumn(q.valueLabel, def)} * _sample_interval)`;
    case "avg":
      return `sum(${resolveValueColumn(q.valueLabel, def)} * _sample_interval) / sum(_sample_interval)`;
    case "min":
      return `min(${resolveValueColumn(q.valueLabel, def)})`;
    case "max":
      return `max(${resolveValueColumn(q.valueLabel, def)})`;
    case "unique":
      return `uniq(${resolveValueColumn(q.valueLabel, def)})`;
    case "quantile":
      return `quantileWeighted(${a.p})(${resolveValueColumn(q.valueLabel, def)}, toUInt64(_sample_interval))`;
    case "retention_Nd":
      // Display-mode retention is undefined as a bucketed series.
      // Experiment path uses compilePerUser, not this. Reject explicitly.
      throw new CompileError(`retention_Nd has no time-series form; use experiment analyzer`);
  }
}

function filterSql(f: Filter, def: MetricDef): string {
  const r = resolveLabel(f.label, def);
  if (!r) throw new CompileError(`unknown label: ${f.label}`);
  if (r.kind === "number") {
    // Numeric labels accept only "=" / "!=" against a numeric literal.
    const num = Number(f.value);
    if (!Number.isFinite(num))
      throw new CompileError(`label '${f.label}' is numeric; '${f.value}' is not a number`);
    if (f.op !== "=" && f.op !== "!=") {
      throw new CompileError(`label '${f.label}' is numeric; regex match not supported`);
    }
    return `${r.column} ${f.op} ${num}`;
  }
  const lit = quote(f.value);
  switch (f.op) {
    case "=":
      return `${r.column} = ${lit}`;
    case "!=":
      return `${r.column} != ${lit}`;
    case "=~":
      return `match(${r.column}, ${lit})`;
    case "!~":
      return `NOT match(${r.column}, ${lit})`;
  }
}

function resolveGroupBy(q: Query, def: MetricDef): [string, string][] {
  if (!q.groupBy || q.groupBy.labels.length === 0) return [];
  if (q.groupBy.op === "by") {
    return q.groupBy.labels.map((l) => {
      const r = resolveLabel(l, def);
      if (!r) throw new CompileError(`unknown label: ${l}`);
      return [l, r.column];
    });
  }
  // `without` = all known dims except the named ones.
  const drop = new Set(q.groupBy.labels);
  const all: [string, string][] = def.properties
    .map((p) => {
      const r = resolveLabel(p.name, def);
      return r ? ([p.name, r.column] as [string, string]) : null;
    })
    .filter((x): x is [string, string] => x !== null);
  return all.filter(([l]) => !drop.has(l));
}

function quote(s: string): string {
  return `'${s.replace(/\\/g, "\\\\").replace(/'/g, "\\'")}'`;
}

function ident(name: string): string {
  if (!/^[a-zA-Z_][a-zA-Z_0-9]*$/.test(name)) {
    throw new CompileError(`invalid identifier: ${name}`);
  }
  return name;
}
