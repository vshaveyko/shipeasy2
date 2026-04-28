import { eq, inArray } from "drizzle-orm";
import { checkLimit, rebuildCatalog, ApiError, getEffectivePlan } from "@shipeasy/core";
import { events, metrics } from "@shipeasy/core/db/schema";
import {
  eventCreateSchema,
  eventUpdateSchema,
  eventApproveSchema,
} from "@shipeasy/core/schemas/events";
import { scopedDb, scopedDbSA } from "../db";
import { getEnvAsync } from "../env";
import { loadProject } from "../project";
import { writeAudit } from "../audit";
import type { AdminIdentity } from "../admin-auth";

export async function listEvents(identity: AdminIdentity) {
  return scopedDb(identity.projectId).select(events);
}

export async function getEvent(identity: AdminIdentity, id: string) {
  const s = scopedDb(identity.projectId);
  const rows = await s.selectWhere(events, eq(events.id, id));
  if (rows.length === 0) throw new ApiError("Event not found", 404);
  return rows[0];
}

export async function createEvent(identity: AdminIdentity, input: unknown) {
  const parsed = eventCreateSchema.parse(input);
  const project = await loadProject(identity.projectId);
  const plan = getEffectivePlan(project);
  const env = await getEnvAsync();

  await checkLimit(env.DB, identity.projectId, "events_catalog", plan);

  const id = crypto.randomUUID();
  const s = await scopedDbSA(identity.projectId);
  try {
    await s.insert(events).values({
      id,
      name: parsed.name,
      description: parsed.description ?? null,
      properties: parsed.properties,
      pending: 0,
      createdAt: new Date().toISOString(),
    });
  } catch (err) {
    if (String(err).includes("UNIQUE")) throw new ApiError(`Event '${parsed.name}' exists`, 409);
    throw err;
  }

  await rebuildCatalog(env, identity.projectId);
  await writeAudit(identity, "event.create", "event", id, parsed);
  return { id, name: parsed.name };
}

export async function updateEvent(identity: AdminIdentity, id: string, input: unknown) {
  const parsed = eventUpdateSchema.parse(input);
  const env = await getEnvAsync();
  const s = await scopedDbSA(identity.projectId);
  const rows = await s.selectWhere(events, eq(events.id, id));
  if (rows.length === 0) throw new ApiError("Event not found", 404);

  const patch: Record<string, unknown> = {};
  if (parsed.description !== undefined) patch.description = parsed.description;
  if (parsed.properties !== undefined) patch.properties = parsed.properties;

  await s.update(events).set(patch).where(eq(events.id, id));
  await rebuildCatalog(env, identity.projectId);
  await writeAudit(identity, "event.update", "event", id, parsed);
  return { id };
}

export async function approveEvent(identity: AdminIdentity, id: string, input: unknown) {
  const parsed = eventApproveSchema.parse(input ?? {});
  const env = await getEnvAsync();
  const s = await scopedDbSA(identity.projectId);
  const rows = await s.selectWhere(events, eq(events.id, id));
  if (rows.length === 0) throw new ApiError("Event not found", 404);

  const patch: Record<string, unknown> = { pending: 0 };
  if (parsed.description !== undefined) patch.description = parsed.description;
  if (parsed.properties !== undefined) patch.properties = parsed.properties;

  await s.update(events).set(patch).where(eq(events.id, id));
  await rebuildCatalog(env, identity.projectId);
  await writeAudit(identity, "event.approve", "event", id, parsed);
  return { id, pending: 0 };
}

export async function deleteEvent(identity: AdminIdentity, id: string) {
  const env = await getEnvAsync();
  const s = await scopedDbSA(identity.projectId);
  const rows = await s.selectWhere(events, eq(events.id, id));
  if (rows.length === 0) throw new ApiError("Event not found", 404);

  const event = rows[0];
  const dependentMetrics = await s.selectWhere(metrics, eq(metrics.eventName, event.name));
  if (dependentMetrics.length > 0) {
    throw new ApiError(
      `Event is referenced by ${dependentMetrics.length} metric(s). Delete them first.`,
      409,
    );
  }

  await s.update(events).set({ deletedAt: new Date().toISOString() }).where(eq(events.id, id));
  await rebuildCatalog(env, identity.projectId);
  await writeAudit(identity, "event.delete", "event", id);
  return { ok: true };
}

export async function bulkDeleteEvents(identity: AdminIdentity, ids: string[]) {
  if (ids.length === 0) return { deleted: 0 };
  const env = await getEnvAsync();
  const s = await scopedDbSA(identity.projectId);
  const existing = await s.selectWhere(events, inArray(events.id, ids));
  if (existing.length === 0) throw new ApiError("No matching events found", 404);
  await s
    .update(events)
    .set({ deletedAt: new Date().toISOString() })
    .where(inArray(events.id, ids));
  await rebuildCatalog(env, identity.projectId);
  await writeAudit(identity, "event.bulk_delete", "event", null, {
    count: existing.length,
    ids: existing.map((e) => e.id),
  });
  return { deleted: existing.length };
}
