import { getCloudflareContext } from "@opennextjs/cloudflare";
import type { CoreEnv } from "@shipeasy/core";

declare global {
  interface CloudflareEnv {
    DB: D1Database;
    FLAGS_KV?: KVNamespace;
    CF_ZONE_ID?: string;
    CF_API_TOKEN?: string;
    FLAGS_DOMAIN?: string;
    WORKER_URL?: string;
    CLI_SERVICE_SECRET?: string;
    // Stripe — set via `wrangler secret put`
    STRIPE_SECRET_KEY?: string;
    STRIPE_PRICE_BASE_MONTHLY?: string;
    STRIPE_PRICE_BASE_ANNUAL?: string;
    STRIPE_PRICE_PER_EXPERIMENT?: string;
    STRIPE_PRICE_PER_GATE?: string;
    STRIPE_PRICE_PER_CONFIG?: string;
  }
}

export function getEnv(): CoreEnv & CloudflareEnv {
  const { env } = getCloudflareContext();
  if (!env.DB) throw new Error("D1 binding `DB` is missing");
  return env as CoreEnv & CloudflareEnv;
}

export async function getEnvAsync(): Promise<CoreEnv & CloudflareEnv> {
  const { env } = await getCloudflareContext({ async: true });
  if (!env.DB) throw new Error("D1 binding `DB` is missing");
  return env as CoreEnv & CloudflareEnv;
}
