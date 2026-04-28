"use client";

import { useState, useTransition } from "react";
import { X } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { BulkAction } from "./bulk-actions";

interface Props<T> {
  selected: T[];
  actions: BulkAction<T>[];
  onClear: () => void;
}

export function BulkActionsBar<T>({ selected, actions, onClear }: Props<T>) {
  const [isPending, startTransition] = useTransition();
  const [pendingConfirm, setPendingConfirm] = useState<string | null>(null);

  if (selected.length === 0) return null;

  function runAction(action: BulkAction<T>) {
    if (action.confirm?.(selected) && pendingConfirm !== action.id) {
      setPendingConfirm(action.id);
      return;
    }
    setPendingConfirm(null);
    startTransition(async () => {
      await action.run(selected);
      onClear();
    });
  }

  return (
    <div
      className="sticky top-0 z-10 flex items-center gap-2 rounded-[var(--radius-md)] border border-[var(--se-line-2)] bg-[var(--se-bg-2)] px-3 py-2"
      style={{ boxShadow: "var(--se-shadow-1)" }}
    >
      <span className="se-badge se-badge-live" aria-label={`${selected.length} selected`}>
        <span className="dot" />
        {selected.length} SELECTED
      </span>
      <Button
        size="xs"
        variant="ghost"
        onClick={onClear}
        disabled={isPending}
        aria-label="Clear selection"
      >
        <X className="size-3" />
        Clear
      </Button>
      <div className="ml-auto flex items-center gap-1">
        {actions.map((a) => {
          const Icon = a.icon;
          const enabled = a.enabled ? a.enabled(selected) : true;
          const awaitingConfirm = pendingConfirm === a.id;
          return awaitingConfirm ? (
            <span key={a.id} className="flex items-center gap-1">
              <Button
                size="xs"
                variant="ghost"
                onClick={() => setPendingConfirm(null)}
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button
                size="xs"
                variant={a.variant ?? "outline"}
                onClick={() => runAction(a)}
                disabled={isPending}
              >
                Confirm
              </Button>
            </span>
          ) : (
            <Button
              key={a.id}
              size="xs"
              variant={a.variant ?? "outline"}
              onClick={() => runAction(a)}
              disabled={!enabled || isPending}
            >
              {Icon ? <Icon className="size-3" /> : null}
              {a.label}
            </Button>
          );
        })}
      </div>
    </div>
  );
}
