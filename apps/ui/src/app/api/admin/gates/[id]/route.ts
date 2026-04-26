import { updateGate, deleteGate } from "@/lib/handlers/gates";
import { withAdmin, readJson, corsPreflight } from "@/lib/handlers/http";

export const runtime = "nodejs";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await readJson(req);
  return withAdmin(req, (idt) => updateGate(idt, id, body));
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return withAdmin(req, (idt) => deleteGate(idt, id));
}

export function OPTIONS(req: Request) {
  return corsPreflight(req);
}
