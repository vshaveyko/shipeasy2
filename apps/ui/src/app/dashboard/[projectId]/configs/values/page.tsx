import type { Metadata } from "next";

import { auth } from "@/auth";
import { listAllConfigs } from "@/lib/handlers/configs";
import { ConfigsContent } from "./configs-content";
import type { ConfigSummary } from "@/lib/handlers/configs";

export const metadata: Metadata = { title: "Configs" };

export default async function ConfigsPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const session = await auth();

  let initial: ConfigSummary[] = [];
  try {
    initial = await listAllConfigs({
      projectId,
      actorEmail: session?.user?.email ?? "unknown",
      source: "jwt",
    });
  } catch {
    // DB unavailable in dev — render the empty client state.
  }

  return <ConfigsContent initial={initial} />;
}
