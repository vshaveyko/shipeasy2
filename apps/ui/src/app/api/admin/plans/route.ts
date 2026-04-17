import { PLANS } from "@shipeasy/core";

export const runtime = "nodejs";

export async function GET() {
  return Response.json(PLANS);
}
