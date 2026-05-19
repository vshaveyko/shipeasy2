"use client";

import * as React from "react";
import { Slider as SliderPrimitive } from "@base-ui/react/slider";

import { cn } from "@/lib/utils";

interface SliderProps extends SliderPrimitive.Root.Props {
  /** Show a tooltip rendering the current value(s) on hover/focus/active. */
  showValue?: boolean;
  /** Format a single numeric value for the tooltip. */
  formatValue?: (v: number) => string;
}

function Slider({
  className,
  showValue = false,
  formatValue = (v) => String(v),
  ...props
}: SliderProps) {
  return (
    <SliderPrimitive.Root
      data-slot="slider"
      className={cn("relative flex h-6 w-full select-none items-center", className)}
      {...props}
    >
      <SliderPrimitive.Control className="relative flex h-6 w-full items-center">
        <SliderPrimitive.Track className="relative h-1 w-full overflow-hidden rounded-full bg-[var(--se-bg-3)]">
          <SliderPrimitive.Indicator className="absolute inset-y-0 left-0 bg-[var(--se-accent)]" />
        </SliderPrimitive.Track>
        <SliderPrimitive.Thumb
          className={cn(
            "group/thumb relative size-3.5 cursor-grab rounded-full bg-[var(--se-fg)] shadow-[0_2px_6px_rgba(0,0,0,0.4)] outline-none ring-1 ring-[var(--se-line-3)] transition-transform",
            "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
            "active:cursor-grabbing",
          )}
        >
          {showValue ? (
            <SliderPrimitive.Value className="pointer-events-none absolute -top-7 left-1/2 -translate-x-1/2 whitespace-nowrap rounded border border-[var(--se-line-2)] bg-[var(--se-bg-3)] px-1.5 py-0.5 font-mono text-[10.5px] text-[var(--se-fg)] opacity-0 transition-opacity group-hover/thumb:opacity-100 group-focus-visible/thumb:opacity-100 group-active/thumb:opacity-100">
              {(_, values) => values.map(formatValue).join(" – ")}
            </SliderPrimitive.Value>
          ) : null}
        </SliderPrimitive.Thumb>
      </SliderPrimitive.Control>
    </SliderPrimitive.Root>
  );
}

export { Slider };
