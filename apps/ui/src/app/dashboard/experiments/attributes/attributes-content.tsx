"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SelectableList } from "@/components/dashboard/selectable-list";
import { deleteAttributeAction, bulkDeleteAttributesAction } from "./actions";

interface Attribute {
  id: string;
  name: string;
  type: string;
}

export function AttributesContent({ attributes }: { attributes: Attribute[] }) {
  return (
    <SelectableList
      items={attributes}
      onBulkDelete={bulkDeleteAttributesAction}
      renderContent={(attr) => (
        <div className="flex items-center gap-3">
          <span className="font-mono text-sm font-medium">{attr.name}</span>
          <Badge variant="secondary">{attr.type}</Badge>
        </div>
      )}
      renderActions={(attr) => (
        <form action={deleteAttributeAction}>
          <input type="hidden" name="id" value={attr.id} />
          <Button size="sm" variant="ghost" type="submit" className="text-destructive hover:text-destructive">
            Delete
          </Button>
        </form>
      )}
    />
  );
}
