"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getIdentity } from "@/lib/server-action";
import { createConfig, deleteConfig, bulkDeleteConfigs } from "@/lib/handlers/configs";

export async function createConfigAction(formData: FormData) {
  const identity = await getIdentity();
  const name = formData.get("key") as string;
  const valueType = (formData.get("value_type") as string) || "string";
  const rawValue = (formData.get("value") as string) ?? "";

  let value: unknown;
  if (valueType === "string") {
    value = rawValue;
  } else if (valueType === "number") {
    value = rawValue !== "" ? Number(rawValue) : 0;
  } else if (valueType === "boolean") {
    value = rawValue === "true";
  } else {
    try {
      value = JSON.parse(rawValue || "null");
    } catch {
      value = null;
    }
  }

  const created = await createConfig(identity, {
    name,
    valueType: (valueType as "string" | "number" | "boolean" | "object" | "array") ?? undefined,
    value: value ?? "",
  });
  revalidatePath("/dashboard/configs/values");
  revalidatePath("/dashboard");
  redirect(`/dashboard/configs/values/${created.id}`);
}

export async function deleteConfigAction(formData: FormData) {
  const identity = await getIdentity();
  const id = formData.get("id") as string;
  await deleteConfig(identity, id);
  revalidatePath("/dashboard/configs/values");
  revalidatePath("/dashboard");
  redirect("/dashboard/configs/values");
}

export async function bulkDeleteConfigsAction(ids: string[]) {
  const identity = await getIdentity();
  await bulkDeleteConfigs(identity, ids);
}
