// Archival cron (04:00 UTC) — export yesterday's AE rows to R2 for long-term storage.
// Gated on plan.data_export (enterprise only); logs and skips otherwise.

import { getDb, getPlan } from "@shipeasy/core";
import { projects } from "@shipeasy/core/db/schema";
import { queryAE, sqlString } from "../lib/ae";
import type { WorkerEnv } from "../env";

export async function runArchival(env: WorkerEnv): Promise<void> {
  if (!env.EVENTS_R2) {
    console.warn(JSON.stringify({ event: "archival_skipped", reason: "EVENTS_R2 not bound" }));
    return;
  }
  const db = getDb(env.DB);
  const allProjects = await db.select({ id: projects.id, plan: projects.plan }).from(projects);

  const yesterday = new Date(Date.now() - 86_400_000);
  const ds = yesterday.toISOString().slice(0, 10);
  const startMs = Date.parse(`${ds}T00:00:00Z`);
  const endMs = startMs + 86_400_000;

  for (const proj of allProjects) {
    const plan = getPlan(proj.plan);
    if (!plan.data_export) continue;

    const exposureSql = `
      SELECT blob1 AS grp, blob2 AS user_id, blob3 AS anonymous_id,
             double1 AS ts, index2 AS experiment
      FROM EXPOSURES
      WHERE index1 = ${sqlString(proj.id)}
        AND index3 = 'exposure'
        AND double1 >= ${startMs}
        AND double1 <  ${endMs}
    `;
    const metricSql = `
      SELECT blob1 AS user_id, blob2 AS anonymous_id,
             double1 AS value, double2 AS ts, index2 AS event_name
      FROM METRIC_EVENTS
      WHERE index1 = ${sqlString(proj.id)}
        AND index3 = 'metric'
        AND double2 >= ${startMs}
        AND double2 <  ${endMs}
    `;

    try {
      const [exposures, metrics] = await Promise.all([
        queryAE(exposureSql, env),
        queryAE(metricSql, env),
      ]);

      await env.EVENTS_R2.put(
        `${proj.id}/${ds}/exposures.jsonl`,
        exposures.map((r) => JSON.stringify(r)).join("\n"),
      );
      await env.EVENTS_R2.put(
        `${proj.id}/${ds}/metrics.jsonl`,
        metrics.map((r) => JSON.stringify(r)).join("\n"),
      );

      console.log(
        JSON.stringify({
          event: "archival_exported",
          project_id: proj.id,
          ds,
          exposures: exposures.length,
          metrics: metrics.length,
        }),
      );
    } catch (err) {
      console.error(
        JSON.stringify({
          event: "archival_failed",
          project_id: proj.id,
          ds,
          error: String(err),
        }),
      );
    }
  }
}
