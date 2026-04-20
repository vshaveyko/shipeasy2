import { listKeySections } from "@/lib/handlers/i18n";
import { withAdmin } from "@/lib/handlers/http";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const profileId = url.searchParams.get("profile_id");
  if (!profileId) return new Response("profile_id required", { status: 400 });
  return withAdmin(req, (identity) => listKeySections(identity, profileId));
}
