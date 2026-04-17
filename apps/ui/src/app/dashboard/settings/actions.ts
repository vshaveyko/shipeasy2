"use server";

import { redirect } from "next/navigation";
import { getIdentity } from "@/lib/server-action";
import { updateProject } from "@/lib/handlers/projects";

export async function updateProjectAction(formData: FormData) {
  const identity = await getIdentity();
  const name = formData.get("name") as string;
  await updateProject(identity, identity.projectId, { name });
  redirect("/dashboard/settings");
}
