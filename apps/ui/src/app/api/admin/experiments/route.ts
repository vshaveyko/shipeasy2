import { listExperiments, createExperiment } from "@/lib/handlers/experiments";
import { withAdmin, withAdminCreated, readJson, corsPreflight } from "@/lib/handlers/http";
import { parsePageQuery } from "@/lib/handlers/_pagination";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const page = parsePageQuery(req);
  return withAdmin(req, (id) => listExperiments(id, page));
}

export async function POST(req: Request) {
  const body = await readJson(req);
  return withAdminCreated(req, (id) => createExperiment(id, body));
}

export function OPTIONS(req: Request) {
  return corsPreflight(req);
}
