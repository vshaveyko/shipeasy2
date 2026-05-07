import { googleSheetsDriver } from "./google-sheets";
import type {
  ConnectorDriver,
  ConnectorPayload,
  ConnectorProvider,
  ConnectorRecord,
  DispatchContext,
} from "./types";

export * from "./types";
export { encryptJSON, decryptJSON } from "./crypto";
export {
  GOOGLE_SHEETS_SCOPES,
  exchangeAuthCode,
  getValidAccessToken,
  type GoogleSheetsConfig,
} from "./google-sheets";

const DRIVERS: Record<ConnectorProvider, ConnectorDriver> = {
  google_sheets: googleSheetsDriver,
};

export function getConnectorDriver(provider: ConnectorProvider): ConnectorDriver {
  return DRIVERS[provider];
}

export type DispatchResult = {
  connectorId: string;
  ok: boolean;
  error?: string;
};

/**
 * Dispatch a lifecycle event to every enabled connector that subscribes to it.
 * Errors per connector are caught and reported individually — one bad connector
 * never blocks another, and never fails the parent operation.
 */
export async function dispatchConnectors(args: {
  connectors: ConnectorRecord[];
  payload: ConnectorPayload;
  ctx: DispatchContext;
}): Promise<DispatchResult[]> {
  const matches = args.connectors.filter((c) => c.enabled && c.events.includes(args.payload.type));
  return Promise.all(
    matches.map(async (c): Promise<DispatchResult> => {
      try {
        const driver = getConnectorDriver(c.provider);
        await driver.dispatch(c, args.payload, args.ctx);
        return { connectorId: c.id, ok: true };
      } catch (e) {
        return { connectorId: c.id, ok: false, error: (e as Error).message };
      }
    }),
  );
}
