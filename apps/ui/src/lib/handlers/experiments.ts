import { and, desc, eq, ne, sql } from "drizzle-orm";
import {
  checkLimit,
  rebuildExperiments,
  ApiError,
  getEffectivePlan,
  buildUsageUpdates,
  getDb,
} from "@shipeasy/core";
import {
  events,
  experiments,
  experimentMetrics,
  experimentResults,
  universes,
  metrics,
} from "@shipeasy/core/db/schema";
import {
  experimentCreateSchema,
  experimentUpdateSchema,
  experimentMetricsUpdateSchema,
  type ExperimentInlineMetric,
} from "@shipeasy/core/schemas/experiments";
import { legacyAggFromIr, legacyValuePathFromIr } from "@shipeasy/core/schemas/metrics";
import { parse as parseDsl, ParseError as DslParseError } from "@shipeasy/query-dsl";
import type { Page, PageQuery } from "@shipeasy/core/pagination";
import { scopedDb, scopedDbSA } from "../db";
import { getEnv, getEnvAsync } from "../env";
import { loadProject } from "../project";
import { writeAudit } from "../audit";
import { syncUsage } from "../billing";
import type { AdminIdentity } from "../admin-auth";
import { keysetWhere, sliceWithCursor } from "./_pagination";

const IMMUTABLE_WHILE_RUNNING = ["allocation_pct", "groups", "salt", "universe", "params"] as const;

type BareExperimentRow = Awaited<ReturnType<ReturnType<typeof scopedDb>["select"]>>[number];
export type ExperimentRow = BareExperimentRow & {
  goalMetric: { id: string; name: string } | null;
  guardrailCount: number;
  guardrails: { id: string; name: string }[];
  primaryLiftPct: number | null;
  significancePct: number | null;
  sampleSize: number | null;
  trendPct: number[];
};

export async function listExperiments(
  identity: AdminIdentity,
  opts: PageQuery,
): Promise<Page<ExperimentRow>> {
  const s = scopedDb(identity.projectId);
  const ks = keysetWhere(experiments.updatedAt, experiments.id, opts.cursor);
  // scopedDb already filters deletedAt IS NULL; also drop archived from default lists.
  const notArchived = ne(experiments.status, "archived");
  const where = ks ? and(notArchived, ks)! : notArchived;
  const rows = (await s
    .selectWhere(experiments, where)
    .orderBy(desc(experiments.updatedAt), desc(experiments.id))
    .limit(opts.limit + 1)) as BareExperimentRow[];

  // Enrich each row with its goal metric and guardrail count via a single
  // grouped query — avoids N+1 round-trips against D1.
  const enriched: ExperimentRow[] = rows.map((r) => ({
    ...r,
    goalMetric: null,
    guardrailCount: 0,
    guardrails: [],
    primaryLiftPct: null,
    significancePct: null,
    sampleSize: null,
    trendPct: [],
  }));
  if (enriched.length === 0) return sliceWithCursor(enriched, opts.limit);

  const ids = enriched.map((e) => e.id);
  const idList = sql.join(
    ids.map((i) => sql`${i}`),
    sql`, `,
  );
  const joined = await s.raw
    .select({
      experimentId: experimentMetrics.experimentId,
      metricId: experimentMetrics.metricId,
      role: experimentMetrics.role,
      name: metrics.name,
    })
    .from(experimentMetrics)
    .leftJoin(metrics, eq(experimentMetrics.metricId, metrics.id))
    .where(sql`${experimentMetrics.experimentId} IN (${idList})`);
  const byId = new Map<string, ExperimentRow>();
  for (const e of enriched) byId.set(e.id, e);
  for (const m of joined) {
    const exp = byId.get(m.experimentId);
    if (!exp) continue;
    if (m.role === "goal" && m.name) {
      exp.goalMetric = { id: m.metricId, name: m.name };
    } else if (m.role === "guardrail") {
      exp.guardrailCount += 1;
      if (m.name) exp.guardrails.push({ id: m.metricId, name: m.name });
    }
  }

  // Treatment group per experiment: first non-control group (fallback first).
  const treatmentByExp = new Map<string, string | null>();
  for (const e of enriched) {
    const groups = Array.isArray(e.groups) ? (e.groups as { name: string }[]) : [];
    const treatment =
      groups.find((g) => g.name && g.name.toLowerCase() !== "control")?.name ??
      groups[0]?.name ??
      null;
    treatmentByExp.set(e.id, treatment);
  }

  // Single batched results query for all experiments × their goal metric. We
  // filter group-by group in JS because group_name varies per experiment.
  const goalMetricNames = enriched.map((e) => e.goalMetric?.name).filter((n): n is string => !!n);
  if (goalMetricNames.length > 0) {
    const metricList = sql.join(
      goalMetricNames.map((n) => sql`${n}`),
      sql`, `,
    );
    const resultRows = await s.raw
      .select({
        experiment: experimentResults.experiment,
        metric: experimentResults.metric,
        groupName: experimentResults.groupName,
        ds: experimentResults.ds,
        n: experimentResults.n,
        deltaPct: experimentResults.deltaPct,
        pValue: experimentResults.pValue,
      })
      .from(experimentResults)
      .where(
        and(
          eq(experimentResults.projectId, identity.projectId),
          sql`${experimentResults.experiment} IN (${idList})`,
          sql`${experimentResults.metric} IN (${metricList})`,
        )!,
      )
      .orderBy(desc(experimentResults.ds));
    // Group rows by experiment, keep only those for the goal metric + treatment group.
    const perExp = new Map<string, typeof resultRows>();
    for (const r of resultRows) {
      const exp = byId.get(r.experiment);
      if (!exp?.goalMetric || r.metric !== exp.goalMetric.name) continue;
      const treatment = treatmentByExp.get(r.experiment);
      if (!treatment || r.groupName !== treatment) continue;
      const arr = perExp.get(r.experiment) ?? [];
      arr.push(r);
      perExp.set(r.experiment, arr);
    }
    for (const [expId, sorted] of perExp.entries()) {
      const exp = byId.get(expId);
      if (!exp) continue;
      const latest = sorted[0];
      if (latest) {
        exp.primaryLiftPct =
          latest.deltaPct != null ? Math.round(latest.deltaPct * 1000) / 10 : null;
        exp.significancePct =
          latest.pValue != null ? Math.round((1 - latest.pValue) * 1000) / 10 : null;
        exp.sampleSize = latest.n ?? null;
      }
      // Trend: last 14 ds points (oldest → newest) of deltaPct.
      exp.trendPct = sorted
        .slice(0, 14)
        .reverse()
        .map((r) => (r.deltaPct != null ? r.deltaPct * 100 : 0));
    }
  }

  return sliceWithCursor(enriched, opts.limit);
}

export async function listAllExperiments(identity: AdminIdentity): Promise<ExperimentRow[]> {
  const out: ExperimentRow[] = [];
  let cursor: string | undefined;
  do {
    const page = await listExperiments(identity, { limit: 500, cursor });
    out.push(...page.data);
    cursor = page.next_cursor ?? undefined;
  } while (cursor);
  return out;
}

export interface ExperimentCounts {
  all: number;
  running: number;
  draft: number;
  stopped: number;
  archived: number;
}

/**
 * Aggregate per-status counts for the experiments list view. Single GROUP BY
 * round-trip — no row data ever leaves the worker. Archived rows are dropped
 * from the default list view but counted here so the "Archived" filter tab
 * still surfaces them.
 */
export async function experimentCounts(identity: AdminIdentity): Promise<ExperimentCounts> {
  const s = scopedDb(identity.projectId);
  const rows = await s.raw
    .select({
      status: experiments.status,
      n: sql<number>`count(*)`,
    })
    .from(experiments)
    .where(eq(experiments.projectId, identity.projectId))
    .groupBy(experiments.status);
  const out: ExperimentCounts = { all: 0, running: 0, draft: 0, stopped: 0, archived: 0 };
  for (const r of rows) {
    const n = Number(r.n);
    out.all += n;
    if (
      r.status === "running" ||
      r.status === "draft" ||
      r.status === "stopped" ||
      r.status === "archived"
    ) {
      out[r.status] = n;
    }
  }
  return out;
}

export async function getExperiment(identity: AdminIdentity, id: string) {
  const s = scopedDb(identity.projectId);
  const rows = await s.selectWhere(experiments, eq(experiments.id, id));
  if (rows.length === 0) throw new ApiError("Experiment not found", 404);
  return rows[0];
}

async function assertUniverseExists(projectId: string, name: string) {
  const s = await scopedDbSA(projectId);
  const rows = await s.selectWhere(universes, eq(universes.name, name));
  if (rows.length === 0) throw new ApiError(`Universe '${name}' not found`, 422);
}

// Parse + upsert a single inline metric (event auto-created if missing) and return its id.
// Idempotent: re-running with the same `name`/derived-name + query returns the existing id.
async function upsertInlineMetric(
  projectId: string,
  inline: ExperimentInlineMetric,
): Promise<string> {
  let ir;
  try {
    ir = parseDsl(inline.query);
  } catch (e) {
    if (e instanceof DslParseError) throw new ApiError(`Invalid metric query: ${e.message}`, 422);
    throw e;
  }
  const eventName = ir.metric;
  const metricName = inline.name ?? deriveMetricName(ir);

  const s = await scopedDbSA(projectId);

  // Upsert event with empty properties schema if missing. Existing events are left
  // alone — overwriting their properties would silently break other metrics.
  const existingEvent = await s.selectWhere(events, eq(events.name, eventName));
  if (existingEvent.length === 0) {
    try {
      await s.insert(events).values({
        id: crypto.randomUUID(),
        name: eventName,
        description: null,
        folder: null,
        properties: [],
        pending: 0,
        createdAt: new Date().toISOString(),
      });
    } catch (err) {
      if (!String(err).includes("UNIQUE")) throw err;
    }
  } else if (existingEvent[0].pending === 1) {
    throw new ApiError(`Event '${eventName}' is pending review`, 422);
  }

  // Upsert metric. Reuse the row on UNIQUE collision (same project + folder + name).
  const existingMetric = await s.selectWhere(metrics, eq(metrics.name, metricName));
  if (existingMetric.length > 0) {
    const row = existingMetric[0];
    await s
      .update(metrics)
      .set({
        eventName,
        queryIr: ir,
        aggregation: legacyAggFromIr(ir),
        valuePath: legacyValuePathFromIr(ir),
        updatedAt: new Date().toISOString(),
      })
      .where(eq(metrics.id, row.id));
    return row.id;
  }
  const id = crypto.randomUUID();
  await s.insert(metrics).values({
    id,
    name: metricName,
    folder: null,
    eventName,
    queryIr: ir,
    aggregation: legacyAggFromIr(ir),
    valuePath: legacyValuePathFromIr(ir),
    winsorizePct: 99,
    minDetectableEffect: null,
    updatedAt: new Date().toISOString(),
  });
  return id;
}

function deriveMetricName(ir: {
  agg: { kind: string; n?: number; p?: number };
  metric: string;
}): string {
  const aggLabel =
    ir.agg.kind === "quantile"
      ? `p${String(ir.agg.p ?? 99).replace("0.", "")}`
      : ir.agg.kind === "retention_Nd"
        ? `retention_${ir.agg.n ?? 7}d`
        : ir.agg.kind;
  return `${ir.metric}.${aggLabel}`.replace(/[^a-z0-9._-]/gi, "_").toLowerCase();
}

async function attachInlineMetrics(
  projectId: string,
  experimentId: string,
  goal: ExperimentInlineMetric | undefined,
  guardrails: ExperimentInlineMetric[] | undefined,
): Promise<void> {
  if (goal === undefined && guardrails === undefined) return;

  const env = await getEnvAsync();
  const db = getDb(env.DB);
  const attachments: { metric_id: string; role: "goal" | "guardrail" }[] = [];
  if (goal) {
    attachments.push({ metric_id: await upsertInlineMetric(projectId, goal), role: "goal" });
  }
  for (const g of guardrails ?? []) {
    attachments.push({ metric_id: await upsertInlineMetric(projectId, g), role: "guardrail" });
  }
  if (attachments.length === 0) return;

  // Replace prior goal/guardrail attachments wholesale; preserve secondary attachments.
  await db
    .delete(experimentMetrics)
    .where(
      and(
        eq(experimentMetrics.experimentId, experimentId),
        ne(experimentMetrics.role, "secondary"),
      ),
    );
  await db.insert(experimentMetrics).values(
    attachments.map((a) => ({
      id: crypto.randomUUID(),
      experimentId,
      metricId: a.metric_id,
      role: a.role,
      createdAt: Math.floor(Date.now() / 1000),
    })),
  );
}

export async function createExperiment(identity: AdminIdentity, input: unknown) {
  const parsed = experimentCreateSchema.parse(input);
  const project = await loadProject(identity.projectId);
  const plan = getEffectivePlan(project);
  const env = await getEnvAsync();

  if (
    parsed.groups.length > plan.max_groups_per_experiment &&
    plan.max_groups_per_experiment !== -1
  ) {
    throw new ApiError(
      `Plan '${plan.name}' allows up to ${plan.max_groups_per_experiment} groups per experiment`,
      429,
    );
  }
  if (parsed.sequential_testing && !plan.sequential_testing) {
    throw new ApiError("sequential_testing requires Premium plan or higher", 403);
  }
  if (parsed.significance_threshold !== 0.05 && !plan.custom_significance_threshold) {
    throw new ApiError("custom significance threshold requires Pro plan or higher", 403);
  }

  await assertUniverseExists(identity.projectId, parsed.universe);

  const id = crypto.randomUUID();
  const salt = parsed.salt ?? crypto.randomUUID().replace(/-/g, "");
  const now = new Date().toISOString();
  const s = await scopedDbSA(identity.projectId);

  try {
    await s.insert(experiments).values({
      id,
      name: parsed.name,
      description: parsed.description ?? null,
      folder: parsed.folder ?? null,
      universe: parsed.universe,
      targetingGate: parsed.targeting_gate ?? null,
      allocationPct: parsed.allocation_pct,
      salt,
      params: parsed.params,
      groups: parsed.groups,
      status: "draft",
      significanceThreshold: parsed.significance_threshold,
      minRuntimeDays: parsed.min_runtime_days,
      minSampleSize: parsed.min_sample_size,
      sequentialTesting: parsed.sequential_testing,
      hashVersion: 1,
      updatedAt: now,
    });
  } catch (err) {
    if (String(err).includes("UNIQUE"))
      throw new ApiError(`Experiment '${parsed.name}' exists`, 409);
    throw err;
  }

  await attachInlineMetrics(identity.projectId, id, parsed.goal_metric, parsed.guardrail_metrics);

  await rebuildExperiments(env, identity.projectId);
  await writeAudit(identity, "experiment.create", "experiment", id, parsed);
  return { id, name: parsed.name };
}

export async function updateExperiment(identity: AdminIdentity, id: string, input: unknown) {
  const parsed = experimentUpdateSchema.parse(input);
  const env = await getEnvAsync();
  const s = await scopedDbSA(identity.projectId);

  const rows = await s.selectWhere(experiments, eq(experiments.id, id));
  if (rows.length === 0) throw new ApiError("Experiment not found", 404);
  const current = rows[0];

  if (current.status === "running") {
    const attempted = IMMUTABLE_WHILE_RUNNING.filter(
      (f) => (parsed as Record<string, unknown>)[f] !== undefined,
    );
    if (attempted.length > 0) {
      throw new ApiError(
        `Cannot modify [${attempted.join(", ")}] on a running experiment. Stop first.`,
        409,
      );
    }
  }

  const patch: Record<string, unknown> = { updatedAt: new Date().toISOString() };
  if (parsed.name !== undefined) patch.name = parsed.name;
  if (parsed.description !== undefined) patch.description = parsed.description;
  if (parsed.folder !== undefined) patch.folder = parsed.folder;
  if (parsed.targeting_gate !== undefined) patch.targetingGate = parsed.targeting_gate;
  if (parsed.allocation_pct !== undefined) patch.allocationPct = parsed.allocation_pct;
  if (parsed.salt !== undefined) patch.salt = parsed.salt;
  if (parsed.universe !== undefined) {
    await assertUniverseExists(identity.projectId, parsed.universe);
    patch.universe = parsed.universe;
  }
  if (parsed.params !== undefined) patch.params = parsed.params;
  if (parsed.groups !== undefined) patch.groups = parsed.groups;
  if (parsed.significance_threshold !== undefined)
    patch.significanceThreshold = parsed.significance_threshold;
  if (parsed.min_runtime_days !== undefined) patch.minRuntimeDays = parsed.min_runtime_days;
  if (parsed.min_sample_size !== undefined) patch.minSampleSize = parsed.min_sample_size;
  if (parsed.sequential_testing !== undefined) patch.sequentialTesting = parsed.sequential_testing;

  await s.update(experiments).set(patch).where(eq(experiments.id, id));
  await attachInlineMetrics(identity.projectId, id, parsed.goal_metric, parsed.guardrail_metrics);
  await rebuildExperiments(env, identity.projectId);
  await writeAudit(identity, "experiment.update", "experiment", id, parsed);
  return { id };
}

export async function setExperimentStatus(
  identity: AdminIdentity,
  id: string,
  status: "draft" | "running" | "stopped" | "archived",
) {
  const project = await loadProject(identity.projectId);
  const plan = getEffectivePlan(project);
  const env = await getEnvAsync();
  const s = await scopedDbSA(identity.projectId);

  const rows = await s.selectWhere(experiments, eq(experiments.id, id));
  if (rows.length === 0) throw new ApiError("Experiment not found", 404);
  const current = rows[0];

  const patch: Record<string, unknown> = {
    status,
    updatedAt: new Date().toISOString(),
  };

  if (status === "running") {
    if (current.status === "running") return { id, status };
    if (current.status === "archived")
      throw new ApiError("Cannot restart archived experiment", 409);
    await checkLimit(env.DB, identity.projectId, "experiments_running", plan);
    patch.startedAt = new Date().toISOString();
    if (plan.cuped_enabled) {
      patch.cupedFrozenAt = new Date().toISOString();
    }
  } else if (status === "stopped") {
    if (current.status !== "running")
      throw new ApiError("Only running experiments can be stopped", 409);
    patch.stoppedAt = new Date().toISOString();
  } else if (status === "archived") {
    if (current.status === "running") throw new ApiError("Stop before archiving", 409);
  }

  await s.update(experiments).set(patch).where(eq(experiments.id, id));
  await rebuildExperiments(env, identity.projectId);
  if (status === "running" || status === "stopped") {
    await syncUsage(env, identity.projectId);
  }
  await writeAudit(identity, `experiment.${status}`, "experiment", id);
  return { id, status };
}

export async function updateExperimentMetrics(identity: AdminIdentity, id: string, input: unknown) {
  const parsed = experimentMetricsUpdateSchema.parse(input);
  const env = await getEnvAsync();
  const s = await scopedDbSA(identity.projectId);
  const rows = await s.selectWhere(experiments, eq(experiments.id, id));
  if (rows.length === 0) throw new ApiError("Experiment not found", 404);

  const db = getDb(env.DB);
  const existingMetrics = await db
    .select({ id: metrics.id })
    .from(metrics)
    .where(eq(metrics.projectId, identity.projectId));
  const validIds = new Set(existingMetrics.map((m) => m.id));
  const unknown = parsed.metrics.filter((m) => !validIds.has(m.metric_id));
  if (unknown.length > 0) {
    throw new ApiError(`Unknown metric ids: ${unknown.map((u) => u.metric_id).join(",")}`, 422);
  }

  await db.delete(experimentMetrics).where(eq(experimentMetrics.experimentId, id));
  if (parsed.metrics.length > 0) {
    await db.insert(experimentMetrics).values(
      parsed.metrics.map((m) => ({
        id: crypto.randomUUID(),
        experimentId: id,
        metricId: m.metric_id,
        role: m.role,
        createdAt: Math.floor(Date.now() / 1000),
      })),
    );
  }

  await writeAudit(identity, "experiment.metrics.set", "experiment", id, parsed);
  return { id, metrics: parsed.metrics };
}

export async function listExperimentResults(identity: AdminIdentity, id: string) {
  const s = scopedDb(identity.projectId);
  const rows = await s.selectWhere(experiments, eq(experiments.id, id));
  if (rows.length === 0) throw new ApiError("Experiment not found", 404);
  const exp = rows[0];

  const env = getEnv();
  const db = getDb(env.DB);
  const results = await db
    .select()
    .from(experimentResults)
    .where(
      and(
        eq(experimentResults.projectId, identity.projectId),
        eq(experimentResults.experiment, exp.name),
      ),
    );
  return { experiment: { id: exp.id, name: exp.name, status: exp.status }, results };
}

export async function listExperimentTimeseries(
  identity: AdminIdentity,
  id: string,
  metric?: string,
) {
  const result = await listExperimentResults(identity, id);
  const filtered = metric ? result.results.filter((r) => r.metric === metric) : result.results;
  return { experiment: result.experiment, series: filtered };
}

export async function reanalyzeExperiment(identity: AdminIdentity, id: string) {
  const s = scopedDb(identity.projectId);
  const rows = await s.selectWhere(experiments, eq(experiments.id, id));
  if (rows.length === 0) throw new ApiError("Experiment not found", 404);
  await writeAudit(identity, "experiment.reanalyze", "experiment", id);
  return { id, queued: true };
}

export async function deleteExperiment(identity: AdminIdentity, id: string) {
  const env = await getEnvAsync();
  const s = await scopedDbSA(identity.projectId);
  const rows = await s.selectWhere(experiments, eq(experiments.id, id));
  if (rows.length === 0) throw new ApiError("Experiment not found", 404);
  if (rows[0].status === "running") throw new ApiError("Stop the experiment before deleting", 409);

  await s
    .update(experiments)
    .set({ status: "archived", updatedAt: new Date().toISOString() })
    .where(eq(experiments.id, id));
  await rebuildExperiments(env, identity.projectId);
  await writeAudit(identity, "experiment.delete", "experiment", id);
  return { ok: true };
}
