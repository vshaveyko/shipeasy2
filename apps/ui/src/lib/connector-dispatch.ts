import { eq } from "drizzle-orm";
import { connectors, type ConnectorEvent } from "@shipeasy/core/db/schema";
import {
  dispatchConnectors,
  type ConnectorPayload,
  type ConnectorRecord,
} from "@shipeasy/core/connectors";
import { scopedDbSA } from "./db";
import { getEnvAsync } from "./env";
import { rotateConnectorCipher } from "./handlers/connectors";

/**
 * Fetch all connectors for a project that subscribe to `event` and dispatch
 * `payload` to them. Errors are swallowed per-connector; this helper never
 * throws (the caller's primary write must not be rolled back by a sync error).
 *
 * Intended use: pass to Next.js `after()` so it runs after the response is
 * sent but inside the same Worker invocation.
 */
export async function dispatchProjectEvent(
  projectId: string,
  event: ConnectorEvent,
  payload: ConnectorPayload,
): Promise<void> {
  let env;
  try {
    env = await getEnvAsync();
  } catch {
    return; // no env in dev
  }
  if (!env.CONNECTOR_ENCRYPTION_KEY) return;
  const s = await scopedDbSA(projectId);
  const rows = await s.raw.select().from(connectors).where(eq(connectors.projectId, projectId));
  if (rows.length === 0) return;
  const records: ConnectorRecord[] = rows.map((r) => ({
    ...r,
    events: (r.events ?? []) as ConnectorEvent[],
    config: (r.config ?? {}) as Record<string, unknown>,
  }));
  const results = await dispatchConnectors({
    connectors: records,
    payload,
    ctx: {
      encryptionKey: env.CONNECTOR_ENCRYPTION_KEY,
      providerSecrets: {
        google:
          env.GOOGLE_CONNECTOR_CLIENT_ID && env.GOOGLE_CONNECTOR_CLIENT_SECRET
            ? {
                clientId: env.GOOGLE_CONNECTOR_CLIENT_ID,
                clientSecret: env.GOOGLE_CONNECTOR_CLIENT_SECRET,
              }
            : undefined,
      },
      onCredentialsRotated: (id, cipher) => rotateConnectorCipher(projectId, id, cipher),
    },
  });
  const failed = results.filter((r) => !r.ok);
  if (failed.length > 0) {
    console.error("[connectors] dispatch failures", { event, failed });
  }
}
