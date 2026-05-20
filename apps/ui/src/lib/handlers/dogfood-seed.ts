import { createEvent } from "./events";
import { createMetric } from "./metrics";
import { ApiError } from "@shipeasy/core";
import type { AdminIdentity } from "../admin-auth";
import { DOGFOOD_EVENTS } from "../dogfood";

type SeedReport = {
  events: { name: string; created: boolean }[];
  metrics: { name: string; created: boolean }[];
};

const SEED_EVENTS = [
  { name: DOGFOOD_EVENTS.loginSucceeded, description: "Admin logged in to dashboard" },
  { name: DOGFOOD_EVENTS.gateCreated, description: "Admin created a feature gate" },
  { name: DOGFOOD_EVENTS.configCreated, description: "Admin created a dynamic config" },
  { name: DOGFOOD_EVENTS.configPublished, description: "Admin published a config value" },
  { name: DOGFOOD_EVENTS.experimentCreated, description: "Admin created an experiment" },
  { name: DOGFOOD_EVENTS.experimentStarted, description: "Admin started an experiment" },
  { name: DOGFOOD_EVENTS.experimentStopped, description: "Admin stopped an experiment" },
  { name: DOGFOOD_EVENTS.metricCreated, description: "Admin created a metric" },
  { name: DOGFOOD_EVENTS.killswitchCreated, description: "Admin created a killswitch" },
  { name: DOGFOOD_EVENTS.killswitchToggled, description: "Admin toggled a killswitch" },
];

const SEED_METRICS: { name: string; event: string; agg: "count_users" | "count_events" }[] = [
  { name: "admin.daily_logins", event: DOGFOOD_EVENTS.loginSucceeded, agg: "count_users" },
  { name: "admin.gates_created", event: DOGFOOD_EVENTS.gateCreated, agg: "count_events" },
  { name: "admin.configs_created", event: DOGFOOD_EVENTS.configCreated, agg: "count_events" },
  {
    name: "admin.experiments_created",
    event: DOGFOOD_EVENTS.experimentCreated,
    agg: "count_events",
  },
  {
    name: "admin.experiments_started",
    event: DOGFOOD_EVENTS.experimentStarted,
    agg: "count_events",
  },
  { name: "admin.metrics_created", event: DOGFOOD_EVENTS.metricCreated, agg: "count_events" },
  {
    name: "admin.killswitches_toggled",
    event: DOGFOOD_EVENTS.killswitchToggled,
    agg: "count_events",
  },
];

export async function seedDogfood(identity: AdminIdentity): Promise<SeedReport> {
  const eventsReport: SeedReport["events"] = [];
  for (const e of SEED_EVENTS) {
    try {
      await createEvent(identity, {
        name: e.name,
        description: e.description,
        properties: [],
      });
      eventsReport.push({ name: e.name, created: true });
    } catch (err) {
      // 409 (name exists) = already seeded, count as a no-op rather than an error.
      if (err instanceof ApiError && err.status === 409) {
        eventsReport.push({ name: e.name, created: false });
      } else {
        throw err;
      }
    }
  }

  const metricsReport: SeedReport["metrics"] = [];
  for (const m of SEED_METRICS) {
    try {
      await createMetric(identity, {
        name: m.name,
        event_name: m.event,
        query_ir: {
          agg: { kind: m.agg },
          metric: m.event,
          filters: [],
        },
      });
      metricsReport.push({ name: m.name, created: true });
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        metricsReport.push({ name: m.name, created: false });
      } else {
        throw err;
      }
    }
  }

  return { events: eventsReport, metrics: metricsReport };
}
