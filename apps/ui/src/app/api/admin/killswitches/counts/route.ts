import { killswitchCounts } from "@/lib/handlers/killswitches";
import { withAdmin, corsPreflight } from "@/lib/handlers/http";

export const runtime = "nodejs";

export async function GET(req: Request) {
  return withAdmin(req, (id) => killswitchCounts(id));
}

export function OPTIONS(req: Request) {
  return corsPreflight(req);
}
