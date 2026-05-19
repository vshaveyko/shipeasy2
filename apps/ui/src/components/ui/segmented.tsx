"use client";

import * as React from "react";
import { ToggleGroup as ToggleGroupPrimitive } from "@base-ui/react/toggle-group";
import { Toggle as TogglePrimitive } from "@base-ui/react/toggle";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const segmentedVariants = cva(
  "inline-flex items-center gap-0.5 rounded-[var(--radius-md)] border border-[var(--se-line)] bg-[var(--se-bg-2)] p-[3px] text-[12px]",
  {
    variants: {
      size: {
        sm: "[&_button]:px-2.5 [&_button]:py-[3px] [&_button]:text-[11.5px]",
        md: "[&_button]:px-3 [&_button]:py-[5px]",
        lg: "[&_button]:px-3.5 [&_button]:py-[7px] [&_button]:text-[13px]",
      },
    },
    defaultVariants: { size: "md" },
  },
);

type SegmentedRootProps = React.ComponentProps<typeof ToggleGroupPrimitive>;

interface SegmentedProps extends SegmentedRootProps, VariantProps<typeof segmentedVariants> {}

function Segmented({ className, size, multiple = false, ...props }: SegmentedProps) {
  return (
    <ToggleGroupPrimitive
      data-slot="segmented"
      multiple={multiple}
      className={cn(segmentedVariants({ size }), className)}
      {...props}
    />
  );
}

type SegmentedItemProps = TogglePrimitive.Props;

function SegmentedItem({ className, ...props }: SegmentedItemProps) {
  return (
    <TogglePrimitive
      data-slot="segmented-item"
      className={cn(
        "inline-flex shrink-0 cursor-default items-center gap-1.5 rounded-[var(--radius-sm)] font-medium text-[var(--se-fg-3)] outline-none transition-colors",
        "hover:text-[var(--se-fg)]",
        "data-pressed:bg-[var(--se-bg-4)] data-pressed:text-[var(--se-fg)] data-pressed:shadow-[inset_0_1px_0_rgba(255,255,255,0.04),var(--se-shadow-1)]",
        "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        "disabled:pointer-events-none disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}

export { Segmented, SegmentedItem };
