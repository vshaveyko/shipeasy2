import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type StatTrioItem = {
  label: ReactNode;
  value: ReactNode;
  /** Optional tint for the value — used for the "wins / running" stat in
   *  experiments + the "Pass (24h)" style accents in the design comp. */
  tone?: "accent" | "warn" | "danger" | "info" | "purple" | "muted";
};

type PageHeaderProps = {
  title: string;
  description?: string;
  kicker?: ReactNode;
  actions?: ReactNode;
  /** Right-aligned 3-stat block trio rendered alongside actions. Matches the
   *  page-head pattern from `Designs/app/*-list.html`. */
  stats?: StatTrioItem[];
  className?: string;
  titleAriaOnly?: boolean;
};

const TONE: Record<NonNullable<StatTrioItem["tone"]>, string> = {
  accent: "text-[var(--se-accent)]",
  warn: "text-[var(--se-warn)]",
  danger: "text-[var(--se-danger)]",
  info: "text-[var(--se-info)]",
  purple: "text-[var(--se-purple)]",
  muted: "text-[var(--se-fg-3)]",
};

function StatTrio({ items }: { items: StatTrioItem[] }) {
  return (
    <div data-slot="page-header-stats" className="flex shrink-0 items-end gap-3 self-end">
      {items.map((s, i) => (
        <div key={i} className="flex items-end gap-3">
          {i > 0 ? <div aria-hidden className="h-9 w-px self-end bg-[var(--se-line)]" /> : null}
          <div className="flex flex-col items-end gap-1 text-right">
            <span className="font-mono text-[10.5px] uppercase tracking-[0.08em] text-[var(--se-fg-4)]">
              {s.label}
            </span>
            <span
              className={cn(
                "text-[22px] font-medium leading-none tracking-[-0.02em] tabular-nums",
                s.tone ? TONE[s.tone] : "text-[var(--se-fg)]",
              )}
            >
              {s.value}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

export function PageHeader({
  title,
  description,
  kicker,
  actions,
  stats,
  className,
  titleAriaOnly,
}: PageHeaderProps) {
  return (
    <div
      className={cn("flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between", className)}
    >
      <div className="min-w-0 flex-1">
        {kicker ? <div className="t-caps dim-2 mb-2">{kicker}</div> : null}
        {titleAriaOnly ? (
          <h1
            className="experiment-heading text-[24px] font-medium tracking-tight"
            data-heading={title}
            aria-label={title}
          />
        ) : (
          <h1 className="text-[24px] font-medium tracking-tight">{title}</h1>
        )}
        {description ? (
          <p className="mt-1 max-w-[60ch] text-[13.5px] text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {stats && stats.length > 0 ? <StatTrio items={stats} /> : null}
      {actions ? <div className="flex shrink-0 items-center gap-2 self-end">{actions}</div> : null}
    </div>
  );
}
