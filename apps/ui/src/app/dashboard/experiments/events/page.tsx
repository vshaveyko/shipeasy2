import { Activity } from "lucide-react";

import { EmptyState } from "@/components/dashboard/empty-state";
import { PageHeader } from "@/components/dashboard/page-header";
import { Button } from "@/components/ui/button";

export default function EventsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Events"
        description="The event catalog. Events auto-discover from SDK track() calls and wait for approval before becoming metric-eligible."
        actions={
          <Button size="sm" disabled>
            New event
          </Button>
        }
      />
      <EmptyState
        icon={Activity}
        title="No events yet"
        description="Call track('purchase', ...) from an SDK and it'll appear here as a pending event awaiting approval."
      />
    </div>
  );
}
