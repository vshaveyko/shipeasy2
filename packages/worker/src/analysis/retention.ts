// Retention cron (03:00 UTC) — purge stale daily results, orphaned CUPED baselines,
// and expired CLI auth sessions. See experiment-platform/06-analysis.md.

import { getDb, getPlan } from "@shipeasy/core";
import {
  cliAuthSessions,
  experimentResults,
  experiments,
  projects,
  userMetricBaseline,
} from "@shipeasy/core/db/schema";
import { and, eq, inArray, lt, notInArray } from "drizzle-orm";
import type { WorkerEnv } from "../env";

export async function runRetentionPurge(env: WorkerEnv): Promise<void> {
  const db = getDb(env.DB);

  const allProjects = await db.select({ id: projects.id, plan: projects.plan }).from(projects);

  for (const proj of allProjects) {
    const plan = getPlan(proj.plan);
    const cutoff = new Date(Date.now() - plan.results_retention_days * 86_400_000)
      .toISOString()
      .slice(0, 10);

    await db
      .delete(experimentResults)
      .where(
        and(
          eq(experimentResults.projectId, proj.id),
          lt(experimentResults.ds, cutoff),
          eq(experimentResults.isFinal, 0),
        ),
      );
  }

  // CUPED baselines: drop rows for projects with no running experiments.
  const runningProjectIds = await db
    .selectDistinct({ projectId: experiments.projectId })
    .from(experiments)
    .where(eq(experiments.status, "running"));
  const ids = runningProjectIds.map((r) => r.projectId);
  if (ids.length > 0) {
    await db.delete(userMetricBaseline).where(notInArray(userMetricBaseline.projectId, ids));
  } else {
    // No running experiments anywhere — nothing needs baselines.
    await db.delete(userMetricBaseline);
  }

  // Expired CLI auth sessions.
  const sessionCutoff = new Date(Date.now() - 7 * 86_400_000).toISOString();
  await db
    .delete(cliAuthSessions)
    .where(
      and(
        lt(cliAuthSessions.expiresAt, sessionCutoff),
        inArray(cliAuthSessions.status, ["expired", "complete"]),
      ),
    );

  console.log(
    JSON.stringify({
      event: "retention_purge_completed",
      projects: allProjects.length,
      ts: new Date().toISOString(),
    }),
  );
}
