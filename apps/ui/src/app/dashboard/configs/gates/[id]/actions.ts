"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getIdentity } from "@/lib/server-action";
import { updateGate } from "@/lib/handlers/gates";

export async function saveGateRulesAction(formData: FormData) {
  const identity = await getIdentity();
  const gateId = formData.get("gate_id") as string;
  const ruleCountRaw = formData.get("rule_count") as string | null;
  const ruleCount = ruleCountRaw ? Number(ruleCountRaw) : 0;

  const rules = [];
  for (let i = 0; i < ruleCount; i++) {
    const attr = (formData.get(`rule_attr_${i}`) as string)?.trim();
    const op = (formData.get(`rule_op_${i}`) as string)?.trim();
    const value = (formData.get(`rule_value_${i}`) as string) ?? "";
    if (attr && op) {
      rules.push({ attr, op, value });
    }
  }

  await updateGate(identity, gateId, { rules });
  revalidatePath(`/dashboard/configs/gates/${gateId}`);
  revalidatePath("/dashboard/configs/gates");
  redirect("/dashboard/configs/gates");
}
