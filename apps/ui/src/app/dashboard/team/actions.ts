"use server";

import { revalidatePath } from "next/cache";
import { getIdentity } from "@/lib/server-action";
import { inviteMember, removeMember, updateMemberRole } from "@/lib/handlers/members";

export async function inviteMembersAction(formData: FormData) {
  const identity = await getIdentity();
  const raw = (formData.get("emails") as string | null) ?? "";
  const role = (formData.get("role") as string | null) ?? "editor";

  const emails = raw
    .split(/[\s,;\n]+/)
    .map((s) => s.trim())
    .filter(Boolean);

  if (emails.length === 0) return;

  const errors: string[] = [];
  for (const email of emails) {
    try {
      await inviteMember(identity, { email, role });
    } catch (err) {
      errors.push(err instanceof Error ? err.message : String(err));
    }
  }

  revalidatePath("/dashboard/team");
  if (errors.length === emails.length) {
    throw new Error(errors[0] ?? "Failed to send invites");
  }
}

export async function removeMemberAction(formData: FormData) {
  const identity = await getIdentity();
  const id = formData.get("id") as string;
  await removeMember(identity, id);
  revalidatePath("/dashboard/team");
}

export async function updateMemberRoleAction(formData: FormData) {
  const identity = await getIdentity();
  const id = formData.get("id") as string;
  const role = formData.get("role") as string;
  await updateMemberRole(identity, id, role);
  revalidatePath("/dashboard/team");
}
