import { decryptJSON, encryptJSON } from "./crypto";
import type { ConnectorDriver, ConnectorPayload, ConnectorRecord, DispatchContext } from "./types";

export const GOOGLE_SHEETS_SCOPES = [
  "https://www.googleapis.com/auth/spreadsheets",
  "https://www.googleapis.com/auth/drive.metadata.readonly",
  "openid",
  "email",
];

export type GoogleSheetsConfig = {
  spreadsheetId: string;
  spreadsheetName?: string;
  sheetTitle: string;
};

type StoredCreds = {
  access_token: string;
  refresh_token: string;
  expires_at: number; // ms epoch
  scope: string;
  account_email?: string;
};

type GoogleTokenResponse = {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  scope: string;
  token_type: string;
  id_token?: string;
};

export async function exchangeAuthCode(args: {
  code: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  fetch?: typeof fetch;
}): Promise<{ creds: StoredCreds; rawIdToken?: string }> {
  const f = args.fetch ?? fetch;
  const res = await f("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code: args.code,
      client_id: args.clientId,
      client_secret: args.clientSecret,
      redirect_uri: args.redirectUri,
      grant_type: "authorization_code",
    }),
  });
  if (!res.ok) throw new Error(`Google token exchange failed: ${res.status} ${await res.text()}`);
  const json = (await res.json()) as GoogleTokenResponse;
  if (!json.refresh_token) {
    throw new Error("Google did not return a refresh_token. Re-consent with prompt=consent.");
  }
  let accountEmail: string | undefined;
  if (json.id_token) {
    try {
      const payload = JSON.parse(
        atob(json.id_token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")),
      );
      accountEmail = payload.email;
    } catch {
      // ignore
    }
  }
  return {
    rawIdToken: json.id_token,
    creds: {
      access_token: json.access_token,
      refresh_token: json.refresh_token,
      expires_at: Date.now() + json.expires_in * 1000,
      scope: json.scope,
      account_email: accountEmail,
    },
  };
}

async function refreshAccessToken(args: {
  creds: StoredCreds;
  clientId: string;
  clientSecret: string;
  fetch?: typeof fetch;
}): Promise<StoredCreds> {
  const f = args.fetch ?? fetch;
  const res = await f("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: args.clientId,
      client_secret: args.clientSecret,
      refresh_token: args.creds.refresh_token,
      grant_type: "refresh_token",
    }),
  });
  if (!res.ok) throw new Error(`Google token refresh failed: ${res.status} ${await res.text()}`);
  const json = (await res.json()) as GoogleTokenResponse;
  return {
    ...args.creds,
    access_token: json.access_token,
    expires_at: Date.now() + json.expires_in * 1000,
    scope: json.scope ?? args.creds.scope,
  };
}

export async function getValidAccessToken(args: {
  cipher: string;
  encryptionKey: string;
  clientId: string;
  clientSecret: string;
  fetch?: typeof fetch;
}): Promise<{ accessToken: string; updatedCipher: string | null; creds: StoredCreds }> {
  const creds = await decryptJSON<StoredCreds>(args.cipher, args.encryptionKey);
  if (creds.expires_at - 60_000 > Date.now()) {
    return { accessToken: creds.access_token, updatedCipher: null, creds };
  }
  const refreshed = await refreshAccessToken({
    creds,
    clientId: args.clientId,
    clientSecret: args.clientSecret,
    fetch: args.fetch,
  });
  const updatedCipher = await encryptJSON(refreshed, args.encryptionKey);
  return { accessToken: refreshed.access_token, updatedCipher, creds: refreshed };
}

function rowFor(payload: ConnectorPayload): string[] {
  if (payload.type === "bug.created") {
    return [
      payload.createdAt,
      "bug",
      payload.id,
      payload.title,
      payload.status,
      payload.reporterEmail ?? "",
      payload.pageUrl ?? "",
      payload.stepsToReproduce,
      payload.actualResult,
      payload.expectedResult,
    ];
  }
  return [
    payload.createdAt,
    "feature_request",
    payload.id,
    payload.title,
    payload.status,
    payload.reporterEmail ?? "",
    payload.pageUrl ?? "",
    payload.importance,
    payload.description,
    payload.useCase,
  ];
}

export const googleSheetsDriver: ConnectorDriver = {
  provider: "google_sheets",
  async dispatch(connector: ConnectorRecord, payload: ConnectorPayload, ctx: DispatchContext) {
    if (!connector.credentialsCipher) throw new Error("Connector is not authenticated");
    const cfg = connector.config as unknown as GoogleSheetsConfig;
    if (!cfg.spreadsheetId || !cfg.sheetTitle)
      throw new Error("Connector missing sheet/tab config");

    if (!ctx.providerSecrets.google) {
      throw new Error("Google connector credentials are not configured");
    }
    const { clientId, clientSecret } = ctx.providerSecrets.google;

    const { accessToken, updatedCipher } = await getValidAccessToken({
      cipher: connector.credentialsCipher,
      encryptionKey: ctx.encryptionKey,
      clientId,
      clientSecret,
      fetch: ctx.fetch,
    });
    if (updatedCipher && ctx.onCredentialsRotated) {
      await ctx.onCredentialsRotated(connector.id, updatedCipher);
    }

    const f = ctx.fetch ?? fetch;
    const range = encodeURIComponent(`${cfg.sheetTitle}!A1`);
    const url =
      `https://sheets.googleapis.com/v4/spreadsheets/${cfg.spreadsheetId}/values/${range}` +
      `:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`;
    const body = JSON.stringify({ values: [rowFor(payload)] });
    const res = await f(url, {
      method: "POST",
      headers: {
        authorization: `Bearer ${accessToken}`,
        "content-type": "application/json",
      },
      body,
    });
    if (!res.ok) {
      throw new Error(`Sheets append failed: ${res.status} ${await res.text()}`);
    }
  },
};
