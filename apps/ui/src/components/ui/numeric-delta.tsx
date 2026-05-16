import * as React from "react";
import { ArrowDownIcon, ArrowUpIcon, MinusIcon } from "lucide-react";

import { cn } from "@/lib/utils";

function NumericDelta({
  value,
  suffix = "%",
  invert = false,
  className,
  ...props
}: Omit<React.ComponentProps<"span">, "children"> & {
  value: number;
  suffix?: string;
  invert?: boolean;
}) {
  const positive = value > 0;
  const zero = value === 0;
  const good = zero ? null : invert ? !positive : positive;
  const Icon = zero ? MinusIcon : positive ? ArrowUpIcon : ArrowDownIcon;
  return (
    <span
      data-slot="numeric-delta"
      data-good={good === null ? "neutral" : good ? "true" : "false"}
      className={cn(
        "num inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[11px] font-medium",
        zero && "bg-[var(--se-bg-3)] text-[var(--se-fg-3)]",
        good === true && "bg-[var(--se-accent-soft)] text-[var(--se-accent)]",
        good === false && "bg-[var(--se-danger-soft)] text-[var(--se-danger)]",
        className,
      )}
      {...props}
    >
      <Icon className="size-3" />
      {positive ? "+" : ""}
      {value}
      {suffix}
    </span>
  );
}

export { NumericDelta };
