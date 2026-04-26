import { listAttributes, createAttribute } from "@/lib/handlers/attributes";
import { withAdmin, withAdminCreated, readJson, corsPreflight } from "@/lib/handlers/http";

export const runtime = "nodejs";

export async function GET(req: Request) {
  return withAdmin(req, (id) => listAttributes(id));
}

export async function POST(req: Request) {
  const body = await readJson(req);
  return withAdminCreated(req, (id) => createAttribute(id, body));
}

export function OPTIONS(req: Request) {
  return corsPreflight(req);
}
