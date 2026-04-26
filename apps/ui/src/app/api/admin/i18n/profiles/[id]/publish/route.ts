import { publishProfile } from "@/lib/handlers/i18n";
import { withAdmin, readJson, corsPreflight } from "@/lib/handlers/http";

export const runtime = "nodejs";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await readJson(req).catch(() => ({}));
  return withAdmin(req, (identity) => publishProfile(identity, id, body as { chunk?: string }));
}

export function OPTIONS(req: Request) {
  return corsPreflight(req);
}
