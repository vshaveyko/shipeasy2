import type { PlanName } from "../types";

// Plans are compiled from plans.yaml at build time.
// See experiment-platform/plans.yaml for limits and features per tier.
export const PLANS = {} as Record<PlanName, unknown>;

export function getPlan(name: string): unknown {
  return PLANS[name as PlanName];
}
