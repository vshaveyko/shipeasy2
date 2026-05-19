"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getIdentity } from "@/lib/server-action";
import { createKey, revokeKey } from "@/lib/handlers/keys";
import { ok, fail } from "@/lib/action-result";
import { NEW_KEY_COOKIE } from "./new-key-cookie";

const KEY_ERROR_COOKIE = "shipeasy_new_key_error";

export async function createKeyAction(formData: FormData) {
  const identity = await getIdentity();
  const type = formData.get("type") as string;
  const cookieStore = await cookies();
  try {
    const result = await createKey(identity, { type });
    cookieStore.set(NEW_KEY_COOKIE, result.key, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: `/dashboard/${identity.projectId}/keys`,
      maxAge: 30,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to create key";
    cookieStore.set(KEY_ERROR_COOKIE, message, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: `/dashboard/${identity.projectId}/keys`,
      maxAge: 30,
    });
  }
  revalidatePath("/dashboard/[projectId]/keys", "page");
  redirect(`/dashboard/${identity.projectId}/keys`);
}

export async function dismissNewKeyAction() {
  const cookieStore = await cookies();
  cookieStore.delete(NEW_KEY_COOKIE);
  cookieStore.delete(KEY_ERROR_COOKIE);
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
