// ANALYSIS_QUEUE consumer — per-project experiment analysis.
// For each running (or, on trigger, stopped) experiment: pull AE exposures + metric events,
// run Welch's t-test per attached metric, write results to experiment_results, detect SRM, etc.
// See experiment-platform/06-analysis.md.

import { getDb, getPlan } from "@shipeasy/core";
import {
  analysisFailures,
  experimentMetrics,
  experimentResults,
  experiments as experimentsTable,
  metrics as metricsTable,
  projects as projectsTable,
  userMetricBaseline,
} from "@shipeasy/core/db/schema";
import { and, eq, inArray } from "drizzle-orm";
import { queryAE, sqlString } from "../lib/ae";
import {
  confidenceInterval,
  cupedAdjust,
  meanVariance,
  msprt,
  srmPValue,
  welchTTest,
  winsorize,
  type GroupSample,
} from "../lib/stats";
import type { AnalysisMessage, WorkerEnv } from "../env";

export async function consumeAnalysis(
  batch: MessageBatch<AnalysisMessage>,
  env: WorkerEnv,
): Promise<void> {
  for (const m of batch.messages) {
    try {
      await analyzeProject(m.body, env);
      m.ack();
    } catch (err) {
      console.error(
        JSON.stringify({
          event: "analysis_failed",
          project_id: m.body.project_id,
          trigger: m.body.trigger,
          error: String(err),
        }),
      );
      try {
        const db = getDb(env.DB);
        await db
          .insert(analysisFailures)
          .values({
            projectId: m.body.project_id,
            failedAt: new Date().toISOString(),
            retryCount: 1,
            messageBody: JSON.stringify(m.body),
            resolvedAt: null,
          })
          .onConflictDoUpdate({
            target: analysisFailures.projectId,
            set: {
              failedAt: new Date().toISOString(),
              messageBody: JSON.stringify(m.body),
              resolvedAt: null,
            },
          });
      } catch {
        /* swallow — failure already logged */
      }
      m.retry();
    }
  }
}

async function analyzeProject(msg: AnalysisMessage, env: WorkerEnv): Promise<void> {
  const db = getDb(env.DB);

  const [project] = await db
    .select({ id: projectsTable.id, plan: projectsTable.plan })
    .from(projectsTable)
    .where(eq(projectsTable.id, msg.project_id))
    .limit(1);
  if (!project) return;
  const plan = getPlan(project.plan);

  let rows: Array<typeof experimentsTable.$inferSelect>;
  if (msg.trigger === "experiment_stopped" && msg.experiment) {
    rows = await db
      .select()
      .from(experimentsTable)
      .where(
        and(
          eq(experimentsTable.projectId, msg.project_id),
          eq(experimentsTable.name, msg.experiment),
          inArray(experimentsTable.status, ["stopped", "running"]),
        ),
      );
  } else if (msg.trigger === "reanalyze") {
    rows = await db
      .select()
      .from(experimentsTable)
      .where(
        and(
          eq(experimentsTable.projectId, msg.project_id),
          inArray(experimentsTable.status, ["running", "stopped"]),
        ),
      );
  } else {
    rows = await db
      .select()
      .from(experimentsTable)
      .where(
        and(eq(experimentsTable.projectId, msg.project_id), eq(experimentsTable.status, "running")),
      );
  }

  for (const exp of rows) {
    const isFinal =
      msg.trigger === "experiment_stopped" ||
      (msg.trigger === "reanalyze" && exp.status === "stopped") ||
      exp.status === "stopped";
    try {
      await analyzeExperiment(exp, msg.project_id, env, isFinal, plan.cuped_enabled);
    } catch (err) {
      console.error(
        JSON.stringify({
          event: "experiment_analysis_failed",
          project_id: msg.project_id,
          experiment: exp.name,
          error: String(err),
        }),
      );
    }
  }

  await db
    .update(analysisFailures)
    .set({ resolvedAt: new Date().toISOString() })
    .where(eq(analysisFailures.projectId, msg.project_id));
}

async function analyzeExperiment(
  exp: typeof experimentsTable.$inferSelect,
  projectId: string,
  env: WorkerEnv,
  isFinal: boolean,
  cupedEnabled: boolean,
): Promise<void> {
  if (!exp.startedAt) return; // never started; nothing to analyze

  const db = getDb(env.DB);

  // Load attached metrics.
  const attached = await db
    .select({
      name: metricsTable.name,
      eventName: metricsTable.eventName,
      aggregation: metricsTable.aggregation,
      winsorizePct: metricsTable.winsorizePct,
    })
    .from(experimentMetrics)
    .innerJoin(metricsTable, eq(experimentMetrics.metricId, metricsTable.id))
    .where(eq(experimentMetrics.experimentId, exp.id));

  if (attached.length === 0) return;

  // Exposures: user → group (first-exposure wins).
  const exposureSql = `
    SELECT blob2 AS user_id, blob1 AS grp, MIN(double1) AS first_ts
    FROM EXPOSURES
    WHERE index1 = ${sqlString(projectId)}
      AND index2 = ${sqlString(exp.name)}
      AND index3 = 'exposure'
    GROUP BY blob2, blob1
  `;
  const exposures = await queryAE<{ user_id: string; grp: string; first_ts: number }>(
    exposureSql,
    env,
  );
  if (!exposures.length) return;

  // First exposure per user (collapse duplicate group rows).
  const userGroup = new Map<string, { group: string; firstTs: number }>();
  for (const row of exposures) {
    const prev = userGroup.get(row.user_id);
    if (!prev || row.first_ts < prev.firstTs) {
      userGroup.set(row.user_id, { group: row.grp, firstTs: row.first_ts });
    }
  }

  const groupCounts = new Map<string, number>();
  for (const { group } of userGroup.values()) {
    groupCounts.set(group, (groupCounts.get(group) ?? 0) + 1);
  }

  // Analysis window: from first exposure to now (or stoppedAt if final).
  const windowStart = new Date(exp.startedAt).getTime();
  const windowEnd = exp.stoppedAt ? new Date(exp.stoppedAt).getTime() : Date.now();
  const ds = new Date().toISOString().slice(0, 10);

  // Expected counts per group from weights (SRM baseline).
  const totalUsers = userGroup.size;
  const groupNames = exp.groups.map((g) => g.name);
  const observed = groupNames.map((name) => groupCounts.get(name) ?? 0);
  const expected = exp.groups.map((g) => totalUsers * (g.weight / 10000));
  const srmP = srmPValue(observed, expected);
  const srmDetected = srmP < 0.001 ? 1 : 0;

  for (const metric of attached) {
    const metricSql = `
      SELECT blob1 AS user_id, SUM(double1) AS total_value, COUNT(*) AS event_count
      FROM METRIC_EVENTS
      WHERE index1 = ${sqlString(projectId)}
        AND index2 = ${sqlString(metric.eventName)}
        AND index3 = 'metric'
        AND double2 >= ${windowStart}
        AND double2 <  ${windowEnd}
      GROUP BY blob1
    `;
    const metricRows = await queryAE<{
      user_id: string;
      total_value: number;
      event_count: number;
    }>(metricSql, env);

    const userMetric = new Map<string, number>();
    for (const r of metricRows) {
      switch (metric.aggregation) {
        case "count_events":
          userMetric.set(r.user_id, Number(r.event_count));
          break;
        case "sum":
        case "avg":
          userMetric.set(r.user_id, Number(r.total_value));
          break;
        case "count_users":
        case "retention_Nd":
        default:
          userMetric.set(r.user_id, 1);
          break;
      }
    }

    // Build per-group value arrays (exposed users only; missing metric → 0 for count-like).
    const groupValues = new Map<string, number[]>();
    for (const name of groupNames) groupValues.set(name, []);
    for (const [userId, { group }] of userGroup.entries()) {
      const v = userMetric.get(userId) ?? 0;
      groupValues.get(group)?.push(v);
    }

    // Winsorize per group.
    const winsorized = new Map<string, number[]>();
    for (const [group, values] of groupValues.entries()) {
      winsorized.set(group, winsorize(values, metric.winsorizePct));
    }

    // Optional CUPED adjustment using frozen baselines.
    let finalValues = winsorized;
    if (cupedEnabled && exp.cupedFrozenAt) {
      const baselineRows = await db
        .select({ userId: userMetricBaseline.userId, avgValue: userMetricBaseline.avgValue })
        .from(userMetricBaseline)
        .where(
          and(
            eq(userMetricBaseline.projectId, projectId),
            eq(userMetricBaseline.metricName, metric.name),
          ),
        );
      const baseline = new Map(baselineRows.map((b) => [b.userId, b.avgValue]));
      const adjusted = new Map<string, number[]>();
      for (const [group, values] of winsorized.entries()) {
        const users = [...userGroup.entries()].filter(([, g]) => g.group === group).map(([u]) => u);
        const pairs: Array<{ y: number; x: number }> = [];
        for (let i = 0; i < users.length; i++) {
          pairs.push({ y: values[i], x: baseline.get(users[i]) ?? 0 });
        }
        adjusted.set(group, cupedAdjust(pairs).adjusted);
      }
      finalValues = adjusted;
    }

    // Compute per-group sample stats.
    const stats = new Map<string, GroupSample>();
    for (const [group, values] of finalValues.entries()) {
      const mv = meanVariance(values);
      stats.set(group, { n: values.length, mean: mv.mean, variance: mv.variance });
    }

    const controlName = groupNames[0];
    const control = stats.get(controlName)!;

    // Write one row per group (control gets self-compared).
    const nowFinal = isFinal ? 1 : 0;
    for (const group of groupNames) {
      const g = stats.get(group)!;
      let delta = 0;
      let deltaPct: number | null = null;
      let ci95 = { low: 0, high: 0 };
      let ci99 = { low: 0, high: 0 };
      let pValue: number | null = null;
      let msprtLambda: number | null = null;
      let msprtSig: number | null = null;

      if (group !== controlName) {
        delta = g.mean - control.mean;
        deltaPct = control.mean === 0 ? null : (delta / Math.abs(control.mean)) * 100;
        ci95 = confidenceInterval(control, g, 0.95);
        ci99 = confidenceInterval(control, g, 0.99);
        const tt = welchTTest(control, g);
        pValue = Number.isFinite(tt.pValue) ? tt.pValue : null;
        if (exp.sequentialTesting) {
          const m = msprt(control, g);
          msprtLambda = Number.isFinite(m.lambda) ? m.lambda : null;
          msprtSig = m.significant;
        }
      }

      const expectedN = Math.round(
        (totalUsers * (exp.groups.find((x) => x.name === group)?.weight ?? 0)) / 10000,
      );
      await db
        .insert(experimentResults)
        .values({
          projectId,
          experiment: exp.name,
          metric: metric.name,
          groupName: group,
          ds,
          n: g.n,
          mean: g.mean,
          variance: g.variance,
          delta,
          deltaPct: deltaPct ?? null,
          ci95Low: ci95.low,
          ci95High: ci95.high,
          ci99Low: ci99.low,
          ci99High: ci99.high,
          pValue,
          expectedN,
          srmPValue: srmP,
          srmDetected,
          msprtLambda,
          msprtSignificant: msprtSig,
          isFinal: nowFinal,
          peekWarning:
            !exp.sequentialTesting && !isFinal && pValue !== null && pValue < 0.05 ? 1 : 0,
        })
        .onConflictDoUpdate({
          target: [
            experimentResults.projectId,
            experimentResults.experiment,
            experimentResults.metric,
            experimentResults.groupName,
            experimentResults.ds,
          ],
          set: {
            n: g.n,
            mean: g.mean,
            variance: g.variance,
            delta,
            deltaPct: deltaPct ?? null,
            ci95Low: ci95.low,
            ci95High: ci95.high,
            ci99Low: ci99.low,
            ci99High: ci99.high,
            pValue,
            expectedN,
            srmPValue: srmP,
            srmDetected,
            msprtLambda,
            msprtSignificant: msprtSig,
            isFinal: nowFinal,
          },
        });
    }
  }
}
