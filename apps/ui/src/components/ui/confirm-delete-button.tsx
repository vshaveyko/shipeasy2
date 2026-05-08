"use client";

import { useState, type ReactNode } from "react";
import { Trash2 } from "lucide-react";
import { ActionForm } from "@/components/ui/action-form";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { ActionResult } from "@/lib/action-result";

type Size = "sm" | "default" | "icon-sm";
type Variant = "ghost" | "outline" | "destructive";

interface Props {
  action: (formData: FormData) => Promise<ActionResult>;
  id: string;
  /** Hidden inputs forwarded to the action; { id } is always included. */
  extraInputs?: Record<string, string>;
  /** Confirm-dialog title — e.g. "Delete experiment?". */
  title: string;
  /** Confirm-dialog body. Pass JSX so callers can highlight the entity name. */
  description: ReactNode;
  /** Loading toast text — defaults to "Deleting…". */
  loading?: string;
  /** Success toast text — defaults to "Deleted". */
  success?: string;
  /** Trigger label. If omitted, an icon-only Trash button is rendered. */
  triggerLabel?: ReactNode;
  triggerSize?: Size;
  triggerVariant?: Variant;
  triggerClassName?: string;
  triggerAriaLabel?: string;
  confirmLabel?: string;
  onSuccess?: () => void;
}

export function ConfirmDeleteButton({
  action,
  id,
  extraInputs,
  title,
  description,
  loading = "Deleting…",
  success = "Deleted",
  triggerLabel,
  triggerSize,
  triggerVariant = "ghost",
  triggerClassName,
  triggerAriaLabel,
  confirmLabel = "Delete",
  onSuccess,
}: Props) {
  const [open, setOpen] = useState(false);

  const iconOnly = !triggerLabel;
  const size: Size = triggerSize ?? (iconOnly ? "icon-sm" : "sm");

  return (
    <>
      <Button
        type="button"
        variant={triggerVariant}
        size={size}
        aria-label={triggerAriaLabel ?? (iconOnly ? "Delete" : undefined)}
        className={triggerClassName}
        onClick={() => setOpen(true)}
      >
        <Trash2 className={iconOnly ? "size-4 text-destructive" : "size-3.5"} />
        {triggerLabel}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <ActionForm
              action={action}
              loading={loading}
              success={success}
              onSuccess={() => {
                setOpen(false);
                onSuccess?.();
              }}
            >
              <input type="hidden" name="id" value={id} />
              {extraInputs
                ? Object.entries(extraInputs).map(([k, v]) => (
                    <input key={k} type="hidden" name={k} value={v} />
                  ))
                : null}
              <Button
                type="submit"
                size="sm"
                className="bg-[var(--se-danger)] text-white hover:bg-[var(--se-danger)]/90"
              >
                {confirmLabel}
              </Button>
            </ActionForm>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
