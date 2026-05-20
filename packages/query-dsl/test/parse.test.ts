import { describe, expect, it } from "vitest";
import { parse, ParseError } from "../src/parse";
import { render } from "../src/render";
import type { Query } from "../src/ir";

describe("parse", () => {
  it("count_users with bare metric", () => {
    expect(parse("count_users(checkout)")).toEqual({
      agg: { kind: "count_users" },
      metric: "checkout",
      filters: [],
      valueLabel: undefined,
      groupBy: undefined,
    });
  });

  it("sum with value label", () => {
    expect(parse("sum(purchase, amount)")).toEqual({
      agg: { kind: "sum" },
      metric: "purchase",
      valueLabel: "amount",
      filters: [],
      groupBy: undefined,
    });
  });

  it("p99 with filters + groupBy", () => {
    const q = parse(`p99(req_dur{route=~"/api/.*", env="prod"}, ms) by (route, status)`);
    expect(q).toEqual({
      agg: { kind: "quantile", p: 0.99 },
      metric: "req_dur",
      valueLabel: "ms",
      filters: [
        { label: "route", op: "=~", value: "/api/.*" },
        { label: "env", op: "=", value: "prod" },
      ],
      groupBy: { op: "by", labels: ["route", "status"] },
    });
  });

  it("retention_7d", () => {
    expect(parse("retention_7d(session_start)")).toEqual({
      agg: { kind: "retention_Nd", n: 7 },
      metric: "session_start",
      filters: [],
      valueLabel: undefined,
      groupBy: undefined,
    });
  });

  it("handles escaped quotes in filter values", () => {
    const q = parse(`count(click{label="foo \\"bar\\""})`);
    expect(q.filters).toEqual([{ label: "label", op: "=", value: 'foo "bar"' }]);
  });

  it("rejects arbitrary quantile", () => {
    expect(() => parse("p97(x)")).toThrow(ParseError);
  });

  it("rejects bare-ident filter value", () => {
    expect(() => parse("count_users(x{a=b})")).toThrow(ParseError);
  });

  it("rejects arithmetic", () => {
    expect(() => parse("sum(a) / sum(b)")).toThrow(ParseError);
  });

  it("round-trips render", () => {
    const cases: Query[] = [
      { agg: { kind: "count_users" }, metric: "x", filters: [] },
      {
        agg: { kind: "sum" },
        metric: "purchase",
        valueLabel: "amount",
        filters: [{ label: "country", op: "=", value: "US" }],
        groupBy: { op: "by", labels: ["country"] },
      },
      {
        agg: { kind: "quantile", p: 0.95 },
        metric: "lat",
        valueLabel: "ms",
        filters: [
          { label: "route", op: "=~", value: "/api/.*" },
          { label: "tier", op: "!=", value: "free" },
        ],
        groupBy: { op: "without", labels: ["region"] },
      },
      { agg: { kind: "retention_Nd", n: 30 }, metric: "session_start", filters: [] },
    ];
    for (const q of cases) {
      expect(parse(render(q))).toEqual(q);
    }
  });
});
