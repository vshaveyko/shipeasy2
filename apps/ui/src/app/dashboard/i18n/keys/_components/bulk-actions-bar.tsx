"use client";

import { useTransition } from "react";
import { X } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { BulkAction } from "./bulk-actions";

interface Props<T> {
  selected: T[];
  actions: BulkAction<T>[];
  onClear: () => void;
}

/**
 * Sticky toolbar that appears above a selectable list when the user has
 * picked one or more rows. Renders the provided `actions` in order and
 * confirms destructive ones via `window.confirm` before dispatching.
 *
 * Strings here are plain English until the shipeasy i18n provider is wired
 * into the app shell; swap them for `t()` calls once translations resolve.
 */
export function BulkActionsBar<T>({ selected, actions, onClear }: Props<T>) {
  const [isPending, startTransition] = useTransition();

  if (selected.length === 0) return null;

  function runAction(action: BulkAction<T>) {
    const msg = action.confirm?.(selected);
    if (msg && !window.confirm(msg)) return;
    startTransition(async () => {
      await action.run(selected);
      onClear();
    });
  }

  return (
    <div className="sticky top-0 z-10 flex items-center gap-2 rounded-lg border bg-background px-3 py-2 shadow-sm">
      <span className="text-xs font-medium">{selected.length} selected</span>
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
          return (
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
