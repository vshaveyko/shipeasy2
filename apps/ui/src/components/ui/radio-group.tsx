"use client";

import * as React from "react";
import { Radio as RadioPrimitive } from "@base-ui/react/radio";
import { RadioGroup as RadioGroupPrimitive } from "@base-ui/react/radio-group";

import { cn } from "@/lib/utils";

function RadioGroup({ className, ...props }: RadioGroupPrimitive.Props) {
  return (
    <RadioGroupPrimitive
      data-slot="radio-group"
      className={cn("flex flex-col gap-2", className)}
      {...props}
    />
  );
}

interface RadioProps extends RadioPrimitive.Root.Props {
  label?: React.ReactNode;
  description?: React.ReactNode;
}

function Radio({ className, label, description, id, value, ...props }: RadioProps) {
  const generatedId = React.useId();
  const inputId = id ?? generatedId;
  const root = (
    <RadioPrimitive.Root
      id={inputId}
      value={value}
      data-slot="radio"
      className={cn(
        "relative inline-grid size-[15px] shrink-0 place-items-center rounded-full border border-[var(--se-line-3)] bg-[var(--se-bg-2)] outline-none transition-colors",
        "data-checked:border-[var(--se-accent)]",
        "hover:border-[var(--se-fg-3)]",
        "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        "disabled:cursor-not-allowed disabled:opacity-40",
        className,
      )}
      {...props}
    >
      <RadioPrimitive.Indicator className="grid place-items-center">
        <span className="size-1.5 rounded-full bg-[var(--se-accent)]" />
      </RadioPrimitive.Indicator>
    </RadioPrimitive.Root>
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

interface OptionCardProps extends Omit<RadioPrimitive.Root.Props, "title"> {
  title: React.ReactNode;
  description?: React.ReactNode;
  tag?: React.ReactNode;
}

function OptionCard({ className, title, description, tag, value, id, ...props }: OptionCardProps) {
  const generatedId = React.useId();
  const inputId = id ?? generatedId;
  return (
    <RadioPrimitive.Root
      id={inputId}
      value={value}
      data-slot="option-card"
      className={cn(
        "group/optcard flex w-full cursor-default items-start gap-2.5 rounded-[var(--radius-md)] border border-[var(--se-line-2)] bg-[var(--se-bg-2)] px-3.5 py-3 text-left outline-none transition-colors",
        "hover:border-[var(--se-line-3)] hover:bg-[var(--se-bg-3)]",
        "data-checked:border-[var(--se-accent)] data-checked:bg-[color-mix(in_oklab,var(--se-accent)_8%,var(--se-bg-2))]",
        "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        className,
      )}
      {...props}
    >
      <span
        className={cn(
          "mt-0.5 grid size-[15px] shrink-0 place-items-center rounded-full border border-[var(--se-line-3)] bg-[var(--se-bg-2)] transition-colors",
          "group-data-checked/optcard:border-[var(--se-accent)]",
        )}
      >
        <RadioPrimitive.Indicator className="grid place-items-center">
          <span className="size-1.5 rounded-full bg-[var(--se-accent)]" />
        </RadioPrimitive.Indicator>
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="flex items-center gap-2 text-[13.5px] font-medium text-[var(--se-fg)]">
          {title}
        </span>
        {description ? (
          <span className="text-[12px] leading-snug text-[var(--se-fg-3)]">{description}</span>
        ) : null}
      </span>
      {tag ? (
        <span className="ml-auto font-mono text-[10px] uppercase tracking-[0.06em] text-[var(--se-fg-4)]">
          {tag}
        </span>
      ) : null}
    </RadioPrimitive.Root>
  );
}

export { RadioGroup, Radio, OptionCard };
