// purgeCache() — Cloudflare CDN purge via API with retry + async fallback.
// See 02-kv-cache.md § "CDN cache purge".

import type { CoreEnv } from "../env";

export async function purgeCache(env: CoreEnv, path: string): Promise<void> {
  if (!env.CF_ZONE_ID || !env.CF_API_TOKEN || !env.FLAGS_DOMAIN || !env.FLAGS_KV) {
    return;
  }

  const url = `https://api.cloudflare.com/client/v4/zones/${env.CF_ZONE_ID}/purge_cache`;
  const body = JSON.stringify({ files: [`https://${env.FLAGS_DOMAIN}${path}`] });

  for (let attempt = 1; attempt <= 3; attempt++) {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.CF_API_TOKEN}`,
        "Content-Type": "application/json",
      },
      body,
    }).catch((err: Error) => {
      return { ok: false, status: 0, statusText: err.message } as Response;
    });

    if (res.ok) return;

    if (attempt < 3) {
      await new Promise((r) => setTimeout(r, 200 * Math.pow(4, attempt - 1)));
      continue;
    }

    console.error(
      JSON.stringify({
        level: "CRITICAL",
        event: "cdn_purge_failed",
        path,
        attempts: 3,
        status: res.status,
      }),
    );
    await env.FLAGS_KV.put(
      `purge_pending:${path}`,
      JSON.stringify({ path, failed_at: new Date().toISOString(), attempts: 3 }),
      { expirationTtl: 3600 },
    );
  }
}
