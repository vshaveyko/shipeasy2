import { after } from "next/server";
import { eq, desc, and } from "drizzle-orm";
import { ApiError } from "@shipeasy/core";
import { bugReports, reportAttachments } from "@shipeasy/core/db/schema";
import { bugCreateSchema, bugUpdateSchema } from "@shipeasy/core/schemas/feedback";
import { scopedDb, scopedDbSA } from "../db";
import { writeAudit } from "../audit";
import { dispatchProjectEvent } from "../connector-dispatch";
import { processBugReport } from "../ai/process-report";
import type { AdminIdentity } from "../admin-auth";

export async function listBugs(identity: AdminIdentity) {
  const s = scopedDb(identity.projectId);
  const rows = await s.raw
    .select()
    .from(bugReports)
    .where(eq(bugReports.projectId, identity.projectId))
    .orderBy(desc(bugReports.createdAt));
  return rows;
}

export async function getBug(identity: AdminIdentity, id: string) {
  const s = scopedDb(identity.projectId);
  const rows = await s.selectWhere(bugReports, eq(bugReports.id, id));
  if (rows.length === 0) throw new ApiError("Bug not found", 404);
  const attachments = await s.raw
    .select()
    .from(reportAttachments)
    .where(
      and(
        eq(reportAttachments.projectId, identity.projectId),
        eq(reportAttachments.reportKind, "bug"),
        eq(reportAttachments.reportId, id),
      ),
    )
    .orderBy(reportAttachments.createdAt);
  return { ...rows[0], attachments };
}

export async function createBug(identity: AdminIdentity, input: unknown) {
  const parsed = bugCreateSchema.parse(input);
  // Run inputs through the AI processor before persisting so we store the
  // improved report and can attach dedupe metadata in `context`.
  const processed = await processBugReport(parsed, { projectId: identity.projectId });
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
  await s.insert(bugReports).values({
    id,
    title: improved.title,
    stepsToReproduce: improved.stepsToReproduce ?? "",
    actualResult: improved.actualResult ?? "",
    expectedResult: improved.expectedResult ?? "",
    status: "open",
    reporterEmail: improved.reporterEmail ?? identity.actorEmail ?? null,
    pageUrl: improved.pageUrl ?? null,
    userAgent: improved.userAgent ?? null,
    viewport: improved.viewport ?? null,
    context: aiContext,
    createdAt: now,
    updatedAt: now,
  });
  await writeAudit(identity, "bug.create", "bug_report", id, { title: improved.title });

  // Fire connectors after the response is sent.
  after(() =>
    dispatchProjectEvent(identity.projectId, "bug.created", {
      type: "bug.created",
      id,
      projectId: identity.projectId,
      title: improved.title,
      stepsToReproduce: improved.stepsToReproduce ?? "",
      actualResult: improved.actualResult ?? "",
      expectedResult: improved.expectedResult ?? "",
      status: "open",
      reporterEmail: improved.reporterEmail ?? identity.actorEmail ?? null,
      pageUrl: improved.pageUrl ?? null,
      userAgent: improved.userAgent ?? null,
      viewport: improved.viewport ?? null,
      context: aiContext,
      createdAt: now,
    }),
  );
  return { id };
}

export async function updateBug(identity: AdminIdentity, id: string, input: unknown) {
  const parsed = bugUpdateSchema.parse(input);
  const s = await scopedDbSA(identity.projectId);
  const existing = await s.selectWhere(bugReports, eq(bugReports.id, id));
  if (existing.length === 0) throw new ApiError("Bug not found", 404);
  const patch: Record<string, unknown> = { updatedAt: new Date().toISOString() };
  if (parsed.title !== undefined) patch.title = parsed.title;
  if (parsed.stepsToReproduce !== undefined) patch.stepsToReproduce = parsed.stepsToReproduce;
  if (parsed.actualResult !== undefined) patch.actualResult = parsed.actualResult;
  if (parsed.expectedResult !== undefined) patch.expectedResult = parsed.expectedResult;
  if (parsed.status !== undefined) patch.status = parsed.status;
  await s.update(bugReports).set(patch).where(eq(bugReports.id, id));
  await writeAudit(identity, "bug.update", "bug_report", id, parsed);
  return { id };
}

export async function deleteBug(identity: AdminIdentity, id: string) {
  const s = await scopedDbSA(identity.projectId);
  const existing = await s.selectWhere(bugReports, eq(bugReports.id, id));
  if (existing.length === 0) throw new ApiError("Bug not found", 404);
  await s.delete(bugReports).where(eq(bugReports.id, id));
  await writeAudit(identity, "bug.delete", "bug_report", id);
  return { ok: true };
}
