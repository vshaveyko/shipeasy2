import { ApiError } from "@shipeasy/core";
import { authenticateAdmin, errorResponse } from "@/lib/admin-auth";
import { getEnvAsync } from "@/lib/env";
import { createAttachment } from "@/lib/handlers/report-attachments";
import { corsPreflight } from "@/lib/handlers/http";
import { z } from "zod";

export const runtime = "nodejs";

function withCors(req: Request, res: Response): Response {
  const origin = req.headers.get("origin") ?? "*";
  res.headers.set("Access-Control-Allow-Origin", origin);
  res.headers.set("Vary", "Origin");
  res.headers.set("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.headers.set("Access-Control-Allow-Headers", "Authorization, Content-Type, X-SDK-Key");
  return res;
}

export function OPTIONS(req: Request) {
  return corsPreflight(req);
}

export async function POST(req: Request) {
  try {
    await getEnvAsync();
    const identity = await authenticateAdmin(req);
    let form: FormData;
    try {
      form = await req.formData();
    } catch {
      throw new ApiError("Expected multipart/form-data", 400);
    }
    const reportKind = String(form.get("reportKind") ?? "");
    const reportId = String(form.get("reportId") ?? "");
    const kind = String(form.get("kind") ?? "");
    const filename = String(form.get("filename") ?? "");
    const file = form.get("file");
    if (!reportId) throw new ApiError("reportId required", 400);
    if (!(file instanceof File)) throw new ApiError("file required", 400);
    const result = await createAttachment(identity, {
      reportKind,
      reportId,
      kind,
      filename,
      file,
    });
    return withCors(req, Response.json(result, { status: 201 }));
  } catch (err) {
    if (err instanceof z.ZodError) {
      return withCors(
        req,
        Response.json({ error: "Validation failed", issues: err.issues }, { status: 422 }),
      );
    }
    if (err instanceof ApiError) {
      return withCors(req, Response.json({ error: err.message }, { status: err.status }));
    }
    return withCors(req, errorResponse(err));
  }
}
