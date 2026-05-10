// Wraps SDK metadata handlers with `caches.default` so repeat hits in a colo
// short-circuit before touching KV. The cache key is a synthetic URL on the
// worker's own zone (built by sdkCacheUrl) so the CF Purge API can later
// invalidate the same key globally on rebuild.
//
// Real client requests carry X-SDK-Key — that header is stripped from the
// cache key, so every customer in the colo shares one entry per (project, variant).

import type { SdkCacheKey } from "@shipeasy/core";
import { sdkCacheUrl } from "@shipeasy/core";
import type { AuthedContext } from "./auth";

// `caches.default` is the Workers-specific colo cache; the DOM CacheStorage
// type from `lib: ["dom"]` doesn't know about it. Returns null in test/node
// environments where the global isn't installed — callers no-op in that case.
function getDefaultCache(): Cache | null {
  if (typeof caches === "undefined") return null;
  const c = (caches as unknown as { default?: Cache }).default;
  return c ?? null;
}

type EdgeCacheOpts = {
  /** Headers to copy from the cached/fresh response onto a 304 reply. */
  passthroughHeaders?: string[];
};

export async function withEdgeCache(
  c: AuthedContext,
  key: SdkCacheKey,
  build: () => Promise<Response>,
  opts: EdgeCacheOpts = {},
): Promise<Response> {
  const cache = getDefaultCache();
  const inm = c.req.header("If-None-Match")?.replace(/^W\//, "");

  // Edge cache is only invalidated by the CF Purge API. If the API isn't
  // configured (local dev / e2e), skip the cache entirely so admin-write →
  // SDK-read returns fresh data instead of a stale colo entry that nothing
  // can flush.
  const purgeAvailable = !!(c.env.CF_API_TOKEN && c.env.CF_ZONE_ID && c.env.FLAGS_DOMAIN);

  if (cache && purgeAvailable) {
    const host = new URL(c.req.url).host;
    const cacheKey = new Request(sdkCacheUrl(host, key), { method: "GET" });
    const hit = await cache.match(cacheKey);
    if (hit) {
      const etag = hit.headers.get("ETag");
      if (etag && inm === etag) {
        return notModified(etag, hit.headers, opts.passthroughHeaders);
      }
      const res = new Response(hit.body, hit);
      res.headers.set("X-Edge-Cache", "HIT");
      return res;
    }

    const fresh = await build();
    if (fresh.status === 200 && hasMaxAge(fresh.headers.get("Cache-Control"))) {
      c.executionCtx.waitUntil(cache.put(cacheKey, fresh.clone()));
    }
    return finalize(fresh, inm, opts.passthroughHeaders);
  }

  // No edge cache available (test/node env) — fall through to the handler.
  return finalize(await build(), inm, opts.passthroughHeaders);
}

function finalize(
  fresh: Response,
  inm: string | undefined,
  passthrough: string[] | undefined,
): Response {
  const etag = fresh.headers.get("ETag");
  if (etag && inm === etag && fresh.status === 200) {
    return notModified(etag, fresh.headers, passthrough);
  }
  fresh.headers.set("X-Edge-Cache", "MISS");
  return fresh;
}

function notModified(etag: string, source: Headers, passthrough: string[] | undefined): Response {
  const headers = new Headers({ ETag: etag });
  for (const h of passthrough ?? []) {
    const v = source.get(h);
    if (v) headers.set(h, v);
  }
  headers.set("X-Edge-Cache", "HIT-304");
  return new Response(null, { status: 304, headers });
}

function hasMaxAge(cc: string | null): boolean {
  return !!cc && /max-age=\d+/.test(cc);
}
