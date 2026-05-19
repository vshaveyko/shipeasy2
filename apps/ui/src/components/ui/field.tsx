"use client";

import * as React from "react";
import { Info, AlertCircle, Check } from "lucide-react";

import { cn } from "@/lib/utils";

function Field({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="field" className={cn("flex flex-col gap-1.5", className)} {...props} />;
}

function FieldRow({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="field-row"
      className={cn("flex items-center gap-3 [&>[data-slot=field]]:flex-1", className)}
      {...props}
    />
  );
}

interface FieldLabelProps extends React.ComponentProps<"label"> {
  required?: boolean;
  optional?: boolean;
  counter?: React.ReactNode;
}

function FieldLabel({
  className,
  children,
  required,
  optional,
  counter,
  ...props
}: FieldLabelProps) {
  return (
    <label
      data-slot="field-label"
      className={cn(
        "flex items-center gap-1.5 text-[12px] font-medium leading-none text-[var(--se-fg-2)] tracking-[-0.005em]",
        className,
      )}
      {...props}
    >
      <span className="inline-flex items-center gap-1.5">
        {children}
        {required ? (
          <span className="font-mono text-[11px] leading-none text-[var(--se-danger)]">*</span>
        ) : null}
        {optional ? (
          <span className="font-mono text-[10px] uppercase tracking-[0.04em] text-[var(--se-fg-4)]">
            Optional
          </span>
        ) : null}
      </span>
      {counter ? (
        <span className="ml-auto font-mono text-[10.5px] tracking-[0.04em] text-[var(--se-fg-4)]">
          {counter}
        </span>
      ) : null}
    </label>
  );
}

function FieldHint({ className, children, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="field-hint"
      className={cn(
        "flex items-center gap-1.5 text-[11.5px] leading-snug text-[var(--se-fg-3)]",
        className,
      )}
      {...props}
    >
      <Info className="size-3 shrink-0" />
      <span>{children}</span>
    </div>
  );
}

function FieldError({ className, children, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="field-error"
      role="alert"
      className={cn(
        "flex items-center gap-1.5 font-mono text-[11.5px] leading-snug text-[var(--se-danger)]",
        className,
      )}
      {...props}
    >
      <AlertCircle className="size-3 shrink-0" />
      <span>{children}</span>
    </div>
  );
}

function FieldSuccess({ className, children, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="field-success"
      className={cn(
        "flex items-center gap-1.5 font-mono text-[11.5px] leading-snug text-[var(--se-accent)]",
        className,
      )}
      {...props}
    >
      <Check className="size-3 shrink-0" />
      <span>{children}</span>
    </div>
  );
}

export { Field, FieldRow, FieldLabel, FieldHint, FieldError, FieldSuccess };
