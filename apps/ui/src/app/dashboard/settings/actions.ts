"use server";

import { revalidatePath } from "next/cache";
import { getIdentity } from "@/lib/server-action";
import { updateProject } from "@/lib/handlers/projects";
import { ok, fail } from "@/lib/action-result";

export async function updateProjectAction(formData: FormData) {
  try {
    const identity = await getIdentity();
    const name = formData.get("name") as string;
    const domain = (formData.get("domain") as string) || undefined;
    await updateProject(identity, identity.projectId, { name, domain });
    revalidatePath("/dashboard/settings");
    return ok("Settings saved");
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Failed to save settings");
  }
}
