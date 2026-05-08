import { NextResponse } from "next/server";
import { encryptJSON, exchangeAuthCode } from "@shipeasy/core/connectors";
import { getEnvAsync } from "@/lib/env";
import { attachConnectorCredentials } from "@/lib/handlers/connectors";

export const runtime = "nodejs";

function redirectUriFrom(req: Request, appUrl: string | undefined): string {
  const origin = appUrl ?? new URL(req.url).origin;
  return `${origin.replace(/\/$/, "")}/api/connectors/oauth/google/callback`;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");

  const cookieHeader = req.headers.get("cookie") ?? "";
  const cookieState = cookieHeader
    .split(/;\s*/)
    .find((c) => c.startsWith("se_connector_oauth="))
    ?.slice("se_connector_oauth=".length);

  // Whatever happens we want to bounce back to the feedback page (which
  // hosts the connectors modal). The modal auto-opens when ?connector=<id>
  // or ?connectors=open is present.
  const back = (qs: string) => NextResponse.redirect(new URL(`/dashboard/feedback?${qs}`, req.url));

  if (error) return back(`connectors=open&error=${encodeURIComponent(error)}`);
  if (!code || !state || !cookieState || cookieState !== state) {
    return back("connectors=open&error=invalid_state");
  }

  const [connectorId, projectId] = state.split(".");
  if (!connectorId || !projectId) return back("connectors=open&error=bad_state");

  try {
    const env = await getEnvAsync();
    if (
      !env.GOOGLE_CONNECTOR_CLIENT_ID ||
      !env.GOOGLE_CONNECTOR_CLIENT_SECRET ||
      !env.CONNECTOR_ENCRYPTION_KEY
    ) {
      return back("error=server_unconfigured");
    }
    const { creds } = await exchangeAuthCode({
      code,
      clientId: env.GOOGLE_CONNECTOR_CLIENT_ID,
      clientSecret: env.GOOGLE_CONNECTOR_CLIENT_SECRET,
      redirectUri: redirectUriFrom(req, env.APP_URL),
    });
    const cipher = await encryptJSON(creds, env.CONNECTOR_ENCRYPTION_KEY);
    await attachConnectorCredentials(projectId, connectorId, {
      credentialsCipher: cipher,
      accountLabel: creds.account_email ?? null,
      enabled: false, // user must still pick a sheet/tab
    });
    const res = back(`connector=${encodeURIComponent(connectorId)}&connected=1`);
    res.cookies.delete("se_connector_oauth");
    return res;
  } catch (e) {
    return back(`connectors=open&error=${encodeURIComponent((e as Error).message)}`);
  }
}
