"use client";

import * as React from "react";
import { Combobox as ComboboxPrimitive } from "@base-ui/react/combobox";
import { CheckIcon, ChevronDownIcon } from "lucide-react";

import { cn } from "@/lib/utils";

export type ComboboxOption<V extends string = string> = {
  value: V;
  label: React.ReactNode;
  icon?: React.ReactNode;
  description?: React.ReactNode;
  disabled?: boolean;
};

function Combobox<V extends string = string>({
  options,
  value,
  onValueChange,
  placeholder = "Select…",
  searchPlaceholder = "Search…",
  emptyLabel = "No matches",
  className,
  triggerClassName,
  size = "default",
  disabled,
  id,
}: {
  options: ComboboxOption<V>[];
  value: V | null;
  onValueChange: (value: V) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyLabel?: string;
  className?: string;
  triggerClassName?: string;
  size?: "default" | "sm";
  disabled?: boolean;
  id?: string;
}) {
  const selected = options.find((o) => o.value === value) ?? null;

  return (
    <ComboboxPrimitive.Root
      items={options}
      itemToStringValue={(item) => (item as ComboboxOption<V>).value}
      value={selected}
      onValueChange={(item) => {
        if (item) onValueChange((item as ComboboxOption<V>).value);
      }}
    >
      <ComboboxPrimitive.Trigger
        id={id}
        disabled={disabled}
        className={cn(
          "inline-flex w-full items-center justify-between gap-2 rounded-md border border-[var(--se-line-2)] bg-[var(--se-bg-2)] px-3 text-[13px] text-[var(--se-fg)] outline-none transition-colors",
          "hover:border-[var(--se-line-3)]",
          "focus-visible:ring-2 focus-visible:ring-[var(--ring)]",
          "disabled:cursor-not-allowed disabled:opacity-50",
          size === "sm" ? "h-7" : "h-8",
          triggerClassName,
        )}
      >
        <span className="flex min-w-0 items-center gap-2 truncate">
          {selected?.icon ? <span className="shrink-0">{selected.icon}</span> : null}
          <span className={cn("truncate", !selected && "dim-2")}>
            {selected ? selected.label : placeholder}
          </span>
        </span>
        <ChevronDownIcon className="size-3.5 shrink-0 text-[var(--se-fg-3)] transition-transform data-[popup-open]:rotate-180" />
      </ComboboxPrimitive.Trigger>
      <ComboboxPrimitive.Portal>
        <ComboboxPrimitive.Positioner sideOffset={6} align="start">
          <ComboboxPrimitive.Popup
            className={cn(
              "z-50 max-h-72 w-[var(--anchor-width)] min-w-[10rem] overflow-hidden rounded-md border border-[var(--se-line-2)] bg-[var(--se-bg-2)] shadow-[var(--se-shadow-pop)] outline-none",
              "data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95",
              "data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95",
              className,
            )}
          >
            <div className="border-b border-[var(--se-line)] p-1">
              <ComboboxPrimitive.Input
                placeholder={searchPlaceholder}
                className="h-7 w-full bg-transparent px-2 text-[13px] outline-none placeholder:text-[var(--se-fg-3)]"
              />
            </div>
            <ComboboxPrimitive.List className="max-h-56 overflow-y-auto p-1">
              <ComboboxPrimitive.Empty className="px-3 py-4 text-center text-[12px] text-[var(--se-fg-3)]">
                {emptyLabel}
              </ComboboxPrimitive.Empty>
              <ComboboxPrimitive.Collection>
                {(item) => {
                  const opt = item as ComboboxOption<V>;
                  return (
                    <ComboboxPrimitive.Item
                      key={opt.value}
                      value={opt}
                      disabled={opt.disabled}
                      className={cn(
                        "flex w-full cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-[13px] outline-none",
                        "data-[highlighted]:bg-[var(--se-bg-3)] data-[highlighted]:text-[var(--se-fg)]",
                        "data-disabled:cursor-not-allowed data-disabled:opacity-50",
                      )}
                    >
                      {opt.icon ? <span className="shrink-0">{opt.icon}</span> : null}
                      <span className="flex min-w-0 flex-1 flex-col">
                        <span className="truncate">{opt.label}</span>
                        {opt.description ? (
                          <span className="dim-2 truncate text-[11px]">{opt.description}</span>
                        ) : null}
                      </span>
                      <ComboboxPrimitive.ItemIndicator className="shrink-0">
                        <CheckIcon className="size-3.5 text-[var(--se-accent)]" />
                      </ComboboxPrimitive.ItemIndicator>
                    </ComboboxPrimitive.Item>
                  );
                }}
              </ComboboxPrimitive.Collection>
            </ComboboxPrimitive.List>
          </ComboboxPrimitive.Popup>
        </ComboboxPrimitive.Positioner>
      </ComboboxPrimitive.Portal>
    </ComboboxPrimitive.Root>
  );
}

export { Combobox };
