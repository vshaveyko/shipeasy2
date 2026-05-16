import * as React from "react";

import { cn } from "@/lib/utils";

type ProgressIntent = "accent" | "info" | "warn" | "danger" | "neutral";

const fillStyles: Record<ProgressIntent, string> = {
  accent: "bg-[var(--se-accent)]",
  info: "bg-[var(--se-info)]",
  warn: "bg-[var(--se-warn)]",
  danger: "bg-[var(--se-danger)]",
  neutral: "bg-[var(--se-fg-3)]",
};

const stripeClass: Record<ProgressIntent, string> = {
  accent: "bg-stripe-accent",
  info: "bg-stripe",
  warn: "bg-stripe-warn",
  danger: "bg-stripe-danger",
  neutral: "bg-stripe",
};

function ProgressBar({
  value,
  max = 100,
  intent = "accent",
  striped = false,
  className,
  ...props
}: Omit<React.ComponentProps<"div">, "children"> & {
  value: number;
  max?: number;
  intent?: ProgressIntent;
  striped?: boolean;
}) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div
      data-slot="progress-bar"
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={max}
      className={cn(
        "relative h-1.5 w-full overflow-hidden rounded-full bg-[var(--se-bg-3)]",
        className,
      )}
      {...props}
    >
      <div
        className={cn(
          "h-full transition-[width] duration-300",
          striped ? stripeClass[intent] : fillStyles[intent],
        )}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

function HoldoutBar({
  allocation,
  holdout,
  className,
  ...props
}: Omit<React.ComponentProps<"div">, "children"> & {
  allocation: number;
  holdout: number;
}) {
  const a = Math.max(0, Math.min(100, allocation));
  const h = Math.max(0, Math.min(100, holdout));
  return (
    <div
      data-slot="holdout-bar"
      className={cn(
        "relative h-2 w-full overflow-hidden rounded-full border border-[var(--se-line)] bg-[var(--se-bg-2)]",
        className,
      )}
      {...props}
    >
      <div className="absolute inset-y-0 left-0 bg-[var(--se-accent)]" style={{ width: `${a}%` }} />
      <div
        className="bg-stripe-warn absolute inset-y-0 right-0"
        style={{ width: `${h}%` }}
        aria-label={`Holdout ${h}%`}
      />
    </div>
  );
}

export { ProgressBar, HoldoutBar };
