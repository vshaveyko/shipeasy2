"use server";

import { redirect } from "next/navigation";
import { getIdentity } from "@/lib/server-action";
import { createUniverse, deleteUniverse } from "@/lib/handlers/universes";

export async function createUniverseAction(formData: FormData) {
  const identity = await getIdentity();
  const name = formData.get("name") as string;
  await createUniverse(identity, { name, unit_type: "user_id", holdout_range: null });
  redirect("/dashboard/experiments/universes");
}

export async function deleteUniverseAction(formData: FormData) {
  const identity = await getIdentity();
  const id = formData.get("id") as string;
  await deleteUniverse(identity, id);
  redirect("/dashboard/experiments/universes");
}
