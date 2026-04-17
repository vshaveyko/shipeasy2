"use server";

import { revalidatePath } from "next/cache";
import { authenticateAdmin } from "@/lib/admin-auth";
import {
  createEvent as createEventHandler,
  updateEvent as updateEventHandler,
  approveEvent as approveEventHandler,
  deleteEvent as deleteEventHandler,
} from "@/lib/handlers/events";

export async function createEvent(input: unknown) {
  const identity = await authenticateAdmin();
  const result = await createEventHandler(identity, input);
  revalidatePath("/dashboard/experiments/events");
  return result;
}

export async function updateEvent(id: string, input: unknown) {
  const identity = await authenticateAdmin();
  const result = await updateEventHandler(identity, id, input);
  revalidatePath("/dashboard/experiments/events");
  return result;
}

export async function approveEvent(id: string, input: unknown = {}) {
  const identity = await authenticateAdmin();
  const result = await approveEventHandler(identity, id, input);
  revalidatePath("/dashboard/experiments/events");
  return result;
}

export async function deleteEvent(id: string) {
  const identity = await authenticateAdmin();
  const result = await deleteEventHandler(identity, id);
  revalidatePath("/dashboard/experiments/events");
  return result;
}
