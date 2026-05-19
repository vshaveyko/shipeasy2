import type { Metadata } from "next";
import { auth } from "@/auth";
import { listAllGates } from "@/lib/handlers/gates";

export const metadata: Metadata = { title: "New experiment" };
import { listAllUniverses } from "@/lib/handlers/universes";
import { listMetrics } from "@/lib/handlers/metrics";
import { listEvents } from "@/lib/handlers/events";
import { loadProjectPlan } from "@/lib/project";
import NewExperimentClient, {
  type EventInfo,
  type GateInfo,
  type MetricInfo,
  type PlanInfo,
  type UniverseInfo,
} from "./new-experiment-client";

export default async function NewExperimentPage() {
  const session = await auth();
  const projectId = session?.user?.project_id;

  let gates: GateInfo[] = [];
  let universes: UniverseInfo[] = [];
  let metrics: MetricInfo[] = [];
  let events: EventInfo[] = [];
  let plan: PlanInfo = {
    name: "free",
    sequential_testing: false,
    custom_significance_threshold: false,
    holdout_groups: false,
  };

  if (projectId) {
    const identity = {
      projectId,
      actorEmail: session?.user?.email ?? "unknown",
      source: "jwt" as const,
    };
    const settled = await Promise.allSettled([
      listAllGates(identity),
      listAllUniverses(identity),
      listMetrics(identity),
      listEvents(identity),
      loadProjectPlan(projectId),
    ]);
    if (settled[0].status === "fulfilled") {
      gates = settled[0].value.map((g) => ({ id: g.id, name: g.name }));
    }
    if (settled[1].status === "fulfilled") {
      universes = settled[1].value.map((u) => ({
        id: u.id,
        name: u.name,
        unit_type: u.unitType,
        holdout_range: u.holdoutRange as [number, number] | null,
      }));
    }
    if (settled[2].status === "fulfilled") {
      metrics = settled[2].value.map((m) => ({
        id: m.id,
        name: m.name,
        event_name: m.eventName,
        aggregation: m.aggregation,
        value_path: m.valuePath,
        winsorize_pct: m.winsorizePct,
        min_detectable_effect: m.minDetectableEffect,
      }));
    }
    if (settled[3].status === "fulfilled") {
      events = settled[3].value.map((e) => ({ name: e.name, pending: e.pending === 1 }));
    }
    if (settled[4].status === "fulfilled") {
      const p = settled[4].value;
      plan = {
        name: p.name,
        sequential_testing: p.sequential_testing,
        custom_significance_threshold: p.custom_significance_threshold,
        holdout_groups: p.holdout_groups,
      };
    }
  }

  return (
    <NewExperimentClient
      gates={gates}
      universes={universes}
      metrics={metrics}
      events={events}
      plan={plan}
    />
  );
}
