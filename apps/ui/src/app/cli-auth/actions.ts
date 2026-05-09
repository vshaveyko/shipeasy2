"use server";

import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { findProjectById, hasProjectAccess } from "@shipeasy/core";
import { getEnvAsync } from "@/lib/env";

export async function approveCliAuthAction(formData: FormData) {
  const session = await auth();
  if (!session?.user?.email) {
    redirect("/auth/signin");
  }

  const state = formData.get("state");
  const projectId = formData.get("project_id");
  if (typeof state !== "string" || !state) throw new Error("Missing state");
  if (typeof projectId !== "string" || !projectId) throw new Error("Missing project_id");

  const env = await getEnvAsync();
  const userEmail = session.user.email;

  // Verify the caller actually has access to the project they picked. We
  // don't trust the form value blindly — a malicious POST could swap in a
  // project_id the user has no relationship with, and the CLI would happily
  // bind to it. Owners and active members both qualify.
  const project = await findProjectById(env.DB, projectId);
  if (!project || !(await hasProjectAccess(env.DB, project.id, userEmail))) {
    throw new Error("You don't have access to that project.");
  }

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
      project_id: projectId,
      user_email: userEmail,
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
