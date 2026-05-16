import * as React from "react";

import { cn } from "@/lib/utils";

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn(
        "animate-pulse rounded-md bg-[color-mix(in_oklab,var(--se-fg-2)_8%,transparent)]",
        className,
      )}
      {...props}
    />
  );
}

export { Skeleton };
