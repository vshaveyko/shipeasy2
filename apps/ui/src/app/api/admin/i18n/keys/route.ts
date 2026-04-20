import { listKeys, upsertKeys } from "@/lib/handlers/i18n";
import { withAdmin, withAdminCreated, readJson } from "@/lib/handlers/http";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const profileId = url.searchParams.get("profile_id") ?? undefined;
  const prefix = url.searchParams.get("prefix") ?? undefined;
  const search = url.searchParams.get("q") ?? undefined;
  return withAdmin(req, (identity) => listKeys(identity, profileId, prefix, search));
}

export async function POST(req: Request) {
  const body = await readJson(req);
  return withAdminCreated(req, (identity) => upsertKeys(identity, body));
}
