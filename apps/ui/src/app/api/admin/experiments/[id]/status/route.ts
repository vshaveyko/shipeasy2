import { setExperimentStatus } from "@/lib/handlers/experiments";
import { withAdmin, readJson } from "@/lib/handlers/http";
import { experimentStatusUpdateSchema } from "@shipeasy/core/schemas/experiments";

export const runtime = "nodejs";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await readJson(req);
  const parsed = experimentStatusUpdateSchema.parse(body);
  return withAdmin(req, (idt) => setExperimentStatus(idt, id, parsed.status));
}
