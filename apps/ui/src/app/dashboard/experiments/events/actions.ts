"use server";

import { redirect } from "next/navigation";
import { getIdentity } from "@/lib/server-action";
import { createEvent, deleteEvent, approveEvent } from "@/lib/handlers/events";

export async function createEventAction(formData: FormData) {
  const identity = await getIdentity();
  const name = formData.get("name") as string;
  const description = (formData.get("description") as string) || undefined;
  await createEvent(identity, { name, description, properties: [] });
  redirect("/dashboard/experiments/events");
}

export async function approveEventAction(formData: FormData) {
  const identity = await getIdentity();
  const id = formData.get("id") as string;
  await approveEvent(identity, id, {});
  redirect("/dashboard/experiments/events");
}

export async function deleteEventAction(formData: FormData) {
  const identity = await getIdentity();
  const id = formData.get("id") as string;
  await deleteEvent(identity, id);
  redirect("/dashboard/experiments/events");
}
