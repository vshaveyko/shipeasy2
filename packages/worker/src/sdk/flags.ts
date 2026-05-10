// GET /sdk/flags — server SDKs poll; cached at the edge per (project, env).

import { getFlags, getPlan, resolveEnv } from "@shipeasy/core";
import type { AuthedContext } from "../lib/auth";
import { withEdgeCache } from "../lib/edge-cache";

export async function handleFlags(c: AuthedContext) {
  const key = c.get("key");
  const targetEnv = resolveEnv(c.req.query("env"));

  return withEdgeCache(
    c,
    { route: "/sdk/flags", projectId: key.project_id, env: targetEnv },
    async () => {
      const flags = await getFlags(c.env, key.project_id, targetEnv);
      const plan = getPlan(flags.plan);
      const interval = plan.poll_interval_seconds;
      const etag = `"${flags.version}"`;

      return new Response(JSON.stringify(flags), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "public, max-age=31536000, immutable",
          ETag: etag,
          "X-Poll-Interval": String(interval),
          "X-Shipeasy-Env": targetEnv,
          "Timing-Allow-Origin": "*",
        },
      });
    },
    { passthroughHeaders: ["X-Poll-Interval", "X-Shipeasy-Env"] },
  );
}
