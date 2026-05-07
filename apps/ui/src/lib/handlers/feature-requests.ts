import { after } from "next/server";
import { eq, desc, and } from "drizzle-orm";
import { ApiError } from "@shipeasy/core";
import { featureRequests, reportAttachments } from "@shipeasy/core/db/schema";
import {
  featureRequestCreateSchema,
  featureRequestUpdateSchema,
} from "@shipeasy/core/schemas/feedback";
import { scopedDb, scopedDbSA } from "../db";
import { writeAudit } from "../audit";
import { dispatchProjectEvent } from "../connector-dispatch";
import { processFeatureRequest } from "../ai/process-report";
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
  const processed = await processFeatureRequest(parsed, { projectId: identity.projectId });
  const improved = processed.improved;

  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const s = await scopedDbSA(identity.projectId);
  const aiContext = {
    ...(improved.context ?? {}),
    ai: {
      duplicateOf: processed.duplicateOf,
      similar: processed.similar,
      notes: processed.notes,
    },
  };
  const importance = improved.importance ?? "nice_to_have";
  await s.insert(featureRequests).values({
    id,
    title: improved.title,
    description: improved.description ?? "",
    useCase: improved.useCase ?? "",
    importance,
    status: "open",
    reporterEmail: improved.reporterEmail ?? identity.actorEmail ?? null,
    pageUrl: improved.pageUrl ?? null,
    userAgent: improved.userAgent ?? null,
    context: aiContext,
    createdAt: now,
    updatedAt: now,
  });
  await writeAudit(identity, "feature_request.create", "feature_request", id, {
    title: improved.title,
  });

  after(() =>
    dispatchProjectEvent(identity.projectId, "feature_request.created", {
      type: "feature_request.created",
      id,
      projectId: identity.projectId,
      title: improved.title,
      description: improved.description ?? "",
      useCase: improved.useCase ?? "",
      importance,
      status: "open",
      reporterEmail: improved.reporterEmail ?? identity.actorEmail ?? null,
      pageUrl: improved.pageUrl ?? null,
      userAgent: improved.userAgent ?? null,
      context: aiContext,
      createdAt: now,
    }),
  );
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
