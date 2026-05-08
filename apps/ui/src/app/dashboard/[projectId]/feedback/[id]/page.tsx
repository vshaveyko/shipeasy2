import { notFound, redirect } from "next/navigation";

import { auth } from "@/auth";
import { getBug } from "@/lib/handlers/bugs";
import { getFeatureRequest } from "@/lib/handlers/feature-requests";

export default async function FeedbackDetailRedirect({
  params,
}: {
  params: Promise<{ projectId: string; id: string }>;
}) {
  const { projectId, id } = await params;
  const session = await auth();
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

  if (kind === "bug") redirect(`/dashboard/${projectId}/bugs/${id}`);
  if (kind === "request") redirect(`/dashboard/${projectId}/feature-requests/${id}`);
  notFound();
}
