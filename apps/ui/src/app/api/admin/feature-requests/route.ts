import { listFeatureRequests, createFeatureRequest } from "@/lib/handlers/feature-requests";
import { withAdmin, withAdminCreated, readJson, corsPreflight } from "@/lib/handlers/http";

export const runtime = "nodejs";

export async function GET(req: Request) {
  return withAdmin(req, (id) => listFeatureRequests(id));
}

export async function POST(req: Request) {
  const body = await readJson(req);
  return withAdminCreated(req, (id) => createFeatureRequest(id, body));
}

export function OPTIONS(req: Request) {
  return corsPreflight(req);
}
