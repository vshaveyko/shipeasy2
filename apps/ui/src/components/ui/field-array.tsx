"use client";

import * as React from "react";
import { GripVerticalIcon, PlusIcon, Trash2Icon } from "lucide-react";

import { cn } from "@/lib/utils";

function FieldArray({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div data-slot="field-array" className={cn("flex flex-col gap-1.5", className)} {...props} />
  );
}

function FieldArrayRow({
  className,
  draggable,
  onRemove,
  removeLabel = "Remove row",
  children,
  ...props
}: React.ComponentProps<"div"> & {
  draggable?: boolean;
  onRemove?: () => void;
  removeLabel?: string;
}) {
  return (
    <div
      data-slot="field-array-row"
      className={cn(
        "flex min-w-0 items-center gap-2 rounded-md border border-[var(--se-line)] bg-[var(--se-bg-2)] px-2 py-1.5",
        className,
      )}
      {...props}
    >
      {draggable ? (
        <button
          type="button"
          aria-label="Drag to reorder"
          className="cursor-grab text-[var(--se-fg-3)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
        >
          <GripVerticalIcon className="size-4" />
        </button>
      ) : null}
      <div className="flex min-w-0 flex-1 items-center gap-2">{children}</div>
      {onRemove ? (
        <button
          type="button"
          aria-label={removeLabel}
          onClick={onRemove}
          className="rounded-sm p-1 text-[var(--se-fg-3)] outline-none transition-colors hover:bg-[var(--se-bg-3)] hover:text-[var(--se-danger)] focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
        >
          <Trash2Icon className="size-3.5" />
        </button>
      ) : null}
    </div>
  );
}

function FieldArrayAdd({
  className,
  children = "Add row",
  ...props
}: React.ComponentProps<"button">) {
  return (
    <button
      type="button"
      data-slot="field-array-add"
      className={cn(
        "inline-flex h-7 items-center gap-1.5 self-start rounded-md border border-dashed border-[var(--se-line-2)] bg-transparent px-2 text-[12px] text-[var(--se-fg-2)] outline-none transition-colors",
        "hover:border-[var(--se-line-3)] hover:bg-[var(--se-bg-2)] hover:text-[var(--se-fg)]",
        "focus-visible:ring-2 focus-visible:ring-[var(--ring)]",
        className,
      )}
      {...props}
    >
      <PlusIcon className="size-3.5" />
      {children}
    </button>
  );
}

export { FieldArray, FieldArrayRow, FieldArrayAdd };
