"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getIdentity } from "@/lib/server-action";
import { createConnector, deleteConnector, updateConnector } from "@/lib/handlers/connectors";
import { ok, fail, type ActionResult } from "@/lib/action-result";

export async function createConnectorAction(formData: FormData): Promise<void> {
  const identity = await getIdentity();
  const provider = String(formData.get("provider") ?? "google_sheets");
  const name = String(formData.get("name") ?? "").trim() || "Google Sheets";
  const events = formData.getAll("events").map((e) => String(e));
  if (events.length === 0) {
    events.push("bug.created", "feature_request.created");
  }
  const { id } = await createConnector(identity, { provider, name, events });
  // Send the user straight into Google's consent screen.
  redirect(`/api/connectors/oauth/google/start?connectorId=${id}`);
}

export async function deleteConnectorAction(formData: FormData): Promise<void> {
  const identity = await getIdentity();
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await deleteConnector(identity, id);
  revalidatePath("/dashboard/feedback/connectors");
}

export async function configureConnectorAction(formData: FormData): Promise<ActionResult> {
  try {
    const identity = await getIdentity();
    const id = String(formData.get("id") ?? "");
    if (!id) return fail("Missing connector id");
    const spreadsheetId = String(formData.get("spreadsheetId") ?? "").trim();
    const spreadsheetName = String(formData.get("spreadsheetName") ?? "").trim();
    const sheetTitle = String(formData.get("sheetTitle") ?? "").trim();
    const eventList = formData.getAll("events").map((e) => String(e));
    const enabled = formData.get("enabled") === "on";
    if (!spreadsheetId || !sheetTitle) return fail("Pick a spreadsheet and tab");
    await updateConnector(identity, id, {
      enabled,
      events: eventList.length > 0 ? eventList : undefined,
      config: { spreadsheetId, spreadsheetName, sheetTitle },
    });
    revalidatePath("/dashboard/feedback/connectors");
    revalidatePath(`/dashboard/feedback/connectors/${id}`);
    return ok("Connector saved");
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Failed to save connector");
  }
}
