"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { auth } from "@/auth";
import { findProjectById } from "@shipeasy/core";
import type { ProjectModuleKey } from "@shipeasy/core";
import { getEnvAsync } from "@/lib/env";
import { getIdentity } from "@/lib/server-action";
import { updateProject } from "@/lib/handlers/projects";
import { ok, fail, type ActionResult } from "@/lib/action-result";

const MODULE_FIELD: Record<ProjectModuleKey, string> = {
  translations: "moduleTranslations",
  configs: "moduleConfigs",
  gates: "moduleGates",
  experiments: "moduleExperiments",
  feedback: "moduleFeedback",
};

/**
 * Set the active project cookie and bounce to the project's detail page in
 * one round trip. Used by the projects-list card click — the user expects a
 * single click to both switch context and reveal the project's settings.
 */
export async function selectAndOpenProjectAction(formData: FormData): Promise<void> {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) redirect("/auth/signin");

  const projectId = (formData.get("projectId") as string) ?? "";
  if (!projectId) throw new Error("Missing project ID");

  const env = await getEnvAsync();
  const proj = await findProjectById(env.DB, projectId);
  if (!proj || proj.ownerEmail !== email) throw new Error("Not authorized");

  const cookieStore = await cookies();
  cookieStore.set("active_project_id", projectId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });

  redirect(`/dashboard/projects/${projectId}`);
}

/**
 * Flip a single module flag on the active project. Called by the per-card
 * Switch on the project detail page; the optimistic UI in the client
 * component handles the round-trip latency.
 */
export async function toggleModuleAction(
  module: ProjectModuleKey,
  enabled: boolean,
): Promise<ActionResult> {
  try {
    const identity = await getIdentity();
    const field = MODULE_FIELD[module];
    if (!field) return fail("Unknown module");
    await updateProject(identity, identity.projectId, { [field]: enabled });
    revalidatePath(`/dashboard/projects/${identity.projectId}`);
    return ok(enabled ? "Enabled" : "Disabled");
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Failed to toggle module");
  }
}
