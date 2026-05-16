import * as React from "react";
import { CheckIcon } from "lucide-react";

import { cn } from "@/lib/utils";

export type StepperItem = {
  id: string;
  label: React.ReactNode;
};

function Stepper({
  steps,
  current,
  onSelect,
  className,
}: {
  steps: StepperItem[];
  current: number;
  onSelect?: (index: number) => void;
  className?: string;
}) {
  return (
    <ol
      role="list"
      data-slot="stepper"
      className={cn("flex min-w-0 flex-1 items-center gap-1.5", className)}
    >
      {steps.map((step, i) => {
        const done = i < current;
        const active = i === current;
        const clickable = Boolean(onSelect) && i <= current;
        return (
          <React.Fragment key={step.id}>
            <li className="flex min-w-0 items-center gap-1.5">
              <button
                type="button"
                disabled={!clickable}
                onClick={clickable ? () => onSelect?.(i) : undefined}
                data-state={done ? "done" : active ? "active" : "todo"}
                className={cn(
                  "flex size-5 shrink-0 items-center justify-center rounded-full border text-[10.5px] font-medium transition-colors",
                  "disabled:cursor-default",
                  done && "border-transparent bg-[var(--se-accent)] text-[var(--se-accent-fg)]",
                  active &&
                    "border-[var(--se-accent)] bg-[var(--se-accent-soft)] text-[var(--se-accent)]",
                  !done &&
                    !active &&
                    "border-[var(--se-line-2)] bg-[var(--se-bg-2)] text-[var(--se-fg-3)]",
                )}
                aria-current={active ? "step" : undefined}
              >
                {done ? <CheckIcon className="size-3" /> : i + 1}
              </button>
              <span
                className={cn(
                  "truncate text-[12px]",
                  active && "text-[var(--se-fg)]",
                  done && "text-[var(--se-fg-2)]",
                  !done && !active && "text-[var(--se-fg-3)]",
                )}
              >
                {step.label}
              </span>
            </li>
            {i < steps.length - 1 ? (
              <span
                aria-hidden
                className={cn(
                  "h-px min-w-3 flex-1",
                  i < current ? "bg-[var(--se-accent)]/40" : "bg-[var(--se-line)]",
                )}
              />
            ) : null}
          </React.Fragment>
        );
      })}
    </ol>
  );
}

export { Stepper };
