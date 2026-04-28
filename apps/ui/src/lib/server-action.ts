"use server";

import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { auth } from "@/auth";
import { findProjectById } from "@shipeasy/core";
import { getEnvAsync } from "@/lib/env";
import type { AdminIdentity } from "./admin-auth";

export async function getIdentity(): Promise<AdminIdentity> {
  const session = await auth();
  const defaultProjectId = session?.user?.project_id;
  if (!session?.user || !defaultProjectId) redirect("/auth/signin");

  const email = session.user.email ?? "unknown";

  const cookieStore = await cookies();
  const cookieProjectId = cookieStore.get("active_project_id")?.value;

  if (cookieProjectId && cookieProjectId !== defaultProjectId) {
    try {
      const env = await getEnvAsync();
      const proj = await findProjectById(env.DB, cookieProjectId);
      if (proj && proj.ownerEmail === email) {
        return { projectId: cookieProjectId, actorEmail: email, source: "jwt" };
      }
    } catch {
      // DB unavailable — fall through to default
    }
  }

  return { projectId: defaultProjectId, actorEmail: email, source: "jwt" };
}
