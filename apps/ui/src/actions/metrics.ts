"use server";

import { revalidatePath } from "next/cache";
import { authenticateAdmin } from "@/lib/admin-auth";
import {
  createMetric as createMetricHandler,
  updateMetric as updateMetricHandler,
  deleteMetric as deleteMetricHandler,
} from "@/lib/handlers/metrics";

export async function createMetric(input: unknown) {
  const identity = await authenticateAdmin();
  const result = await createMetricHandler(identity, input);
  revalidatePath("/dashboard/experiments/metrics");
  return result;
}

export async function updateMetric(id: string, input: unknown) {
  const identity = await authenticateAdmin();
  const result = await updateMetricHandler(identity, id, input);
  revalidatePath("/dashboard/experiments/metrics");
  return result;
}

export async function deleteMetric(id: string) {
  const identity = await authenticateAdmin();
  const result = await deleteMetricHandler(identity, id);
  revalidatePath("/dashboard/experiments/metrics");
  return result;
}
