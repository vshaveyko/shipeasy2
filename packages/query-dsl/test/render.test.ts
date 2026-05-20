import { describe, expect, it } from "vitest";
import { render } from "../src/render";
import type { Query } from "../src/ir";

describe("render", () => {
  it("count_users with no filters", () => {
    const q: Query = { agg: { kind: "count_users" }, metric: "checkout_completed", filters: [] };
    expect(render(q)).toBe("count_users(checkout_completed)");
  });

  it("sum with value label and filters", () => {
    const q: Query = {
      agg: { kind: "sum" },
      metric: "purchase",
      valueLabel: "amount",
      filters: [{ label: "country", op: "=", value: "US" }],
    };
    expect(render(q)).toBe(`sum(purchase{country="US"}, amount)`);
  });

  it("p99 with groupBy", () => {
    const q: Query = {
      agg: { kind: "quantile", p: 0.99 },
      metric: "request_duration",
      valueLabel: "ms",
      filters: [{ label: "route", op: "=~", value: "/api/.*" }],
      groupBy: { op: "by", labels: ["route", "status"] },
    };
    expect(render(q)).toBe(`p99(request_duration{route=~"/api/.*"}, ms) by (route, status)`);
  });

  it("retention_7d", () => {
    const q: Query = {
      agg: { kind: "retention_Nd", n: 7 },
      metric: "session_start",
      filters: [],
    };
    expect(render(q)).toBe("retention_7d(session_start)");
  });

  it("escapes quotes in filter values", () => {
    const q: Query = {
      agg: { kind: "count_events" },
      metric: "click",
      filters: [{ label: "label", op: "=", value: 'foo "bar"' }],
    };
    expect(render(q)).toBe(`count(click{label="foo \\"bar\\""})`);
  });
});
