"use server";

import { revalidatePath } from "next/cache";
import { authenticateAdmin } from "@/lib/admin-auth";
import {
  createGate as createGateHandler,
  updateGate as updateGateHandler,
  setGateEnabled,
  deleteGate as deleteGateHandler,
} from "@/lib/handlers/gates";

const GATES_PATH = "/dashboard/configs/gates";

export async function createGate(input: unknown) {
  const identity = await authenticateAdmin();
  const result = await createGateHandler(identity, input);
  revalidatePath(GATES_PATH);
  return result;
}

export async function updateGate(id: string, input: unknown) {
  const identity = await authenticateAdmin();
  const result = await updateGateHandler(identity, id, input);
  revalidatePath(GATES_PATH);
  return result;
}

export async function enableGate(id: string) {
  const identity = await authenticateAdmin();
  const result = await setGateEnabled(identity, id, true);
  revalidatePath(GATES_PATH);
  return result;
}

export async function disableGate(id: string) {
  const identity = await authenticateAdmin();
  const result = await setGateEnabled(identity, id, false);
  revalidatePath(GATES_PATH);
  return result;
}

export async function deleteGate(id: string) {
  const identity = await authenticateAdmin();
  const result = await deleteGateHandler(identity, id);
  revalidatePath(GATES_PATH);
  return result;
}
