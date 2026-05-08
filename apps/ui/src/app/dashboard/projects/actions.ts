"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { auth } from "@/auth";
import {
  findProjectById,
  findProjectByOwnerAndDomain,
  insertProject,
  listProjectsByEmail,
} from "@shipeasy/core";
import { projectDomainSchema } from "@shipeasy/core/schemas/keys";
import { getEnvAsync } from "@/lib/env";
import { ok, fail } from "@/lib/action-result";

export async function createProjectAction(formData: FormData) {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) redirect("/auth/signin");

  const name = ((formData.get("name") as string) ?? "").trim();
  if (!name) return fail("Name is required");

  const rawDomain = (formData.get("domain") as string) ?? "";
  const domainParsed = projectDomainSchema.safeParse(rawDomain);
  if (!domainParsed.success) {
    return fail(domainParsed.error.issues[0]?.message ?? "Invalid domain");
  }
  const domain = domainParsed.data;

  const env = await getEnvAsync();

  // Per-owner uniqueness on domain. The DB also enforces this via a unique
  // index, but we surface a friendly message instead of a raw constraint
  // error. Wildcard "*" projects are allowed to coexist with FQDN ones
  // under the same owner — the unique index treats the literal "*" as a
  // distinct value.
  const dup = await findProjectByOwnerAndDomain(env.DB, email, domain);
  if (dup) {
    return fail(
      `A project with domain "${domain}" already exists (${dup.name}). Pick a different domain or open the existing project.`,
    );
  }

  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  try {
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
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return fail(`Could not create project: ${msg}`);
  }

  const cookieStore = await cookies();
  cookieStore.set("active_project_id", id, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });

  revalidatePath("/dashboard");
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
