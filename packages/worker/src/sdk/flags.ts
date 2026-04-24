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

  if (c.req.header("If-None-Match") === etag) {
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
