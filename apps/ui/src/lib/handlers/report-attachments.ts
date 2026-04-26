import { eq, and } from "drizzle-orm";
import { ApiError } from "@shipeasy/core";
import {
  reportAttachments,
  bugReports,
  featureRequests,
  ATTACHMENT_KINDS,
  REPORT_KINDS,
  type AttachmentKind,
  type ReportKind,
} from "@shipeasy/core/db/schema";
import { scopedDb, scopedDbSA } from "../db";
import { getEnvAsync } from "../env";
import { writeAudit } from "../audit";
import type { AdminIdentity } from "../admin-auth";

const MAX_BYTES = 25 * 1024 * 1024; // 25 MiB

const KIND_TABLE = {
  bug: bugReports,
  feature_request: featureRequests,
} as const;

function safeFilename(raw: string): string {
  return raw.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 100) || "file";
}

export async function createAttachment(
  identity: AdminIdentity,
  input: { reportKind: string; reportId: string; kind: string; filename: string; file: File },
) {
  if (!(REPORT_KINDS as readonly string[]).includes(input.reportKind)) {
    throw new ApiError("Invalid reportKind", 400);
  }
  if (!(ATTACHMENT_KINDS as readonly string[]).includes(input.kind)) {
    throw new ApiError("Invalid kind", 400);
  }
  if (!(input.file instanceof File)) throw new ApiError("file required", 400);
  if (input.file.size === 0) throw new ApiError("file is empty", 400);
  if (input.file.size > MAX_BYTES) throw new ApiError("file too large (max 25 MiB)", 413);

  const reportKind = input.reportKind as ReportKind;
  const kind = input.kind as AttachmentKind;
  const reportTable = KIND_TABLE[reportKind];

  const s = await scopedDbSA(identity.projectId);
  const existing = await s.selectWhere(reportTable, eq(reportTable.id, input.reportId));
  if (existing.length === 0) throw new ApiError("Report not found", 404);

  const env = await getEnvAsync();
  const id = crypto.randomUUID();
  const filename = safeFilename(input.filename || input.file.name || "file");
  const r2Key = `feedback/${identity.projectId}/${reportKind}/${input.reportId}/${id}-${filename}`;

  const buf = await input.file.arrayBuffer();
  const mimeType = input.file.type || "application/octet-stream";
  await env.EVENTS_R2.put(r2Key, buf, { httpMetadata: { contentType: mimeType } });

  await s.insert(reportAttachments).values({
    id,
    reportKind,
    reportId: input.reportId,
    kind,
    filename,
    mimeType,
    sizeBytes: input.file.size,
    r2Key,
    createdAt: new Date().toISOString(),
  });

  await writeAudit(identity, "attachment.create", "report_attachment", id, {
    reportKind,
    reportId: input.reportId,
    kind,
    sizeBytes: input.file.size,
  });

  return { id, filename, kind, mimeType, sizeBytes: input.file.size };
}

export async function streamAttachment(identity: AdminIdentity, id: string): Promise<Response> {
  const s = scopedDb(identity.projectId);
  const rows = await s.raw
    .select()
    .from(reportAttachments)
    .where(and(eq(reportAttachments.projectId, identity.projectId), eq(reportAttachments.id, id)));
  if (rows.length === 0) throw new ApiError("Attachment not found", 404);
  const att = rows[0];

  const env = await getEnvAsync();
  const obj = await env.EVENTS_R2.get(att.r2Key);
  if (!obj) throw new ApiError("Attachment blob missing", 410);

  const headers = new Headers();
  headers.set("Content-Type", att.mimeType);
  headers.set("Content-Length", String(att.sizeBytes));
  headers.set("Content-Disposition", `inline; filename="${att.filename}"`);
  headers.set("Cache-Control", "private, max-age=300");
  return new Response(obj.body, { status: 200, headers });
}
