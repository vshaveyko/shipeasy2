import { ToggleLeft } from "lucide-react";
import { auth } from "@/auth";
import { listGates } from "@/lib/handlers/gates";
import { EmptyState } from "@/components/dashboard/empty-state";
import { PageHeader } from "@/components/dashboard/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LinkButton } from "@/components/ui/link-button";
import { deleteGateAction, enableGateAction } from "./actions";

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
        <div className="rounded-lg border">
          {gates.map((gate) => (
            <div
              key={gate.id}
              className="flex items-center justify-between border-b px-4 py-3 last:border-0"
            >
              <div className="flex items-center gap-3">
                <span className="font-mono text-sm font-medium">{gate.name}</span>
                <Badge variant={gate.enabled ? "default" : "secondary"}>
                  {gate.enabled ? "enabled" : "disabled"}
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <LinkButton size="sm" variant="ghost" href={`/dashboard/configs/gates/${gate.id}`}>
                  Edit
                </LinkButton>
                <form action={enableGateAction}>
                  <input type="hidden" name="id" value={gate.id} />
                  <input type="hidden" name="enabled" value={gate.enabled ? "false" : "true"} />
                  <Button size="sm" variant="ghost" type="submit">
                    {gate.enabled ? "Disable" : "Enable"}
                  </Button>
                </form>
                <form action={deleteGateAction}>
                  <input type="hidden" name="id" value={gate.id} />
                  <Button
                    size="sm"
                    variant="ghost"
                    type="submit"
                    className="text-destructive hover:text-destructive"
                  >
                    Delete
                  </Button>
                </form>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
