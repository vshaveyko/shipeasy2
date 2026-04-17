import { updateDraft, deleteDraft } from "@/lib/handlers/i18n";
import { withAdmin, readJson } from "@/lib/handlers/http";

export const runtime = "nodejs";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await readJson(req);
  return withAdmin(req, (identity) => updateDraft(identity, id, body));
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return withAdmin(req, (identity) => deleteDraft(identity, id));
}
