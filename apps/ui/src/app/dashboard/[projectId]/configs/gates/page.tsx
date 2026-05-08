import { ToggleLeft } from "lucide-react";
import { auth } from "@/auth";
import { listGates } from "@/lib/handlers/gates";
import { EmptyState } from "@/components/dashboard/empty-state";
import { PageHeader } from "@/components/dashboard/page-header";
import { LinkButton } from "@/components/ui/link-button";
import { GatesContent } from "./gates-content";

export default async function GatesPage() {
  const session = await auth();
  const projectId = session?.user?.project_id;

  let gates: Awaited<ReturnType<typeof listGates>> = [];
  if (projectId) {
    try {
      gates = await listGates({
        projectId,
        actorEmail: session?.user?.email ?? "unknown",
        source: "jwt",
      });
    } catch {
      // DB not available in dev without wrangler — show empty state
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Gates"
        description="Gates toggle features on and off per user, attribute, or percentage."
        actions={
          <LinkButton size="sm" href="/dashboard/configs/gates/new">
            New gate
          </LinkButton>
        }
      />
      {gates.length === 0 ? (
        <EmptyState
          icon={ToggleLeft}
          title="No gates yet"
          description="Create your first gate to start rolling features out to targeted users, percentages, or rules."
          action={
            <LinkButton size="sm" href="/dashboard/configs/gates/new">
              Create gate
            </LinkButton>
          }
        />
      ) : (
        <GatesContent gates={gates} />
      )}
    </div>
  );
}
