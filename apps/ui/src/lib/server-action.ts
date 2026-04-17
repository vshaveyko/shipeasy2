"use server";

import { redirect } from "next/navigation";
import { auth } from "@/auth";
import type { AdminIdentity } from "./admin-auth";

export async function getIdentity(): Promise<AdminIdentity> {
  const session = await auth();
  const projectId = session?.user?.project_id;
  if (!session?.user || !projectId) redirect("/auth/signin");
  return { projectId, actorEmail: session.user.email ?? "unknown", source: "jwt" };
}
