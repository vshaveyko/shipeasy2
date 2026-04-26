import { getAttribute, updateAttribute, deleteAttribute } from "@/lib/handlers/attributes";
import { withAdmin, readJson, corsPreflight } from "@/lib/handlers/http";

export const runtime = "nodejs";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return withAdmin(req, (idt) => getAttribute(idt, id));
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await readJson(req);
  return withAdmin(req, (idt) => updateAttribute(idt, id, body));
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return withAdmin(req, (idt) => deleteAttribute(idt, id));
}

export function OPTIONS(req: Request) {
  return corsPreflight(req);
}
