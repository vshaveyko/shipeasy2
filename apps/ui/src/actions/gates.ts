"use server";

import { revalidatePath } from "next/cache";
import { authenticateAdmin } from "@/lib/admin-auth";
import {
  createGate as createGateHandler,
  updateGate as updateGateHandler,
  setGateEnabled,
  deleteGate as deleteGateHandler,
} from "@/lib/handlers/gates";
import { DOGFOOD_EVENTS, dogfoodTrack } from "@/lib/dogfood";

const GATES_PATH = "/dashboard/[projectId]/gates";

export async function createGate(input: unknown) {
  const identity = await authenticateAdmin();
  const result = await createGateHandler(identity, input);
  dogfoodTrack(identity.actorEmail || identity.projectId, DOGFOOD_EVENTS.gateCreated, {
    project_id: identity.projectId,
  });
  revalidatePath(GATES_PATH, "page");
  return result;
}

export async function updateGate(id: string, input: unknown) {
  const identity = await authenticateAdmin();
  const result = await updateGateHandler(identity, id, input);
  revalidatePath(GATES_PATH, "page");
  return result;
}

export async function enableGate(id: string) {
  const identity = await authenticateAdmin();
  const result = await setGateEnabled(identity, id, true);
  revalidatePath(GATES_PATH, "page");
  return result;
}

export async function disableGate(id: string) {
  const identity = await authenticateAdmin();
  const result = await setGateEnabled(identity, id, false);
  revalidatePath(GATES_PATH, "page");
  return result;
}

export async function deleteGate(id: string) {
  const identity = await authenticateAdmin();
  const result = await deleteGateHandler(identity, id);
  revalidatePath(GATES_PATH, "page");
  return result;
}
