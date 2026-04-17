import { listExperiments, createExperiment } from "@/lib/handlers/experiments";
import { withAdmin, withAdminCreated, readJson } from "@/lib/handlers/http";

export const runtime = "nodejs";

export async function GET(req: Request) {
  return withAdmin(req, (id) => listExperiments(id));
}

export async function POST(req: Request) {
  const body = await readJson(req);
  return withAdminCreated(req, (id) => createExperiment(id, body));
}
