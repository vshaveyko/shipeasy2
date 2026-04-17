"use server";

import { redirect } from "next/navigation";
import { getIdentity } from "@/lib/server-action";
import { createConfig, deleteConfig } from "@/lib/handlers/configs";

export async function createConfigAction(formData: FormData) {
  const identity = await getIdentity();
  const name = formData.get("key") as string;
  await createConfig(identity, { name, value: {} });
  redirect("/dashboard/configs/values");
}

export async function deleteConfigAction(formData: FormData) {
  const identity = await getIdentity();
  const id = formData.get("id") as string;
  await deleteConfig(identity, id);
  redirect("/dashboard/configs/values");
}
