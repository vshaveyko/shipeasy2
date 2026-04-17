import { describe, it, expect } from "vitest";
import { matchRule, evalGate, type GateRule, type Gate, type User } from "../gate";

describe("matchRule", () => {
  const user: User = {
    user_id: "u1",
    country: "US",
    age: 25,
    tags: ["beta", "admin"],
    email: "test@example.com",
  };

  describe("eq", () => {
    it("matches equal value", () => {
      expect(matchRule({ attr: "country", op: "eq", value: "US" }, user)).toBe(true);
    });
    it("does not match different value", () => {
      expect(matchRule({ attr: "country", op: "eq", value: "CA" }, user)).toBe(false);
    });
    it("does not match missing attribute (undefined !== value)", () => {
      expect(matchRule({ attr: "missing", op: "eq", value: "US" }, user)).toBe(false);
    });
  });

  describe("neq", () => {
    it("matches when values differ", () => {
      expect(matchRule({ attr: "country", op: "neq", value: "CA" }, user)).toBe(true);
    });
    it("does not match equal value", () => {
      expect(matchRule({ attr: "country", op: "neq", value: "US" }, user)).toBe(false);
    });
  });

  describe("in", () => {
    it("matches when attribute value is in list", () => {
      expect(matchRule({ attr: "country", op: "in", value: ["US", "CA"] }, user)).toBe(true);
    });
    it("does not match when attribute value is not in list", () => {
      expect(matchRule({ attr: "country", op: "in", value: ["CA", "GB"] }, user)).toBe(false);
    });
    it("returns false when rule value is not an array", () => {
      expect(matchRule({ attr: "country", op: "in", value: "US" }, user)).toBe(false);
    });
  });

  describe("not_in", () => {
    it("matches when attribute value is not in list", () => {
      expect(matchRule({ attr: "country", op: "not_in", value: ["CA", "GB"] }, user)).toBe(true);
    });
    it("does not match when attribute value is in list", () => {
      expect(matchRule({ attr: "country", op: "not_in", value: ["US", "CA"] }, user)).toBe(false);
    });
  });

  describe("numeric comparisons", () => {
    it("gt: true when actual > value", () => {
      expect(matchRule({ attr: "age", op: "gt", value: 20 }, user)).toBe(true);
    });
    it("gt: false when actual <= value", () => {
      expect(matchRule({ attr: "age", op: "gt", value: 25 }, user)).toBe(false);
    });
    it("gte: true when actual >= value", () => {
      expect(matchRule({ attr: "age", op: "gte", value: 25 }, user)).toBe(true);
    });
    it("gte: false when actual < value", () => {
      expect(matchRule({ attr: "age", op: "gte", value: 26 }, user)).toBe(false);
    });
    it("lt: true when actual < value", () => {
      expect(matchRule({ attr: "age", op: "lt", value: 30 }, user)).toBe(true);
    });
    it("lt: false when actual >= value", () => {
      expect(matchRule({ attr: "age", op: "lt", value: 25 }, user)).toBe(false);
    });
    it("lte: true when actual <= value", () => {
      expect(matchRule({ attr: "age", op: "lte", value: 25 }, user)).toBe(true);
    });
    it("lte: false when actual > value", () => {
      expect(matchRule({ attr: "age", op: "lte", value: 24 }, user)).toBe(false);
    });
    it("coerces numeric-string attributes", () => {
      const u = { user_id: "u", age: "25" };
      expect(matchRule({ attr: "age", op: "gt", value: "20" }, u)).toBe(true);
    });
    it("returns false for non-numeric attribute values", () => {
      expect(matchRule({ attr: "country", op: "gt", value: 5 }, user)).toBe(false);
    });
    it("returns false for Infinity as rule value", () => {
      expect(matchRule({ attr: "age", op: "lt", value: Infinity }, user)).toBe(false);
    });
  });

  describe("contains", () => {
    it("matches substring in string attribute", () => {
      expect(matchRule({ attr: "email", op: "contains", value: "example.com" }, user)).toBe(true);
    });
    it("does not match absent substring", () => {
      expect(matchRule({ attr: "email", op: "contains", value: "gmail.com" }, user)).toBe(false);
    });
    it("matches element in array attribute", () => {
      expect(matchRule({ attr: "tags", op: "contains", value: "beta" }, user)).toBe(true);
    });
    it("does not match missing element in array attribute", () => {
      expect(matchRule({ attr: "tags", op: "contains", value: "vip" }, user)).toBe(false);
    });
    it("returns false for numeric attribute (not string or array)", () => {
      expect(matchRule({ attr: "age", op: "contains", value: 2 }, user)).toBe(false);
    });
  });

  describe("regex", () => {
    it("matches a valid regex pattern against string attribute", () => {
      expect(matchRule({ attr: "email", op: "regex", value: "^test@" }, user)).toBe(true);
    });
    it("does not match non-matching pattern", () => {
      expect(matchRule({ attr: "email", op: "regex", value: "^admin@" }, user)).toBe(false);
    });
    it("returns false (not throws) for invalid regex", () => {
      expect(matchRule({ attr: "email", op: "regex", value: "[invalid" }, user)).toBe(false);
    });
    it("returns false when attribute is not a string", () => {
      expect(matchRule({ attr: "age", op: "regex", value: "\\d+" }, user)).toBe(false);
    });
    it("returns false when rule value is not a string", () => {
      expect(matchRule({ attr: "email", op: "regex", value: 42 }, user)).toBe(false);
    });
  });

  it("returns false for an unknown operator", () => {
    expect(matchRule({ attr: "country", op: "unknown" as never, value: "US" }, user)).toBe(false);
  });
});

describe("evalGate", () => {
  const baseGate: Gate = {
    rules: [],
    rolloutPct: 10000,
    salt: "test-salt",
    enabled: 1,
  };
  const user: User = { user_id: "user-for-gate-tests" };

  it("returns false when killswitch=1", () => {
    expect(evalGate({ ...baseGate, killswitch: 1 }, user)).toBe(false);
  });

  it("returns false when killswitch=true", () => {
    expect(evalGate({ ...baseGate, killswitch: true }, user)).toBe(false);
  });

  it("returns false when enabled=0", () => {
    expect(evalGate({ ...baseGate, enabled: 0 }, user)).toBe(false);
  });

  it("returns false when enabled=false", () => {
    expect(evalGate({ ...baseGate, enabled: false }, user)).toBe(false);
  });

  it("returns false when user has no user_id or anonymous_id", () => {
    expect(evalGate(baseGate, {})).toBe(false);
  });

  it("accepts anonymous_id in place of user_id", () => {
    const anonUser: User = { anonymous_id: "anon-abc" };
    // 100% rollout → must return true
    expect(evalGate(baseGate, anonUser)).toBe(true);
  });

  it("returns false at 0% rollout regardless of user", () => {
    expect(evalGate({ ...baseGate, rolloutPct: 0 }, user)).toBe(false);
  });

  it("returns true at 100% rollout with no rules", () => {
    expect(evalGate(baseGate, user)).toBe(true);
  });

  it("returns false when any rule fails", () => {
    const gate: Gate = {
      ...baseGate,
      rules: [{ attr: "country", op: "eq", value: "US" }],
    };
    expect(evalGate(gate, { user_id: "u1", country: "CA" })).toBe(false);
  });

  it("all rules must pass (AND semantics)", () => {
    const gate: Gate = {
      ...baseGate,
      rules: [
        { attr: "country", op: "eq", value: "US" },
        { attr: "age", op: "gte", value: 18 },
      ],
    };
    expect(evalGate(gate, { user_id: "u1", country: "US", age: 25 })).toBe(true);
    expect(evalGate(gate, { user_id: "u1", country: "CA", age: 25 })).toBe(false);
    expect(evalGate(gate, { user_id: "u1", country: "US", age: 16 })).toBe(false);
  });

  it("is deterministic — same user always gets same result", () => {
    const gate: Gate = { ...baseGate, rolloutPct: 5000 };
    expect(evalGate(gate, user)).toBe(evalGate(gate, user));
  });

  it("different salts produce independent bucketing", () => {
    const gateA: Gate = { ...baseGate, salt: "salt-a", rolloutPct: 5000 };
    const gateB: Gate = { ...baseGate, salt: "salt-b", rolloutPct: 5000 };
    // At least some users should differ between gates (statistical check over 20 users)
    let diffs = 0;
    for (let i = 0; i < 20; i++) {
      const u: User = { user_id: `u-${i}` };
      if (evalGate(gateA, u) !== evalGate(gateB, u)) diffs++;
    }
    expect(diffs).toBeGreaterThan(0);
  });
});
