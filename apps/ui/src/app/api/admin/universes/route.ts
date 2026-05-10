import { listUniverses, createUniverse } from "@/lib/handlers/universes";
import { withAdmin, withAdminCreated, readJson, corsPreflight } from "@/lib/handlers/http";
import { parsePageQuery } from "@/lib/handlers/_pagination";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const page = parsePageQuery(req);
  return withAdmin(req, (id) => listUniverses(id, page));
}

export async function POST(req: Request) {
  const body = await readJson(req);
  return withAdminCreated(req, (id) => createUniverse(id, body));
}

export function OPTIONS(req: Request) {
  return corsPreflight(req);
}
