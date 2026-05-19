"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getIdentity } from "@/lib/server-action";
import { createAttribute, deleteAttribute, bulkDeleteAttributes } from "@/lib/handlers/attributes";
import { setFlashError } from "@/lib/flash-error";
import { ATTRIBUTE_ERROR_COOKIE } from "./attribute-error-cookie";

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
  try {
    await createAttribute(identity, { name, type, enum_values, required: false });
  } catch (e) {
    await setFlashError({
      cookieName: ATTRIBUTE_ERROR_COOKIE,
      scopePath: `/dashboard/${identity.projectId}/experiments/attributes`,
      message: e instanceof Error ? e.message : "Failed to create attribute",
    });
  }
  revalidatePath("/dashboard/[projectId]/experiments/attributes", "page");
  redirect(`/dashboard/${identity.projectId}/experiments/attributes`);
}

export async function deleteAttributeAction(formData: FormData) {
  const identity = await getIdentity();
  const id = formData.get("id") as string;
  try {
    await deleteAttribute(identity, id);
  } catch (e) {
    await setFlashError({
      cookieName: ATTRIBUTE_ERROR_COOKIE,
      scopePath: `/dashboard/${identity.projectId}/experiments/attributes`,
      message: e instanceof Error ? e.message : "Failed to delete attribute",
    });
  }
  revalidatePath("/dashboard/[projectId]/experiments/attributes", "page");
  redirect(`/dashboard/${identity.projectId}/experiments/attributes`);
}

export async function bulkDeleteAttributesAction(ids: string[]) {
  const identity = await getIdentity();
  await bulkDeleteAttributes(identity, ids);
}
