"use server";

import { redirect } from "next/navigation";
import { getIdentity } from "@/lib/server-action";
import { createGate, deleteGate, setGateEnabled } from "@/lib/handlers/gates";

export async function createGateAction(formData: FormData) {
  const identity = await getIdentity();
  const name = formData.get("key") as string;
  await createGate(identity, { name, rollout_pct: 0, rules: [], killswitch: false });
  redirect("/dashboard/configs/gates");
}

export async function deleteGateAction(formData: FormData) {
  const identity = await getIdentity();
  const id = formData.get("id") as string;
  await deleteGate(identity, id);
  redirect("/dashboard/configs/gates");
}

export async function enableGateAction(formData: FormData) {
  const identity = await getIdentity();
  const id = formData.get("id") as string;
  const enabled = formData.get("enabled") === "true";
  await setGateEnabled(identity, id, enabled);
  redirect("/dashboard/configs/gates");
}
