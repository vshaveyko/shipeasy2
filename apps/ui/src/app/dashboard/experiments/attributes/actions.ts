"use server";

import { redirect } from "next/navigation";
import { getIdentity } from "@/lib/server-action";
import { createAttribute, deleteAttribute } from "@/lib/handlers/attributes";

export async function createAttributeAction(formData: FormData) {
  const identity = await getIdentity();
  const name = formData.get("name") as string;
  const type = (formData.get("type") as string) || "string";
  await createAttribute(identity, { name, type, enum_values: null, required: false });
  redirect("/dashboard/experiments/attributes");
}

export async function deleteAttributeAction(formData: FormData) {
  const identity = await getIdentity();
  const id = formData.get("id") as string;
  await deleteAttribute(identity, id);
  redirect("/dashboard/experiments/attributes");
}
