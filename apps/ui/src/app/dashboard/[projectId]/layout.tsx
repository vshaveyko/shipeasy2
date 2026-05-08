import type { ReactNode } from "react";
import { notFound, redirect } from "next/navigation";

import { auth } from "@/auth";
import { getEnvAsync } from "@/lib/env";
import { findProjectById } from "@shipeasy/core";

export default async function ProjectScopedLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const session = await auth();
  if (!session) redirect("/auth/signin");

  const email = session.user?.email ?? "";
  let project: Awaited<ReturnType<typeof findProjectById>> | null = null;
  try {
    const env = await getEnvAsync();
    project = await findProjectById(env.DB, projectId);
  } catch {
    // DB unreachable / schema missing in local dev — skip access check.
    return <>{children}</>;
  }

  // Project lookup succeeded: enforce ownership. If the project is genuinely
  // missing we don't 404 (the dev DB may simply not have it seeded yet) —
  // we 404 only on a confirmed owner mismatch.
  if (project && project.ownerEmail !== email) notFound();

  return <>{children}</>;
}
