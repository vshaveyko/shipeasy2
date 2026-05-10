import { Power } from "lucide-react";
import { auth } from "@/auth";
import { listAllKillswitches } from "@/lib/handlers/killswitches";
import { EmptyState } from "@/components/dashboard/empty-state";
import { Page, PageBody, PageHeader } from "@/components/dashboard/page";
import { KillswitchesContent } from "./killswitches-content";
import { NewKillswitchTrigger } from "./_components/new-killswitch-trigger";

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

  return (
    <Page>
      <PageHeader
        kicker={
          initial.length > 0
            ? `${initial.length} killswitch${initial.length === 1 ? "" : "es"}`
            : undefined
        }
        title="Killswitches"
        description="Static on/off configs delivered as-is to the client. Each can carry per-key overrides that take precedence over the default value."
        actions={<NewKillswitchTrigger />}
      />
      <PageBody>
        {initial.length === 0 ? (
          <EmptyState
            icon={Power}
            title="No killswitches yet"
            description="Killswitches deliver a hardcoded { value, switches } payload through the same edge cache as configs — no eval, no rules."
            action={<NewKillswitchTrigger label="Create killswitch" />}
          />
        ) : (
          <KillswitchesContent initial={initial} />
        )}
      </PageBody>
    </Page>
  );
}
