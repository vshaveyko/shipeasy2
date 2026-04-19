"use server";

import { and, eq } from "drizzle-orm";
import { getDb } from "@shipeasy/core";
import { projects } from "@shipeasy/core/db/schema";
import { createKey } from "@/lib/handlers/keys";
import type { AdminIdentity } from "@/lib/admin-auth";
import { auth } from "@/auth";
import { getEnvAsync } from "@/lib/env";

export interface ProjectOption {
  id: string;
  name: string;
  plan: string;
}

export interface DevtoolsAuthResult {
  token: string;
  projectId: string;
  projectName: string;
  email: string;
}

/**
 * List projects the signed-in user can authorize DevTools for. Currently
 * each user owns exactly one project (projects.owner_email is unique), but
 * the list shape is forward-compatible with future multi-project membership.
 */
export async function listDevtoolsProjectsAction(): Promise<ProjectOption[]> {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) throw new Error("Not signed in");

  const env = await getEnvAsync();
  const db = getDb(env.DB);
  const rows = await db.select().from(projects).where(eq(projects.ownerEmail, email));
  return rows.map((r) => ({ id: r.id, name: r.name, plan: r.plan }));
}

/**
 * Mints a fresh admin SDK key for the chosen project (must be owned by the
 * signed-in user) and returns it so the popup can postMessage it back to
 * the opener.
 */
export async function approveDevtoolsAuthAction(projectId: string): Promise<DevtoolsAuthResult> {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) throw new Error("Not signed in");
  if (!projectId) throw new Error("Project is required");

  const env = await getEnvAsync();
  const db = getDb(env.DB);
  const [project] = await db
    .select()
    .from(projects)
    .where(and(eq(projects.id, projectId), eq(projects.ownerEmail, email)))
    .limit(1);
  if (!project) throw new Error("Project not found or you do not have access to it");

  const identity: AdminIdentity = { projectId: project.id, actorEmail: email, source: "jwt" };
  const result = await createKey(identity, { type: "admin" });
  return { token: result.key, projectId: project.id, projectName: project.name, email };
}
