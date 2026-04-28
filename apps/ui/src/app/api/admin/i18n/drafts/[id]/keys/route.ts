import { listDraftKeys, upsertDraftKey } from "@/lib/handlers/i18n";
import { withAdmin, withAdminCreated, readJson, corsPreflight } from "@/lib/handlers/http";
import { z } from "zod";

export const runtime = "nodejs";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return withAdmin(req, (identity) => listDraftKeys(identity, id));
}

const upsertSchema = z.object({
  key: z.string().min(1).max(256),
  value: z.string(),
  description: z.string().optional(),
});

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = upsertSchema.parse(await readJson(req));
  return withAdminCreated(req, (identity) =>
    upsertDraftKey(identity, id, body.key, body.value, body.description),
  );
}

export function OPTIONS(req: Request) {
  return corsPreflight(req);
}
