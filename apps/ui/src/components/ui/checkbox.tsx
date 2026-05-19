"use client";

import * as React from "react";
import { Checkbox as CheckboxPrimitive } from "@base-ui/react/checkbox";
import { Check, Minus } from "lucide-react";

import { cn } from "@/lib/utils";

interface CheckboxProps extends CheckboxPrimitive.Root.Props {
  label?: React.ReactNode;
  description?: React.ReactNode;
}

function Checkbox({ className, label, description, id, ...props }: CheckboxProps) {
  const generatedId = React.useId();
  const inputId = id ?? generatedId;
  const root = (
    <CheckboxPrimitive.Root
      id={inputId}
      data-slot="checkbox"
      className={cn(
        "peer relative inline-grid size-[15px] shrink-0 place-items-center rounded-[4px] border border-[var(--se-line-3)] bg-[var(--se-bg-2)] outline-none transition-colors",
        "data-checked:border-[var(--se-accent)] data-checked:bg-[var(--se-accent)]",
        "data-indeterminate:border-[var(--se-accent)] data-indeterminate:bg-[var(--se-accent)]",
        "hover:border-[var(--se-fg-3)]",
        "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        "disabled:cursor-not-allowed disabled:opacity-40",
        className,
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator
        data-slot="checkbox-indicator"
        className="grid place-items-center text-[var(--se-accent-fg)]"
      >
        {props.indeterminate ? (
          <Minus className="size-2.5" strokeWidth={3} />
        ) : (
          <Check className="size-2.5" strokeWidth={3} />
        )}
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );

  if (!label && !description) return root;

  return (
    <label
      htmlFor={inputId}
      className="inline-flex cursor-default items-start gap-2 text-[13px] leading-snug text-[var(--se-fg)]"
    >
      {root}
      <span className="flex flex-col gap-0.5">
        {label ? <span>{label}</span> : null}
        {description ? (
          <span className="text-[11.5px] leading-snug text-[var(--se-fg-3)]">{description}</span>
        ) : null}
      </span>
    </label>
  );
}

export { Checkbox };
