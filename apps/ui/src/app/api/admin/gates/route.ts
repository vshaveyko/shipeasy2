import { listGates, createGate } from "@/lib/handlers/gates";
import { withAdmin, withAdminCreated, readJson, corsPreflight } from "@/lib/handlers/http";

export const runtime = "nodejs";

export async function GET(req: Request) {
  return withAdmin(req, (id) => listGates(id));
}

export async function POST(req: Request) {
  const body = await readJson(req);
  return withAdminCreated(req, (id) => createGate(id, body));
}

export function OPTIONS(req: Request) {
  return corsPreflight(req);
}
