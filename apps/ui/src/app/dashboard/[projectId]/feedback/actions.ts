"use server";

import { revalidatePath } from "next/cache";
import { getIdentity } from "@/lib/server-action";
import { updateBug, deleteBug } from "@/lib/handlers/bugs";
import { updateFeatureRequest, deleteFeatureRequest } from "@/lib/handlers/feature-requests";
import {
  BUG_STATUSES,
  BUG_PRIORITIES,
  FEATURE_REQUEST_STATUSES,
  FEATURE_REQUEST_IMPORTANCES,
} from "@shipeasy/core/db/schema";
import { ok, fail, type ActionResult } from "@/lib/action-result";

function revalidateFeedback() {
  revalidatePath(`/dashboard/[projectId]/feedback`, "page");
}

export async function updateBugFieldAction(formData: FormData): Promise<ActionResult> {
  try {
    const id = String(formData.get("id") ?? "");
    if (!id) return fail("Missing id");
    const identity = await getIdentity();
    const patch: { status?: string; priority?: string | null } = {};
    const status = formData.get("status");
    if (typeof status === "string" && status.length > 0) {
      if (!(BUG_STATUSES as readonly string[]).includes(status)) return fail("Invalid status");
      patch.status = status;
    }
    if (formData.has("priority")) {
      const priority = formData.get("priority");
      const value = typeof priority === "string" ? priority : "";
      if (value === "") {
        patch.priority = null;
      } else {
        if (!(BUG_PRIORITIES as readonly string[]).includes(value)) return fail("Invalid priority");
        patch.priority = value;
      }
    }
    if (patch.status === undefined && patch.priority === undefined)
      return fail("No fields to update");
    await updateBug(identity, id, patch);
    revalidateFeedback();
    return ok("Updated");
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Failed to update bug");
  }
}

export async function deleteBugInlineAction(formData: FormData): Promise<ActionResult> {
  try {
    const id = String(formData.get("id") ?? "");
    if (!id) return fail("Missing id");
    const identity = await getIdentity();
    await deleteBug(identity, id);
    revalidateFeedback();
    return ok("Bug deleted");
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Failed to delete bug");
  }
}

export async function updateFeatureRequestFieldAction(formData: FormData): Promise<ActionResult> {
  try {
    const id = String(formData.get("id") ?? "");
    if (!id) return fail("Missing id");
    const identity = await getIdentity();
    const patch: { status?: string; importance?: string } = {};
    const status = formData.get("status");
    if (typeof status === "string" && status.length > 0) {
      if (!(FEATURE_REQUEST_STATUSES as readonly string[]).includes(status)) {
        return fail("Invalid status");
      }
      patch.status = status;
    }
    const importance = formData.get("importance");
    if (typeof importance === "string" && importance.length > 0) {
      if (!(FEATURE_REQUEST_IMPORTANCES as readonly string[]).includes(importance)) {
        return fail("Invalid importance");
      }
      patch.importance = importance;
    }
    if (patch.status === undefined && patch.importance === undefined) {
      return fail("No fields to update");
    }
    await updateFeatureRequest(identity, id, patch);
    revalidateFeedback();
    return ok("Updated");
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Failed to update request");
  }
}

export async function deleteFeatureRequestInlineAction(formData: FormData): Promise<ActionResult> {
  try {
    const id = String(formData.get("id") ?? "");
    if (!id) return fail("Missing id");
    const identity = await getIdentity();
    await deleteFeatureRequest(identity, id);
    revalidateFeedback();
    return ok("Request deleted");
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Failed to delete request");
  }
}
