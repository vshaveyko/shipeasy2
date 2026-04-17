import { eq } from "drizzle-orm";
import { checkLimit, rebuildExperiments, ApiError, getPlan } from "@shipeasy/core";
import { universes } from "@shipeasy/core/db/schema";
import { universeCreateSchema, universeUpdateSchema } from "@shipeasy/core/schemas/universes";
import { scopedDb } from "../db";
import { getEnv } from "../env";
import { loadProject } from "../project";
import { writeAudit } from "../audit";
import type { AdminIdentity } from "../admin-auth";

export async function listUniverses(identity: AdminIdentity) {
  return scopedDb(identity.projectId).select(universes);
}

export async function createUniverse(identity: AdminIdentity, input: unknown) {
  const parsed = universeCreateSchema.parse(input);
  const project = await loadProject(identity.projectId);
  const plan = getPlan(project.plan);
  const env = getEnv();

  if (parsed.holdout_range && !plan.holdout_groups) {
    throw new ApiError("holdout_groups requires Pro plan or higher", 403);
  }

  await checkLimit(env.DB, identity.projectId, "universes", plan);

  const id = crypto.randomUUID();
  const s = scopedDb(identity.projectId);
  try {
    await s.insert(universes).values({
      id,
      name: parsed.name,
      unitType: parsed.unit_type,
      holdoutRange: parsed.holdout_range,
      createdAt: new Date().toISOString(),
    });
  } catch (err) {
    if (String(err).includes("UNIQUE")) throw new ApiError(`Universe '${parsed.name}' exists`, 409);
    throw err;
  }

  await rebuildExperiments(env, identity.projectId);
  await writeAudit(identity, "universe.create", "universe", id, parsed);
  return { id, name: parsed.name };
}

export async function updateUniverse(identity: AdminIdentity, id: string, input: unknown) {
  const parsed = universeUpdateSchema.parse(input);
  const project = await loadProject(identity.projectId);
  const plan = getPlan(project.plan);
  const env = getEnv();

  if (parsed.holdout_range !== undefined && parsed.holdout_range !== null && !plan.holdout_groups) {
    throw new ApiError("holdout_groups requires Pro plan or higher", 403);
  }

  const s = scopedDb(identity.projectId);
  const rows = await s.selectWhere(universes, eq(universes.id, id));
  if (rows.length === 0) throw new ApiError("Universe not found", 404);

  const patch: Record<string, unknown> = {};
  if (parsed.holdout_range !== undefined) patch.holdoutRange = parsed.holdout_range;

  await s.update(universes).set(patch).where(eq(universes.id, id));
  await rebuildExperiments(env, identity.projectId);
  await writeAudit(identity, "universe.update", "universe", id, parsed);
  return { id };
}

export async function deleteUniverse(identity: AdminIdentity, id: string) {
  const env = getEnv();
  const s = scopedDb(identity.projectId);
  const rows = await s.selectWhere(universes, eq(universes.id, id));
  if (rows.length === 0) throw new ApiError("Universe not found", 404);

  await s.delete(universes).where(eq(universes.id, id));
  await rebuildExperiments(env, identity.projectId);
  await writeAudit(identity, "universe.delete", "universe", id);
  return { ok: true };
}
