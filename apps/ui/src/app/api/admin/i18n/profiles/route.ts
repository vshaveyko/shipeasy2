import { listProfiles, createProfile } from "@/lib/handlers/i18n";
import { withAdmin, withAdminCreated, readJson, corsPreflight } from "@/lib/handlers/http";

export const runtime = "nodejs";

export async function GET(req: Request) {
  return withAdmin(req, (identity) => listProfiles(identity));
}

export async function POST(req: Request) {
  const body = await readJson(req);
  return withAdminCreated(req, (identity) => createProfile(identity, body));
}

export function OPTIONS(req: Request) {
  return corsPreflight(req);
}
