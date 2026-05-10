import { ToggleLeft } from "lucide-react";
import { auth } from "@/auth";
import { listAllGates } from "@/lib/handlers/gates";
import { EmptyState } from "@/components/dashboard/empty-state";
import { Page, PageBody, PageHeader } from "@/components/dashboard/page";
import { LinkButton } from "@/components/ui/link-button";
import { GatesContent } from "./gates-content";

export default async function GatesPage() {
  const session = await auth();
  const projectId = session?.user?.project_id;

  let gates: Awaited<ReturnType<typeof listAllGates>> = [];
  if (projectId) {
    try {
      gates = await listAllGates({
        projectId,
        actorEmail: session?.user?.email ?? "unknown",
        source: "jwt",
      });
    } catch {
      // DB not available in dev without wrangler — show empty state
    }
  }

  return (
    <Page>
      <PageHeader
        title="Gates"
        description="Gates toggle features on and off per user, attribute, or percentage."
        actions={
          <LinkButton size="sm" href={`/dashboard/${projectId}/configs/gates/new`}>
            New gate
          </LinkButton>
        }
      />
      <PageBody>
        {gates.length === 0 ? (
          <EmptyState
            icon={ToggleLeft}
            title="No gates yet"
            description="Create your first gate to start rolling features out to targeted users, percentages, or rules."
            action={
              <LinkButton size="sm" href={`/dashboard/${projectId}/configs/gates/new`}>
                Create gate
              </LinkButton>
            }
          />
        ) : (
          <GatesContent gates={gates} />
        )}
      </PageBody>
    </Page>
  );
}
