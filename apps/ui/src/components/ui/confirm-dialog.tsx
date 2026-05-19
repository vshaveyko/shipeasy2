"use client";

import * as React from "react";
import { AlertDialog as AlertDialogPrimitive } from "@base-ui/react/alert-dialog";
import { AlertTriangle, Info, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Tone = "default" | "destructive" | "warning" | "info";

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: React.ReactNode;
  description?: React.ReactNode;
  /** Body content shown between the description and the footer. */
  children?: React.ReactNode;
  confirmLabel?: React.ReactNode;
  cancelLabel?: React.ReactNode;
  tone?: Tone;
  /** Called when the user confirms; if it returns a promise the dialog stays open until it settles. */
  onConfirm?: () => void | Promise<void>;
  /** Called when the user cancels (Escape, Cancel button, backdrop click). */
  onCancel?: () => void;
  /** Show or hide the leading icon (defaults to true for non-default tones). */
  showIcon?: boolean;
  /** Disable the confirm button (e.g. while a checkbox is unchecked). */
  confirmDisabled?: boolean;
}

const toneIcon: Record<Tone, React.ComponentType<{ className?: string }> | null> = {
  default: null,
  destructive: Trash2,
  warning: AlertTriangle,
  info: Info,
};

const toneRingClass: Record<Tone, string> = {
  default: "bg-[var(--se-bg-3)] text-[var(--se-fg-2)] border-[var(--se-line-2)]",
  destructive:
    "bg-[var(--se-danger-soft)] text-[var(--se-danger)] border-[color-mix(in_oklab,var(--se-danger)_30%,transparent)]",
  warning:
    "bg-[var(--se-warn-soft)] text-[var(--se-warn)] border-[color-mix(in_oklab,var(--se-warn)_30%,transparent)]",
  info: "bg-[var(--se-info-soft)] text-[var(--se-info)] border-[color-mix(in_oklab,var(--se-info)_30%,transparent)]",
};

function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  tone = "default",
  onConfirm,
  onCancel,
  showIcon,
  confirmDisabled,
}: ConfirmDialogProps) {
  const [pending, setPending] = React.useState(false);
  const Icon = toneIcon[tone];
  const showLeading = showIcon ?? tone !== "default";

  const close = React.useCallback(
    (next: boolean) => {
      if (pending) return;
      onOpenChange(next);
    },
    [onOpenChange, pending],
  );

  const confirm = async () => {
    if (!onConfirm) {
      onOpenChange(false);
      return;
    }
    try {
      setPending(true);
      await onConfirm();
      onOpenChange(false);
    } finally {
      setPending(false);
    }
  };

  return (
    <AlertDialogPrimitive.Root open={open} onOpenChange={close}>
      <AlertDialogPrimitive.Portal>
        <AlertDialogPrimitive.Backdrop className="fixed inset-0 z-50 bg-black/55 backdrop-blur-[6px] data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0" />
        <AlertDialogPrimitive.Popup
          className={cn(
            "fixed left-1/2 top-1/2 z-50 grid w-[min(440px,calc(100vw-32px))] -translate-x-1/2 -translate-y-1/2 gap-4 rounded-[var(--radius-xl)] border border-[var(--se-line-2)] bg-[var(--se-bg-1)] p-5 shadow-[0_40px_100px_-20px_rgba(0,0,0,0.6)] outline-none",
            "data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95",
          )}
        >
          <div className="flex items-start gap-3">
            {showLeading && Icon ? (
              <span
                className={cn(
                  "grid size-9 shrink-0 place-items-center rounded-[var(--radius-md)] border",
                  toneRingClass[tone],
                )}
              >
                <Icon className="size-4" />
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
          <div className="mt-1 flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={pending}
              onClick={() => {
                onCancel?.();
                onOpenChange(false);
              }}
            >
              {cancelLabel}
            </Button>
            <Button
              type="button"
              size="sm"
              variant={tone === "destructive" ? "destructive" : "default"}
              disabled={pending || confirmDisabled}
              onClick={confirm}
            >
              {pending ? "…" : confirmLabel}
            </Button>
          </div>
        </AlertDialogPrimitive.Popup>
      </AlertDialogPrimitive.Portal>
    </AlertDialogPrimitive.Root>
  );
}

export { ConfirmDialog };
export type { ConfirmDialogProps };
