import { Tags } from "lucide-react";

import { EmptyState } from "@/components/dashboard/empty-state";
import { PageHeader } from "@/components/dashboard/page-header";
import { Button } from "@/components/ui/button";

export default function AttributesPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="User attributes"
        description="Declared attributes your SDKs can target on — country, plan, signup date, custom traits."
        actions={
          <Button size="sm" disabled>
            New attribute
          </Button>
        }
      />
      <EmptyState
        icon={Tags}
        title="No attributes declared"
        description="Declaring an attribute lets you reference it in targeting rules without typos, with the right data type."
      />
    </div>
  );
}
