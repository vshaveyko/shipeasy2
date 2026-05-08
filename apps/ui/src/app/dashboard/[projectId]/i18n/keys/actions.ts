"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { bulkDeleteKeys, deleteKey, updateKey, upsertDraftKey } from "@/lib/handlers/i18n";
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
  await deleteKey(identity, id);
  revalidatePath("/dashboard/[projectId]/i18n/keys", "page");
}

export async function bulkDeleteKeysAction(formData: FormData) {
  const identity = await getIdentity();
  const ids = formData.getAll("ids").map((v) => String(v));
  if (ids.length === 0) return { deleted: 0 };
  const result = await bulkDeleteKeys(identity, ids);
  revalidatePath("/dashboard/[projectId]/i18n/keys", "page");
  return result;
}

export async function updateKeyAction(formData: FormData) {
  const identity = await getIdentity();
  const id = formData.get("id") as string;
  const value = formData.get("value") as string;
  await updateKey(identity, id, { value });
  revalidatePath("/dashboard/[projectId]/i18n/keys", "page");
}

export async function upsertDraftKeyAction(formData: FormData) {
  const identity = await getIdentity();
  const draftId = formData.get("draftId") as string;
  const key = formData.get("key") as string;
  const value = formData.get("value") as string;
  await upsertDraftKey(identity, draftId, key, value);
  revalidatePath("/dashboard/[projectId]/i18n/keys", "page");
}
