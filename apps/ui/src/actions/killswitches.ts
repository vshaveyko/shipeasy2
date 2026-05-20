"use server";

import { revalidatePath } from "next/cache";
import { authenticateAdmin } from "@/lib/admin-auth";
import {
  createKillswitch as createKillswitchHandler,
  updateKillswitch as updateKillswitchHandler,
  deleteKillswitch as deleteKillswitchHandler,
  setKillswitchSwitch as setKillswitchSwitchHandler,
  unsetKillswitchSwitch as unsetKillswitchSwitchHandler,
} from "@/lib/handlers/killswitches";
import { DOGFOOD_EVENTS, dogfoodTrack } from "@/lib/dogfood";

const PATH = "/dashboard/[projectId]/killswitches";

export async function createKillswitch(input: unknown) {
  const identity = await authenticateAdmin();
  const result = await createKillswitchHandler(identity, input);
  dogfoodTrack(identity.actorEmail || identity.projectId, DOGFOOD_EVENTS.killswitchCreated, {
    project_id: identity.projectId,
  });
  revalidatePath(PATH, "page");
  return result;
}

export async function updateKillswitch(id: string, input: unknown) {
  const identity = await authenticateAdmin();
  const result = await updateKillswitchHandler(identity, id, input);
  revalidatePath(PATH, "page");
  return result;
}

export async function deleteKillswitch(id: string) {
  const identity = await authenticateAdmin();
  const result = await deleteKillswitchHandler(identity, id);
  revalidatePath(PATH, "page");
  return result;
}

export async function setKillswitchSwitch(id: string, input: unknown) {
  const identity = await authenticateAdmin();
  const result = await setKillswitchSwitchHandler(identity, id, input);
  dogfoodTrack(identity.actorEmail || identity.projectId, DOGFOOD_EVENTS.killswitchToggled, {
    project_id: identity.projectId,
    killswitch_id: id,
    state: "set",
  });
  revalidatePath(PATH, "page");
  return result;
}

export async function unsetKillswitchSwitch(id: string, input: unknown) {
  const identity = await authenticateAdmin();
  const result = await unsetKillswitchSwitchHandler(identity, id, input);
  dogfoodTrack(identity.actorEmail || identity.projectId, DOGFOOD_EVENTS.killswitchToggled, {
    project_id: identity.projectId,
    killswitch_id: id,
    state: "unset",
  });
  revalidatePath(PATH, "page");
  return result;
}
