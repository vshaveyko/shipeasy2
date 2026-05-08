import { ApiError } from "@shipeasy/core";
import { authenticateAdmin, errorResponse } from "@/lib/admin-auth";
import { getEnvAsync } from "@/lib/env";
import { streamAttachment } from "@/lib/handlers/report-attachments";
import { applyCors, corsPreflight } from "@/lib/handlers/http";

export const runtime = "nodejs";

export function OPTIONS(req: Request) {
  return corsPreflight(req);
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await getEnvAsync();
    const identity = await authenticateAdmin(req);
    const { id } = await params;
    // streamAttachment returns a binary Response — CORS headers aren't
    // attached for us by withAdmin (which only handles JSON), so we apply
    // them here. Without this the devtools fetch from a customer page
    // origin fails the CORS check.
    return applyCors(req, await streamAttachment(identity, id));
  } catch (err) {
    if (err instanceof ApiError) {
      return applyCors(req, Response.json({ error: err.message }, { status: err.status }));
    }
    return applyCors(req, errorResponse(err));
  }
}
