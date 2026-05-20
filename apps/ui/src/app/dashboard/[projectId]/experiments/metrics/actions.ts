"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getIdentity } from "@/lib/server-action";
import { createMetric, deleteMetric, bulkDeleteMetrics } from "@/lib/handlers/metrics";

import { METRIC_ERROR_COOKIE } from "./metric-error-cookie";

export async function createMetricAction(formData: FormData) {
  const identity = await getIdentity();
  const name = formData.get("name") as string;
  const event_name = formData.get("event_name") as string;
  const aggregation = (formData.get("aggregation") as string) || "count_users";
  const valuePathRaw = formData.get("value_path") as string | null;
  const valueLabel = valuePathRaw && valuePathRaw.trim() !== "" ? valuePathRaw.trim() : undefined;
  const winsorizeRaw = formData.get("winsorize_pct") as string | null;
  const winsorize_pct = winsorizeRaw ? Number(winsorizeRaw) : 99;
  const mdeRaw = formData.get("min_detectable_effect") as string | null;
  const min_detectable_effect = mdeRaw && mdeRaw.trim() !== "" ? Number(mdeRaw) : null;
  const cookieStore = await cookies();
  const aggIr =
    aggregation === "retention_Nd"
      ? { kind: "retention_Nd" as const, n: 7 }
      : { kind: aggregation as "count_users" | "count_events" | "sum" | "avg" };
  const query_ir = {
    agg: aggIr,
    metric: event_name,
    valueLabel,
    filters: [] as { label: string; op: "=" | "!=" | "=~" | "!~"; value: string }[],
  };
  try {
    await createMetric(identity, {
      name,
      event_name,
      query_ir,
      winsorize_pct,
      min_detectable_effect,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to create metric";
    cookieStore.set(METRIC_ERROR_COOKIE, message, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: `/dashboard/${identity.projectId}/experiments/metrics`,
      maxAge: 30,
    });
  }
  revalidatePath("/dashboard/[projectId]/experiments/metrics", "page");
  redirect(`/dashboard/${identity.projectId}/experiments/metrics`);
}

export async function deleteMetricAction(formData: FormData) {
  const identity = await getIdentity();
  const id = formData.get("id") as string;
  await deleteMetric(identity, id);
  revalidatePath("/dashboard/[projectId]/experiments/metrics", "page");
  redirect(`/dashboard/${identity.projectId}/experiments/metrics`);
}

export async function bulkDeleteMetricsAction(ids: string[]) {
  const identity = await getIdentity();
  await bulkDeleteMetrics(identity, ids);
}
