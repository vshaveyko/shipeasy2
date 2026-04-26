import { getStorage } from "@/lib/handlers/projects";
import { withAdmin, corsPreflight } from "@/lib/handlers/http";

export const runtime = "nodejs";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return withAdmin(req, (idt) => getStorage(idt, id));
}

export function OPTIONS(req: Request) {
  return corsPreflight(req);
}
