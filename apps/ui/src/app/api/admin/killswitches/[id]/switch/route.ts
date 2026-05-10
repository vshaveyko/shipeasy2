import { setKillswitchSwitch, unsetKillswitchSwitch } from "@/lib/handlers/killswitches";
import { withAdmin, readJson, corsPreflight } from "@/lib/handlers/http";

export const runtime = "nodejs";

/** Set a single switch entry. Body: { env, switchKey, value } */
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await readJson(req);
  return withAdmin(req, (idt) => setKillswitchSwitch(idt, id, body));
}

/** Remove a single switch entry. Body: { env, switchKey } */
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await readJson(req);
  return withAdmin(req, (idt) => unsetKillswitchSwitch(idt, id, body));
}

export function OPTIONS(req: Request) {
  return corsPreflight(req);
}
