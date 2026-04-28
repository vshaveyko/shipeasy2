"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getIdentity } from "@/lib/server-action";
import { createAttribute, deleteAttribute, bulkDeleteAttributes } from "@/lib/handlers/attributes";

export async function createAttributeAction(formData: FormData) {
  const identity = await getIdentity();
  const name = formData.get("name") as string;
  const type = (formData.get("type") as string) || "string";
  const enumValuesRaw = formData.get("enum_values") as string | null;
  const enum_values =
    type === "enum" && enumValuesRaw
      ? enumValuesRaw
          .split(",")
          .map((v) => v.trim())
          .filter(Boolean)
      : null;
  await createAttribute(identity, { name, type, enum_values, required: false });
  revalidatePath("/dashboard/experiments/attributes");
  redirect("/dashboard/experiments/attributes");
}

export async function deleteAttributeAction(formData: FormData) {
  const identity = await getIdentity();
  const id = formData.get("id") as string;
  await deleteAttribute(identity, id);
  revalidatePath("/dashboard/experiments/attributes");
  redirect("/dashboard/experiments/attributes");
}

export async function bulkDeleteAttributesAction(ids: string[]) {
  const identity = await getIdentity();
  await bulkDeleteAttributes(identity, ids);
}
