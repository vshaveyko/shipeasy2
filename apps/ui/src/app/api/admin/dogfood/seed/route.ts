import { seedDogfood } from "@/lib/handlers/dogfood-seed";
import { withAdminCreated, corsPreflight } from "@/lib/handlers/http";

export const runtime = "nodejs";

export async function POST(req: Request) {
  return withAdminCreated(req, (identity) => seedDogfood(identity));
}

export function OPTIONS(req: Request) {
  return corsPreflight(req);
}
