import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type PageHeaderProps = {
  title: string;
  description?: string;
  actions?: ReactNode;
  className?: string;
  titleAriaOnly?: boolean;
};

export function PageHeader({
  title,
  description,
  actions,
  className,
  titleAriaOnly,
}: PageHeaderProps) {
  return (
    <div
      className={cn("flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between", className)}
    >
      <div className="min-w-0 flex-1">
        {titleAriaOnly ? (
          <h1
            className="experiment-heading text-2xl font-semibold tracking-tight"
            data-heading={title}
            aria-label={title}
          />
        ) : (
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        )}
        {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
      </div>
      {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
    </div>
  );
}
