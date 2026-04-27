import { getPlan, type Plan } from "../config/plans";
import type { PlanName } from "../types";

export type SubscriptionStatus =
  | "none"
  | "trialing"
  | "active"
  | "past_due"
  | "canceled"
  | "incomplete";

export interface BillingState {
  plan: PlanName;
  subscriptionStatus: SubscriptionStatus;
  currentPeriodEnd: string | null;
  trialEndsAt: string | null;
  cancelAtPeriodEnd: number;
  billingInterval: "monthly" | "annual";
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  stripeItemIdBase: string | null;
  stripeItemIdExperiments: string | null;
  stripeItemIdGates: string | null;
  stripeItemIdConfigs: string | null;
}

/** Grace period after currentPeriodEnd before a past_due project is downgraded. */
const PAST_DUE_GRACE_MS = 3 * 24 * 60 * 60 * 1000;

/**
 * Returns the effective Plan for a project, accounting for subscription status.
 * A canceled subscription or a past_due subscription past the grace period
 * reverts to the free plan regardless of the stored plan name.
 */
export function getEffectivePlan(
  billing: Pick<BillingState, "plan" | "subscriptionStatus" | "currentPeriodEnd">,
): Plan {
  const { subscriptionStatus, currentPeriodEnd } = billing;

  if (subscriptionStatus === "canceled") {
    return getPlan("free");
  }

  if (subscriptionStatus === "past_due" && currentPeriodEnd) {
    const graceEnd = new Date(currentPeriodEnd).getTime() + PAST_DUE_GRACE_MS;
    if (Date.now() > graceEnd) return getPlan("free");
  }

  return getPlan(billing.plan);
}

export interface UsageSnapshot {
  runningExperiments: number;
  activeGates: number;
  activeConfigs: number;
}

/**
 * Returns the Stripe subscription item updates needed to sync metered quantities.
 * The caller is responsible for calling the Stripe API — this module stays
 * free of the Stripe SDK so it can be imported from @shipeasy/core without
 * pulling in the Stripe client at build time.
 */
export function buildUsageUpdates(
  billing: Pick<
    BillingState,
    "stripeItemIdExperiments" | "stripeItemIdGates" | "stripeItemIdConfigs"
  >,
  usage: UsageSnapshot,
): Array<{ itemId: string; quantity: number }> {
  const updates: Array<{ itemId: string; quantity: number }> = [];

  if (billing.stripeItemIdExperiments) {
    updates.push({ itemId: billing.stripeItemIdExperiments, quantity: usage.runningExperiments });
  }
  if (billing.stripeItemIdGates) {
    updates.push({ itemId: billing.stripeItemIdGates, quantity: usage.activeGates });
  }
  if (billing.stripeItemIdConfigs) {
    updates.push({ itemId: billing.stripeItemIdConfigs, quantity: usage.activeConfigs });
  }

  return updates;
}
