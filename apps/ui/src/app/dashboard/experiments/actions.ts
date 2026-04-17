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
    allocation_pct,
    groups,
    significance_threshold: 0.05,
    min_runtime_days: 0,
    min_sample_size: 100,
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
