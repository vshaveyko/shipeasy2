"use server";

import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getEnvAsync } from "@/lib/env";
import { createCheckoutSession, createPortalSession } from "@/lib/billing";

const BILLING_URL = "/dashboard/billing";

export async function startCheckoutAction(formData: FormData) {
  const session = await auth();
  const projectId = session?.user?.project_id;
  const email = session?.user?.email;
  if (!projectId || !email) redirect("/auth/signin");

  const interval = (formData.get("interval") ?? "monthly") as "monthly" | "annual";
  const env = await getEnvAsync();
  const url = await createCheckoutSession(
    env,
    projectId,
    email,
    interval,
    `${process.env.NEXTAUTH_URL ?? "https://shipeasy.ai"}${BILLING_URL}`,
  );
  redirect(url);
}

export async function openPortalAction() {
  const session = await auth();
  const projectId = session?.user?.project_id;
  if (!projectId) redirect("/auth/signin");

  const env = await getEnvAsync();
  const url = await createPortalSession(
    env,
    projectId,
    `${process.env.NEXTAUTH_URL ?? "https://shipeasy.ai"}${BILLING_URL}`,
  );
  redirect(url);
}
