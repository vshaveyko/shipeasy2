import type { Context } from "hono";
import Stripe from "stripe";
import { getDb } from "@shipeasy/core";
import { billingEvents, projects } from "@shipeasy/core/db/schema";
import { rebuildFlags, rebuildExperiments } from "@shipeasy/core";
import { eq } from "drizzle-orm";
import type { WorkerEnv } from "../env";
import { getStripe } from "./stripe";

import type { SdkKeyMeta } from "@shipeasy/core";

type SubscriptionStatus = typeof projects.$inferInsert["subscriptionStatus"];
type HonoEnv = { Bindings: WorkerEnv; Variables: { key: SdkKeyMeta } };

/** Map Stripe subscription status to our enum. */
function mapStatus(s: Stripe.Subscription.Status): SubscriptionStatus {
  switch (s) {
    case "trialing": return "trialing";
    case "active": return "active";
    case "past_due": return "past_due";
    case "canceled": return "canceled";
    case "incomplete":
    case "incomplete_expired":
    case "paused":
      return "incomplete";
    default:
      return "incomplete";
  }
}

async function syncSubscription(
  env: WorkerEnv,
  projectId: string,
  sub: Stripe.Subscription,
): Promise<void> {
  const db = getDb(env.DB);

  // Map subscription items to our stored item IDs
  const itemMap: Record<string, string> = {};
  for (const item of sub.items.data) {
    const priceId = item.price.id;
    if (priceId === env.STRIPE_PRICE_PER_EXPERIMENT) itemMap.stripeItemIdExperiments = item.id;
    else if (priceId === env.STRIPE_PRICE_PER_GATE) itemMap.stripeItemIdGates = item.id;
    else if (priceId === env.STRIPE_PRICE_PER_CONFIG) itemMap.stripeItemIdConfigs = item.id;
    else itemMap.stripeItemIdBase = item.id;
  }

  const patch = {
    plan: "paid" as const,
    stripeSubscriptionId: sub.id,
    subscriptionStatus: mapStatus(sub.status),
    currentPeriodEnd: new Date(sub.current_period_end * 1000).toISOString(),
    trialEndsAt: sub.trial_end ? new Date(sub.trial_end * 1000).toISOString() : null,
    cancelAtPeriodEnd: sub.cancel_at_period_end ? 1 : 0,
    updatedAt: new Date().toISOString(),
    ...itemMap,
  };

  await db.update(projects).set(patch).where(eq(projects.id, projectId));
  await rebuildFlags(env, projectId, "paid");
  await rebuildExperiments(env, projectId);
}

async function handleCheckoutCompleted(
  env: WorkerEnv,
  session: Stripe.Checkout.Session,
): Promise<void> {
  if (session.mode !== "subscription") return;
  const projectId = session.metadata?.project_id;
  if (!projectId) {
    console.error(JSON.stringify({ event: "billing_webhook_no_project", sessionId: session.id }));
    return;
  }

  const stripe = getStripe(env);
  const sub = await stripe.subscriptions.retrieve(session.subscription as string, {
    expand: ["items.data.price"],
  });

  const db = getDb(env.DB);
  await db
    .update(projects)
    .set({ stripeCustomerId: session.customer as string, updatedAt: new Date().toISOString() })
    .where(eq(projects.id, projectId));

  await syncSubscription(env, projectId, sub);
}

async function handleSubscriptionChange(
  env: WorkerEnv,
  sub: Stripe.Subscription,
): Promise<void> {
  const db = getDb(env.DB);
  const rows = await db
    .select({ id: projects.id })
    .from(projects)
    .where(eq(projects.stripeSubscriptionId, sub.id))
    .limit(1);
  const projectId = rows[0]?.id;
  if (!projectId) return;

  if (sub.status === "canceled") {
    await db.update(projects).set({
      plan: "free",
      subscriptionStatus: "canceled",
      updatedAt: new Date().toISOString(),
    }).where(eq(projects.id, projectId));
    await rebuildFlags(env, projectId, "free");
    await rebuildExperiments(env, projectId);
    return;
  }

  await syncSubscription(env, projectId, sub);
}

async function handleInvoiceStatusChange(
  env: WorkerEnv,
  invoice: Stripe.Invoice,
  status: "active" | "past_due",
): Promise<void> {
  const subId = typeof invoice.subscription === "string"
    ? invoice.subscription
    : invoice.subscription?.id;
  if (!subId) return;

  const db = getDb(env.DB);
  await db
    .update(projects)
    .set({ subscriptionStatus: status, updatedAt: new Date().toISOString() })
    .where(eq(projects.stripeSubscriptionId, subId));
}

export async function handleWebhook(c: Context<HonoEnv>): Promise<Response> {
  const env = c.env;

  if (!env.STRIPE_WEBHOOK_SECRET) {
    return c.json({ error: "Webhook secret not configured" }, 500);
  }

  const stripe = getStripe(env);
  const signature = c.req.header("stripe-signature");
  if (!signature) return c.json({ error: "Missing stripe-signature" }, 400);

  let event: Stripe.Event;
  try {
    const body = await c.req.text();
    event = await stripe.webhooks.constructEventAsync(body, signature, env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error(JSON.stringify({ event: "billing_webhook_sig_error", error: String(err) }));
    return c.json({ error: "Invalid signature" }, 400);
  }

  // Idempotency: insert or ignore keyed on Stripe event ID
  const db = getDb(env.DB);
  const existing = await db
    .select({ id: billingEvents.id })
    .from(billingEvents)
    .where(eq(billingEvents.id, event.id))
    .limit(1);
  if (existing.length > 0) {
    return c.json({ ok: true, duplicate: true });
  }

  // Record the event
  await db.insert(billingEvents).values({
    id: event.id,
    projectId: null,
    type: event.type,
    payload: event.data.object as unknown as Record<string, unknown>,
    receivedAt: new Date().toISOString(),
  });

  try {
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutCompleted(env, event.data.object as Stripe.Checkout.Session);
        break;
      case "customer.subscription.updated":
        await handleSubscriptionChange(env, event.data.object as Stripe.Subscription);
        break;
      case "customer.subscription.deleted":
        await handleSubscriptionChange(env, event.data.object as Stripe.Subscription);
        break;
      case "invoice.payment_succeeded":
        await handleInvoiceStatusChange(env, event.data.object as Stripe.Invoice, "active");
        break;
      case "invoice.payment_failed":
        await handleInvoiceStatusChange(env, event.data.object as Stripe.Invoice, "past_due");
        break;
      default:
        // Unhandled events are fine — log and return 200 so Stripe doesn't retry
        console.log(JSON.stringify({ event: "billing_webhook_unhandled", type: event.type }));
    }
  } catch (err) {
    console.error(JSON.stringify({ event: "billing_webhook_handler_error", type: event.type, error: String(err) }));
    // Return 500 so Stripe retries
    return c.json({ error: "Handler failed" }, 500);
  }

  return c.json({ ok: true });
}
