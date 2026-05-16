import * as React from "react";

import { cn } from "@/lib/utils";

function Table({ className, ...props }: React.ComponentProps<"table">) {
  return (
    <div data-slot="table-wrapper" className="relative w-full overflow-auto">
      <table
        data-slot="table"
        className={cn("w-full caption-bottom border-collapse text-[13px]", className)}
        {...props}
      />
    </div>
  );
}

function THead({ className, ...props }: React.ComponentProps<"thead">) {
  return (
    <thead
      data-slot="thead"
      className={cn(
        "sticky top-0 z-10 bg-[var(--se-bg-1)]/95 backdrop-blur supports-[backdrop-filter]:bg-[var(--se-bg-1)]/80",
        "[&_th]:t-caps [&_th]:dim [&_th]:border-b [&_th]:border-[var(--se-line)] [&_th]:px-3.5 [&_th]:py-2.5 [&_th]:text-left [&_th]:font-normal",
        className,
      )}
      {...props}
    />
  );
}

function TBody({ className, ...props }: React.ComponentProps<"tbody">) {
  return (
    <tbody
      data-slot="tbody"
      className={cn(
        "[&_tr]:border-b [&_tr]:border-[var(--se-line)] [&_tr:last-child]:border-0",
        className,
      )}
      {...props}
    />
  );
}

function TR({
  className,
  active,
  interactive,
  ...props
}: React.ComponentProps<"tr"> & { active?: boolean; interactive?: boolean }) {
  return (
    <tr
      data-slot="tr"
      data-active={active ? "true" : undefined}
      className={cn(
        "transition-colors",
        interactive && "cursor-pointer hover:bg-[var(--se-bg-2)]",
        active && "bg-[var(--se-bg-2)] [box-shadow:inset_2px_0_0_var(--se-accent)]",
        className,
      )}
      {...props}
    />
  );
}

function TH({ className, ...props }: React.ComponentProps<"th">) {
  return <th data-slot="th" className={className} {...props} />;
}

function TD({ className, ...props }: React.ComponentProps<"td">) {
  return <td data-slot="td" className={cn("px-3.5 py-3 align-middle", className)} {...props} />;
}

export { Table, THead, TBody, TR, TH, TD };
