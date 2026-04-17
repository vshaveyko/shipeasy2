"use server";

import { redirect } from "next/navigation";
import { getIdentity } from "@/lib/server-action";
import { createKey, revokeKey } from "@/lib/handlers/keys";

export async function createKeyAction(formData: FormData) {
  const identity = await getIdentity();
  const type = formData.get("type") as string;
  await createKey(identity, { type });
  redirect("/dashboard/keys");
}

export async function revokeKeyAction(formData: FormData) {
  const identity = await getIdentity();
  const id = formData.get("id") as string;
  await revokeKey(identity, id);
  redirect("/dashboard/keys");
}
