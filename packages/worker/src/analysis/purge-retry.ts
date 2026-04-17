// Purge retry cron (*/5 * * * *) — drain `purge_pending:*` KV entries written by
// packages/core/src/kv/purge.ts when the CDN purge API fails its initial retries.

import type { WorkerEnv } from "../env";

export async function runPurgeRetry(env: WorkerEnv): Promise<void> {
  if (!env.FLAGS_KV || !env.CF_API_TOKEN || !env.CF_ZONE_ID || !env.FLAGS_DOMAIN) return;

  let cursor: string | undefined;
  let drained = 0;

  do {
    const list: KVNamespaceListResult<unknown> = await env.FLAGS_KV.list({
      prefix: "purge_pending:",
      cursor,
    });
    for (const k of list.keys) {
      const path = k.name.slice("purge_pending:".length);
      const ok = await purgeOnce(env, path);
      if (ok) {
        await env.FLAGS_KV.delete(k.name);
        drained += 1;
      }
    }
    cursor = list.list_complete ? undefined : list.cursor;
  } while (cursor);

  if (drained > 0) {
    console.log(
      JSON.stringify({
        event: "purge_retry_drained",
        count: drained,
        ts: new Date().toISOString(),
      }),
    );
  }
}

async function purgeOnce(env: WorkerEnv, path: string): Promise<boolean> {
  const res = await fetch(
    `https://api.cloudflare.com/client/v4/zones/${env.CF_ZONE_ID}/purge_cache`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.CF_API_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ files: [`https://${env.FLAGS_DOMAIN}${path}`] }),
    },
  ).catch(() => null);
  return !!res && res.ok;
}
