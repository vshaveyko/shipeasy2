"use server";

import { redirect } from "next/navigation";
import { getIdentity } from "@/lib/server-action";
import { createMetric, deleteMetric } from "@/lib/handlers/metrics";

export async function createMetricAction(formData: FormData) {
  const identity = await getIdentity();
  const name = formData.get("name") as string;
  const event_name = formData.get("event_name") as string;
  const aggregation = (formData.get("aggregation") as string) || "count_users";
  await createMetric(identity, {
    name,
    event_name,
    aggregation,
    winsorize_pct: 99,
    value_path: null,
    min_detectable_effect: null,
  });
  redirect("/dashboard/experiments/metrics");
}

export async function deleteMetricAction(formData: FormData) {
  const identity = await getIdentity();
  const id = formData.get("id") as string;
  await deleteMetric(identity, id);
  redirect("/dashboard/experiments/metrics");
}
