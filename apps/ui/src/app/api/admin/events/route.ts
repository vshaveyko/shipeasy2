import { listEvents, createEvent } from "@/lib/handlers/events";
import { withAdmin, withAdminCreated, readJson, corsPreflight } from "@/lib/handlers/http";

export const runtime = "nodejs";

export async function GET(req: Request) {
  return withAdmin(req, (id) => listEvents(id));
}

export async function POST(req: Request) {
  const body = await readJson(req);
  return withAdminCreated(req, (id) => createEvent(id, body));
}

export function OPTIONS(req: Request) {
  return corsPreflight(req);
}
