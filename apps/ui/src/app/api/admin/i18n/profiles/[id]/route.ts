import { deleteProfile } from "@/lib/handlers/i18n";
import { withAdmin, corsPreflight } from "@/lib/handlers/http";

export const runtime = "nodejs";

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return withAdmin(req, (identity) => deleteProfile(identity, id));
}

export function OPTIONS(req: Request) {
  return corsPreflight(req);
}
