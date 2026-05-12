import { and, desc, eq, inArray } from "drizzle-orm";
import { checkLimit, rebuildFlags, ApiError, getEffectivePlan } from "@shipeasy/core";
import { gates, experiments } from "@shipeasy/core/db/schema";
import { gateCreateSchema, gateUpdateSchema } from "@shipeasy/core/schemas/gates";
import type { Page, PageQuery } from "@shipeasy/core/pagination";
import { scopedDb, scopedDbSA } from "../db";
import { getEnvAsync } from "../env";
import { loadProject } from "../project";
import { writeAudit } from "../audit";
import { syncUsage } from "../billing";
import type { AdminIdentity } from "../admin-auth";
import { keysetWhere, sliceWithCursor } from "./_pagination";

type GateRow = Awaited<ReturnType<ReturnType<typeof scopedDb>["select"]>>[number];

/**
 * Single page of gates ordered `(updated_at desc, id desc)`. The HTTP route
 * wraps this; dashboard pages that want every gate use {@link listAllGates}.
 */
export async function listGates(identity: AdminIdentity, opts: PageQuery): Promise<Page<GateRow>> {
  const s = scopedDb(identity.projectId);
  const ks = keysetWhere(gates.updatedAt, gates.id, opts.cursor);
  const base = ks ? s.selectWhere(gates, ks) : s.select(gates);
  const rows = await base.orderBy(desc(gates.updatedAt), desc(gates.id)).limit(opts.limit + 1);
  return sliceWithCursor(rows as GateRow[], opts.limit);
}

/**
 * Drains every page of gates. Used by dashboard pages that render the full
 * list and by SDK consumers that opt into auto-pagination.
 */
export async function listAllGates(identity: AdminIdentity): Promise<GateRow[]> {
  const collected: GateRow[] = [];
  let cursor: string | undefined;
  do {
    const page = await listGates(identity, { limit: 500, cursor });
    collected.push(...page.data);
    cursor = page.next_cursor ?? undefined;
  } while (cursor);
  return collected;
}

export async function createGate(identity: AdminIdentity, input: unknown) {
  const parsed = gateCreateSchema.parse(input);
  const project = await loadProject(identity.projectId);
  const plan = getEffectivePlan(project);
  const env = await getEnvAsync();

  await checkLimit(env.DB, identity.projectId, "flags", plan);

  const id = crypto.randomUUID();
  const salt = parsed.salt ?? crypto.randomUUID().replace(/-/g, "");
  const s = await scopedDbSA(identity.projectId);

  try {
    await s.insert(gates).values({
      id,
      name: parsed.name,
      rules: parsed.rules,
      rolloutPct: parsed.rollout_pct,
      salt,
      enabled: 1,
      title: parsed.title ?? null,
      description: parsed.description ?? null,
      folder: parsed.folder ?? null,
      groupName: parsed.group ?? null,
      ownerEmail: parsed.owner_email ?? null,
      stack: parsed.stack ?? null,
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    if (String(err).includes("UNIQUE")) {
      throw new ApiError(`Gate '${parsed.name}' already exists`, 409);
    }
    throw err;
  }

  await rebuildFlags(env, identity.projectId, project.plan);
  await syncUsage(env, identity.projectId);
  await writeAudit(identity, "gate.create", "gate", id, parsed);
  return { id, name: parsed.name };
}

export async function updateGate(identity: AdminIdentity, id: string, input: unknown) {
  const parsed = gateUpdateSchema.parse(input);
  const project = await loadProject(identity.projectId);
  const env = await getEnvAsync();
  const s = await scopedDbSA(identity.projectId);

  const existing = await s.selectWhere(gates, eq(gates.id, id));
  if (existing.length === 0) throw new ApiError("Gate not found", 404);

  const patch: Record<string, unknown> = { updatedAt: new Date().toISOString() };
  if (parsed.rollout_pct !== undefined) patch.rolloutPct = parsed.rollout_pct;
  if (parsed.rules !== undefined) patch.rules = parsed.rules;
  if (parsed.enabled !== undefined) patch.enabled = parsed.enabled ? 1 : 0;
  if (parsed.stack !== undefined) patch.stack = parsed.stack;
  if (parsed.title !== undefined) patch.title = parsed.title;
  if (parsed.description !== undefined) patch.description = parsed.description;
  if (parsed.folder !== undefined) patch.folder = parsed.folder;
  if (parsed.group !== undefined) patch.groupName = parsed.group;
  if (parsed.owner_email !== undefined) patch.ownerEmail = parsed.owner_email;

  await s.update(gates).set(patch).where(eq(gates.id, id));
  await rebuildFlags(env, identity.projectId, project.plan);
  await writeAudit(identity, "gate.update", "gate", id, parsed);
  return { id };
}

export async function setGateEnabled(identity: AdminIdentity, id: string, enabled: boolean) {
  const project = await loadProject(identity.projectId);
  const env = await getEnvAsync();
  const s = await scopedDbSA(identity.projectId);
  const existing = await s.selectWhere(gates, eq(gates.id, id));
  if (existing.length === 0) throw new ApiError("Gate not found", 404);

  await s
    .update(gates)
    .set({ enabled: enabled ? 1 : 0, updatedAt: new Date().toISOString() })
    .where(eq(gates.id, id));

  await rebuildFlags(env, identity.projectId, project.plan);
  await writeAudit(identity, enabled ? "gate.enable" : "gate.disable", "gate", id);
  return { id, enabled };
}

export async function deleteGate(identity: AdminIdentity, id: string) {
  const project = await loadProject(identity.projectId);
  const env = await getEnvAsync();
  const s = await scopedDbSA(identity.projectId);
  const existing = await s.selectWhere(gates, eq(gates.id, id));
  if (existing.length === 0) throw new ApiError("Gate not found", 404);

  const gate = existing[0];
  const runningRefs = await s.selectWhere(
    experiments,
    and(eq(experiments.targetingGate, gate.name), eq(experiments.status, "running"))!,
  );
  if (runningRefs.length > 0) {
    throw new ApiError(
      `Gate is used as a targeting gate on ${runningRefs.length} running experiment(s). Stop them first.`,
      409,
    );
  }

  await s.update(gates).set({ deletedAt: new Date().toISOString() }).where(eq(gates.id, id));
  await rebuildFlags(env, identity.projectId, project.plan);
  await syncUsage(env, identity.projectId);
  await writeAudit(identity, "gate.delete", "gate", id);
  return { ok: true };
}

export async function bulkDeleteGates(identity: AdminIdentity, ids: string[]) {
  if (ids.length === 0) return { deleted: 0 };
  const project = await loadProject(identity.projectId);
  const env = await getEnvAsync();
  const s = await scopedDbSA(identity.projectId);
  const existing = await s.selectWhere(gates, inArray(gates.id, ids));
  if (existing.length === 0) throw new ApiError("No matching gates found", 404);
  await s.update(gates).set({ deletedAt: new Date().toISOString() }).where(inArray(gates.id, ids));
  await rebuildFlags(env, identity.projectId, project.plan);
  await writeAudit(identity, "gate.bulk_delete", "gate", null, {
    count: existing.length,
    ids: existing.map((g) => g.id),
  });
  return { deleted: existing.length };
}
