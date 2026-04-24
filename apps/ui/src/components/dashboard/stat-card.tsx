import type { ReactNode } from "react";

type StatCardProps = {
  label: ReactNode;
  value: ReactNode;
  hint?: string;
  accent?: boolean;
};

/**
 * Design-native stat block: mono/uppercase label, tabular-num value,
 * optional hint line. Wraps in the Shipeasy card surface.
 */
export function StatCard({ label, value, hint, accent }: StatCardProps) {
  return (
    <div className="rounded-[var(--radius-md)] border border-[var(--se-line)] bg-[var(--se-bg-1)] px-4 py-3.5">
      <div className="t-caps dim-3">{label}</div>
      <div
        className="mt-1.5 text-[24px] font-medium tracking-[-0.02em]"
        style={{
          fontVariantNumeric: "tabular-nums",
          color: accent ? "var(--se-accent)" : undefined,
        }}
      >
        {value}
      </div>
      {hint ? (
        <div className="mt-1 text-[11.5px] text-[var(--se-fg-3)] font-mono">{hint}</div>
      ) : null}
    </div>
  );
}
