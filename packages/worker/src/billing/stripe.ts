import Stripe from "stripe";
import type { WorkerEnv } from "../env";

export function getStripe(env: WorkerEnv): Stripe {
  if (!env.STRIPE_SECRET_KEY) throw new Error("STRIPE_SECRET_KEY is not configured");
  return new Stripe(env.STRIPE_SECRET_KEY, {
    // Pin to an API version to prevent silent breaking changes on Stripe upgrades
    apiVersion: "2025-02-24.acacia",
    httpClient: Stripe.createFetchHttpClient(),
  });
}

export interface CreateSubscriptionParams {
  customerId: string;
  /** "monthly" uses STRIPE_PRICE_BASE_MONTHLY; "annual" uses STRIPE_PRICE_BASE_ANNUAL */
  interval: "monthly" | "annual";
  trialDays: number;
  env: WorkerEnv;
}

export async function createSubscription(
  stripe: Stripe,
  params: CreateSubscriptionParams,
): Promise<Stripe.Subscription> {
  const { customerId, interval, trialDays, env } = params;

  const basePriceId =
    interval === "annual" ? env.STRIPE_PRICE_BASE_ANNUAL : env.STRIPE_PRICE_BASE_MONTHLY;
  if (!basePriceId) throw new Error(`Stripe base price for '${interval}' is not configured`);

  const items: Stripe.SubscriptionCreateParams.Item[] = [{ price: basePriceId, quantity: 1 }];

  if (env.STRIPE_PRICE_PER_EXPERIMENT) {
    items.push({ price: env.STRIPE_PRICE_PER_EXPERIMENT, quantity: 0 });
  }
  if (env.STRIPE_PRICE_PER_GATE) {
    items.push({ price: env.STRIPE_PRICE_PER_GATE, quantity: 0 });
  }
  if (env.STRIPE_PRICE_PER_CONFIG) {
    items.push({ price: env.STRIPE_PRICE_PER_CONFIG, quantity: 0 });
  }

  return stripe.subscriptions.create({
    customer: customerId,
    items,
    trial_period_days: trialDays > 0 ? trialDays : undefined,
    payment_behavior: "default_incomplete",
    payment_settings: { save_default_payment_method: "on_subscription" },
    expand: ["latest_invoice.payment_intent"],
  });
}

/**
 * Syncs subscription item quantities after a resource is created or deleted.
 * Pass the current counts; Stripe receives absolute quantities (not deltas).
 */
export async function syncUsageQuantities(
  stripe: Stripe,
  updates: Array<{ itemId: string; quantity: number }>,
): Promise<void> {
  await Promise.all(
    updates.map(({ itemId, quantity }) =>
      stripe.subscriptionItems.update(itemId, { quantity }),
    ),
  );
}
