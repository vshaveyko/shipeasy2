"use server";

import { revalidatePath } from "next/cache";
import { authenticateAdmin } from "@/lib/admin-auth";
import { createKey as createKeyHandler, revokeKey as revokeKeyHandler } from "@/lib/handlers/keys";

export async function createKey(input: unknown) {
  const identity = await authenticateAdmin();
  const result = await createKeyHandler(identity, input);
  revalidatePath("/dashboard/keys");
  return result;
}

export async function revokeKey(id: string) {
  const identity = await authenticateAdmin();
  const result = await revokeKeyHandler(identity, id);
  revalidatePath("/dashboard/keys");
  return result;
}
