import { Globe2 } from "lucide-react";

import { EmptyState } from "@/components/dashboard/empty-state";
import { PageHeader } from "@/components/dashboard/page-header";
import { Button } from "@/components/ui/button";

export default function UniversesPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Universes"
        description="A universe groups experiments that share a holdout. Users held out of a universe see no experiment inside it."
        actions={
          <Button size="sm" disabled>
            New universe
          </Button>
        }
      />
      <EmptyState
        icon={Globe2}
        title="One default universe"
        description="Your project starts with a 'default' universe and no holdout. Create a custom universe once you want to reserve a % of users as a long-term control."
      />
    </div>
  );
}
