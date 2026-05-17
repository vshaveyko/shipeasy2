"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getIdentity } from "@/lib/server-action";
import { createGate, deleteGate, setGateEnabled } from "@/lib/handlers/gates";
import { ok, fail } from "@/lib/action-result";
import { setFlashError } from "@/lib/flash-error";
import { GATE_ERROR_COOKIE } from "./gate-error-cookie";

export async function createGateAction(formData: FormData) {
  const identity = await getIdentity();
  const name = formData.get("key") as string;
  const rollout_pct = Math.round(Number(formData.get("rollout_pct") ?? 0) * 100);
  const stackRaw = formData.get("stack");
  let stack: unknown = undefined;
  if (typeof stackRaw === "string" && stackRaw.length > 0) {
    try {
      stack = JSON.parse(stackRaw);
    } catch {
      // ignore — fall through with no stack
    }
  }
  let created: Awaited<ReturnType<typeof createGate>> | null = null;
  try {
    created = await createGate(identity, {
      name,
      rollout_pct,
      rules: [],
      ...(Array.isArray(stack) && stack.length > 0 ? { stack: stack as never } : {}),
    });
  } catch (e) {
    await setFlashError({
      cookieName: GATE_ERROR_COOKIE,
      scopePath: `/dashboard/${identity.projectId}/gates`,
      message: e instanceof Error ? e.message : "Failed to create gate",
    });
  }
  revalidatePath("/dashboard/[projectId]/gates", "page");
  if (!created) {
    // Send the user back to the gates list so the error banner has somewhere
    // to render (the /new page is a client component and can't read the cookie).
    redirect(`/dashboard/${identity.projectId}/gates`);
  }
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
