import { getConnector, updateConnector, deleteConnector } from "@/lib/handlers/connectors";
import { withAdmin, readJson, corsPreflight } from "@/lib/handlers/http";

export const runtime = "nodejs";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return withAdmin(req, (identity) => getConnector(identity, id));
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await readJson(req);
  return withAdmin(req, (identity) => updateConnector(identity, id, body));
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return withAdmin(req, (identity) => deleteConnector(identity, id));
}

export function OPTIONS(req: Request) {
  return corsPreflight(req);
}
