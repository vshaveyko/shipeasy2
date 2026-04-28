"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getIdentity } from "@/lib/server-action";
import { createUniverse, deleteUniverse } from "@/lib/handlers/universes";

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
  await createUniverse(identity, { name, unit_type, holdout_range });
  revalidatePath("/dashboard/experiments/universes");
  redirect("/dashboard/experiments/universes");
}

export async function deleteUniverseAction(formData: FormData) {
  const identity = await getIdentity();
  const id = formData.get("id") as string;
  await deleteUniverse(identity, id);
  revalidatePath("/dashboard/experiments/universes");
  redirect("/dashboard/experiments/universes");
}
