import { ApiError } from "@shipeasy/core";
import { authenticateAdmin, errorResponse } from "@/lib/admin-auth";
import { getEnvAsync } from "@/lib/env";
import { streamAttachment } from "@/lib/handlers/report-attachments";
import { corsPreflight } from "@/lib/handlers/http";

export const runtime = "nodejs";

export function OPTIONS(req: Request) {
  return corsPreflight(req);
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await getEnvAsync();
    const identity = await authenticateAdmin(req);
    const { id } = await params;
    return await streamAttachment(identity, id);
  } catch (err) {
    if (err instanceof ApiError) {
      return Response.json({ error: err.message }, { status: err.status });
    }
    return errorResponse(err);
  }
}
