import { listConfigActivity } from "@/lib/handlers/configs";
import { withAdmin, corsPreflight } from "@/lib/handlers/http";

export const runtime = "nodejs";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const url = new URL(req.url);
  const limitRaw = url.searchParams.get("limit");
  const limit = limitRaw ? Math.min(Math.max(Number(limitRaw) || 20, 1), 100) : 20;
  return withAdmin(req, (idt) => listConfigActivity(idt, id, limit));
}

export function OPTIONS(req: Request) {
  return corsPreflight(req);
}
