import { eq } from "drizzle-orm";
import {
  checkLimit,
  ApiError,
  getPlan,
  sha256,
  writeSdkKeyEntry,
  deleteSdkKeyEntry,
} from "@shipeasy/core";
import { sdkKeys } from "@shipeasy/core/db/schema";
import { keyCreateSchema } from "@shipeasy/core/schemas/keys";
import { scopedDb } from "../db";
import { getEnv } from "../env";
import { loadProject } from "../project";
import { writeAudit } from "../audit";
import type { AdminIdentity } from "../admin-auth";

export async function listKeys(identity: AdminIdentity) {
  const s = scopedDb(identity.projectId);
  const rows = await s.select(sdkKeys);
  return rows.map((r) => ({
    id: r.id,
    type: r.type,
    created_at: r.createdAt,
    revoked_at: r.revokedAt,
    expires_at: r.expiresAt,
  }));
}

export async function createKey(identity: AdminIdentity, input: unknown) {
  const parsed = keyCreateSchema.parse(input);
  const project = await loadProject(identity.projectId);
  const plan = getPlan(project.plan);
  const env = getEnv();

  await checkLimit(env.DB, identity.projectId, "sdk_keys", plan);

  const raw = `sdk_${parsed.type}_${crypto.randomUUID().replace(/-/g, "")}`;
  const hash = await sha256(raw);
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const expiresAt =
    parsed.type === "admin" ? new Date(Date.now() + 90 * 86_400_000).toISOString() : null;

  const s = scopedDb(identity.projectId);
  await s.insert(sdkKeys).values({
    id,
    keyHash: hash,
    type: parsed.type,
    createdAt: now,
    expiresAt,
  });

  await writeSdkKeyEntry(env, hash, {
    project_id: identity.projectId,
    type: parsed.type,
    expires_at: expiresAt,
  });
  await writeAudit(identity, "key.create", "sdk_key", id, { type: parsed.type });
  return { id, type: parsed.type, key: raw, expires_at: expiresAt };
}

export async function revokeKey(identity: AdminIdentity, id: string) {
  const env = getEnv();
  const s = scopedDb(identity.projectId);
  const rows = await s.selectWhere(sdkKeys, eq(sdkKeys.id, id));
  if (rows.length === 0) throw new ApiError("Key not found", 404);
  const key = rows[0];
  if (key.revokedAt) return { id, revoked: true };

  await s.update(sdkKeys).set({ revokedAt: new Date().toISOString() }).where(eq(sdkKeys.id, id));

  await deleteSdkKeyEntry(env, key.keyHash);
  await writeAudit(identity, "key.revoke", "sdk_key", id);
  return { id, revoked: true };
}
