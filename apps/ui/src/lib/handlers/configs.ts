import { eq } from "drizzle-orm";
import { checkLimit, rebuildFlags, ApiError, getPlan } from "@shipeasy/core";
import { configs } from "@shipeasy/core/db/schema";
import { configCreateSchema, configUpdateSchema } from "@shipeasy/core/schemas/configs";
import { scopedDb, scopedDbSA } from "../db";
import { getEnvAsync } from "../env";
import { loadProject } from "../project";
import { writeAudit } from "../audit";
import type { AdminIdentity } from "../admin-auth";

export async function listConfigs(identity: AdminIdentity) {
  const s = scopedDb(identity.projectId);
  return s.select(configs);
}

export async function getConfig(identity: AdminIdentity, id: string) {
  const s = scopedDb(identity.projectId);
  const rows = await s.selectWhere(configs, eq(configs.id, id));
  if (rows.length === 0) throw new ApiError("Config not found", 404);
  return rows[0];
}

export async function createConfig(identity: AdminIdentity, input: unknown) {
  const parsed = configCreateSchema.parse(input);
  const project = await loadProject(identity.projectId);
  const plan = getPlan(project.plan);
  const env = await getEnvAsync();

  await checkLimit(env.DB, identity.projectId, "configs", plan);

  const id = crypto.randomUUID();
  const s = await scopedDbSA(identity.projectId);
  try {
    await s.insert(configs).values({
      id,
      name: parsed.name,
      valueJson: parsed.value,
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    if (String(err).includes("UNIQUE")) throw new ApiError(`Config '${parsed.name}' exists`, 409);
    throw err;
  }

  await rebuildFlags(env, identity.projectId, project.plan);
  await writeAudit(identity, "config.create", "config", id, parsed);
  return { id, name: parsed.name };
}

export async function updateConfig(identity: AdminIdentity, id: string, input: unknown) {
  const parsed = configUpdateSchema.parse(input);
  const project = await loadProject(identity.projectId);
  const env = await getEnvAsync();
  const s = await scopedDbSA(identity.projectId);

  const rows = await s.selectWhere(configs, eq(configs.id, id));
  if (rows.length === 0) throw new ApiError("Config not found", 404);

  await s
    .update(configs)
    .set({ valueJson: parsed.value, updatedAt: new Date().toISOString() })
    .where(eq(configs.id, id));

  await rebuildFlags(env, identity.projectId, project.plan);
  await writeAudit(identity, "config.update", "config", id, parsed);
  return { id };
}

export async function deleteConfig(identity: AdminIdentity, id: string) {
  const project = await loadProject(identity.projectId);
  const env = await getEnvAsync();
  const s = await scopedDbSA(identity.projectId);
  const rows = await s.selectWhere(configs, eq(configs.id, id));
  if (rows.length === 0) throw new ApiError("Config not found", 404);
  await s.delete(configs).where(eq(configs.id, id));
  await rebuildFlags(env, identity.projectId, project.plan);
  await writeAudit(identity, "config.delete", "config", id);
  return { ok: true };
}
