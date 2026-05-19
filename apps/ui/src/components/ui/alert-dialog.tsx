"use client";

import * as React from "react";
import { AlertDialog as AlertDialogPrimitive } from "@base-ui/react/alert-dialog";
import { Info } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface AlertDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: React.ReactNode;
  description?: React.ReactNode;
  children?: React.ReactNode;
  ctaLabel?: React.ReactNode;
  /** Optional leading icon. Pass `null` to suppress, undefined for the default `Info` glyph. */
  icon?: React.ReactNode | null;
}

function AlertDialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  ctaLabel = "Got it",
  icon,
}: AlertDialogProps) {
  return (
    <AlertDialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <AlertDialogPrimitive.Portal>
        <AlertDialogPrimitive.Backdrop className="fixed inset-0 z-50 bg-black/55 backdrop-blur-[6px] data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0" />
        <AlertDialogPrimitive.Popup
          className={cn(
            "fixed left-1/2 top-1/2 z-50 grid w-[min(440px,calc(100vw-32px))] -translate-x-1/2 -translate-y-1/2 gap-4 rounded-[var(--radius-xl)] border border-[var(--se-line-2)] bg-[var(--se-bg-1)] p-5 shadow-[0_40px_100px_-20px_rgba(0,0,0,0.6)] outline-none",
            "data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95",
          )}
        >
          <div className="flex items-start gap-3">
            {icon !== null ? (
              <span className="grid size-9 shrink-0 place-items-center rounded-[var(--radius-md)] border border-[color-mix(in_oklab,var(--se-info)_30%,transparent)] bg-[var(--se-info-soft)] text-[var(--se-info)]">
                {icon ?? <Info className="size-4" />}
              </span>
            ) : null}
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <AlertDialogPrimitive.Title className="text-[15px] font-semibold leading-tight tracking-[-0.01em] text-[var(--se-fg)]">
                {title}
              </AlertDialogPrimitive.Title>
              {description ? (
                <AlertDialogPrimitive.Description className="text-[13px] leading-snug text-[var(--se-fg-2)]">
                  {description}
                </AlertDialogPrimitive.Description>
              ) : null}
            </div>
          </div>
          {children ? <div className="text-[13px] text-[var(--se-fg-2)]">{children}</div> : null}
          <div className="mt-1 flex justify-end">
            <Button type="button" size="sm" onClick={() => onOpenChange(false)}>
              {ctaLabel}
            </Button>
          </div>
        </AlertDialogPrimitive.Popup>
      </AlertDialogPrimitive.Portal>
    </AlertDialogPrimitive.Root>
  );
}

export { AlertDialog };
export type { AlertDialogProps };
