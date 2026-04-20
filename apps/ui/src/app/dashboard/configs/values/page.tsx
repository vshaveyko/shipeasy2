import { Layers } from "lucide-react";
import { auth } from "@/auth";
import { listConfigs } from "@/lib/handlers/configs";
import { EmptyState } from "@/components/dashboard/empty-state";
import { PageHeader } from "@/components/dashboard/page-header";
import { SelectableList } from "@/components/dashboard/selectable-list";
import { Button } from "@/components/ui/button";
import { LinkButton } from "@/components/ui/link-button";
import { deleteConfigAction, bulkDeleteConfigsAction } from "./actions";

export default async function ConfigValuesPage() {
  const session = await auth();
  const projectId = session?.user?.project_id;

  let configs: Awaited<ReturnType<typeof listConfigs>> = [];
  if (projectId) {
    try {
      configs = await listConfigs({
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
        title="Dynamic configs"
        description="Configs store JSON values you can update without a deploy — feature copy, thresholds, experiment buckets."
        actions={
          <LinkButton size="sm" href="/dashboard/configs/values/new">
            New config
          </LinkButton>
        }
      />
      {configs.length === 0 ? (
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
      ) : (
        <SelectableList
          items={configs}
          onBulkDelete={bulkDeleteConfigsAction}
          renderContent={(cfg) => <span className="font-mono text-sm font-medium">{cfg.name}</span>}
          renderActions={(cfg) => (
            <form action={deleteConfigAction}>
              <input type="hidden" name="id" value={cfg.id} />
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
        />
      )}
    </div>
  );
}
