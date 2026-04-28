// Worker runtime bindings. Matches wrangler.toml — keep in sync when bindings
// are added or removed.

import type { CoreEnv } from "@shipeasy/core";

export interface AnalysisMessage {
  project_id: string;
  trigger: "daily" | "experiment_stopped" | "reanalyze";
  experiment?: string;
}

export interface WorkerEnv extends CoreEnv {
  // D1 + KV are defined on CoreEnv. Worker adds:
  CLI_TOKEN_KV?: KVNamespace;

  EXPOSURES?: AnalyticsEngineDataset;
  METRIC_EVENTS?: AnalyticsEngineDataset;
  I18N_REQUESTS?: AnalyticsEngineDataset;

  ANALYSIS_QUEUE?: Queue<AnalysisMessage>;
  I18N_USAGE_QUEUE?: Queue<{ project_id: string; trigger: "daily" | "manual" }>;
  EVENTS_R2?: R2Bucket;
  LABELS_R2?: R2Bucket;

  // vars
  CF_ACCOUNT_ID?: string;
  CF_API_TOKEN?: string;
  CF_ZONE_ID?: string;
  FLAGS_DOMAIN?: string;
  ANALYTICS_HOST?: string;
  CRONITOR_HEARTBEAT_URL?: string;
  CLI_SERVICE_SECRET?: string;

  // Stripe — secrets set via `wrangler secret put`
  STRIPE_SECRET_KEY?: string;
  STRIPE_WEBHOOK_SECRET?: string;
  STRIPE_PRICE_BASE_MONTHLY?: string;
  STRIPE_PRICE_BASE_ANNUAL?: string;
  STRIPE_PRICE_PER_EXPERIMENT?: string;
  STRIPE_PRICE_PER_GATE?: string;
  STRIPE_PRICE_PER_CONFIG?: string;
}
