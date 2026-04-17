import { setGateEnabled } from "@/lib/handlers/gates";
import { withAdmin } from "@/lib/handlers/http";

export const runtime = "nodejs";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return withAdmin(req, (idt) => setGateEnabled(idt, id, false));
}
