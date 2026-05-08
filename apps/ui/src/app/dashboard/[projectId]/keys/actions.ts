"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getIdentity } from "@/lib/server-action";
import { createKey, revokeKey } from "@/lib/handlers/keys";
import { ok, fail } from "@/lib/action-result";

export async function createKeyAction(formData: FormData) {
  const identity = await getIdentity();
  const type = formData.get("type") as string;
  const result = await createKey(identity, { type });
  revalidatePath("/dashboard/[projectId]/keys", "page");
  redirect(`/dashboard/keys?new_key=${encodeURIComponent(result.key)}`);
}

export async function revokeKeyAction(formData: FormData) {
  try {
    const identity = await getIdentity();
    const id = formData.get("id") as string;
    await revokeKey(identity, id);
    revalidatePath("/dashboard/[projectId]/keys", "page");
    return ok("Key revoked");
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Failed to revoke key");
  }
}

/** Stub: paginated revoked-keys load. The corresponding listRevokedKeys
 *  handler isn't wired up yet; return an empty page so the UI compiles. */
export async function loadRevokedKeysAction(
  _offset: number,
): Promise<{ rows: never[]; hasMore: boolean; nextOffset: number }> {
  void _offset;
  return { rows: [], hasMore: false, nextOffset: 0 };
}
