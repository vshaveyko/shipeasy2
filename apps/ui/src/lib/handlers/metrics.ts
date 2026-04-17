import { eq } from "drizzle-orm";
import { checkLimit, ApiError, getPlan } from "@shipeasy/core";
import { metrics, events } from "@shipeasy/core/db/schema";
import { metricCreateSchema, metricUpdateSchema } from "@shipeasy/core/schemas/metrics";
import { scopedDb, scopedDbSA } from "../db";
import { getEnv, getEnvAsync } from "../env";
import { loadProject } from "../project";
import { writeAudit } from "../audit";
import type { AdminIdentity } from "../admin-auth";

async function assertEventExists(projectId: string, name: string) {
  const s = await scopedDbSA(projectId);
  const rows = await s.selectWhere(events, eq(events.name, name));
  if (rows.length === 0) throw new ApiError(`Event '${name}' not registered`, 422);
  if (rows[0].pending === 1) throw new ApiError(`Event '${name}' is pending review`, 422);
}

export async function listMetrics(identity: AdminIdentity) {
  return scopedDb(identity.projectId).select(metrics);
}

export async function getMetric(identity: AdminIdentity, id: string) {
  const s = scopedDb(identity.projectId);
  const rows = await s.selectWhere(metrics, eq(metrics.id, id));
  if (rows.length === 0) throw new ApiError("Metric not found", 404);
  return rows[0];
}

export async function createMetric(identity: AdminIdentity, input: unknown) {
  const parsed = metricCreateSchema.parse(input);
  const project = await loadProject(identity.projectId);
  const plan = getPlan(project.plan);
  const env = await getEnvAsync();

  await assertEventExists(identity.projectId, parsed.event_name);
  await checkLimit(env.DB, identity.projectId, "metrics", plan);

  const id = crypto.randomUUID();
  const s = await scopedDbSA(identity.projectId);
  try {
    await s.insert(metrics).values({
      id,
      name: parsed.name,
      eventName: parsed.event_name,
      valuePath: parsed.value_path,
      aggregation: parsed.aggregation,
      winsorizePct: parsed.winsorize_pct,
      minDetectableEffect: parsed.min_detectable_effect,
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    if (String(err).includes("UNIQUE")) throw new ApiError(`Metric '${parsed.name}' exists`, 409);
    throw err;
  }
  await writeAudit(identity, "metric.create", "metric", id, parsed);
  return { id, name: parsed.name };
}

export async function updateMetric(identity: AdminIdentity, id: string, input: unknown) {
  const parsed = metricUpdateSchema.parse(input);
  const s = await scopedDbSA(identity.projectId);
  const rows = await s.selectWhere(metrics, eq(metrics.id, id));
  if (rows.length === 0) throw new ApiError("Metric not found", 404);

  if (parsed.event_name !== undefined)
    await assertEventExists(identity.projectId, parsed.event_name);

  const patch: Record<string, unknown> = { updatedAt: new Date().toISOString() };
  if (parsed.event_name !== undefined) patch.eventName = parsed.event_name;
  if (parsed.value_path !== undefined) patch.valuePath = parsed.value_path;
  if (parsed.aggregation !== undefined) patch.aggregation = parsed.aggregation;
  if (parsed.winsorize_pct !== undefined) patch.winsorizePct = parsed.winsorize_pct;
  if (parsed.min_detectable_effect !== undefined)
    patch.minDetectableEffect = parsed.min_detectable_effect;

  await s.update(metrics).set(patch).where(eq(metrics.id, id));
  await writeAudit(identity, "metric.update", "metric", id, parsed);
  return { id };
}

export async function deleteMetric(identity: AdminIdentity, id: string) {
  const s = await scopedDbSA(identity.projectId);
  const rows = await s.selectWhere(metrics, eq(metrics.id, id));
  if (rows.length === 0) throw new ApiError("Metric not found", 404);
  await s.delete(metrics).where(eq(metrics.id, id));
  await writeAudit(identity, "metric.delete", "metric", id);
  return { ok: true };
}
