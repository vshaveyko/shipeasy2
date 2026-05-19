import { gateCounts } from "@/lib/handlers/gates";
import { withAdmin, corsPreflight } from "@/lib/handlers/http";

export const runtime = "nodejs";

export async function GET(req: Request) {
  return withAdmin(req, (id) => gateCounts(id));
}

export function OPTIONS(req: Request) {
  return corsPreflight(req);
}
