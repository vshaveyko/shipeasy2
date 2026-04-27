// Plans are compiled at build time from experiment-platform/plans.yaml.
// See 02-kv-cache.md § "Plans are NOT in KV".

import type { PlanName } from "../types";

export interface Plan {
  name: PlanName;
  display_name: string;
  /** 0 = free, -1 = usage-based (Stripe manages) */
  price_usd_per_month: number;
  trial_days: number;

  poll_interval_seconds: number;

  // -1 means unlimited (platform ceiling in limits.ts applies)
  max_flags: number;
  max_configs: number;
  max_experiments_running: number;
  max_universes: number;
  max_groups_per_experiment: number;
  max_metrics: number;
  max_events_catalog: number;
  max_sdk_keys: number;
  max_team_members: number;
  max_i18n_keys: number;
  max_i18n_profiles: number;

  max_events_per_day: number;
  max_evaluate_per_day: number;

  analysis_frequency: "daily";
  results_retention_days: number;
  results_final_archive_days: number;
  ae_retention_days: number;

  holdout_groups: boolean;
  cuped_enabled: boolean;
  srm_detection: boolean;
  data_export: boolean;
  mcp_access: boolean;
  audit_log_retention_days: number;
  custom_significance_threshold: boolean;
  sequential_testing: boolean;
  durable_ingestion: boolean;
}

export const PLANS: Record<PlanName, Plan> = {
  free: {
    name: "free",
    display_name: "Free",
    price_usd_per_month: 0,
    trial_days: 0,
    poll_interval_seconds: 300,
    max_flags: 3,
    max_configs: 1,
    max_experiments_running: 1,
    max_universes: 1,
    max_groups_per_experiment: 2,
    max_metrics: 5,
    max_events_catalog: 5,
    max_sdk_keys: 3,
    max_team_members: 1,
    max_i18n_keys: 250,
    max_i18n_profiles: 1,
    max_events_per_day: 1_000_000,
    max_evaluate_per_day: 50_000,
    analysis_frequency: "daily",
    results_retention_days: 30,
    results_final_archive_days: 90,
    ae_retention_days: 30,
    holdout_groups: false,
    cuped_enabled: false,
    srm_detection: true,
    data_export: false,
    mcp_access: true,
    audit_log_retention_days: 7,
    custom_significance_threshold: false,
    sequential_testing: false,
    durable_ingestion: false,
  },
  paid: {
    name: "paid",
    display_name: "Paid",
    price_usd_per_month: -1,
    trial_days: 14,
    poll_interval_seconds: 60,
    max_flags: -1,
    max_configs: -1,
    max_experiments_running: -1,
    max_universes: -1,
    max_groups_per_experiment: -1,
    max_metrics: -1,
    max_events_catalog: -1,
    max_sdk_keys: -1,
    max_team_members: -1,
    max_i18n_keys: -1,
    max_i18n_profiles: -1,
    max_events_per_day: -1,
    max_evaluate_per_day: -1,
    analysis_frequency: "daily",
    results_retention_days: 365,
    results_final_archive_days: 1825,
    ae_retention_days: 540,
    holdout_groups: true,
    cuped_enabled: true,
    srm_detection: true,
    data_export: true,
    mcp_access: true,
    audit_log_retention_days: 365,
    custom_significance_threshold: true,
    sequential_testing: true,
    durable_ingestion: true,
  },
};

export function getPlan(name: string): Plan {
  const plan = PLANS[name as PlanName];
  if (!plan) throw new Error(`Unknown plan: ${name}`);
  return plan;
}
