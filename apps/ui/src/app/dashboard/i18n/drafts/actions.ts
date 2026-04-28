"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { createDraft, updateDraft, deleteDraft } from "@/lib/handlers/i18n";
import type { AdminIdentity } from "@/lib/admin-auth";
import { ok, fail } from "@/lib/action-result";

async function getIdentity(): Promise<AdminIdentity> {
  const session = await auth();
  const projectId = session?.user?.project_id;
  if (!session?.user || !projectId) redirect("/auth/signin");
  return { projectId, actorEmail: session.user.email ?? "unknown", source: "jwt" };
}

export async function createDraftAction(formData: FormData) {
  const identity = await getIdentity();
  const name = formData.get("name");
  const profile_id = formData.get("profile_id");
  await createDraft(identity, { name, profile_id });
  redirect("/dashboard/i18n/drafts");
}

export async function abandonDraftAction(formData: FormData) {
  try {
    const identity = await getIdentity();
    const id = formData.get("id") as string;
    await updateDraft(identity, id, { status: "abandoned" });
    revalidatePath("/dashboard/i18n/drafts");
    revalidatePath("/dashboard/i18n/keys");
    return ok("Draft abandoned");
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Failed to abandon draft");
  }
}

export async function deleteDraftAction(formData: FormData) {
  try {
    const identity = await getIdentity();
    const id = formData.get("id") as string;
    await deleteDraft(identity, id);
    revalidatePath("/dashboard/i18n/drafts");
    return ok("Draft deleted");
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Failed to delete draft");
  }
}
