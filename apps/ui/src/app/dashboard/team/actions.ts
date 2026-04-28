"use server";

import { revalidatePath } from "next/cache";
import { getIdentity } from "@/lib/server-action";
import { inviteMember, removeMember, updateMemberRole } from "@/lib/handlers/members";
import { ok, fail } from "@/lib/action-result";

export async function inviteMembersAction(formData: FormData) {
  try {
    const identity = await getIdentity();
    const raw = (formData.get("emails") as string | null) ?? "";
    const role = (formData.get("role") as string | null) ?? "editor";

    const emails = raw
      .split(/[\s,;\n]+/)
      .map((s) => s.trim())
      .filter(Boolean);

    if (emails.length === 0) return fail("Enter at least one email address");

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
      return fail(errors[0] ?? "Failed to send invites");
    }
    const sent = emails.length - errors.length;
    return ok(`Invite${sent === 1 ? "" : "s"} sent`);
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Failed to send invites");
  }
}

export async function removeMemberAction(formData: FormData) {
  try {
    const identity = await getIdentity();
    const id = formData.get("id") as string;
    await removeMember(identity, id);
    revalidatePath("/dashboard/team");
    return ok("Member removed");
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Failed to remove member");
  }
}

export async function updateMemberRoleAction(formData: FormData) {
  try {
    const identity = await getIdentity();
    const id = formData.get("id") as string;
    const role = formData.get("role") as string;
    await updateMemberRole(identity, id, role);
    revalidatePath("/dashboard/team");
    return ok("Role updated");
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Failed to update role");
  }
}
