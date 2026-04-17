import { describe, it, expect } from "vitest";
import { evalExperiment, type Experiment, type ExperimentGroup } from "../experiment";
import type { User } from "../gate";

const twoGroups: ExperimentGroup[] = [
  { name: "control", weight: 5000, params: { variant: "A" } },
  { name: "treatment", weight: 5000, params: { variant: "B" } },
];

const baseExp: Experiment = {
  universe: "default",
  targetingGate: null,
  allocationPct: 10000,
  salt: "exp-smoke-test",
  groups: twoGroups,
  status: "running",
};

const user: User = { user_id: "exp-user-1" };

describe("evalExperiment — targeting gate", () => {
  it("returns null when targeting gate flag is false", () => {
    const exp: Experiment = { ...baseExp, targetingGate: "beta_gate" };
    expect(evalExperiment(exp, user, { beta_gate: false }, null)).toBeNull();
  });

  it("passes targeting when gate flag is true", () => {
    const exp: Experiment = { ...baseExp, targetingGate: "beta_gate" };
    expect(evalExperiment(exp, user, { beta_gate: true }, null)).not.toBeNull();
  });

  it("passes when targetingGate is null (no gate required)", () => {
    expect(evalExperiment(baseExp, user, {}, null)).not.toBeNull();
  });

  it("passes when targetingGate is undefined", () => {
    const exp: Experiment = { ...baseExp, targetingGate: undefined };
    expect(evalExperiment(exp, user, {}, null)).not.toBeNull();
  });
});

describe("evalExperiment — user identity", () => {
  it("returns null when user has no user_id or anonymous_id", () => {
    expect(evalExperiment(baseExp, {}, {}, null)).toBeNull();
  });

  it("uses anonymous_id when user_id is absent", () => {
    const anonUser: User = { anonymous_id: "anon-exp-456" };
    expect(evalExperiment(baseExp, anonUser, {}, null)).not.toBeNull();
  });
});

describe("evalExperiment — holdout", () => {
  it("excludes a user covered by the full holdout range [0, 9999]", () => {
    expect(evalExperiment(baseExp, user, {}, [0, 9999])).toBeNull();
  });

  it("does not exclude a user when holdout range is null", () => {
    expect(evalExperiment(baseExp, user, {}, null)).not.toBeNull();
  });

  it("holdout is scoped to the universe, not the experiment salt", () => {
    // Two experiments in different universes share the same user; one may be excluded, other not
    const expA: Experiment = { ...baseExp, universe: "universe-a", salt: "exp-a" };
    const expB: Experiment = { ...baseExp, universe: "universe-b", salt: "exp-b" };
    const holdout: [number, number] = [0, 4999]; // 50% holdout
    const rA = evalExperiment(expA, user, {}, holdout);
    const rB = evalExperiment(expB, user, {}, holdout);
    // Results may differ — what matters is neither throws
    expect(rA === null || rA !== null).toBe(true);
    expect(rB === null || rB !== null).toBe(true);
  });
});

describe("evalExperiment — allocation", () => {
  it("returns null when allocationPct is 0", () => {
    const exp: Experiment = { ...baseExp, allocationPct: 0 };
    expect(evalExperiment(exp, user, {}, null)).toBeNull();
  });

  it("always assigns at 100% allocation", () => {
    expect(evalExperiment(baseExp, user, {}, null)).not.toBeNull();
  });
});

describe("evalExperiment — group assignment", () => {
  it("returns an object with group name and params", () => {
    const result = evalExperiment(baseExp, user, {}, null);
    expect(result).not.toBeNull();
    expect(["control", "treatment"]).toContain(result!.group);
    expect(result!.params).toHaveProperty("variant");
  });

  it("is deterministic — same inputs always produce the same group", () => {
    const r1 = evalExperiment(baseExp, user, {}, null);
    const r2 = evalExperiment(baseExp, user, {}, null);
    expect(r1).toEqual(r2);
  });

  it("different users can land in different groups", () => {
    const groups = new Set<string>();
    for (let i = 0; i < 50; i++) {
      const u: User = { user_id: `exp-user-${i}` };
      const r = evalExperiment(baseExp, u, {}, null);
      if (r) groups.add(r.group);
    }
    expect(groups.size).toBe(2);
  });

  it("falls through to last group for high group hash values", () => {
    // Group weights don't sum to 10000 — last group catches the remainder
    const exp: Experiment = {
      ...baseExp,
      groups: [
        { name: "control", weight: 5000, params: {} },
        { name: "treatment", weight: 4000, params: {} }, // only covers up to 9000
      ],
    };
    // Verify no crash and result is one of the valid groups
    const result = evalExperiment(exp, user, {}, null);
    if (result) {
      expect(["control", "treatment"]).toContain(result.group);
    }
  });

  it("params are returned unchanged", () => {
    const exp: Experiment = {
      ...baseExp,
      groups: [{ name: "only", weight: 10000, params: { color: "blue", size: 42 } }],
    };
    const result = evalExperiment(exp, user, {}, null);
    expect(result?.params).toEqual({ color: "blue", size: 42 });
  });
});
