import { saveDraft, discardDraft } from "@/lib/handlers/configs";
import { withAdmin, readJson, corsPreflight } from "@/lib/handlers/http";

export const runtime = "nodejs";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await readJson(req);
  return withAdmin(req, (idt) => saveDraft(idt, id, body));
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await readJson(req);
  return withAdmin(req, (idt) => discardDraft(idt, id, body));
}

export function OPTIONS(req: Request) {
  return corsPreflight(req);
}
