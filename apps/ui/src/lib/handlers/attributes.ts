import { eq } from "drizzle-orm";
import { ApiError } from "@shipeasy/core";
import { userAttributes } from "@shipeasy/core/db/schema";
import { attributeCreateSchema, attributeUpdateSchema } from "@shipeasy/core/schemas/attributes";
import { scopedDb } from "../db";
import { writeAudit } from "../audit";
import type { AdminIdentity } from "../admin-auth";

export async function listAttributes(identity: AdminIdentity) {
  return scopedDb(identity.projectId).select(userAttributes);
}

export async function getAttribute(identity: AdminIdentity, id: string) {
  const s = scopedDb(identity.projectId);
  const rows = await s.selectWhere(userAttributes, eq(userAttributes.id, id));
  if (rows.length === 0) throw new ApiError("Attribute not found", 404);
  return rows[0];
}

export async function createAttribute(identity: AdminIdentity, input: unknown) {
  const parsed = attributeCreateSchema.parse(input);
  if (parsed.type === "enum" && (!parsed.enum_values || parsed.enum_values.length === 0)) {
    throw new ApiError("enum_values required for type 'enum'", 422);
  }
  const id = crypto.randomUUID();
  const s = scopedDb(identity.projectId);
  try {
    await s.insert(userAttributes).values({
      id,
      name: parsed.name,
      type: parsed.type,
      enumValues: parsed.enum_values,
      required: parsed.required ? 1 : 0,
      description: parsed.description ?? null,
      sdkPath: parsed.sdk_path ?? null,
      createdAt: new Date().toISOString(),
    });
  } catch (err) {
    if (String(err).includes("UNIQUE"))
      throw new ApiError(`Attribute '${parsed.name}' exists`, 409);
    throw err;
  }
  await writeAudit(identity, "attribute.create", "attribute", id, parsed);
  return { id, name: parsed.name };
}

export async function updateAttribute(identity: AdminIdentity, id: string, input: unknown) {
  const parsed = attributeUpdateSchema.parse(input);
  const s = scopedDb(identity.projectId);
  const rows = await s.selectWhere(userAttributes, eq(userAttributes.id, id));
  if (rows.length === 0) throw new ApiError("Attribute not found", 404);

  const patch: Record<string, unknown> = {};
  if (parsed.type !== undefined) patch.type = parsed.type;
  if (parsed.enum_values !== undefined) patch.enumValues = parsed.enum_values;
  if (parsed.required !== undefined) patch.required = parsed.required ? 1 : 0;
  if (parsed.description !== undefined) patch.description = parsed.description;
  if (parsed.sdk_path !== undefined) patch.sdkPath = parsed.sdk_path;

  await s.update(userAttributes).set(patch).where(eq(userAttributes.id, id));
  await writeAudit(identity, "attribute.update", "attribute", id, parsed);
  return { id };
}

export async function deleteAttribute(identity: AdminIdentity, id: string) {
  const s = scopedDb(identity.projectId);
  const rows = await s.selectWhere(userAttributes, eq(userAttributes.id, id));
  if (rows.length === 0) throw new ApiError("Attribute not found", 404);
  await s.delete(userAttributes).where(eq(userAttributes.id, id));
  await writeAudit(identity, "attribute.delete", "attribute", id);
  return { ok: true };
}
