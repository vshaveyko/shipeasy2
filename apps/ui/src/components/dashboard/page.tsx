import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export { PageHeader } from "./page-header";

/**
 * Page — flex column that fills the dashboard <main>. Pin PageHeader at top,
 * PageFooter at bottom; PageBody is the sole scrollable region.
 */
export function Page({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("flex min-h-0 flex-1 flex-col pt-6", className)}>{children}</div>;
}

type PageBodyProps = {
  children: ReactNode;
  className?: string;
  /** Set to false when a descendant owns the scroll (e.g. a virtualised table). */
  scroll?: boolean;
};

export function PageBody({ children, className, scroll = true }: PageBodyProps) {
  return (
    <div
      className={cn(
        "flex min-h-0 flex-1 flex-col pt-6 pb-6",
        scroll ? "overflow-y-auto" : "overflow-hidden",
        className,
      )}
    >
      {children}
    </div>
  );
}

type PageFooterProps = {
  children: ReactNode;
  className?: string;
  align?: "start" | "end" | "between";
};

export function PageFooter({ children, className, align = "end" }: PageFooterProps) {
  return (
    <div
      className={cn(
        "shrink-0 -mx-6 flex items-center gap-2 border-t border-[var(--se-line)] bg-[var(--se-bg)] px-6 py-3",
        align === "end" && "justify-end",
        align === "between" && "justify-between",
        align === "start" && "justify-start",
        className,
      )}
    >
      {children}
    </div>
  );
}
