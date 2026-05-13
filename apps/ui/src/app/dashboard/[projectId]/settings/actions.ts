"use server";

import { revalidatePath } from "next/cache";
import { getIdentity } from "@/lib/server-action";
import { transferOwnership, updateProject } from "@/lib/handlers/projects";
import { ok, fail } from "@/lib/action-result";

export async function updateProjectAction(formData: FormData) {
  try {
    const identity = await getIdentity();
    const name = formData.get("name") as string;
    const domain = (formData.get("domain") as string) || undefined;
    await updateProject(identity, identity.projectId, { name, domain });
    revalidatePath("/dashboard/[projectId]/settings", "page");
    return ok("Settings saved");
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Failed to save settings");
  }
}

export async function transferOwnershipAction(formData: FormData) {
  try {
    const identity = await getIdentity();
    const targetEmail = (formData.get("targetEmail") as string | null) ?? "";
    const confirmName = (formData.get("confirmName") as string | null) ?? "";
    const result = await transferOwnership(identity, identity.projectId, {
      targetEmail,
      confirmName,
    });
    revalidatePath("/dashboard/[projectId]/settings", "page");
    revalidatePath("/dashboard/team");
    return ok(`Project transferred to ${result.to}`);
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Failed to transfer project");
  }
}
