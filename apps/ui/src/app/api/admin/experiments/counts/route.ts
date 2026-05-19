import { experimentCounts } from "@/lib/handlers/experiments";
import { withAdmin, corsPreflight } from "@/lib/handlers/http";

export const runtime = "nodejs";

export async function GET(req: Request) {
  return withAdmin(req, (id) => experimentCounts(id));
}

export function OPTIONS(req: Request) {
  return corsPreflight(req);
}
