import { eq } from "drizzle-orm";
import { ApiError } from "@shipeasy/core";
import { connectors, type ConnectorEvent } from "@shipeasy/core/db/schema";
import { connectorCreateSchema, connectorUpdateSchema } from "@shipeasy/core/schemas/connectors";
import type { ConnectorRecord } from "@shipeasy/core/connectors";
import { scopedDb, scopedDbSA } from "../db";
import { writeAudit } from "../audit";
import type { AdminIdentity } from "../admin-auth";

function rowToRecord(r: typeof connectors.$inferSelect): ConnectorRecord {
  return {
    ...r,
    events: (r.events ?? []) as ConnectorEvent[],
    config: (r.config ?? {}) as Record<string, unknown>,
  };
}

export async function listConnectors(identity: AdminIdentity): Promise<ConnectorRecord[]> {
  const s = scopedDb(identity.projectId);
  const rows = await s.raw
    .select()
    .from(connectors)
    .where(eq(connectors.projectId, identity.projectId));
  return rows.map(rowToRecord);
}

export async function getConnector(identity: AdminIdentity, id: string): Promise<ConnectorRecord> {
  const s = scopedDb(identity.projectId);
  const rows = await s.selectWhere(connectors, eq(connectors.id, id));
  if (rows.length === 0) throw new ApiError("Connector not found", 404);
  return rowToRecord(rows[0]);
}

/** Create a stub connector record (pre-OAuth). Returns the new id. */
export async function createConnector(
  identity: AdminIdentity,
  input: unknown,
): Promise<{ id: string }> {
  const parsed = connectorCreateSchema.parse(input);
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const s = await scopedDbSA(identity.projectId);
  await s.insert(connectors).values({
    id,
    provider: parsed.provider,
    name: parsed.name,
    enabled: false, // disabled until OAuth + config complete
    events: parsed.events,
    config: {},
    credentialsCipher: null,
    accountLabel: null,
    createdAt: now,
    updatedAt: now,
  });
  await writeAudit(identity, "connector.create", "connector", id, {
    provider: parsed.provider,
  });
  return { id };
}

export async function updateConnector(
  identity: AdminIdentity,
  id: string,
  input: unknown,
): Promise<{ id: string }> {
  const parsed = connectorUpdateSchema.parse(input);
  const s = await scopedDbSA(identity.projectId);
  const existing = await s.selectWhere(connectors, eq(connectors.id, id));
  if (existing.length === 0) throw new ApiError("Connector not found", 404);
  const patch: Record<string, unknown> = { updatedAt: new Date().toISOString() };
  if (parsed.name !== undefined) patch.name = parsed.name;
  if (parsed.enabled !== undefined) patch.enabled = parsed.enabled;
  if (parsed.events !== undefined) patch.events = parsed.events;
  if (parsed.config !== undefined) patch.config = parsed.config;
  await s.update(connectors).set(patch).where(eq(connectors.id, id));
  await writeAudit(identity, "connector.update", "connector", id, parsed);
  return { id };
}

export async function deleteConnector(identity: AdminIdentity, id: string): Promise<{ ok: true }> {
  const s = await scopedDbSA(identity.projectId);
  await s.delete(connectors).where(eq(connectors.id, id));
  await writeAudit(identity, "connector.delete", "connector", id);
  return { ok: true };
}

/** Used by the OAuth callback (not project-scoped because state lookup is by id). */
export async function attachConnectorCredentials(
  projectId: string,
  id: string,
  args: { credentialsCipher: string; accountLabel: string | null; enabled?: boolean },
): Promise<void> {
  const s = await scopedDbSA(projectId);
  await s
    .update(connectors)
    .set({
      credentialsCipher: args.credentialsCipher,
      accountLabel: args.accountLabel,
      enabled: args.enabled ?? false,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(connectors.id, id));
}

export async function rotateConnectorCipher(
  projectId: string,
  id: string,
  newCipher: string,
): Promise<void> {
  const s = await scopedDbSA(projectId);
  await s
    .update(connectors)
    .set({ credentialsCipher: newCipher, updatedAt: new Date().toISOString() })
    .where(eq(connectors.id, id));
}
