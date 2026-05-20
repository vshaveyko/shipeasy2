"use server";

import { revalidatePath } from "next/cache";
import { authenticateAdmin } from "@/lib/admin-auth";
import {
  createExperiment as createExperimentHandler,
  updateExperiment as updateExperimentHandler,
  setExperimentStatus,
  updateExperimentMetrics as updateExperimentMetricsHandler,
  deleteExperiment as deleteExperimentHandler,
  reanalyzeExperiment as reanalyzeExperimentHandler,
} from "@/lib/handlers/experiments";
import { DOGFOOD_EVENTS, dogfoodTrack } from "@/lib/dogfood";

export async function createExperiment(input: unknown) {
  const identity = await authenticateAdmin();
  const result = await createExperimentHandler(identity, input);
  dogfoodTrack(identity.actorEmail || identity.projectId, DOGFOOD_EVENTS.experimentCreated, {
    project_id: identity.projectId,
  });
  revalidatePath("/dashboard/[projectId]/experiments", "page");
  return result;
}

export async function updateExperiment(id: string, input: unknown) {
  const identity = await authenticateAdmin();
  const result = await updateExperimentHandler(identity, id, input);
  revalidatePath(`/dashboard/[projectId]/experiments/${id}`, "page");
  return result;
}

export async function startExperiment(id: string) {
  const identity = await authenticateAdmin();
  const result = await setExperimentStatus(identity, id, "running");
  dogfoodTrack(identity.actorEmail || identity.projectId, DOGFOOD_EVENTS.experimentStarted, {
    project_id: identity.projectId,
    experiment_id: id,
  });
  revalidatePath(`/dashboard/[projectId]/experiments/${id}`, "page");
  return result;
}

export async function stopExperiment(id: string) {
  const identity = await authenticateAdmin();
  const result = await setExperimentStatus(identity, id, "stopped");
  dogfoodTrack(identity.actorEmail || identity.projectId, DOGFOOD_EVENTS.experimentStopped, {
    project_id: identity.projectId,
    experiment_id: id,
  });
  revalidatePath(`/dashboard/[projectId]/experiments/${id}`, "page");
  return result;
}

export async function archiveExperiment(id: string) {
  const identity = await authenticateAdmin();
  const result = await setExperimentStatus(identity, id, "archived");
  revalidatePath("/dashboard/[projectId]/experiments", "page");
  return result;
}

export async function updateExperimentMetrics(id: string, input: unknown) {
  const identity = await authenticateAdmin();
  const result = await updateExperimentMetricsHandler(identity, id, input);
  revalidatePath(`/dashboard/[projectId]/experiments/${id}`, "page");
  return result;
}

export async function reanalyzeExperiment(id: string) {
  const identity = await authenticateAdmin();
  const result = await reanalyzeExperimentHandler(identity, id);
  revalidatePath(`/dashboard/[projectId]/experiments/${id}`, "page");
  return result;
}

export async function deleteExperiment(id: string) {
  const identity = await authenticateAdmin();
  const result = await deleteExperimentHandler(identity, id);
  revalidatePath("/dashboard/[projectId]/experiments", "page");
  return result;
}
