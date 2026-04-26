import { listExperimentTimeseries } from "@/lib/handlers/experiments";
import { withAdmin, corsPreflight } from "@/lib/handlers/http";

export const runtime = "nodejs";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const url = new URL(req.url);
  const metric = url.searchParams.get("metric") ?? undefined;
  return withAdmin(req, (idt) => listExperimentTimeseries(idt, id, metric));
}

export function OPTIONS(req: Request) {
  return corsPreflight(req);
}
