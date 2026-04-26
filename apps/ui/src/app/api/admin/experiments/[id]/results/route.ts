import { listExperimentResults } from "@/lib/handlers/experiments";
import { withAdmin, corsPreflight } from "@/lib/handlers/http";

export const runtime = "nodejs";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return withAdmin(req, (idt) => listExperimentResults(idt, id));
}

export function OPTIONS(req: Request) {
  return corsPreflight(req);
}
