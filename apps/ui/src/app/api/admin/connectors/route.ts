import { listConnectors, createConnector } from "@/lib/handlers/connectors";
import { withAdmin, withAdminCreated, readJson, corsPreflight } from "@/lib/handlers/http";

export const runtime = "nodejs";

export async function GET(req: Request) {
  return withAdmin(req, (id) => listConnectors(id));
}

export async function POST(req: Request) {
  const body = await readJson(req);
  return withAdminCreated(req, (id) => createConnector(id, body));
}

export function OPTIONS(req: Request) {
  return corsPreflight(req);
}
