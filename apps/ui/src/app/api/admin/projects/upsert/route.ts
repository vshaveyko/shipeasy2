import { upsertProject } from "@/lib/handlers/projects";
import { withAdmin, readJson, corsPreflight } from "@/lib/handlers/http";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const body = await readJson(req);
  return withAdmin(req, (identity) => upsertProject(identity, body));
}

export function OPTIONS(req: Request) {
  return corsPreflight(req);
}
