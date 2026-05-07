import { ApiError } from "@shipeasy/core";
import { listSheetTabs } from "@/lib/handlers/connector-google";
import { withAdmin, corsPreflight } from "@/lib/handlers/http";

export const runtime = "nodejs";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const url = new URL(req.url);
  const spreadsheetId = url.searchParams.get("spreadsheetId");
  if (!spreadsheetId) throw new ApiError("Missing spreadsheetId", 400);
  return withAdmin(req, (identity) =>
    listSheetTabs(identity, id, spreadsheetId).then((tabs) => ({ tabs })),
  );
}

export function OPTIONS(req: Request) {
  return corsPreflight(req);
}
