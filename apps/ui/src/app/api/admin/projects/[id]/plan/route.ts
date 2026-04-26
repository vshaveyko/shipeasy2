import { updateProjectPlan } from "@/lib/handlers/projects";
import { withAdmin, readJson, corsPreflight } from "@/lib/handlers/http";

export const runtime = "nodejs";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await readJson(req);
  return withAdmin(req, (idt) => updateProjectPlan(idt, id, body));
}

export function OPTIONS(req: Request) {
  return corsPreflight(req);
}
