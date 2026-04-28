"use server";

import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { auth } from "@/auth";
import { findProjectById, insertProject, listProjectsByEmail } from "@shipeasy/core";
import { getEnvAsync } from "@/lib/env";
import { ok, fail } from "@/lib/action-result";

export async function createProjectAction(formData: FormData) {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) redirect("/auth/signin");

  const name = ((formData.get("name") as string) ?? "").trim();
  const domain = ((formData.get("domain") as string) ?? "").trim() || undefined;
  if (!name) return fail("Name is required");

  const env = await getEnvAsync();
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  await insertProject(env.DB, {
    id,
    name,
    domain,
    ownerEmail: email,
    plan: "free",
    status: "active",
    subscriptionStatus: "none",
    cancelAtPeriodEnd: 0,
    billingInterval: "monthly",
    createdAt: now,
    updatedAt: now,
  });

  const cookieStore = await cookies();
  cookieStore.set("active_project_id", id, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });

  redirect("/dashboard");
}

export async function switchProjectAction(formData: FormData) {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) return fail("Not authenticated");

  const projectId = (formData.get("projectId") as string) ?? "";
  if (!projectId) return fail("Missing project ID");

  const env = await getEnvAsync();
  const proj = await findProjectById(env.DB, projectId);
  if (!proj || proj.ownerEmail !== email) return fail("Not authorized");

  const cookieStore = await cookies();
  cookieStore.set("active_project_id", projectId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });

  return ok("Switched");
}

export async function listUserProjectsAction() {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) return [];

  try {
    const env = await getEnvAsync();
    return listProjectsByEmail(env.DB, email);
  } catch {
    return [];
  }
}
