// GET /sdk/experiments — server SDKs poll every 600s; ETag + infinite CDN cache.

import { getExperiments } from "@shipeasy/core";
import type { AuthedContext } from "../lib/auth";

export async function handleExperiments(c: AuthedContext) {
  const key = c.get("key");
  const exps = await getExperiments(c.env, key.project_id);
  const etag = `"${exps.version}"`;

  // Cloudflare's edge rewrites strong ETags to weak (`W/"..."`); strip the
  // prefix on compare so the 304 fast-path actually fires.
  const ifNoneMatch = c.req.header("If-None-Match")?.replace(/^W\//, "");
  if (ifNoneMatch === etag) {
    return new Response(null, { status: 304, headers: { ETag: etag } });
  }

  return new Response(JSON.stringify(exps), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=31536000",
      ETag: etag,
    },
  });
}
