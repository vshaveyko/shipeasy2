import { describe, expect, it } from "vitest";
import { compile, compilePerUser, CompileError } from "../src/compile";
import type { Query, Envelope } from "../src/ir";
import type { Registry } from "../src/registry";

const REG: Registry = {
  checkout: {
    dataset: "shipeasy_metric_events",
    eventName: "checkout",
    defaultValueColumn: "double1",
    properties: [
      { name: "country", type: "string" },
      { name: "tier", type: "string" },
      { name: "amount", type: "number" },
      { name: "is_promo", type: "boolean" },
    ],
  },
};

const ENV: Envelope = { bucket: 60, timeRange: { from: 1700000000, to: 1700003600 } };

describe("compile", () => {
  it("count_users with no filters", () => {
    const q: Query = { agg: { kind: "count_users" }, metric: "checkout", filters: [] };
    expect(compile(q, ENV, REG)).toMatchInlineSnapshot(`
      "SELECT
        intDiv(toUInt32(double2), 60) * 60 AS t,
        uniq(blob2) AS v
      FROM shipeasy_metric_events
      WHERE blob1 = 'checkout'
        AND double2 >= 1700000000
        AND double2 <  1700003600
      GROUP BY t
      ORDER BY t"
    `);
  });

  it("sum with value label and filters", () => {
    const q: Query = {
      agg: { kind: "sum" },
      metric: "checkout",
      valueLabel: "amount",
      filters: [
        { label: "country", op: "=", value: "US" },
        { label: "tier", op: "!=", value: "free" },
      ],
    };
    expect(compile(q, ENV, REG)).toMatchInlineSnapshot(`
      "SELECT
        intDiv(toUInt32(double2), 60) * 60 AS t,
        sum(double3 * _sample_interval) AS v
      FROM shipeasy_metric_events
      WHERE blob1 = 'checkout'
        AND double2 >= 1700000000
        AND double2 <  1700003600
        AND blob4 = 'US'
        AND blob5 != 'free'
      GROUP BY t
      ORDER BY t"
    `);
  });

  it("p95 grouped by string label", () => {
    const q: Query = {
      agg: { kind: "quantile", p: 0.95 },
      metric: "checkout",
      valueLabel: "amount",
      filters: [{ label: "country", op: "=~", value: "US|CA" }],
      groupBy: { op: "by", labels: ["country"] },
    };
    expect(compile(q, ENV, REG)).toMatchInlineSnapshot(`
      "SELECT
        intDiv(toUInt32(double2), 60) * 60 AS t,
        blob4 AS country,
        quantileWeighted(0.95)(double3, toUInt64(_sample_interval)) AS v
      FROM shipeasy_metric_events
      WHERE blob1 = 'checkout'
        AND double2 >= 1700000000
        AND double2 <  1700003600
        AND match(blob4, 'US|CA')
      GROUP BY t, country
      ORDER BY t"
    `);
  });

  it("rejects unknown label", () => {
    const q: Query = {
      agg: { kind: "count_users" },
      metric: "checkout",
      filters: [{ label: "ghost", op: "=", value: "1" }],
    };
    expect(() => compile(q, ENV, REG)).toThrow(CompileError);
  });

  it("rejects regex on numeric label", () => {
    const q: Query = {
      agg: { kind: "count_users" },
      metric: "checkout",
      filters: [{ label: "amount", op: "=~", value: "1" }],
    };
    expect(() => compile(q, ENV, REG)).toThrow(CompileError);
  });

  it("rejects sql-injection in event name via registry tampering", () => {
    const bad: Registry = {
      checkout: { ...REG.checkout, dataset: "drop;table" },
    };
    const q: Query = { agg: { kind: "count_users" }, metric: "checkout", filters: [] };
    expect(() => compile(q, ENV, bad)).toThrow(CompileError);
  });

  it("escapes single quotes in filter values", () => {
    const q: Query = {
      agg: { kind: "count_users" },
      metric: "checkout",
      filters: [{ label: "country", op: "=", value: "O'Brien" }],
    };
    expect(compile(q, ENV, REG)).toContain(`'O\\'Brien'`);
  });
});

describe("compilePerUser", () => {
  it("collapses per user_id with sampling weight", () => {
    const q: Query = {
      agg: { kind: "sum" },
      metric: "checkout",
      valueLabel: "amount",
      filters: [{ label: "country", op: "=", value: "US" }],
    };
    expect(compilePerUser(q, { from: 0, to: 3600 }, REG)).toMatchInlineSnapshot(`
      "SELECT
        blob2 AS user_id,
        SUM(double3 * _sample_interval) AS total_value,
        toUInt64(SUM(_sample_interval)) AS event_count,
        MIN(double2) AS first_ts,
        MAX(double2) AS last_ts
      FROM shipeasy_metric_events
      WHERE blob1 = 'checkout'
        AND double2 >= 0
        AND double2 <  3600
        AND blob4 = 'US'
      GROUP BY blob2"
    `);
  });

  it("count_users path uses constant 1 for value", () => {
    const q: Query = { agg: { kind: "count_users" }, metric: "checkout", filters: [] };
    expect(compilePerUser(q, { from: 0, to: 1 }, REG)).toContain(`SUM(1 * _sample_interval)`);
  });
});
