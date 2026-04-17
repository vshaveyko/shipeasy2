import { getDb } from "@shipeasy/core";
import { auditLog } from "@shipeasy/core/db/schema";
import type { AdminIdentity } from "./admin-auth";
import { getEnv } from "./env";

export async function writeAudit(
  identity: AdminIdentity,
  action: string,
  resourceType: string,
  resourceId: string | null,
  payload?: unknown,
): Promise<void> {
  const db = getDb(getEnv().DB);
  await db.insert(auditLog).values({
    id: crypto.randomUUID(),
    projectId: identity.projectId,
    actorEmail: identity.actorEmail,
    actorType: identity.source === "jwt" ? "user" : "cli",
    action,
    resourceType,
    resourceId,
    payload: payload === undefined ? null : JSON.stringify(payload),
    createdAt: new Date().toISOString(),
  });
}
