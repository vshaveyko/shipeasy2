"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getIdentity } from "@/lib/server-action";
import {
  createExperiment,
  deleteExperiment,
  setExperimentStatus,
  updateExperimentMetrics,
} from "@/lib/handlers/experiments";
import { createUniverse } from "@/lib/handlers/universes";
import { createMetric } from "@/lib/handlers/metrics";
import { ok, fail } from "@/lib/action-result";

export async function createExperimentAction(formData: FormData) {
  const identity = await getIdentity();
  const name = formData.get("name") as string;
  const description = ((formData.get("description") as string) || "").trim() || null;
  const folder = ((formData.get("folder") as string) || "").trim() || null;
  const universe = (formData.get("universe") as string) || "default";
  const allocationRaw = Number(formData.get("allocation") ?? 100);
  const allocation_pct = Math.round(Math.min(100, Math.max(0, allocationRaw)) * 100);

  // Targeting gate
  const targetingGateRaw = formData.get("targeting_gate") as string | null;
  const targeting_gate =
    targetingGateRaw && targetingGateRaw !== "" && targetingGateRaw !== "none"
      ? targetingGateRaw
      : null;

  // Statistical config
  const sigRaw = formData.get("significance_threshold") as string | null;
  const significance_threshold = sigRaw && sigRaw !== "" ? Number(sigRaw) : 0.05;
  const minDaysRaw = formData.get("min_runtime_days") as string | null;
  const min_runtime_days = minDaysRaw && minDaysRaw !== "" ? Number(minDaysRaw) : 0;
  const minSampleRaw = formData.get("min_sample_size") as string | null;
  const min_sample_size = minSampleRaw && minSampleRaw !== "" ? Number(minSampleRaw) : 100;

  // Params schema: param_count, param_name_0, param_type_0, ...
  const paramCount = Number(formData.get("param_count") ?? 0);
  const params: Record<string, "string" | "bool" | "number"> = {};
  for (let i = 0; i < paramCount; i++) {
    const paramName = (formData.get(`param_name_${i}`) as string)?.trim();
    const paramType = (formData.get(`param_type_${i}`) as string) || "string";
    if (paramName) {
      params[paramName] = paramType as "string" | "bool" | "number";
    }
  }

  // Read dynamic groups submitted by the form (group_name_0, group_weight_0, ...)
  const groupCount = Number(formData.get("group_count") ?? 2);
  const groups =
    groupCount >= 2
      ? Array.from({ length: groupCount }, (_, i) => ({
          name:
            (formData.get(`group_name_${i}`) as string) || (i === 0 ? "control" : `variant_${i}`),
          weight: Number(formData.get(`group_weight_${i}`) ?? Math.round(10000 / groupCount)),
          params: {} as Record<string, unknown>,
        }))
      : [
          { name: "control", weight: 5000, params: {} as Record<string, unknown> },
          { name: "test", weight: 5000, params: {} as Record<string, unknown> },
        ];

  await createExperiment(identity, {
    name,
    description,
    folder,
    universe,
    targeting_gate,
    allocation_pct,
    groups,
    params,
    significance_threshold,
    min_runtime_days,
    min_sample_size,
    sequential_testing: false,
  });
  revalidatePath("/dashboard/[projectId]/experiments", "page");
  revalidatePath("/dashboard");
  redirect(`/dashboard/${identity.projectId}/experiments`);
}

// ── Wizard-driven create (full design) ──────────────────────────────────
// Used by /experiments/new — supports metric attachment + optional start.

export type WizardMetricInput = { metric_id: string; role: "goal" | "guardrail" | "secondary" };

export type WizardPublishInput = {
  name: string;
  description: string | null;
  folder: string | null;
  universe: string;
  targeting_gate: string | null;
  allocation_pct: number; // basis points 0..10000
  groups: { name: string; weight: number; params: Record<string, unknown> }[];
  params: Record<string, "string" | "bool" | "number">;
  significance_threshold: number;
  min_runtime_days: number;
  min_sample_size: number;
  sequential_testing: boolean;
  metrics: WizardMetricInput[];
  start: boolean;
};

export async function publishExperimentAction(input: WizardPublishInput) {
  try {
    const identity = await getIdentity();
    const created = await createExperiment(identity, {
      name: input.name,
      description: input.description,
      folder: input.folder,
      universe: input.universe,
      targeting_gate: input.targeting_gate,
      allocation_pct: input.allocation_pct,
      groups: input.groups,
      params: input.params,
      significance_threshold: input.significance_threshold,
      min_runtime_days: input.min_runtime_days,
      min_sample_size: input.min_sample_size,
      sequential_testing: input.sequential_testing,
    });
    if (input.metrics.length > 0) {
      await updateExperimentMetrics(identity, created.id, { metrics: input.metrics });
    }
    if (input.start) {
      await setExperimentStatus(identity, created.id, "running");
    }
    revalidatePath("/dashboard/[projectId]/experiments", "page");
    return ok(input.start ? "Experiment started" : "Experiment created");
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Failed to create experiment");
  }
}

export async function inlineCreateUniverseAction(input: {
  name: string;
  unit_type: string;
  holdout_lo: number | null;
  holdout_hi: number | null;
}) {
  try {
    const identity = await getIdentity();
    const holdout_range =
      input.holdout_lo !== null && input.holdout_hi !== null
        ? [input.holdout_lo, input.holdout_hi]
        : null;
    const created = await createUniverse(identity, {
      name: input.name,
      unit_type: input.unit_type,
      holdout_range,
    });
    return { ok: true as const, id: created.id, name: created.name };
  } catch (e) {
    return {
      ok: false as const,
      error: e instanceof Error ? e.message : "Failed to create universe",
    };
  }
}

export async function inlineCreateMetricAction(input: {
  name: string;
  event_name: string;
  value_path: string | null;
  aggregation: "count_users" | "count_events" | "sum" | "avg" | "retention_Nd";
  winsorize_pct: number | null;
  min_detectable_effect: number | null;
}) {
  try {
    const identity = await getIdentity();
    const agg =
      input.aggregation === "retention_Nd"
        ? { kind: "retention_Nd" as const, n: 7 }
        : { kind: input.aggregation };
    const created = await createMetric(identity, {
      name: input.name,
      event_name: input.event_name,
      query_ir: {
        agg,
        metric: input.event_name,
        valueLabel: input.value_path ?? undefined,
        filters: [],
      },
      winsorize_pct: input.winsorize_pct ?? 99,
      min_detectable_effect: input.min_detectable_effect,
    });
    return { ok: true as const, id: created.id, name: created.name };
  } catch (e) {
    return {
      ok: false as const,
      error: e instanceof Error ? e.message : "Failed to create metric",
    };
  }
}

export async function deleteExperimentAction(formData: FormData) {
  try {
    const identity = await getIdentity();
    const id = formData.get("id") as string;
    await deleteExperiment(identity, id);
    revalidatePath("/dashboard/[projectId]/experiments", "page");
    return ok("Experiment deleted");
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Failed to delete experiment");
  }
}

export async function setExperimentStatusAction(formData: FormData) {
  try {
    const identity = await getIdentity();
    const id = formData.get("id") as string;
    const status = formData.get("status") as "draft" | "running" | "stopped" | "archived";
    await setExperimentStatus(identity, id, status);
    revalidatePath("/dashboard/[projectId]/experiments", "page");
    const labels: Record<string, string> = {
      running: "Experiment started",
      stopped: "Experiment stopped",
      archived: "Experiment archived",
    };
    return ok(labels[status] ?? "Status updated");
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Failed to update experiment");
  }
}
