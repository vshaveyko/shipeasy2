"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getIdentity } from "@/lib/server-action";
import { createConfig, deleteConfig, bulkDeleteConfigs } from "@/lib/handlers/configs";

export async function createConfigAction(input: {
  name: string;
  description?: string;
  schema: Record<string, unknown>;
  value: unknown;
}) {
  const identity = await getIdentity();
  const created = await createConfig(identity, input);
  revalidatePath("/dashboard/[projectId]/configs/values", "page");
  revalidatePath("/dashboard");
  redirect(`/dashboard/${identity.projectId}/configs/values/${created.id}`);
}

export async function deleteConfigAction(formData: FormData) {
  const identity = await getIdentity();
  const id = formData.get("id") as string;
  await deleteConfig(identity, id);
  revalidatePath("/dashboard/[projectId]/configs/values", "page");
  revalidatePath("/dashboard");
  redirect(`/dashboard/${identity.projectId}/configs/values`);
}

export async function bulkDeleteConfigsAction(ids: string[]) {
  const identity = await getIdentity();
  await bulkDeleteConfigs(identity, ids);
}
