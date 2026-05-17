import type { Metadata } from "next";
import { auth } from "@/auth";

export const metadata: Metadata = { title: "Killswitches" };
import { listAllKillswitches } from "@/lib/handlers/killswitches";
import { KillswitchesContent } from "./killswitches-content";

export default async function KillswitchesPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const session = await auth();

  let initial: Awaited<ReturnType<typeof listAllKillswitches>> = [];
  if (session?.user?.email) {
    try {
      initial = await listAllKillswitches({
        projectId,
        actorEmail: session.user.email,
        source: "jwt",
      });
    } catch {
      // DB unavailable in local dev; fall through to empty state.
    }
  }

  return <KillswitchesContent initial={initial} />;
}
