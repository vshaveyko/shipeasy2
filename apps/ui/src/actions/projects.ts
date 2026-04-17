"use server";

import { revalidatePath } from "next/cache";
import { authenticateAdmin } from "@/lib/admin-auth";
import {
  updateProject as updateProjectHandler,
  updateProjectPlan as updateProjectPlanHandler,
} from "@/lib/handlers/projects";

export async function updateProject(input: unknown) {
  const identity = await authenticateAdmin();
  const result = await updateProjectHandler(identity, identity.projectId, input);
  revalidatePath("/dashboard/settings");
  return result;
}

export async function updatePlan(input: unknown) {
  const identity = await authenticateAdmin();
  const result = await updateProjectPlanHandler(identity, identity.projectId, input);
  revalidatePath("/dashboard/settings");
  return result;
}
