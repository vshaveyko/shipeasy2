"use server";

import { revalidatePath } from "next/cache";
import { authenticateAdmin } from "@/lib/admin-auth";
import {
  createUniverse as createUniverseHandler,
  updateUniverse as updateUniverseHandler,
  deleteUniverse as deleteUniverseHandler,
} from "@/lib/handlers/universes";

export async function createUniverse(input: unknown) {
  const identity = await authenticateAdmin();
  const result = await createUniverseHandler(identity, input);
  revalidatePath("/dashboard/experiments/universes");
  return result;
}

export async function updateUniverse(id: string, input: unknown) {
  const identity = await authenticateAdmin();
  const result = await updateUniverseHandler(identity, id, input);
  revalidatePath("/dashboard/experiments/universes");
  return result;
}

export async function deleteUniverse(id: string) {
  const identity = await authenticateAdmin();
  const result = await deleteUniverseHandler(identity, id);
  revalidatePath("/dashboard/experiments/universes");
  return result;
}
