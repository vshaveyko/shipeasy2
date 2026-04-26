import { eq, desc, and } from "drizzle-orm";
import { ApiError } from "@shipeasy/core";
import { featureRequests, reportAttachments } from "@shipeasy/core/db/schema";
import {
  featureRequestCreateSchema,
  featureRequestUpdateSchema,
} from "@shipeasy/core/schemas/feedback";
import { scopedDb, scopedDbSA } from "../db";
import { writeAudit } from "../audit";
import type { AdminIdentity } from "../admin-auth";

export async function listFeatureRequests(identity: AdminIdentity) {
  const s = scopedDb(identity.projectId);
  const rows = await s.raw
    .select()
    .from(featureRequests)
    .where(eq(featureRequests.projectId, identity.projectId))
    .orderBy(desc(featureRequests.createdAt));
  return rows;
}

export async function getFeatureRequest(identity: AdminIdentity, id: string) {
  const s = scopedDb(identity.projectId);
  const rows = await s.selectWhere(featureRequests, eq(featureRequests.id, id));
  if (rows.length === 0) throw new ApiError("Feature request not found", 404);
  const attachments = await s.raw
    .select()
    .from(reportAttachments)
    .where(
      and(
        eq(reportAttachments.projectId, identity.projectId),
        eq(reportAttachments.reportKind, "feature_request"),
        eq(reportAttachments.reportId, id),
      ),
    )
    .orderBy(reportAttachments.createdAt);
  return { ...rows[0], attachments };
}

export async function createFeatureRequest(identity: AdminIdentity, input: unknown) {
  const parsed = featureRequestCreateSchema.parse(input);
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const s = await scopedDbSA(identity.projectId);
  await s.insert(featureRequests).values({
    id,
    title: parsed.title,
    description: parsed.description ?? "",
    useCase: parsed.useCase ?? "",
    importance: parsed.importance ?? "nice_to_have",
    status: "open",
    reporterEmail: parsed.reporterEmail ?? identity.actorEmail ?? null,
    pageUrl: parsed.pageUrl ?? null,
    userAgent: parsed.userAgent ?? null,
    context: parsed.context ?? null,
    createdAt: now,
    updatedAt: now,
  });
  await writeAudit(identity, "feature_request.create", "feature_request", id, {
    title: parsed.title,
  });
  return { id };
}

export async function updateFeatureRequest(identity: AdminIdentity, id: string, input: unknown) {
  const parsed = featureRequestUpdateSchema.parse(input);
  const s = await scopedDbSA(identity.projectId);
  const existing = await s.selectWhere(featureRequests, eq(featureRequests.id, id));
  if (existing.length === 0) throw new ApiError("Feature request not found", 404);
  const patch: Record<string, unknown> = { updatedAt: new Date().toISOString() };
  if (parsed.title !== undefined) patch.title = parsed.title;
  if (parsed.description !== undefined) patch.description = parsed.description;
  if (parsed.useCase !== undefined) patch.useCase = parsed.useCase;
  if (parsed.importance !== undefined) patch.importance = parsed.importance;
  if (parsed.status !== undefined) patch.status = parsed.status;
  await s.update(featureRequests).set(patch).where(eq(featureRequests.id, id));
  await writeAudit(identity, "feature_request.update", "feature_request", id, parsed);
  return { id };
}

export async function deleteFeatureRequest(identity: AdminIdentity, id: string) {
  const s = await scopedDbSA(identity.projectId);
  const existing = await s.selectWhere(featureRequests, eq(featureRequests.id, id));
  if (existing.length === 0) throw new ApiError("Feature request not found", 404);
  await s.delete(featureRequests).where(eq(featureRequests.id, id));
  await writeAudit(identity, "feature_request.delete", "feature_request", id);
  return { ok: true };
}
