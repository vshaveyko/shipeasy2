import * as React from "react";
import { AlertTriangleIcon, InfoIcon, OctagonAlertIcon, SparklesIcon } from "lucide-react";

import { cn } from "@/lib/utils";

type BannerIntent = "info" | "warn" | "danger" | "accent";

const intentStyles: Record<BannerIntent, string> = {
  info: "border-[color-mix(in_oklab,var(--se-info)_30%,transparent)] bg-[var(--se-info-soft)] text-[var(--se-info)]",
  warn: "border-[color-mix(in_oklab,var(--se-warn)_30%,transparent)] bg-[var(--se-warn-soft)] text-[var(--se-warn)]",
  danger:
    "border-[color-mix(in_oklab,var(--se-danger)_30%,transparent)] bg-[var(--se-danger-soft)] text-[var(--se-danger)]",
  accent:
    "border-[color-mix(in_oklab,var(--se-accent)_30%,transparent)] bg-[var(--se-accent-soft)] text-[var(--se-accent)]",
};

const intentIcon: Record<BannerIntent, React.ComponentType<{ className?: string }>> = {
  info: InfoIcon,
  warn: AlertTriangleIcon,
  danger: OctagonAlertIcon,
  accent: SparklesIcon,
};

function Banner({
  intent = "info",
  icon,
  title,
  action,
  className,
  children,
  ...props
}: Omit<React.ComponentProps<"div">, "title"> & {
  intent?: BannerIntent;
  icon?: React.ReactNode;
  title?: React.ReactNode;
  action?: React.ReactNode;
}) {
  const Icon = intentIcon[intent];
  return (
    <div
      role="status"
      data-slot="banner"
      data-intent={intent}
      className={cn(
        "flex items-start gap-3 rounded-md border px-3 py-2 text-[13px] leading-snug",
        intentStyles[intent],
        className,
      )}
      {...props}
    >
      <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center">
        {icon ?? <Icon className="size-4" />}
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        {title ? <span className="font-medium text-[var(--se-fg)]">{title}</span> : null}
        {children ? <span className="dim text-[12.5px]">{children}</span> : null}
      </div>
      {action ? <div className="ml-2 shrink-0">{action}</div> : null}
    </div>
  );
}

export { Banner };
