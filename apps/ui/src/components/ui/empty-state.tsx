import * as React from "react";

import { cn } from "@/lib/utils";

interface EmptyStateProps extends Omit<React.ComponentProps<"div">, "title"> {
  eyebrow?: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  /** Optional decorative slot rendered above the actions (e.g. terminal preview). */
  visual?: React.ReactNode;
  /** Optional stats grid rendered below the actions. */
  stats?: React.ReactNode;
}

function EmptyState({
  className,
  eyebrow,
  title,
  description,
  actions,
  visual,
  stats,
  ...props
}: EmptyStateProps) {
  return (
    <div
      data-slot="empty-state"
      className={cn(
        "relative flex h-full min-h-0 items-center justify-center overflow-hidden rounded-[var(--radius-lg)] border border-[var(--se-line)] bg-[var(--se-bg-1)] px-8 py-9 text-center",
        className,
      )}
      {...props}
    >
      <div className="relative z-10 flex w-full max-w-[760px] flex-col items-center">
        {eyebrow ? (
          <span className="mb-3.5 inline-flex items-center gap-2 rounded-full border border-[var(--se-line-2)] bg-[var(--se-bg-2)] px-2.5 py-[3px] font-mono text-[10.5px] uppercase tracking-[0.08em] text-[var(--se-fg-2)]">
            <span className="size-1.5 rounded-full bg-[var(--se-accent)] shadow-[0_0_0_3px_color-mix(in_oklab,var(--se-accent)_22%,transparent)]" />
            {eyebrow}
          </span>
        ) : null}
        <h2 className="m-0 max-w-[22ch] text-[32px] font-medium leading-tight tracking-[-0.02em] text-[var(--se-fg)]">
          {title}
        </h2>
        {description ? (
          <p className="mb-4 mt-2 max-w-[56ch] text-[13.5px] leading-snug text-[var(--se-fg-2)]">
            {description}
          </p>
        ) : null}
        {visual ? <div className="mb-4 w-full max-w-[580px]">{visual}</div> : null}
        {actions ? (
          <div className="mb-4 flex flex-wrap justify-center gap-2.5">{actions}</div>
        ) : null}
        {stats ? (
          <div className="grid w-full max-w-[580px] grid-cols-3 gap-2.5">{stats}</div>
        ) : null}
      </div>
    </div>
  );
}

interface EmptyStatProps extends React.ComponentProps<"div"> {
  value: React.ReactNode;
  label: React.ReactNode;
  detail?: React.ReactNode;
}

function EmptyStat({ className, value, label, detail, ...props }: EmptyStatProps) {
  return (
    <div
      className={cn(
        "rounded-[var(--radius-md)] border border-[var(--se-line)] bg-[var(--se-bg-2)] px-3 py-2.5 text-left",
        className,
      )}
      {...props}
    >
      <div className="font-mono text-[18px] font-medium tabular-nums tracking-[-0.01em] text-[var(--se-fg)]">
        {value}
      </div>
      <div className="mt-px text-[12px] text-[var(--se-fg-2)]">{label}</div>
      {detail ? (
        <div className="mt-px font-mono text-[10.5px] text-[var(--se-fg-4)]">{detail}</div>
      ) : null}
    </div>
  );
}

export { EmptyState, EmptyStat };
