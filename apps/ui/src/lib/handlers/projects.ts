import { and, eq, gte, count } from "drizzle-orm";
import {
  ApiError,
  findProjectById,
  updateProject as updateProjectRow,
  getDb,
} from "@shipeasy/core";
import {
  gates,
  configs,
  experiments,
  universes,
  metrics,
  events,
  auditLog,
} from "@shipeasy/core/db/schema";
import { projectUpdateSchema, projectPlanUpdateSchema } from "@shipeasy/core/schemas/keys";
import { getEnv, getEnvAsync } from "../env";
import { writeAudit } from "../audit";
import { rebuildFlags, rebuildExperiments } from "@shipeasy/core";
import type { AdminIdentity } from "../admin-auth";

export async function getProject(identity: AdminIdentity, id: string) {
  if (id !== identity.projectId) throw new ApiError("Forbidden", 403);
  const env = getEnv();
  const project = await findProjectById(env.DB, id);
  if (!project) throw new ApiError("Project not found", 404);
  return project;
}

export async function updateProject(identity: AdminIdentity, id: string, input: unknown) {
  if (id !== identity.projectId) throw new ApiError("Forbidden", 403);
  const parsed = projectUpdateSchema.parse(input);
  const env = await getEnvAsync();

  const patch: Record<string, unknown> = { updatedAt: new Date().toISOString() };
  if (parsed.name !== undefined) patch.name = parsed.name;
  if (parsed.domain !== undefined) patch.domain = parsed.domain;

  await updateProjectRow(env.DB, id, patch);
  await writeAudit(identity, "project.update", "project", id, parsed);
  return getProject(identity, id);
}

export async function updateProjectPlan(identity: AdminIdentity, id: string, input: unknown) {
  if (id !== identity.projectId) throw new ApiError("Forbidden", 403);
  const parsed = projectPlanUpdateSchema.parse(input);
  const env = await getEnvAsync();

  await updateProjectRow(env.DB, id, {
    plan: parsed.plan,
    updatedAt: new Date().toISOString(),
  });
  await rebuildFlags(env, id, parsed.plan);
  await rebuildExperiments(env, id);
  await writeAudit(identity, "project.plan", "project", id, parsed);
  return getProject(identity, id);
}

export async function getStorage(identity: AdminIdentity, id: string) {
  if (id !== identity.projectId) throw new ApiError("Forbidden", 403);
  const env = getEnv();
  const db = getDb(env.DB);

  const [gateCount, configCount, experimentCount, universeCount, metricCount, eventCount] =
    await Promise.all([
      db.select({ n: count() }).from(gates).where(eq(gates.projectId, id)),
      db.select({ n: count() }).from(configs).where(eq(configs.projectId, id)),
      db.select({ n: count() }).from(experiments).where(eq(experiments.projectId, id)),
      db.select({ n: count() }).from(universes).where(eq(universes.projectId, id)),
      db.select({ n: count() }).from(metrics).where(eq(metrics.projectId, id)),
      db.select({ n: count() }).from(events).where(eq(events.projectId, id)),
    ]);

  const since = new Date(Date.now() - 24 * 3600_000).toISOString();
  const recentAudit = await db
    .select({ n: count() })
    .from(auditLog)
    .where(and(eq(auditLog.projectId, id), gte(auditLog.createdAt, since)));

  return {
    projectId: id,
    counts: {
      gates: gateCount[0]?.n ?? 0,
      configs: configCount[0]?.n ?? 0,
      experiments: experimentCount[0]?.n ?? 0,
      universes: universeCount[0]?.n ?? 0,
      metrics: metricCount[0]?.n ?? 0,
      events: eventCount[0]?.n ?? 0,
      audit_last_24h: recentAudit[0]?.n ?? 0,
    },
  };
}
