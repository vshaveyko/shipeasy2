"use server";

import { redirect } from "next/navigation";
import { auth } from "@/auth";
import {
  findProjectById,
  findProjectByOwnerAndDomain,
  hasProjectAccess,
  insertProject,
} from "@shipeasy/core";
import { projectDomainSchema } from "@shipeasy/core/schemas/keys";
import { z } from "zod";
import { getEnvAsync } from "@/lib/env";

const stateSchema = z.string().min(1);

async function completeDeviceAuth(state: string, projectId: string, userEmail: string) {
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
      project_id: projectId,
      user_email: userEmail,
    }),
  });

  if (res.status === 404)
    throw new Error("Auth session not found or expired. Try running `shipeasy login` again.");
  if (res.status === 409) throw new Error("Auth session already completed.");
  if (res.status === 410)
    throw new Error("Auth session expired. Try running `shipeasy login` again.");
  if (!res.ok) throw new Error(`Unexpected error (${res.status}). Please try again.`);
}

export async function approveCliAuthAction(formData: FormData) {
  const session = await auth();
  if (!session?.user?.email) {
    redirect("/auth/signin");
  }

  const state = stateSchema.parse(formData.get("state"));
  const projectId = formData.get("project_id");
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

  await completeDeviceAuth(state, projectId, userEmail);
  redirect("/cli-auth/success");
}

const createSchema = z.object({
  state: stateSchema,
  domain: projectDomainSchema,
  name: z
    .string()
    .min(1)
    .max(100)
    .optional()
    .or(z.literal("").transform(() => undefined)),
});

export async function createAndApproveCliAuthAction(formData: FormData) {
  const session = await auth();
  if (!session?.user?.email) {
    redirect("/auth/signin");
  }

  const parsed = createSchema.parse({
    state: formData.get("state"),
    domain: formData.get("domain"),
    name: formData.get("name") ?? undefined,
  });

  const env = await getEnvAsync();
  const userEmail = session.user.email;

  // Idempotent on (owner_email, domain) — same contract as the
  // CLI's `shipeasy projects upsert`. A user re-running login with the
  // same domain re-binds to the existing project rather than minting a
  // duplicate.
  const existing = await findProjectByOwnerAndDomain(env.DB, userEmail, parsed.domain);
  let projectId: string;
  if (existing) {
    projectId = existing.id;
  } else {
    projectId = crypto.randomUUID();
    const now = new Date().toISOString();
    const projectName = parsed.name ?? parsed.domain;
    await insertProject(env.DB, {
      id: projectId,
      name: projectName,
      domain: parsed.domain,
      ownerEmail: userEmail,
      plan: "free",
      status: "active",
      subscriptionStatus: "none",
      cancelAtPeriodEnd: 0,
      billingInterval: "monthly",
      createdAt: now,
      updatedAt: now,
    });
  }

  await completeDeviceAuth(parsed.state, projectId, userEmail);
  redirect("/cli-auth/success");
}
