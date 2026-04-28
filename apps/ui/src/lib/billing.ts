import Stripe from "stripe";
import { and, count, eq, isNull } from "drizzle-orm";
import { buildUsageUpdates, findProjectById, getDb } from "@shipeasy/core";
import { gates, configs, experiments } from "@shipeasy/core/db/schema";

function getStripe(secretKey: string): Stripe {
  return new Stripe(secretKey, {
    apiVersion: "2025-02-24.acacia",
    httpClient: Stripe.createFetchHttpClient(),
  });
}

export interface BillingEnv {
  DB: D1Database;
  STRIPE_SECRET_KEY?: string;
  STRIPE_PRICE_BASE_MONTHLY?: string;
  STRIPE_PRICE_BASE_ANNUAL?: string;
  STRIPE_PRICE_PER_EXPERIMENT?: string;
  STRIPE_PRICE_PER_GATE?: string;
  STRIPE_PRICE_PER_CONFIG?: string;
}

export async function createCheckoutSession(
  env: BillingEnv,
  projectId: string,
  ownerEmail: string,
  interval: "monthly" | "annual",
  returnUrl: string,
): Promise<string> {
  if (!env.STRIPE_SECRET_KEY) throw new Error("Stripe not configured");

  const stripe = getStripe(env.STRIPE_SECRET_KEY);
  const basePriceId = interval === "annual" ? env.STRIPE_PRICE_BASE_ANNUAL : env.STRIPE_PRICE_BASE_MONTHLY;
  if (!basePriceId) throw new Error(`Stripe base price for '${interval}' not configured`);

  const items: Stripe.Checkout.SessionCreateParams.LineItem[] = [
    { price: basePriceId, quantity: 1 },
  ];
  if (env.STRIPE_PRICE_PER_EXPERIMENT) items.push({ price: env.STRIPE_PRICE_PER_EXPERIMENT, quantity: 0 });
  if (env.STRIPE_PRICE_PER_GATE) items.push({ price: env.STRIPE_PRICE_PER_GATE, quantity: 0 });
  if (env.STRIPE_PRICE_PER_CONFIG) items.push({ price: env.STRIPE_PRICE_PER_CONFIG, quantity: 0 });

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer_email: ownerEmail,
    line_items: items,
    subscription_data: {
      trial_period_days: 14,
      metadata: { project_id: projectId },
    },
    metadata: { project_id: projectId },
    payment_method_collection: "always",
    success_url: `${returnUrl}?billing=success`,
    cancel_url: `${returnUrl}?billing=canceled`,
  });

  return session.url!;
}

export async function createPortalSession(
  env: BillingEnv,
  projectId: string,
  returnUrl: string,
): Promise<string> {
  if (!env.STRIPE_SECRET_KEY) throw new Error("Stripe not configured");

  const project = await findProjectById(env.DB, projectId);
  if (!project?.stripeCustomerId) throw new Error("No Stripe customer for this project");

  const stripe = getStripe(env.STRIPE_SECRET_KEY);
  const session = await stripe.billingPortal.sessions.create({
    customer: project.stripeCustomerId,
    return_url: returnUrl,
  });

  return session.url;
}

/** Syncs Stripe subscription item quantities after resource creation/deletion. */
export async function syncUsage(env: BillingEnv, projectId: string): Promise<void> {
  if (!env.STRIPE_SECRET_KEY) return;

  const project = await findProjectById(env.DB, projectId);
  if (!project?.stripeSubscriptionId || project.subscriptionStatus === "none") return;

  const db = getDb(env.DB);
  const [expRow, gateRow, configRow] = await Promise.all([
    db.select({ n: count() }).from(experiments).where(
      and(eq(experiments.projectId, projectId), eq(experiments.status, "running")),
    ),
    db.select({ n: count() }).from(gates).where(
      and(eq(gates.projectId, projectId), isNull(gates.deletedAt), eq(gates.enabled, 1)),
    ),
    db.select({ n: count() }).from(configs).where(
      and(eq(configs.projectId, projectId), isNull(configs.deletedAt)),
    ),
  ]);

  const updates = buildUsageUpdates(project, {
    runningExperiments: expRow[0]?.n ?? 0,
    activeGates: gateRow[0]?.n ?? 0,
    activeConfigs: configRow[0]?.n ?? 0,
  });

  if (updates.length === 0) return;

  const stripe = getStripe(env.STRIPE_SECRET_KEY);
  await Promise.all(
    updates.map(({ itemId, quantity }) =>
      stripe.subscriptionItems.update(itemId, { quantity }),
    ),
  );
}
