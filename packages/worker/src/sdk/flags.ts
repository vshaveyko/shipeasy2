// GET /sdk/flags — server SDKs poll; ETag + infinite CDN cache (explicit purge).

import { getFlags, getPlan } from "@shipeasy/core";
import type { AuthedContext } from "../lib/auth";

export async function handleFlags(c: AuthedContext) {
  const key = c.get("key");
  const flags = await getFlags(c.env, key.project_id);
  const plan = getPlan(flags.plan);
  const interval = plan.poll_interval_seconds;
  const etag = `"${flags.version}"`;

  if (c.req.header("If-None-Match") === etag) {
    return new Response(null, {
      status: 304,
      headers: { "X-Poll-Interval": String(interval), ETag: etag },
    });
  }

  return new Response(JSON.stringify(flags), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=31536000",
      ETag: etag,
      "X-Poll-Interval": String(interval),
    },
  });
}
