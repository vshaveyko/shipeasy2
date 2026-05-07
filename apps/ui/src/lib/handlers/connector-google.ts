import { ApiError } from "@shipeasy/core";
import { getValidAccessToken } from "@shipeasy/core/connectors";
import type { AdminIdentity } from "../admin-auth";
import { getEnvAsync } from "../env";
import { getConnector, rotateConnectorCipher } from "./connectors";

async function googleClientCfg() {
  const env = await getEnvAsync();
  if (
    !env.GOOGLE_CONNECTOR_CLIENT_ID ||
    !env.GOOGLE_CONNECTOR_CLIENT_SECRET ||
    !env.CONNECTOR_ENCRYPTION_KEY
  ) {
    throw new ApiError(
      "Google connector not configured: missing GOOGLE_CONNECTOR_CLIENT_ID / GOOGLE_CONNECTOR_CLIENT_SECRET / CONNECTOR_ENCRYPTION_KEY",
      503,
    );
  }
  return {
    clientId: env.GOOGLE_CONNECTOR_CLIENT_ID,
    clientSecret: env.GOOGLE_CONNECTOR_CLIENT_SECRET,
    encryptionKey: env.CONNECTOR_ENCRYPTION_KEY,
  };
}

async function tokenFor(identity: AdminIdentity, connectorId: string): Promise<string> {
  const connector = await getConnector(identity, connectorId);
  if (connector.provider !== "google_sheets") throw new ApiError("Wrong connector provider", 400);
  if (!connector.credentialsCipher) throw new ApiError("Connector not authenticated", 409);
  const cfg = await googleClientCfg();
  const { accessToken, updatedCipher } = await getValidAccessToken({
    cipher: connector.credentialsCipher,
    encryptionKey: cfg.encryptionKey,
    clientId: cfg.clientId,
    clientSecret: cfg.clientSecret,
  });
  if (updatedCipher) await rotateConnectorCipher(identity.projectId, connectorId, updatedCipher);
  return accessToken;
}

type DriveFile = { id: string; name: string; modifiedTime?: string };

export async function listSpreadsheets(
  identity: AdminIdentity,
  connectorId: string,
): Promise<DriveFile[]> {
  const accessToken = await tokenFor(identity, connectorId);
  const url =
    "https://www.googleapis.com/drive/v3/files" +
    "?q=" +
    encodeURIComponent("mimeType='application/vnd.google-apps.spreadsheet' and trashed=false") +
    "&fields=files(id,name,modifiedTime)" +
    "&orderBy=modifiedTime%20desc" +
    "&pageSize=50";
  const res = await fetch(url, { headers: { authorization: `Bearer ${accessToken}` } });
  if (!res.ok) throw new ApiError(`Drive list failed: ${res.status}`, 502);
  const json = (await res.json()) as { files?: DriveFile[] };
  return json.files ?? [];
}

export async function listSheetTabs(
  identity: AdminIdentity,
  connectorId: string,
  spreadsheetId: string,
): Promise<{ title: string; sheetId: number }[]> {
  const accessToken = await tokenFor(identity, connectorId);
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(
    spreadsheetId,
  )}?fields=sheets.properties(sheetId,title)`;
  const res = await fetch(url, { headers: { authorization: `Bearer ${accessToken}` } });
  if (!res.ok) throw new ApiError(`Spreadsheet fetch failed: ${res.status}`, 502);
  const json = (await res.json()) as {
    sheets?: { properties?: { sheetId?: number; title?: string } }[];
  };
  return (json.sheets ?? [])
    .map((s) => s.properties)
    .filter((p): p is { sheetId: number; title: string } => !!p?.title && p?.sheetId !== undefined);
}
