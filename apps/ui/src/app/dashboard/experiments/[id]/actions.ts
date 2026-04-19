"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getIdentity } from "@/lib/server-action";
import { updateExperimentMetrics } from "@/lib/handlers/experiments";
import { getEnvAsync } from "@/lib/env";
import { getDb } from "@shipeasy/core";
import { experimentMetrics } from "@shipeasy/core/db/schema";

export async function addExperimentMetricAction(formData: FormData) {
  const identity = await getIdentity();
  const experimentId = formData.get("experiment_id") as string;
  const metricId = formData.get("metric_id") as string;
  const role = (formData.get("role") as string) || "guardrail";

  const env = await getEnvAsync();
  const db = getDb(env.DB);

  const existing = await db
    .select({ metricId: experimentMetrics.metricId, role: experimentMetrics.role })
    .from(experimentMetrics)
    .where(eq(experimentMetrics.experimentId, experimentId));

  const alreadyHas = existing.some((m) => m.metricId === metricId);
  const updated = alreadyHas
    ? existing.map((m) =>
        m.metricId === metricId
          ? { metric_id: metricId, role: role as "goal" | "guardrail" | "secondary" }
          : { metric_id: m.metricId, role: m.role as "goal" | "guardrail" | "secondary" },
      )
    : [
        ...existing.map((m) => ({
          metric_id: m.metricId,
          role: m.role as "goal" | "guardrail" | "secondary",
        })),
        { metric_id: metricId, role: role as "goal" | "guardrail" | "secondary" },
      ];

  await updateExperimentMetrics(identity, experimentId, { metrics: updated });
  revalidatePath(`/dashboard/experiments/${experimentId}`);
  redirect(`/dashboard/experiments/${experimentId}`);
}
