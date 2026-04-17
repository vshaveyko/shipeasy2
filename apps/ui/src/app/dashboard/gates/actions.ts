"use server";

import { redirect } from "next/navigation";
import { getIdentity } from "@/lib/server-action";
import { createGate, deleteGate, setGateEnabled } from "@/lib/handlers/gates";

export async function createGateAction(formData: FormData) {
  const identity = await getIdentity();
  const name = formData.get("key") as string;
  // Slider sends 0-100; schema stores 0-10000
  const rollout_pct = Math.round(Number(formData.get("rollout_pct") ?? 0) * 100);
  const killswitch = formData.get("killswitch") === "true";
  await createGate(identity, { name, rollout_pct, rules: [], killswitch });
  redirect("/dashboard/gates");
}

export async function deleteGateAction(formData: FormData) {
  const identity = await getIdentity();
  const id = formData.get("id") as string;
  await deleteGate(identity, id);
  redirect("/dashboard/gates");
}

export async function enableGateAction(formData: FormData) {
  const identity = await getIdentity();
  const id = formData.get("id") as string;
  const enabled = formData.get("enabled") === "true";
  await setGateEnabled(identity, id, enabled);
  redirect("/dashboard/gates");
}
