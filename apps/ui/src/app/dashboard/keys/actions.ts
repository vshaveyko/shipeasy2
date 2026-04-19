"use server";

import { redirect } from "next/navigation";
import { getIdentity } from "@/lib/server-action";
import { createKey, revokeKey } from "@/lib/handlers/keys";

export async function createKeyAction(formData: FormData) {
  const identity = await getIdentity();
  const type = formData.get("type") as string;
  const result = await createKey(identity, { type });
  redirect(`/dashboard/keys?new_key=${encodeURIComponent(result.key)}`);
}

export async function revokeKeyAction(formData: FormData) {
  const identity = await getIdentity();
  const id = formData.get("id") as string;
  await revokeKey(identity, id);
  redirect("/dashboard/keys");
}
