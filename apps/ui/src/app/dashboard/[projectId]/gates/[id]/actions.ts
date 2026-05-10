"use server";

import { revalidatePath } from "next/cache";
import { getIdentity } from "@/lib/server-action";
import { updateGate } from "@/lib/handlers/gates";
import type { GateUpdateInput } from "@shipeasy/core/schemas/gates";

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
  revalidatePath(`/dashboard/[projectId]/gates/${gateId}`, "page");
  revalidatePath("/dashboard/[projectId]/gates", "page");
}

// ── Wizard save: stack + metadata ─────────────────────────────────────────
//
// The wizard editor calls this with the full stack (sub-gates ordered
// top-to-bottom) + metadata fields. We also write a best-effort fallback
// rules+rolloutPct so legacy SDKs that ignore `stack` still see something
// sensible: the first condition's rules and the public floor's percentage.

export async function saveGatekeeperAction(input: {
  gateId: string;
  title?: string;
  description?: string;
  folder?: string;
  group?: string;
  owner_email?: string;
  stack: GateUpdateInput["stack"];
}) {
  const identity = await getIdentity();
  const stack = input.stack ?? [];

  // Legacy compat: pick the first non-locked condition's rules and the locked
  // public rollout's percentage. If neither is present, leave them unchanged.
  const firstCond = stack.find((e) => e.type === "condition" && !e.locked);
  const publicFloor = [...stack].reverse().find((e) => e.type === "rollout" && e.locked);

  const patch: GateUpdateInput = {
    title: input.title,
    description: input.description,
    folder: input.folder,
    group: input.group,
    owner_email: input.owner_email,
    stack,
  };
  if (firstCond && firstCond.type === "condition") {
    patch.rules = firstCond.rules;
  }
  if (publicFloor && publicFloor.type === "rollout") {
    patch.rollout_pct = publicFloor.rolloutPct;
  }

  await updateGate(identity, input.gateId, patch);
  revalidatePath(`/dashboard/[projectId]/gates/${input.gateId}`, "page");
  revalidatePath("/dashboard/[projectId]/gates", "page");
}
