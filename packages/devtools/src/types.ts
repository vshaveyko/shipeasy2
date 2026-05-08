export interface DevtoolsOptions {
  /**
   * Admin app base URL. Defaults to the origin of the <script> tag that
   * loaded the devtools bundle, falling back to window.location.origin.
   * Override when embedding from a different admin deployment.
   */
  adminUrl?: string;
  /**
   * Force-hide every deep link from the overlay back into the ShipEasy
   * admin dashboard ("Open dashboard ↗", empty-state "Create new …" CTAs,
   * bug/feature row click-throughs). Use for white-labelled embeds where
   * the underlying ShipEasy URLs should not be exposed to the end user.
   *
   * If unset, the overlay also evaluates the ShipEasy gate
   * `HIDE_ADMIN_LINKS_GATE` against the customer's SDK bridge — so a
   * ShipEasy gate can flip this on at runtime without a redeploy. When
   * either source is true, links are hidden.
   */
  hideAdminLinks?: boolean;
}

/**
 * Name of the ShipEasy gate (evaluated via `window.__shipeasy.getFlag()`)
 * that, when ON, hides admin dashboard links in the devtools overlay.
 * The customer creates and toggles this gate in their own ShipEasy
 * project; devtools picks it up via the already-installed SDK bridge.
 */
export const HIDE_ADMIN_LINKS_GATE = "shipeasy_hide_admin_links";

export interface DevtoolsSession {
  token: string;
  projectId: string;
}

export interface ProjectModules {
  translations: boolean;
  configs: boolean;
  gates: boolean;
  experiments: boolean;
  feedback: boolean;
}

export interface ProjectRecord {
  id: string;
  name: string;
  domain: string | null;
  modules: ProjectModules;
}

/** Mirrors `originAllowed` in packages/worker/src/lib/auth.ts. */
export function projectOwnsHost(host: string, domain: string | null): boolean {
  if (!domain) return false;
  if (domain === "*") return true;
  if (domain.startsWith("*.")) return host.endsWith(domain.slice(1));
  return host === domain || host === `www.${domain}`;
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
  /** Name of the universe this experiment runs in. */
  universe: string;
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

export type BugStatus = "open" | "triaged" | "in_progress" | "resolved" | "wont_fix";

export interface BugRecord {
  id: string;
  title: string;
  status: BugStatus;
  reporterEmail: string | null;
  pageUrl: string | null;
  createdAt: string;
}

export interface BugCreateInput {
  title: string;
  stepsToReproduce: string;
  actualResult: string;
  expectedResult: string;
  pageUrl?: string;
  userAgent?: string;
  viewport?: string;
}

export type FeatureRequestStatus = "open" | "considering" | "planned" | "shipped" | "declined";
export type FeatureRequestImportance = "nice_to_have" | "important" | "critical";

export interface FeatureRequestRecord {
  id: string;
  title: string;
  status: FeatureRequestStatus;
  importance: FeatureRequestImportance;
  reporterEmail: string | null;
  pageUrl: string | null;
  createdAt: string;
}

export interface FeatureRequestCreateInput {
  title: string;
  description: string;
  useCase: string;
  importance: FeatureRequestImportance;
  pageUrl?: string;
  userAgent?: string;
}

export interface AttachmentUploadResult {
  id: string;
  filename: string;
  kind: "screenshot" | "recording" | "file";
  mimeType: string;
  sizeBytes: number;
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
