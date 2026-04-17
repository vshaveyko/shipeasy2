import { FlaskConical } from "lucide-react";
import { auth } from "@/auth";
import { listExperiments } from "@/lib/handlers/experiments";
import { EmptyState } from "@/components/dashboard/empty-state";
import { PageHeader } from "@/components/dashboard/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LinkButton } from "@/components/ui/link-button";
import { deleteExperimentAction, setExperimentStatusAction } from "./actions";

export default async function ExperimentsPage() {
  const session = await auth();
  const projectId = session?.user?.project_id;

  let experiments: Awaited<ReturnType<typeof listExperiments>> = [];
  if (projectId) {
    try {
      experiments = await listExperiments({
        projectId,
        actorEmail: session?.user?.email ?? "unknown",
        source: "jwt",
      });
    } catch {
      // DB not available in dev without wrangler
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Experiments"
        description="Run A/B tests on metrics with guardrails. Results compute daily once an experiment starts."
        actions={
          <LinkButton size="sm" href="/dashboard/experiments/new">
            New experiment
          </LinkButton>
        }
      />
      {experiments.length === 0 ? (
        <EmptyState
          icon={FlaskConical}
          title="No experiments yet"
          description="Create an experiment to start running A/B tests on your metrics."
          action={
            <LinkButton size="sm" href="/dashboard/experiments/new">
              Create experiment
            </LinkButton>
          }
        />
      ) : (
        <div className="rounded-lg border">
          {experiments.map((exp) => (
            <div
              key={exp.id}
              className="flex items-center justify-between border-b px-4 py-3 last:border-0"
            >
              <div className="flex items-center gap-3">
                <span className="font-mono text-sm font-medium">{exp.name}</span>
                <Badge variant={exp.status === "running" ? "default" : "secondary"}>
                  {exp.status}
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                {exp.status === "draft" && (
                  <form action={setExperimentStatusAction}>
                    <input type="hidden" name="id" value={exp.id} />
                    <input type="hidden" name="status" value="running" />
                    <Button size="sm" variant="outline" type="submit">
                      Start
                    </Button>
                  </form>
                )}
                {exp.status === "running" && (
                  <form action={setExperimentStatusAction}>
                    <input type="hidden" name="id" value={exp.id} />
                    <input type="hidden" name="status" value="stopped" />
                    <Button size="sm" variant="outline" type="submit">
                      Stop
                    </Button>
                  </form>
                )}
                {exp.status !== "running" && (
                  <form action={deleteExperimentAction}>
                    <input type="hidden" name="id" value={exp.id} />
                    <Button
                      size="sm"
                      variant="ghost"
                      type="submit"
                      className="text-destructive hover:text-destructive"
                    >
                      Delete
                    </Button>
                  </form>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
