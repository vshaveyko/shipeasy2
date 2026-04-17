"use server";

import { revalidatePath } from "next/cache";
import { authenticateAdmin } from "@/lib/admin-auth";
import {
  createAttribute as createAttributeHandler,
  updateAttribute as updateAttributeHandler,
  deleteAttribute as deleteAttributeHandler,
} from "@/lib/handlers/attributes";

export async function createAttribute(input: unknown) {
  const identity = await authenticateAdmin();
  const result = await createAttributeHandler(identity, input);
  revalidatePath("/dashboard/experiments/attributes");
  return result;
}

export async function updateAttribute(id: string, input: unknown) {
  const identity = await authenticateAdmin();
  const result = await updateAttributeHandler(identity, id, input);
  revalidatePath("/dashboard/experiments/attributes");
  return result;
}

export async function deleteAttribute(id: string) {
  const identity = await authenticateAdmin();
  const result = await deleteAttributeHandler(identity, id);
  revalidatePath("/dashboard/experiments/attributes");
  return result;
}
