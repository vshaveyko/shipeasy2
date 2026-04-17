"use server";

import { revalidatePath } from "next/cache";
import { authenticateAdmin } from "@/lib/admin-auth";
import {
  createConfig as createConfigHandler,
  updateConfig as updateConfigHandler,
  deleteConfig as deleteConfigHandler,
} from "@/lib/handlers/configs";

const CONFIGS_PATH = "/dashboard/configs/values";

export async function createConfig(input: unknown) {
  const identity = await authenticateAdmin();
  const result = await createConfigHandler(identity, input);
  revalidatePath(CONFIGS_PATH);
  return result;
}

export async function updateConfig(id: string, input: unknown) {
  const identity = await authenticateAdmin();
  const result = await updateConfigHandler(identity, id, input);
  revalidatePath(CONFIGS_PATH);
  return result;
}

export async function deleteConfig(id: string) {
  const identity = await authenticateAdmin();
  const result = await deleteConfigHandler(identity, id);
  revalidatePath(CONFIGS_PATH);
  return result;
}
