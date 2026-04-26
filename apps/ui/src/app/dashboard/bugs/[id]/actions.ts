"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { updateBug, deleteBug } from "@/lib/handlers/bugs";
import { BUG_STATUSES } from "@shipeasy/core/db/schema";

async function identityOrThrow() {
  const session = await auth();
  const projectId = session?.user?.project_id;
  const email = session?.user?.email;
  if (!projectId || !email) throw new Error("Not authenticated");
  return { projectId, actorEmail: email, source: "jwt" as const };
}

export async function updateBugStatusAction(formData: FormData) {
  const id = String(formData.get("id"));
  const status = String(formData.get("status"));
  if (!(BUG_STATUSES as readonly string[]).includes(status)) throw new Error("Invalid status");
  const identity = await identityOrThrow();
  await updateBug(identity, id, { status });
  revalidatePath(`/dashboard/bugs/${id}`);
  revalidatePath(`/dashboard/bugs`);
}

export async function deleteBugAction(formData: FormData) {
  const id = String(formData.get("id"));
  const identity = await identityOrThrow();
  await deleteBug(identity, id);
  revalidatePath(`/dashboard/bugs`);
  redirect("/dashboard/bugs");
}
