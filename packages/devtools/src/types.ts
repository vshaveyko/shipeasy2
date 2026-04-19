export interface DevtoolsOptions {
  /** Admin dashboard base URL. Defaults to https://app.shipeasy.dev */
  adminUrl?: string;
  /** Edge worker base URL. Defaults to https://edge.shipeasy.dev */
  edgeUrl?: string;
}

export interface DevtoolsSession {
  token: string;
  projectId: string;
}

export interface GateRecord {
  id: string;
  name: string;
  enabled: boolean;
  killswitch: boolean;
  rolloutPct: number;
  updatedAt: string;
}

export interface ConfigRecord {
  id: string;
  name: string;
  valueJson: unknown;
  updatedAt: string;
}

export interface ExperimentRecord {
  id: string;
  name: string;
  status: "draft" | "running" | "stopped" | "archived";
  groups: Array<{ name: string; weight: number }>;
  updatedAt: string;
}

export interface ProfileRecord {
  id: string;
  name: string;
  createdAt: string;
}

export interface UniverseRecord {
  id: string;
  name: string;
  unitType: string;
  holdoutRange: [number, number] | null;
  createdAt: string;
}

export interface KeyRecord {
  id: string;
  key: string;
  value: string;
  profileId: string | null;
  createdAt: string;
}

export interface DraftRecord {
  id: string;
  name: string;
  profileId: string;
  status: string;
  createdAt: string;
}

export type OverridePersistence = "session" | "local";

/**
 * Bridge written to window.__shipeasy by the host framework integration.
 * Devtools reads from these to show live SDK evaluation results.
 */
export interface ShipeasySdkBridge {
  getFlag(name: string): boolean;
  getExperiment(name: string): { inExperiment: boolean; group: string } | undefined;
  getConfig(name: string): unknown;
}
