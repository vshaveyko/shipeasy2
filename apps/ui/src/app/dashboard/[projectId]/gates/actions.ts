"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getIdentity } from "@/lib/server-action";
import { createGate, deleteGate, setGateEnabled } from "@/lib/handlers/gates";
import { ok, fail } from "@/lib/action-result";

export async function createGateAction(formData: FormData) {
  const identity = await getIdentity();
  const name = formData.get("key") as string;
  const rollout_pct = Math.round(Number(formData.get("rollout_pct") ?? 0) * 100);
  const created = await createGate(identity, { name, rollout_pct, rules: [] });
  revalidatePath("/dashboard/[projectId]/gates", "page");
  // Land directly on the gatekeeper wizard for the new gate so the user can
  // start stacking sub-gates immediately.
  redirect(`/dashboard/${identity.projectId}/gates/${created.id}`);
}

export async function deleteGateAction(formData: FormData) {
  try {
    const identity = await getIdentity();
    const id = formData.get("id") as string;
    await deleteGate(identity, id);
    revalidatePath("/dashboard/[projectId]/gates", "page");
    return ok("Gate deleted");
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Failed to delete gate");
  }
}

export async function enableGateAction(formData: FormData) {
  try {
    const identity = await getIdentity();
    const id = formData.get("id") as string;
    const enabled = formData.get("enabled") === "true";
    await setGateEnabled(identity, id, enabled);
    revalidatePath("/dashboard/[projectId]/gates", "page");
    return ok(enabled ? "Gate enabled" : "Gate disabled");
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Failed to update gate");
  }
}
