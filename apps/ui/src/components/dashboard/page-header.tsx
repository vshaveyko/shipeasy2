import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type PageHeaderProps = {
  title: string;
  description?: string;
  kicker?: ReactNode;
  actions?: ReactNode;
  className?: string;
  titleAriaOnly?: boolean;
};

export function PageHeader({
  title,
  description,
  kicker,
  actions,
  className,
  titleAriaOnly,
}: PageHeaderProps) {
  return (
    <div
      className={cn("flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between", className)}
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
      {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
    </div>
  );
}
