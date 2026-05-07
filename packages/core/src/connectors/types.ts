import type { ConnectorEvent, ConnectorProvider } from "../db/schema";

export type { ConnectorEvent, ConnectorProvider };

export type ConnectorRecord = {
  id: string;
  projectId: string;
  provider: ConnectorProvider;
  name: string;
  enabled: boolean;
  events: ConnectorEvent[];
  config: Record<string, unknown>;
  credentialsCipher: string | null;
  accountLabel: string | null;
  createdAt: string;
  updatedAt: string;
};

export type BugCreatedPayload = {
  type: "bug.created";
  id: string;
  projectId: string;
  title: string;
  stepsToReproduce: string;
  actualResult: string;
  expectedResult: string;
  status: string;
  reporterEmail: string | null;
  pageUrl: string | null;
  userAgent: string | null;
  viewport: string | null;
  context: Record<string, unknown> | null;
  createdAt: string;
};

export type FeatureRequestCreatedPayload = {
  type: "feature_request.created";
  id: string;
  projectId: string;
  title: string;
  description: string;
  useCase: string;
  importance: string;
  status: string;
  reporterEmail: string | null;
  pageUrl: string | null;
  userAgent: string | null;
  context: Record<string, unknown> | null;
  createdAt: string;
};

export type ConnectorPayload = BugCreatedPayload | FeatureRequestCreatedPayload;

export type ProviderSecrets = {
  google?: { clientId: string; clientSecret: string };
};

export type DispatchContext = {
  encryptionKey: string;
  providerSecrets: ProviderSecrets;
  /** Called when a refresh token rotation produced a new ciphertext. */
  onCredentialsRotated?: (connectorId: string, newCipher: string) => Promise<void> | void;
  fetch?: typeof fetch;
};

export type ConnectorDriver = {
  provider: ConnectorProvider;
  /** Send a single lifecycle event to this connector. Throws on failure. */
  dispatch: (
    connector: ConnectorRecord,
    payload: ConnectorPayload,
    ctx: DispatchContext,
  ) => Promise<void>;
};
