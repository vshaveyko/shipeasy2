import { describe, it, expect } from "vitest";
import { PLANS, getPlan } from "../plans";

describe("getPlan", () => {
  it("returns the free plan", () => {
    const plan = getPlan("free");
    expect(plan.name).toBe("free");
    expect(plan.price_usd_per_month).toBe(0);
  });

  it("returns the paid plan", () => {
    const plan = getPlan("paid");
    expect(plan.name).toBe("paid");
    expect(plan.max_flags).toBe(-1);
  });

  it("throws for an unknown plan name", () => {
    expect(() => getPlan("unknown")).toThrow("Unknown plan: unknown");
  });

  it("throws for empty string", () => {
    expect(() => getPlan("")).toThrow();
  });
});

describe("PLANS", () => {
  it("contains exactly the two expected plans", () => {
    expect(Object.keys(PLANS)).toEqual(["free", "paid"]);
  });

  it("free plan has hard count limits; paid has -1 (unlimited)", () => {
    expect(PLANS.free.max_flags).toBe(3);
    expect(PLANS.free.max_configs).toBe(1);
    expect(PLANS.free.max_experiments_running).toBe(1);
    expect(PLANS.free.max_universes).toBe(1);
    expect(PLANS.paid.max_flags).toBe(-1);
    expect(PLANS.paid.max_configs).toBe(-1);
    expect(PLANS.paid.max_experiments_running).toBe(-1);
  });

  it("free plan has i18n limits; paid has -1", () => {
    expect(PLANS.free.max_i18n_keys).toBe(250);
    expect(PLANS.free.max_i18n_profiles).toBe(1);
    expect(PLANS.paid.max_i18n_keys).toBe(-1);
    expect(PLANS.paid.max_i18n_profiles).toBe(-1);
  });

  it("paid plan polls faster than free", () => {
    expect(PLANS.paid.poll_interval_seconds).toBeLessThan(PLANS.free.poll_interval_seconds);
  });

  it("free has mcp_access=true (1 profile with MCP included)", () => {
    expect(PLANS.free.mcp_access).toBe(true);
  });

  it("paid plan has 14-day trial", () => {
    expect(PLANS.paid.trial_days).toBe(14);
  });

  it("all plans have required boolean feature flags", () => {
    for (const plan of Object.values(PLANS)) {
      expect(typeof plan.holdout_groups).toBe("boolean");
      expect(typeof plan.cuped_enabled).toBe("boolean");
      expect(typeof plan.srm_detection).toBe("boolean");
      expect(typeof plan.data_export).toBe("boolean");
      expect(typeof plan.mcp_access).toBe("boolean");
    }
  });

  it("analysis_frequency is 'daily' for all plans", () => {
    for (const plan of Object.values(PLANS)) {
      expect(plan.analysis_frequency).toBe("daily");
    }
  });

  it("paid plan retains results longer than free", () => {
    expect(PLANS.paid.results_retention_days).toBeGreaterThan(PLANS.free.results_retention_days);
  });
});
