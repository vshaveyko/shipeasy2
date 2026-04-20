"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { RowCheckbox } from "@/app/dashboard/i18n/keys/_components/row-checkbox";
import { Button } from "@/components/ui/button";
import { BulkActionsBar } from "@/app/dashboard/i18n/keys/_components/bulk-actions-bar";
import type { BulkAction } from "@/app/dashboard/i18n/keys/_components/bulk-actions";

interface Props<T extends { id: string }> {
  items: T[];
  renderContent: (item: T) => React.ReactNode;
  renderActions?: (item: T) => React.ReactNode;
  onBulkDelete: (ids: string[]) => Promise<void>;
  deleteConfirmMessage?: (count: number) => string;
}

export function SelectableList<T extends { id: string }>({
  items,
  renderContent,
  renderActions,
  onBulkDelete,
  deleteConfirmMessage,
}: Props<T>) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [, startTransition] = useTransition();
  const router = useRouter();

  const allSelected = items.length > 0 && items.every((it) => selected.has(it.id));
  const someSelected = !allSelected && items.some((it) => selected.has(it.id));

  function toggleAll() {
    if (allSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(items.map((it) => it.id)));
    }
  }

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const selectedItems = items.filter((it) => selected.has(it.id));

  const bulkActions: BulkAction<T>[] = [
    {
      id: "delete",
      label: "Delete",
      icon: Trash2,
      variant: "destructive",
      confirm: (sel) =>
        deleteConfirmMessage
          ? deleteConfirmMessage(sel.length)
          : `Delete ${sel.length} item${sel.length === 1 ? "" : "s"}? This cannot be undone.`,
      run: (sel) => {
        startTransition(async () => {
          await onBulkDelete(sel.map((it) => it.id));
          setSelected(new Set());
          router.refresh();
        });
      },
    },
  ];

  return (
    <div className="space-y-2">
      <BulkActionsBar
        selected={selectedItems}
        actions={bulkActions}
        onClear={() => setSelected(new Set())}
      />
      <div className="rounded-lg border">
        <div className="flex items-center gap-3 border-b px-4 py-2">
          <RowCheckbox
            checked={allSelected}
            indeterminate={someSelected}
            onChange={toggleAll}
            ariaLabel="Select all"
          />
          <span className="text-xs text-muted-foreground">Select all</span>
        </div>
        {items.map((item) => (
          <div
            key={item.id}
            className="flex items-center justify-between border-b px-4 py-3 last:border-0"
          >
            <div className="flex items-center gap-3">
              <RowCheckbox
                checked={selected.has(item.id)}
                onChange={() => toggle(item.id)}
                ariaLabel={`Select ${item.id}`}
              />
              {renderContent(item)}
            </div>
            {renderActions && <div className="flex items-center gap-2">{renderActions(item)}</div>}
          </div>
        ))}
      </div>
    </div>
  );
}
