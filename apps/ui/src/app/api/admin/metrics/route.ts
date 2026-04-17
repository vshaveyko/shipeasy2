import { listMetrics, createMetric } from "@/lib/handlers/metrics";
import { withAdmin, withAdminCreated, readJson } from "@/lib/handlers/http";

export const runtime = "nodejs";

export async function GET(req: Request) {
  return withAdmin(req, (id) => listMetrics(id));
}

export async function POST(req: Request) {
  const body = await readJson(req);
  return withAdminCreated(req, (id) => createMetric(id, body));
}
