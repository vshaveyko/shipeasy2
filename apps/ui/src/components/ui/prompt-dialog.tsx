"use client";

import * as React from "react";
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldError, FieldHint, FieldLabel } from "@/components/ui/field";
import { cn } from "@/lib/utils";

interface PromptDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: React.ReactNode;
  description?: React.ReactNode;
  label?: React.ReactNode;
  placeholder?: string;
  defaultValue?: string;
  hint?: React.ReactNode;
  /** Optional sync validator — return a string to display an error and block submission. */
  validate?: (value: string) => string | null;
  confirmLabel?: React.ReactNode;
  cancelLabel?: React.ReactNode;
  onConfirm: (value: string) => void | Promise<void>;
  required?: boolean;
}

function PromptDialog({
  open,
  onOpenChange,
  title,
  description,
  label,
  placeholder,
  defaultValue = "",
  hint,
  validate,
  confirmLabel = "Save",
  cancelLabel = "Cancel",
  onConfirm,
  required,
}: PromptDialogProps) {
  const [value, setValue] = React.useState(defaultValue);
  const [error, setError] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (open) {
      setValue(defaultValue);
      setError(null);
      // Defer focus until after the popup mounts.
      requestAnimationFrame(() => inputRef.current?.select());
    }
  }, [open, defaultValue]);

  const submit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (required && !value.trim()) {
      setError("Required.");
      return;
    }
    if (validate) {
      const v = validate(value);
      if (v) {
        setError(v);
        return;
      }
    }
    try {
      setPending(true);
      await onConfirm(value);
      onOpenChange(false);
    } finally {
      setPending(false);
    }
  };

  return (
    <DialogPrimitive.Root open={open} onOpenChange={(o) => !pending && onOpenChange(o)}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Backdrop className="fixed inset-0 z-50 bg-black/55 backdrop-blur-[6px] data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0" />
        <DialogPrimitive.Popup
          className={cn(
            "fixed left-1/2 top-1/2 z-50 grid w-[min(460px,calc(100vw-32px))] -translate-x-1/2 -translate-y-1/2 gap-4 rounded-[var(--radius-xl)] border border-[var(--se-line-2)] bg-[var(--se-bg-1)] p-5 shadow-[0_40px_100px_-20px_rgba(0,0,0,0.6)] outline-none",
            "data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95",
          )}
        >
          <form onSubmit={submit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <DialogPrimitive.Title className="text-[15px] font-semibold leading-tight tracking-[-0.01em] text-[var(--se-fg)]">
                {title}
              </DialogPrimitive.Title>
              {description ? (
                <DialogPrimitive.Description className="text-[13px] leading-snug text-[var(--se-fg-2)]">
                  {description}
                </DialogPrimitive.Description>
              ) : null}
            </div>
            <Field>
              {label ? <FieldLabel required={required}>{label}</FieldLabel> : null}
              <Input
                ref={inputRef}
                value={value}
                placeholder={placeholder}
                onChange={(e) => {
                  setValue(e.target.value);
                  if (error) setError(null);
                }}
                aria-invalid={error ? true : undefined}
              />
              {error ? (
                <FieldError>{error}</FieldError>
              ) : hint ? (
                <FieldHint>{hint}</FieldHint>
              ) : null}
            </Field>
            <div className="flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={pending}
                onClick={() => onOpenChange(false)}
              >
                {cancelLabel}
              </Button>
              <Button type="submit" size="sm" disabled={pending}>
                {pending ? "…" : confirmLabel}
              </Button>
            </div>
          </form>
        </DialogPrimitive.Popup>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

export { PromptDialog };
export type { PromptDialogProps };
