"use server";

import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { deleteKey } from "@/lib/handlers/i18n";
import type { AdminIdentity } from "@/lib/admin-auth";

async function getIdentity(): Promise<AdminIdentity> {
  const session = await auth();
  const projectId = session?.user?.project_id;
  if (!session?.user || !projectId) redirect("/auth/signin");
  return { projectId, actorEmail: session.user.email ?? "unknown", source: "jwt" };
}

export async function deleteKeyAction(formData: FormData) {
  const identity = await getIdentity();
  const id = formData.get("id") as string;
  const back = (formData.get("back") as string) || "/dashboard/i18n/keys";
  await deleteKey(identity, id);
  redirect(back);
}
