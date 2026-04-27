// GET /sdk/flags — server SDKs poll; ETag + infinite CDN cache (explicit purge).

import { getFlags, getPlan, resolveEnv } from "@shipeasy/core";
import type { AuthedContext } from "../lib/auth";

export async function handleFlags(c: AuthedContext) {
  const key = c.get("key");
  const targetEnv = resolveEnv(c.req.query("env"));
  const flags = await getFlags(c.env, key.project_id, targetEnv);
  const plan = getPlan(flags.plan);
  const interval = plan.poll_interval_seconds;
  const etag = `"${flags.version}"`;

  // Cloudflare's edge rewrites strong ETags to weak (`W/"..."`), so a client
  // echoing `If-None-Match` back to us sends the weak form. Compare etag values
  // independent of the weak prefix.
  const ifNoneMatch = c.req.header("If-None-Match")?.replace(/^W\//, "");
  if (ifNoneMatch === etag) {
    return new Response(null, {
      status: 304,
      headers: {
        "X-Poll-Interval": String(interval),
        "X-Shipeasy-Env": targetEnv,
        ETag: etag,
      },
    });
  }

  return new Response(JSON.stringify(flags), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=31536000",
      ETag: etag,
      "X-Poll-Interval": String(interval),
      "X-Shipeasy-Env": targetEnv,
      // Cache varies per env so CDN stores 3 distinct blobs per project.
      Vary: "Accept, Accept-Encoding",
    },
  });
}
