// Cron handlers. Dispatched from src/index.ts based on cron expression.
// See experiment-platform/06-analysis.md.

import { getDb, upsertSystemHealth } from "@shipeasy/core";
import { experiments, projects } from "@shipeasy/core/db/schema";
import { eq } from "drizzle-orm";
import type { AnalysisMessage, WorkerEnv } from "../env";

export async function runAnalysisCron(env: WorkerEnv): Promise<void> {
  const db = getDb(env.DB);
  const rows = await db
    .selectDistinct({ id: projects.id })
    .from(projects)
    .innerJoin(experiments, eq(experiments.projectId, projects.id))
    .where(eq(experiments.status, "running"));

  if (!env.ANALYSIS_QUEUE) {
    console.warn(
      JSON.stringify({
        event: "analysis_cron_skipped",
        reason: "ANALYSIS_QUEUE not bound",
        projects: rows.length,
      }),
    );
  } else if (rows.length > 0) {
    const messages = rows.map<{ body: AnalysisMessage }>((r) => ({
      body: { project_id: r.id, trigger: "daily" },
    }));
    // sendBatch handles 100 at a time — chunk if larger.
    for (let i = 0; i < messages.length; i += 100) {
      await env.ANALYSIS_QUEUE.sendBatch(messages.slice(i, i + 100));
    }
  }

  await upsertSystemHealth(env.DB, "analysis_cron", {
    lastFiredAt: new Date().toISOString(),
    projectsEnqueued: rows.length,
  });

  if (env.CRONITOR_HEARTBEAT_URL) {
    await fetch(env.CRONITOR_HEARTBEAT_URL).catch(() => {});
  }

  console.log(
    JSON.stringify({
      event: "analysis_cron_completed",
      projects_enqueued: rows.length,
      ts: new Date().toISOString(),
    }),
  );
}
