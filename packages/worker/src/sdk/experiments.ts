// GET /sdk/experiments — server SDKs poll; cached at the edge per project.

import { getExperiments } from "@shipeasy/core";
import type { AuthedContext } from "../lib/auth";
import { withEdgeCache } from "../lib/edge-cache";

export async function handleExperiments(c: AuthedContext) {
  const key = c.get("key");

  return withEdgeCache(c, { route: "/sdk/experiments", projectId: key.project_id }, async () => {
    const exps = await getExperiments(c.env, key.project_id);
    const etag = `"${exps.version}"`;

    return new Response(JSON.stringify(exps), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=31536000, immutable",
        ETag: etag,
        "Timing-Allow-Origin": "*",
      },
    });
  });
}
