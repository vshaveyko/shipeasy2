import { configCounts } from "@/lib/handlers/configs";
import { withAdmin, corsPreflight } from "@/lib/handlers/http";

export const runtime = "nodejs";

export async function GET(req: Request) {
  return withAdmin(req, (id) => configCounts(id));
}

export function OPTIONS(req: Request) {
  return corsPreflight(req);
}
