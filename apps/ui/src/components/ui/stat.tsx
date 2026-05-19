import * as React from "react";
import { ArrowDown, ArrowUp, Minus } from "lucide-react";

import { cn } from "@/lib/utils";

interface StatProps extends React.ComponentProps<"div"> {
  label: React.ReactNode;
  value: React.ReactNode;
  unit?: React.ReactNode;
  delta?: React.ReactNode;
  trend?: "up" | "down" | "flat";
}

function Stat({ className, label, value, unit, delta, trend, ...props }: StatProps) {
  const trendClass =
    trend === "up"
      ? "text-[var(--se-accent)]"
      : trend === "down"
        ? "text-[var(--se-danger)]"
        : "text-[var(--se-fg-3)]";
  const TrendIcon = trend === "up" ? ArrowUp : trend === "down" ? ArrowDown : Minus;
  return (
    <div data-slot="stat" className={cn("flex flex-col gap-1", className)} {...props}>
      <span className="font-mono text-[10.5px] uppercase tracking-[0.08em] text-[var(--se-fg-4)]">
        {label}
      </span>
      <span className="text-[24px] font-medium leading-none tracking-[-0.02em] tabular-nums">
        {value}
        {unit ? (
          <span className="ml-1 text-[13px] font-normal text-[var(--se-fg-3)]">{unit}</span>
        ) : null}
      </span>
      {delta != null ? (
        <span className={cn("flex items-center gap-1 font-mono text-[11px]", trendClass)}>
          {trend ? <TrendIcon className="size-3" /> : null}
          {delta}
        </span>
      ) : null}
    </div>
  );
}

interface StatTileProps extends StatProps {
  kindTag?: React.ReactNode;
  kind?: "auto" | "custom";
  spark?: React.ReactNode;
}

function StatTile({ className, kindTag, kind, spark, ...rest }: StatTileProps) {
  const kindClass =
    kind === "auto"
      ? "text-[var(--se-info)] bg-[var(--se-info-soft)] border-[color-mix(in_oklab,var(--se-info)_30%,transparent)]"
      : kind === "custom"
        ? "text-[var(--se-accent)] bg-[var(--se-accent-soft)] border-[color-mix(in_oklab,var(--se-accent)_30%,transparent)]"
        : "text-[var(--se-fg-3)] bg-[var(--se-bg-3)] border-[var(--se-line)]";
  return (
    <div
      data-slot="stat-tile"
      className={cn(
        "relative flex min-h-[120px] flex-col gap-2 overflow-hidden rounded-[var(--radius-lg)] border border-[var(--se-line)] bg-[var(--se-bg-1)] px-4 py-3.5",
        className,
      )}
    >
      {kindTag ? (
        <span
          className={cn(
            "absolute right-3.5 top-3.5 rounded border px-1.5 py-px font-mono text-[8.5px] uppercase leading-snug tracking-[0.12em]",
            kindClass,
          )}
        >
          {kindTag}
        </span>
      ) : null}
      <Stat className="gap-1" {...rest} />
      {spark ? <div className="absolute bottom-2.5 right-2.5 opacity-95">{spark}</div> : null}
    </div>
  );
}

export { Stat, StatTile };
