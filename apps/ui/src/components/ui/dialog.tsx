"use client";

import * as React from "react";
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { XIcon } from "lucide-react";

import { cn } from "@/lib/utils";

function Dialog(props: DialogPrimitive.Root.Props) {
  // Default to `"trap-focus"` instead of `true` so Base UI doesn't lock body
  // scroll (which sets `overflow: hidden` + `padding-right` on `<body>` and
  // causes a paint flash on close). Focus is still trapped inside the modal,
  // and the backdrop already blocks pointer interaction with the page below.
  return <DialogPrimitive.Root modal="trap-focus" {...props} />;
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
        // Match the popup's duration so the backdrop never finishes fading
        // before the popup does — otherwise the page underneath snaps from
        // blurred/dark to sharp while the popup is still visible, which reads
        // as a whole-UI blink.
        variant === "big-modal"
          ? "bg-[radial-gradient(circle_at_50%_30%,rgba(0,0,0,0.62)_0%,rgba(0,0,0,0.92)_70%)] backdrop-blur-[6px] duration-[220ms]"
          : "bg-black/50 backdrop-blur-[2px] duration-150",
        className,
      )}
      {...props}
    />
  );
}

type DialogSize = "default" | "big-modal" | "big-modal-nested";

function DialogContent({
  className,
  children,
  showClose = true,
  size = "default",
  ...props
}: DialogPrimitive.Popup.Props & { showClose?: boolean; size?: DialogSize }) {
  const isBig = size === "big-modal" || size === "big-modal-nested";
  const isNested = size === "big-modal-nested";
  return (
    <DialogPortal>
      <DialogBackdrop variant={isBig ? "big-modal" : "default"} />
      <DialogPrimitive.Popup
        data-slot="dialog-content"
        data-size={size}
        className={cn(
          "fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 outline-none",
          // Nested big modal sits above the parent (z-60) so it never gets
          // partly hidden by its own backdrop interaction.
          isNested ? "z-[60]" : "z-50",
          "data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95",
          isBig && !isNested
            ? "grid h-[calc(100vh-130px)] min-h-[560px] w-[calc(100vw-48px)] max-w-[1180px] grid-rows-[auto_auto_minmax(0,1fr)_auto] overflow-hidden rounded-[14px] border border-[var(--se-line-2)] bg-[var(--se-bg-1)] shadow-[var(--se-shadow-pop),inset_0_1px_0_rgba(255,255,255,0.04)] duration-[220ms]"
            : null,
          // Nested big modal: noticeably smaller than the host so the layering
          // reads clearly. ~88% width, ~84% height.
          isNested
            ? "grid h-[calc(100vh-200px)] min-h-[480px] w-[calc(100vw-180px)] max-w-[1020px] grid-rows-[auto_auto_minmax(0,1fr)_auto] overflow-hidden rounded-[14px] border border-[var(--se-line-2)] bg-[var(--se-bg-1)] shadow-[var(--se-shadow-pop),inset_0_1px_0_rgba(255,255,255,0.04)] duration-[220ms]"
            : null,
          !isBig
            ? "grid w-full max-w-lg gap-4 rounded-[var(--radius-lg)] border border-[var(--se-line)] bg-[var(--se-bg-1)] p-6 shadow-lg duration-150"
            : null,
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
