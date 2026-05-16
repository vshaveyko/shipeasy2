"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getIdentity } from "@/lib/server-action";
import {
  softDeleteProject,
  transferOwnership,
  updateProject,
} from "@/lib/handlers/projects";
import {
  updateNotificationPref,
  resetNotificationPrefs,
} from "@/lib/handlers/notifications";
import {
  connectIntegration,
  disconnectIntegration,
} from "@/lib/handlers/integrations";
import { ok, fail } from "@/lib/action-result";

function settingsPath() {
  return "/dashboard/[projectId]/settings";
}

export async function updateProjectAction(formData: FormData) {
  try {
    const identity = await getIdentity();
    const patch: Record<string, unknown> = {};
    const name = formData.get("name");
    if (typeof name === "string" && name.length > 0) patch.name = name;
    const domain = formData.get("domain");
    if (typeof domain === "string" && domain.length > 0) patch.domain = domain;
    const slug = formData.get("slug");
    if (typeof slug === "string" && slug.length > 0) patch.slug = slug;
    const defaultEnv = formData.get("defaultEnv");
    if (typeof defaultEnv === "string" && defaultEnv) patch.defaultEnv = defaultEnv;
    const timezone = formData.get("timezone");
    if (typeof timezone === "string" && timezone) patch.timezone = timezone;
    const statMethod = formData.get("statMethod");
    if (typeof statMethod === "string" && statMethod) patch.statMethod = statMethod;
    const sigThreshold = formData.get("sigThreshold");
    if (typeof sigThreshold === "string" && sigThreshold) patch.sigThreshold = sigThreshold;
    const autoRollback = formData.get("autoRollback");
    if (autoRollback !== null) patch.autoRollback = autoRollback === "on" || autoRollback === "true";
    const minSampleDays = formData.get("minSampleDays");
    if (typeof minSampleDays === "string" && minSampleDays) {
      const n = Number(minSampleDays);
      if (Number.isFinite(n)) patch.minSampleDays = Math.trunc(n);
    }
    await updateProject(identity, identity.projectId, patch);
    revalidatePath(settingsPath(), "page");
    return ok("Settings saved");
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Failed to save settings");
  }
}

export async function transferOwnershipAction(formData: FormData) {
  try {
    const identity = await getIdentity();
    const targetEmail = (formData.get("targetEmail") as string | null) ?? "";
    const confirmName = (formData.get("confirmName") as string | null) ?? "";
    const result = await transferOwnership(identity, identity.projectId, {
      targetEmail,
      confirmName,
    });
    revalidatePath(settingsPath(), "page");
    revalidatePath("/dashboard/team");
    return ok(`Project transferred to ${result.to}`);
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Failed to transfer project");
  }
}

export async function softDeleteProjectAction(formData: FormData) {
  let redirectTo: string | null = null;
  try {
    const identity = await getIdentity();
    const confirmName = (formData.get("confirmName") as string | null) ?? "";
    await softDeleteProject(identity, identity.projectId, confirmName);
    redirectTo = "/dashboard/projects";
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Failed to delete project");
  }
  if (redirectTo) redirect(redirectTo);
  return ok("Project queued for deletion");
}

export async function updateNotificationPrefAction(formData: FormData) {
  try {
    const identity = await getIdentity();
    const event = formData.get("event") as string;
    const email = formData.get("email") === "on";
    const slack = formData.get("slack") === "on";
    const claudeDm = formData.get("claudeDm") === "on";
    await updateNotificationPref(identity, { event, email, slack, claudeDm });
    revalidatePath(settingsPath(), "page");
    return ok("Saved");
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Failed to save preference");
  }
}

export async function resetNotificationPrefsAction() {
  try {
    const identity = await getIdentity();
    await resetNotificationPrefs(identity);
    revalidatePath(settingsPath(), "page");
    return ok("Notification preferences reset");
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Failed to reset");
  }
}

export async function connectIntegrationAction(formData: FormData) {
  try {
    const identity = await getIdentity();
    const kind = formData.get("kind") as string;
    const configRaw = formData.get("config");
    let config: Record<string, unknown> | undefined;
    if (typeof configRaw === "string" && configRaw.trim()) {
      try {
        config = JSON.parse(configRaw);
      } catch {
        return fail("Config must be valid JSON");
      }
    }
    await connectIntegration(identity, { kind, config });
    revalidatePath(settingsPath(), "page");
    return ok("Connected");
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Failed to connect");
  }
}

export async function disconnectIntegrationAction(formData: FormData) {
  try {
    const identity = await getIdentity();
    const kind = formData.get("kind") as string;
    await disconnectIntegration(identity, { kind });
    revalidatePath(settingsPath(), "page");
    return ok("Disconnected");
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Failed to disconnect");
  }
}
