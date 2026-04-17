"use server";

import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { createProfile, deleteProfile } from "@/lib/handlers/i18n";
import type { AdminIdentity } from "@/lib/admin-auth";

async function getIdentity(): Promise<AdminIdentity> {
  const session = await auth();
  const projectId = session?.user?.project_id;
  if (!session?.user || !projectId) redirect("/auth/signin");
  return { projectId, actorEmail: session.user.email ?? "unknown", source: "jwt" };
}

export async function createProfileAction(formData: FormData) {
  const identity = await getIdentity();
  const name = formData.get("name");
  await createProfile(identity, { name });
  redirect("/dashboard/i18n/profiles");
}

export async function deleteProfileAction(formData: FormData) {
  const identity = await getIdentity();
  const id = formData.get("id") as string;
  await deleteProfile(identity, id);
  redirect("/dashboard/i18n/profiles");
}
