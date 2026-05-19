"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getIdentity } from "@/lib/server-action";
import { createEvent, deleteEvent, approveEvent, bulkDeleteEvents } from "@/lib/handlers/events";
import { setFlashError } from "@/lib/flash-error";
import { EVENT_ERROR_COOKIE } from "./event-error-cookie";

async function flashError(projectId: string, e: unknown, fallback: string) {
  await setFlashError({
    cookieName: EVENT_ERROR_COOKIE,
    scopePath: `/dashboard/${projectId}/experiments/events`,
    message: e instanceof Error ? e.message : fallback,
  });
}

export async function createEventAction(formData: FormData) {
  const identity = await getIdentity();
  const name = formData.get("name") as string;
  const description = (formData.get("description") as string) || undefined;
  try {
    await createEvent(identity, { name, description, properties: [] });
  } catch (e) {
    await flashError(identity.projectId, e, "Failed to create event");
  }
  revalidatePath("/dashboard/[projectId]/experiments/events", "page");
  redirect(`/dashboard/${identity.projectId}/experiments/events`);
}

export async function approveEventAction(formData: FormData) {
  const identity = await getIdentity();
  const id = formData.get("id") as string;
  try {
    await approveEvent(identity, id, {});
  } catch (e) {
    await flashError(identity.projectId, e, "Failed to approve event");
  }
  revalidatePath("/dashboard/[projectId]/experiments/events", "page");
  redirect(`/dashboard/${identity.projectId}/experiments/events`);
}

export async function deleteEventAction(formData: FormData) {
  const identity = await getIdentity();
  const id = formData.get("id") as string;
  try {
    await deleteEvent(identity, id);
  } catch (e) {
    await flashError(identity.projectId, e, "Failed to delete event");
  }
  revalidatePath("/dashboard/[projectId]/experiments/events", "page");
  redirect(`/dashboard/${identity.projectId}/experiments/events`);
}

export async function bulkDeleteEventsAction(ids: string[]) {
  const identity = await getIdentity();
  await bulkDeleteEvents(identity, ids);
}
