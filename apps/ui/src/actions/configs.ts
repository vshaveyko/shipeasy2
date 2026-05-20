"use server";

import { revalidatePath } from "next/cache";
import { authenticateAdmin } from "@/lib/admin-auth";
import {
  createConfig as createConfigHandler,
  updateConfig as updateConfigHandler,
  updateConfigSchema as updateConfigSchemaHandler,
  deleteConfig as deleteConfigHandler,
} from "@/lib/handlers/configs";
import { DOGFOOD_EVENTS, dogfoodTrack } from "@/lib/dogfood";

const CONFIGS_PATH = "/dashboard/configs/values";

export async function createConfig(input: unknown) {
  const identity = await authenticateAdmin();
  const result = await createConfigHandler(identity, input);
  dogfoodTrack(identity.actorEmail || identity.projectId, DOGFOOD_EVENTS.configCreated, {
    project_id: identity.projectId,
  });
  revalidatePath(CONFIGS_PATH);
  return result;
}

export async function updateConfig(id: string, input: unknown) {
  const identity = await authenticateAdmin();
  const result = await updateConfigHandler(identity, id, input);
  revalidatePath(CONFIGS_PATH);
  return result;
}

export async function updateConfigSchema(id: string, schema: unknown) {
  const identity = await authenticateAdmin();
  const result = await updateConfigSchemaHandler(identity, id, { schema });
  revalidatePath(CONFIGS_PATH);
  return result;
}

export async function deleteConfig(id: string) {
  const identity = await authenticateAdmin();
  const result = await deleteConfigHandler(identity, id);
  revalidatePath(CONFIGS_PATH);
  return result;
}
