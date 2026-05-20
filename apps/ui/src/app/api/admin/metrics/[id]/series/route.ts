import { getMetricSeries } from "@/lib/handlers/metric-series";
import { withAdmin, readJson, corsPreflight } from "@/lib/handlers/http";

export const runtime = "nodejs";

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const body = await readJson(req);
  return withAdmin(req, (identity) => getMetricSeries(identity, id, body));
}

export function OPTIONS(req: Request) {
  return corsPreflight(req);
}
