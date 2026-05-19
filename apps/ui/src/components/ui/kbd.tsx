import * as React from "react";

import { cn } from "@/lib/utils";

function Kbd({ className, ...props }: React.ComponentProps<"kbd">) {
  return (
    <kbd
      data-slot="kbd"
      className={cn(
        "inline-flex items-center rounded border border-b-2 border-[var(--se-line-2)] bg-[var(--se-bg-3)] px-1.5 py-px font-mono text-[10.5px] leading-none text-[var(--se-fg-2)]",
        className,
      )}
      {...props}
    />
  );
}

export { Kbd };
