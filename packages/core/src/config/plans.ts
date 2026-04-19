// Plans are compiled at build time from experiment-platform/plans.yaml.
// See 02-kv-cache.md § "Plans are NOT in KV".

import type { PlanName } from "../types";

export interface Plan {
  name: PlanName;
  display_name: string;
  price_usd_per_month: number;

  poll_interval_seconds: number;

  max_flags: number;
  max_configs: number;
  max_experiments_running: number;
  max_universes: number;
  max_groups_per_experiment: number;
  max_metrics: number;
  max_events_catalog: number;
  max_sdk_keys: number;
  max_team_members: number;

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
    poll_interval_seconds: 300,
    max_flags: 50,
    max_configs: 20,
    max_experiments_running: 1,
    max_universes: 3,
    max_groups_per_experiment: 5,
    max_metrics: 15,
    max_events_catalog: 20,
    max_sdk_keys: 5,
    max_team_members: 1,
    max_events_per_day: 10_000_000,
    max_evaluate_per_day: 500_000,
    analysis_frequency: "daily",
    results_retention_days: 30,
    results_final_archive_days: 365,
    ae_retention_days: 90,
    holdout_groups: true,
    cuped_enabled: false,
    srm_detection: true,
    data_export: false,
    mcp_access: false,
    audit_log_retention_days: 7,
    custom_significance_threshold: false,
    sequential_testing: false,
    durable_ingestion: false,
  },
  pro: {
    name: "pro",
    display_name: "Pro",
    price_usd_per_month: 49,
    poll_interval_seconds: 60,
    max_flags: 200,
    max_configs: 100,
    max_experiments_running: 10,
    max_universes: 10,
    max_groups_per_experiment: 5,
    max_metrics: 50,
    max_events_catalog: 100,
    max_sdk_keys: 20,
    max_team_members: 5,
    max_events_per_day: 100_000_000,
    max_evaluate_per_day: 5_000_000,
    analysis_frequency: "daily",
    results_retention_days: 90,
    results_final_archive_days: 730,
    ae_retention_days: 90,
    holdout_groups: true,
    cuped_enabled: true,
    srm_detection: true,
    data_export: false,
    mcp_access: true,
    audit_log_retention_days: 30,
    custom_significance_threshold: true,
    sequential_testing: false,
    durable_ingestion: false,
  },
  premium: {
    name: "premium",
    display_name: "Premium",
    price_usd_per_month: 199,
    poll_interval_seconds: 30,
    max_flags: 500,
    max_configs: 500,
    max_experiments_running: 25,
    max_universes: 25,
    max_groups_per_experiment: 10,
    max_metrics: 200,
    max_events_catalog: 500,
    max_sdk_keys: 100,
    max_team_members: 20,
    max_events_per_day: 500_000_000,
    max_evaluate_per_day: 25_000_000,
    analysis_frequency: "daily",
    results_retention_days: 180,
    results_final_archive_days: 1095,
    ae_retention_days: 180,
    holdout_groups: true,
    cuped_enabled: true,
    srm_detection: true,
    data_export: false,
    mcp_access: true,
    audit_log_retention_days: 90,
    custom_significance_threshold: true,
    sequential_testing: true,
    durable_ingestion: true,
  },
  enterprise: {
    name: "enterprise",
    display_name: "Enterprise",
    price_usd_per_month: -1,
    poll_interval_seconds: 10,
    max_flags: -1,
    max_configs: -1,
    max_experiments_running: -1,
    max_universes: -1,
    max_groups_per_experiment: -1,
    max_metrics: -1,
    max_events_catalog: -1,
    max_sdk_keys: -1,
    max_team_members: -1,
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
