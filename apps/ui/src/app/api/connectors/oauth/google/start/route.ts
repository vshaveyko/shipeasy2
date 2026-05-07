import { NextResponse } from "next/server";
import { ApiError } from "@shipeasy/core";
import { GOOGLE_SHEETS_SCOPES } from "@shipeasy/core/connectors";
import { authenticateAdmin } from "@/lib/admin-auth";
import { getEnvAsync } from "@/lib/env";
import { getConnector } from "@/lib/handlers/connectors";

export const runtime = "nodejs";

function redirectUriFrom(req: Request, appUrl: string | undefined): string {
  const origin = appUrl ?? new URL(req.url).origin;
  return `${origin.replace(/\/$/, "")}/api/connectors/oauth/google/callback`;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const connectorId = url.searchParams.get("connectorId");
  if (!connectorId) {
    return NextResponse.json({ error: "Missing connectorId" }, { status: 400 });
  }
  try {
    const identity = await authenticateAdmin(req);
    // Verify connector belongs to caller's project before issuing redirect.
    await getConnector(identity, connectorId);

    const env = await getEnvAsync();
    if (!env.GOOGLE_CONNECTOR_CLIENT_ID) {
      throw new ApiError("GOOGLE_CONNECTOR_CLIENT_ID not configured", 503);
    }
    const state = `${connectorId}.${identity.projectId}.${crypto.randomUUID()}`;
    const redirectUri = redirectUriFrom(req, env.APP_URL);
    const params = new URLSearchParams({
      client_id: env.GOOGLE_CONNECTOR_CLIENT_ID,
      redirect_uri: redirectUri,
      response_type: "code",
      access_type: "offline",
      include_granted_scopes: "true",
      prompt: "consent",
      scope: GOOGLE_SHEETS_SCOPES.join(" "),
      state,
    });
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
    const res = NextResponse.redirect(authUrl);
    // httpOnly cookie carries the state; callback compares against ?state.
    res.cookies.set("se_connector_oauth", state, {
      httpOnly: true,
      sameSite: "lax",
      secure: true,
      path: "/",
      maxAge: 600,
    });
    return res;
  } catch (err) {
    if (err instanceof ApiError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
