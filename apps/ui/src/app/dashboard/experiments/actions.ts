"use server";

import { redirect } from "next/navigation";
import { getIdentity } from "@/lib/server-action";
import {
  createExperiment,
  deleteExperiment,
  setExperimentStatus,
} from "@/lib/handlers/experiments";

export async function createExperimentAction(formData: FormData) {
  const identity = await getIdentity();
  const name = formData.get("name") as string;
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
  redirect("/dashboard/experiments");
}

export async function deleteExperimentAction(formData: FormData) {
  const identity = await getIdentity();
  const id = formData.get("id") as string;
  await deleteExperiment(identity, id);
  redirect("/dashboard/experiments");
}

export async function setExperimentStatusAction(formData: FormData) {
  const identity = await getIdentity();
  const id = formData.get("id") as string;
  const status = formData.get("status") as "draft" | "running" | "stopped" | "archived";
  await setExperimentStatus(identity, id, status);
  redirect("/dashboard/experiments");
}
