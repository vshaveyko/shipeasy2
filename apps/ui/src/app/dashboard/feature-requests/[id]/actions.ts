"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { updateFeatureRequest, deleteFeatureRequest } from "@/lib/handlers/feature-requests";
import { FEATURE_REQUEST_STATUSES, FEATURE_REQUEST_IMPORTANCES } from "@shipeasy/core/db/schema";

async function identityOrThrow() {
  const session = await auth();
  const projectId = session?.user?.project_id;
  const email = session?.user?.email;
  if (!projectId || !email) throw new Error("Not authenticated");
  return { projectId, actorEmail: email, source: "jwt" as const };
}

export async function updateFeatureRequestAction(formData: FormData) {
  const id = String(formData.get("id"));
  const status = String(formData.get("status"));
  const importance = String(formData.get("importance"));
  if (!(FEATURE_REQUEST_STATUSES as readonly string[]).includes(status)) {
    throw new Error("Invalid status");
  }
  if (!(FEATURE_REQUEST_IMPORTANCES as readonly string[]).includes(importance)) {
    throw new Error("Invalid importance");
  }
  const identity = await identityOrThrow();
  await updateFeatureRequest(identity, id, { status, importance });
  revalidatePath(`/dashboard/feature-requests/${id}`);
  revalidatePath(`/dashboard/feature-requests`);
}

export async function deleteFeatureRequestAction(formData: FormData) {
  const id = String(formData.get("id"));
  const identity = await identityOrThrow();
  await deleteFeatureRequest(identity, id);
  revalidatePath(`/dashboard/feature-requests`);
  redirect("/dashboard/feature-requests");
}
