import { notFound, redirect } from "next/navigation";

import { auth } from "@/auth";
import { getBug } from "@/lib/handlers/bugs";
import { getFeatureRequest } from "@/lib/handlers/feature-requests";

export default async function FeedbackDetailRedirect({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  const projectId = session?.user?.project_id;
  if (!projectId) notFound();
  const identity = {
    projectId,
    actorEmail: session?.user?.email ?? "unknown",
    source: "jwt" as const,
  };

  let kind: "bug" | "request" | null = null;
  try {
    await getBug(identity, id);
    kind = "bug";
  } catch {
    try {
      await getFeatureRequest(identity, id);
      kind = "request";
    } catch {
      /* fall through to notFound */
    }
  }

  if (kind === "bug") redirect(`/dashboard/bugs/${id}`);
  if (kind === "request") redirect(`/dashboard/feature-requests/${id}`);
  notFound();
}
