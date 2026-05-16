"use client";

import * as React from "react";
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { XIcon } from "lucide-react";

import { cn } from "@/lib/utils";

function Dialog(props: DialogPrimitive.Root.Props) {
  return <DialogPrimitive.Root {...props} />;
}

function DialogTrigger(props: DialogPrimitive.Trigger.Props) {
  return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />;
}

function DialogClose(props: DialogPrimitive.Close.Props) {
  return <DialogPrimitive.Close data-slot="dialog-close" {...props} />;
}

function DialogPortal(props: DialogPrimitive.Portal.Props) {
  return <DialogPrimitive.Portal {...props} />;
}

function DialogBackdrop({
  className,
  variant = "default",
  ...props
}: DialogPrimitive.Backdrop.Props & { variant?: "default" | "big-modal" }) {
  return (
    <DialogPrimitive.Backdrop
      data-slot="dialog-backdrop"
      data-variant={variant}
      className={cn(
        "fixed inset-0 z-50 data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0",
        variant === "big-modal"
          ? "bg-[radial-gradient(circle_at_50%_30%,rgba(0,0,0,0.62)_0%,rgba(0,0,0,0.92)_70%)] backdrop-blur-[6px]"
          : "bg-black/50 backdrop-blur-[2px]",
        className,
      )}
      {...props}
    />
  );
}

type DialogSize = "default" | "big-modal";

function DialogContent({
  className,
  children,
  showClose = true,
  size = "default",
  ...props
}: DialogPrimitive.Popup.Props & { showClose?: boolean; size?: DialogSize }) {
  return (
    <DialogPortal>
      <DialogBackdrop variant={size === "big-modal" ? "big-modal" : "default"} />
      <DialogPrimitive.Popup
        data-slot="dialog-content"
        data-size={size}
        className={cn(
          "fixed top-1/2 left-1/2 z-50 -translate-x-1/2 -translate-y-1/2 outline-none",
          "data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95",
          size === "big-modal"
            ? "grid h-[calc(100vh-130px)] min-h-[560px] w-[calc(100vw-48px)] max-w-[1180px] grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden rounded-[14px] border border-[var(--se-line-2)] bg-[var(--se-bg-1)] shadow-[var(--se-shadow-pop),inset_0_1px_0_rgba(255,255,255,0.04)] duration-[220ms]"
            : "grid w-full max-w-lg gap-4 rounded-[var(--radius-lg)] border border-[var(--se-line)] bg-[var(--se-bg-1)] p-6 shadow-lg duration-150",
          className,
        )}
        {...props}
      >
        {children}
        {showClose ? (
          <DialogPrimitive.Close
            className="absolute top-3 right-3 z-10 rounded-sm text-[var(--se-fg-3)] opacity-70 transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring"
            aria-label="Close"
          >
            <XIcon className="size-4" />
          </DialogPrimitive.Close>
        ) : null}
      </DialogPrimitive.Popup>
    </DialogPortal>
  );
}

function DialogHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-header"
      className={cn("flex flex-col gap-1.5 text-left", className)}
      {...props}
    />
  );
}

function DialogFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-footer"
      className={cn("flex flex-col-reverse gap-2 sm:flex-row sm:justify-end", className)}
      {...props}
    />
  );
}

function DialogTitle({ className, ...props }: DialogPrimitive.Title.Props) {
  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      className={cn("text-[15px] font-semibold leading-none", className)}
      {...props}
    />
  );
}

function DialogDescription({ className, ...props }: DialogPrimitive.Description.Props) {
  return (
    <DialogPrimitive.Description
      data-slot="dialog-description"
      className={cn("text-[13px] text-[var(--se-fg-3)]", className)}
      {...props}
    />
  );
}

export {
  Dialog,
  DialogTrigger,
  DialogClose,
  DialogPortal,
  DialogBackdrop,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
};
