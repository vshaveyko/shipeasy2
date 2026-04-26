"use server";

import { revalidatePath } from "next/cache";
import { getIdentity } from "@/lib/server-action";
import { updateGate } from "@/lib/handlers/gates";

export async function saveGateRulesAction(formData: FormData) {
  const identity = await getIdentity();
  const gateId = formData.get("gate_id") as string;
  const ruleCountRaw = formData.get("rule_count") as string | null;
  const ruleCount = ruleCountRaw ? Number(ruleCountRaw) : 0;
  const rolloutPctRaw = formData.get("rollout_pct") as string | null;
  const rolloutPct =
    rolloutPctRaw != null
      ? Math.round(Math.max(0, Math.min(100, Number(rolloutPctRaw))) * 100)
      : undefined;

  const rules: Array<{ attr: string; op: string; value: string }> = [];
  for (let i = 0; i < ruleCount; i++) {
    const attr = (formData.get(`rule_attr_${i}`) as string)?.trim();
    const op = (formData.get(`rule_op_${i}`) as string)?.trim();
    const value = (formData.get(`rule_value_${i}`) as string) ?? "";
    if (attr && op) {
      rules.push({ attr, op, value });
    }
  }

  const patch: { rules: typeof rules; rollout_pct?: number } = { rules };
  if (rolloutPct != null) patch.rollout_pct = rolloutPct;

  await updateGate(identity, gateId, patch);
  revalidatePath(`/dashboard/gates/${gateId}`);
  revalidatePath("/dashboard/gates");
}
