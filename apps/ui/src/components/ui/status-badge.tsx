import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const statusBadgeVariants = cva(
  "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border font-mono text-[10.5px] leading-[1.4] tracking-[0.02em] py-px px-[7px]",
  {
    variants: {
      tone: {
        neutral: "border-[var(--se-line-2)] bg-[var(--se-bg-3)] text-[var(--se-fg-2)]",
        live: "border-[color-mix(in_oklab,var(--se-accent)_30%,transparent)] bg-[var(--se-accent-soft)] text-[var(--se-accent)]",
        paused:
          "border-[color-mix(in_oklab,var(--se-warn)_30%,transparent)] bg-[var(--se-warn-soft)] text-[var(--se-warn)]",
        killed:
          "border-[color-mix(in_oklab,var(--se-danger)_30%,transparent)] bg-[var(--se-danger-soft)] text-[var(--se-danger)]",
        completed:
          "border-[color-mix(in_oklab,var(--se-info)_30%,transparent)] bg-[var(--se-info-soft)] text-[var(--se-info)]",
        draft: "border-[var(--se-line)] bg-[var(--se-bg-3)] text-[var(--se-fg-3)]",
      },
      pulse: {
        true: "[&>.dot]:shadow-[0_0_0_3px_color-mix(in_oklab,currentColor_22%,transparent)]",
        false: "",
      },
    },
    defaultVariants: { tone: "neutral", pulse: false },
  },
);

interface StatusBadgeProps
  extends React.ComponentProps<"span">, VariantProps<typeof statusBadgeVariants> {
  /** Render the leading status dot (defaults to true). */
  showDot?: boolean;
}

function StatusBadge({
  className,
  tone,
  pulse,
  showDot = true,
  children,
  ...props
}: StatusBadgeProps) {
  return (
    <span
      data-slot="status-badge"
      data-tone={tone ?? "neutral"}
      className={cn(statusBadgeVariants({ tone, pulse }), className)}
      {...props}
    >
      {showDot ? (
        <span className="dot inline-block size-1.5 shrink-0 rounded-full bg-current" />
      ) : null}
      {children}
    </span>
  );
}

export { StatusBadge, statusBadgeVariants };
