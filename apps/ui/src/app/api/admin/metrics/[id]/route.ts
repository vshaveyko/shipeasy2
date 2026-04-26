import { getMetric, updateMetric, deleteMetric } from "@/lib/handlers/metrics";
import { withAdmin, readJson, corsPreflight } from "@/lib/handlers/http";

export const runtime = "nodejs";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return withAdmin(req, (idt) => getMetric(idt, id));
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await readJson(req);
  return withAdmin(req, (idt) => updateMetric(idt, id, body));
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return withAdmin(req, (idt) => deleteMetric(idt, id));
}

export function OPTIONS(req: Request) {
  return corsPreflight(req);
}
