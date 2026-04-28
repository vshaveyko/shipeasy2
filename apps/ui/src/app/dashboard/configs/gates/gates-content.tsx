"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LinkButton } from "@/components/ui/link-button";
import { SelectableList } from "@/components/dashboard/selectable-list";
import { deleteGateAction, enableGateAction, bulkDeleteGatesAction } from "./actions";

interface Gate {
  id: string;
  name: string;
  enabled: boolean | number;
}

export function GatesContent({ gates }: { gates: Gate[] }) {
  return (
    <SelectableList
      items={gates}
      onBulkDelete={bulkDeleteGatesAction}
      renderContent={(gate) => (
        <div className="flex items-center gap-3">
          <span className="font-mono text-sm font-medium">{gate.name}</span>
          <Badge variant={gate.enabled ? "default" : "secondary"}>
            {gate.enabled ? "enabled" : "disabled"}
          </Badge>
        </div>
      )}
      renderActions={(gate) => (
        <>
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
            <Button size="sm" variant="ghost" type="submit" className="text-destructive hover:text-destructive">
              Delete
            </Button>
          </form>
        </>
      )}
    />
  );
}
