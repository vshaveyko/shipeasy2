import { Layers } from "lucide-react";

import { EmptyState } from "@/components/dashboard/empty-state";
import { PageHeader } from "@/components/dashboard/page-header";
import { LinkButton } from "@/components/ui/link-button";

export default function ConfigValuesPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Dynamic configs"
        description="Configs store JSON values you can update without a deploy — feature copy, thresholds, experiment buckets."
        actions={
          <LinkButton size="sm" href="/dashboard/configs/values/new">
            New config
          </LinkButton>
        }
      />
      <EmptyState
        icon={Layers}
        title="No configs yet"
        description="Configs store JSON values you can update without a deploy."
        action={
          <LinkButton size="sm" href="/dashboard/configs/values/new">
            Create config
          </LinkButton>
        }
      />
    </div>
  );
}
