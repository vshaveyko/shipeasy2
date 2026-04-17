import { deleteProfile } from "@/lib/handlers/i18n";
import { withAdmin } from "@/lib/handlers/http";

export const runtime = "nodejs";

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return withAdmin(req, (identity) => deleteProfile(identity, id));
}
