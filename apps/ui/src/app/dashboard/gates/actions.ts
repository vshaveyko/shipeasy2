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
  const killswitch = formData.get("killswitch") === "true";
  await createGate(identity, { name, rollout_pct, rules: [], killswitch });
  revalidatePath("/dashboard/gates");
  redirect("/dashboard/gates");
}

export async function deleteGateAction(formData: FormData) {
  try {
    const identity = await getIdentity();
    const id = formData.get("id") as string;
    await deleteGate(identity, id);
    revalidatePath("/dashboard/gates");
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
    revalidatePath("/dashboard/gates");
    return ok(enabled ? "Gate enabled" : "Gate disabled");
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Failed to update gate");
  }
}
