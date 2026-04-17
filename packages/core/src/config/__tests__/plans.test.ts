import { describe, it, expect } from "vitest";
import { PLANS, getPlan } from "../plans";

describe("getPlan", () => {
  it("returns the free plan", () => {
    const plan = getPlan("free");
    expect(plan.name).toBe("free");
    expect(plan.price_usd_per_month).toBe(0);
  });

  it("returns the pro plan", () => {
    const plan = getPlan("pro");
    expect(plan.name).toBe("pro");
    expect(plan.max_flags).toBe(200);
  });

  it("returns the premium plan", () => {
    const plan = getPlan("premium");
    expect(plan.name).toBe("premium");
  });

  it("returns the enterprise plan with -1 limits (unlimited)", () => {
    const plan = getPlan("enterprise");
    expect(plan.name).toBe("enterprise");
    expect(plan.max_flags).toBe(-1);
    expect(plan.max_sdk_keys).toBe(-1);
  });

  it("throws for an unknown plan name", () => {
    expect(() => getPlan("unknown")).toThrow("Unknown plan: unknown");
  });

  it("throws for empty string", () => {
    expect(() => getPlan("")).toThrow();
  });
});

describe("PLANS", () => {
  it("contains exactly the four expected plans", () => {
    expect(Object.keys(PLANS)).toEqual(["free", "pro", "premium", "enterprise"]);
  });

  it("resource limits increase from free → pro → premium", () => {
    expect(PLANS.free.max_flags).toBeLessThan(PLANS.pro.max_flags);
    expect(PLANS.pro.max_flags).toBeLessThan(PLANS.premium.max_flags);

    expect(PLANS.free.max_experiments_running).toBeLessThan(PLANS.pro.max_experiments_running);
    expect(PLANS.pro.max_experiments_running).toBeLessThan(PLANS.premium.max_experiments_running);
  });

  it("poll interval decreases as tier increases (faster polling at higher tiers)", () => {
    expect(PLANS.enterprise.poll_interval_seconds).toBeLessThan(
      PLANS.premium.poll_interval_seconds,
    );
    expect(PLANS.premium.poll_interval_seconds).toBeLessThan(PLANS.pro.poll_interval_seconds);
    expect(PLANS.pro.poll_interval_seconds).toBeLessThan(PLANS.free.poll_interval_seconds);
  });

  it("enterprise has -1 for all resource count limits", () => {
    const ent = PLANS.enterprise;
    expect(ent.max_flags).toBe(-1);
    expect(ent.max_configs).toBe(-1);
    expect(ent.max_experiments_running).toBe(-1);
    expect(ent.max_universes).toBe(-1);
    expect(ent.max_metrics).toBe(-1);
    expect(ent.max_events_catalog).toBe(-1);
    expect(ent.max_sdk_keys).toBe(-1);
    expect(ent.max_team_members).toBe(-1);
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

  it("free plan has holdout_groups=false", () => {
    expect(PLANS.free.holdout_groups).toBe(false);
  });

  it("pro and above have holdout_groups=true", () => {
    expect(PLANS.pro.holdout_groups).toBe(true);
    expect(PLANS.premium.holdout_groups).toBe(true);
    expect(PLANS.enterprise.holdout_groups).toBe(true);
  });

  it("analysis_frequency is 'daily' for all plans", () => {
    for (const plan of Object.values(PLANS)) {
      expect(plan.analysis_frequency).toBe("daily");
    }
  });

  it("results_retention_days increases with plan tier", () => {
    expect(PLANS.free.results_retention_days).toBeLessThan(PLANS.pro.results_retention_days);
    expect(PLANS.pro.results_retention_days).toBeLessThan(PLANS.premium.results_retention_days);
  });
});
