import { listExperimentResults } from "@/lib/handlers/experiments";
import { withAdmin } from "@/lib/handlers/http";

export const runtime = "nodejs";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return withAdmin(req, (idt) => listExperimentResults(idt, id));
}
