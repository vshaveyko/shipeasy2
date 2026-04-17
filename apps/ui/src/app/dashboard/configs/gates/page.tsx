import { ToggleLeft } from "lucide-react";

import { EmptyState } from "@/components/dashboard/empty-state";
import { PageHeader } from "@/components/dashboard/page-header";
import { LinkButton } from "@/components/ui/link-button";

export default function GatesPage() {
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
    </div>
  );
}
