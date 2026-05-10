import { listKillswitches, createKillswitch } from "@/lib/handlers/killswitches";
import { withAdmin, withAdminCreated, readJson, corsPreflight } from "@/lib/handlers/http";
import { parsePageQuery } from "@/lib/handlers/_pagination";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const page = parsePageQuery(req);
  return withAdmin(req, (id) => listKillswitches(id, page));
}

export async function POST(req: Request) {
  const body = await readJson(req);
  return withAdminCreated(req, (id) => createKillswitch(id, body));
}

export function OPTIONS(req: Request) {
  return corsPreflight(req);
}
