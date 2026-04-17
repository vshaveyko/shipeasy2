import { FlaskConical } from "lucide-react";

import { EmptyState } from "@/components/dashboard/empty-state";
import { PageHeader } from "@/components/dashboard/page-header";
import { LinkButton } from "@/components/ui/link-button";

export default function ExperimentsPage() {
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
      <EmptyState
        icon={FlaskConical}
        title="No experiments yet"
        description="An experiment has a goal metric, a universe, a traffic split, and runs until it reaches significance."
        action={
          <LinkButton size="sm" href="/dashboard/experiments/new">
            Create experiment
          </LinkButton>
        }
      />
    </div>
  );
}
