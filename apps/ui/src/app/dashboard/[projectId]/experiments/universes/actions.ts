"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getIdentity } from "@/lib/server-action";
import { createUniverse, deleteUniverse } from "@/lib/handlers/universes";
import { setFlashError } from "@/lib/flash-error";
import { UNIVERSE_ERROR_COOKIE } from "./universe-error-cookie";

export async function createUniverseAction(formData: FormData) {
  const identity = await getIdentity();
  const name = formData.get("name") as string;
  const unit_type = (formData.get("unit_type") as string) || "user_id";
  const loRaw = formData.get("holdout_lo") as string | null;
  const hiRaw = formData.get("holdout_hi") as string | null;
  const holdout_range =
    loRaw !== null && loRaw !== "" && hiRaw !== null && hiRaw !== ""
      ? [Number(loRaw), Number(hiRaw)]
      : null;
  try {
    await createUniverse(identity, { name, unit_type, holdout_range });
  } catch (e) {
    await setFlashError({
      cookieName: UNIVERSE_ERROR_COOKIE,
      scopePath: `/dashboard/${identity.projectId}/experiments/universes`,
      message: e instanceof Error ? e.message : "Failed to create universe",
    });
  }
  revalidatePath("/dashboard/[projectId]/experiments/universes", "page");
  redirect(`/dashboard/${identity.projectId}/experiments/universes`);
}

export async function deleteUniverseAction(formData: FormData) {
  const identity = await getIdentity();
  const id = formData.get("id") as string;
  try {
    await deleteUniverse(identity, id);
  } catch (e) {
    await setFlashError({
      cookieName: UNIVERSE_ERROR_COOKIE,
      scopePath: `/dashboard/${identity.projectId}/experiments/universes`,
      message: e instanceof Error ? e.message : "Failed to delete universe",
    });
  }
  revalidatePath("/dashboard/[projectId]/experiments/universes", "page");
  redirect(`/dashboard/${identity.projectId}/experiments/universes`);
}
