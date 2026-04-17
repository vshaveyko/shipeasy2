"use server";

import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getEnvAsync } from "@/lib/env";

export async function approveCliAuthAction(formData: FormData) {
  const session = await auth();
  if (!session?.user?.project_id || !session?.user?.email) {
    redirect("/auth/signin");
  }

  const state = formData.get("state") as string;
  if (!state) throw new Error("Missing state");

  const env = await getEnvAsync();
  const workerUrl = env.WORKER_URL;
  const secret = env.CLI_SERVICE_SECRET;

  if (!workerUrl) throw new Error("WORKER_URL not configured");
  if (!secret) throw new Error("CLI_SERVICE_SECRET not configured");

  const res = await fetch(`${workerUrl}/auth/device/complete`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Service-Key": secret,
    },
    body: JSON.stringify({
      state,
      project_id: session.user.project_id,
      user_email: session.user.email,
    }),
  });

  if (res.status === 404)
    throw new Error("Auth session not found or expired. Try running `shipeasy auth login` again.");
  if (res.status === 409) throw new Error("Auth session already completed.");
  if (res.status === 410)
    throw new Error("Auth session expired. Try running `shipeasy auth login` again.");
  if (!res.ok) throw new Error(`Unexpected error (${res.status}). Please try again.`);

  redirect("/cli-auth/success");
}
