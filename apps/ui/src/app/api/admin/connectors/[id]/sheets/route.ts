import { listSpreadsheets } from "@/lib/handlers/connector-google";
import { withAdmin, corsPreflight } from "@/lib/handlers/http";

export const runtime = "nodejs";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return withAdmin(req, (identity) => listSpreadsheets(identity, id).then((files) => ({ files })));
}

export function OPTIONS(req: Request) {
  return corsPreflight(req);
}
