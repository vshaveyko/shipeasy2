"use client";

import { Button } from "@/components/ui/button";
import { SelectableList } from "@/components/dashboard/selectable-list";
import { deleteMetricAction, bulkDeleteMetricsAction } from "./actions";

interface Metric {
  id: string;
  name: string;
  aggregation: string;
  eventName: string;
}

export function MetricsContent({ metrics }: { metrics: Metric[] }) {
  return (
    <SelectableList
      items={metrics}
      onBulkDelete={bulkDeleteMetricsAction}
      renderContent={(m) => (
        <div className="flex items-center gap-3">
          <span className="font-mono text-sm font-medium">{m.name}</span>
          <span className="text-xs text-muted-foreground">
            {m.aggregation} on {m.eventName}
          </span>
        </div>
      )}
      renderActions={(m) => (
        <form action={deleteMetricAction}>
          <input type="hidden" name="id" value={m.id} />
          <Button size="sm" variant="ghost" type="submit" className="text-destructive hover:text-destructive">
            Delete
          </Button>
        </form>
      )}
    />
  );
}
