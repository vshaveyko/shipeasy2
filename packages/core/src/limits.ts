// checkLimit() — plan enforcement before every INSERT.

import { and, count, eq, isNull, ne } from "drizzle-orm";
import { getDb } from "./db";
import {
  gates,
  configs,
  experiments,
  universes,
  metrics,
  events,
  sdkKeys,
  labelKeys,
  labelProfiles,
} from "./db/schema";
import { ApiError } from "./errors";
import type { Plan } from "./config/plans";

export type LimitResource =
  | "flags"
  | "configs"
  | "experiments_running"
  | "universes"
  | "metrics"
  | "events_catalog"
  | "sdk_keys"
  | "i18n_keys"
  | "i18n_profiles";

const PLATFORM_LIMITS: Record<LimitResource, number> = {
  flags: 40_000,
  configs: 10_000,
  experiments_running: 1_000,
  universes: 500,
  metrics: 5_000,
  events_catalog: 20_000,
  sdk_keys: 1_000,
  i18n_keys: 500_000,
  i18n_profiles: 100,
};

export async function checkLimit(
  d1: D1Database,
  projectId: string,
  resource: LimitResource,
  plan: Plan,
): Promise<void> {
  const planLimits: Record<LimitResource, number> = {
    flags: plan.max_flags,
    configs: plan.max_configs,
    experiments_running: plan.max_experiments_running,
    universes: plan.max_universes,
    metrics: plan.max_metrics,
    events_catalog: plan.max_events_catalog,
    sdk_keys: plan.max_sdk_keys,
    i18n_keys: plan.max_i18n_keys,
    i18n_profiles: plan.max_i18n_profiles,
  };

  const planLimit = planLimits[resource];
  const effectiveLimit = planLimit === -1 ? PLATFORM_LIMITS[resource] : planLimit;

  const db = getDb(d1);

  let n = 0;
  switch (resource) {
    case "flags": {
      const row = await db
        .select({ n: count() })
        .from(gates)
        .where(and(eq(gates.projectId, projectId), isNull(gates.deletedAt)));
      n = row[0]?.n ?? 0;
      break;
    }
    case "configs": {
      const row = await db
        .select({ n: count() })
        .from(configs)
        .where(and(eq(configs.projectId, projectId), isNull(configs.deletedAt)));
      n = row[0]?.n ?? 0;
      break;
    }
    case "experiments_running": {
      const row = await db
        .select({ n: count() })
        .from(experiments)
        .where(and(eq(experiments.projectId, projectId), eq(experiments.status, "running")));
      n = row[0]?.n ?? 0;
      break;
    }
    case "universes": {
      const row = await db
        .select({ n: count() })
        .from(universes)
        .where(and(eq(universes.projectId, projectId), isNull(universes.deletedAt)));
      n = row[0]?.n ?? 0;
      break;
    }
    case "metrics": {
      const row = await db
        .select({ n: count() })
        .from(metrics)
        .where(and(eq(metrics.projectId, projectId), isNull(metrics.deletedAt)));
      n = row[0]?.n ?? 0;
      break;
    }
    case "events_catalog": {
      const row = await db
        .select({ n: count() })
        .from(events)
        .where(and(eq(events.projectId, projectId), isNull(events.deletedAt)));
      n = row[0]?.n ?? 0;
      break;
    }
    case "sdk_keys": {
      // Only "server" and "client" keys count against the plan limit.
      // "admin" keys are internal CLI/devtools auth tokens and are unlimited.
      const row = await db
        .select({ n: count() })
        .from(sdkKeys)
        .where(
          and(
            eq(sdkKeys.projectId, projectId),
            isNull(sdkKeys.revokedAt),
            ne(sdkKeys.type, "admin"),
          ),
        );
      n = row[0]?.n ?? 0;
      break;
    }
    case "i18n_keys": {
      const row = await db
        .select({ n: count() })
        .from(labelKeys)
        .where(eq(labelKeys.projectId, projectId));
      n = row[0]?.n ?? 0;
      break;
    }
    case "i18n_profiles": {
      const row = await db
        .select({ n: count() })
        .from(labelProfiles)
        .where(and(eq(labelProfiles.projectId, projectId), isNull(labelProfiles.deletedAt)));
      n = row[0]?.n ?? 0;
      break;
    }
  }

  if (n >= effectiveLimit) {
    const scope = planLimit === -1 ? " — platform ceiling" : ` on ${plan.name} plan`;
    throw new ApiError(
      `${resource} limit reached (${effectiveLimit}${scope}). Contact support.`,
      429,
    );
  }
}
