import { getCloudflareContext } from "@opennextjs/cloudflare";
import type { CoreEnv } from "@shipeasy/core";

declare global {
  interface CloudflareEnv {
    DB: D1Database;
    FLAGS_KV?: KVNamespace;
    CF_ZONE_ID?: string;
    CF_API_TOKEN?: string;
    FLAGS_DOMAIN?: string;
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
