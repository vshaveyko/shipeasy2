import { and, eq } from "drizzle-orm";
import { checkLimit, rebuildExperiments, ApiError, getPlan, getDb } from "@shipeasy/core";
import {
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
} from "@shipeasy/core/schemas/experiments";
import { scopedDb, scopedDbSA } from "../db";
import { getEnv, getEnvAsync } from "../env";
import { loadProject } from "../project";
import { writeAudit } from "../audit";
import type { AdminIdentity } from "../admin-auth";

const IMMUTABLE_WHILE_RUNNING = ["allocation_pct", "groups", "salt", "universe", "params"] as const;

export async function listExperiments(identity: AdminIdentity) {
  return scopedDb(identity.projectId).select(experiments);
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

export async function createExperiment(identity: AdminIdentity, input: unknown) {
  const parsed = experimentCreateSchema.parse(input);
  const project = await loadProject(identity.projectId);
  const plan = getPlan(project.plan);
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
  const plan = getPlan(project.plan);
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

  await s.delete(experiments).where(eq(experiments.id, id));
  await rebuildExperiments(env, identity.projectId);
  await writeAudit(identity, "experiment.delete", "experiment", id);
  return { ok: true };
}
