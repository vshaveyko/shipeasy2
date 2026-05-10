"use client";

import { useState } from "react";
import { Code2 } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  IntegrationSnippetDialog,
  type IntegrationSnippetDialogProps,
} from "./integration-snippet-dialog";

type Variant = "icon" | "ghost" | "subtle";

export interface IntegrationSnippetButtonProps {
  kind: IntegrationSnippetDialogProps["kind"];
  name: string;
  variant?: Variant;
  className?: string;
  /** Stop propagation on click — useful when nested inside row links. */
  stopPropagation?: boolean;
  /** Override label for non-icon variants. */
  label?: string;
  /** Override default lang shown when opened. */
  defaultLang?: IntegrationSnippetDialogProps["defaultLang"];
}

/**
 * Trigger + dialog pair. Drop into row actions, dropdown menus, or detail
 * pages. The dialog mounts only after the user clicks (cheap on long lists).
 */
export function IntegrationSnippetButton({
  kind,
  name,
  variant = "icon",
  className,
  stopPropagation,
  label = "Integration code",
  defaultLang,
}: IntegrationSnippetButtonProps) {
  const [open, setOpen] = useState(false);

  function handleClick(e: React.MouseEvent) {
    if (stopPropagation) {
      e.stopPropagation();
      e.preventDefault();
    }
    setOpen(true);
  }

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        aria-label={label}
        title={label}
        data-integration-trigger={kind}
        className={cn(
          variant === "icon" &&
            "inline-flex size-7 items-center justify-center rounded-md text-[var(--se-fg-3)] transition-colors hover:bg-[var(--se-bg-2)] hover:text-foreground",
          variant === "ghost" &&
            "inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[12px] text-[var(--se-fg-2)] hover:bg-[var(--se-bg-2)] hover:text-foreground",
          variant === "subtle" &&
            "inline-flex items-center gap-1.5 rounded-md border border-[var(--se-line-2)] bg-[var(--se-bg-2)] px-2.5 py-1 text-[12px] text-[var(--se-fg-2)] hover:bg-[var(--se-bg-3)] hover:text-foreground",
          className,
        )}
      >
        <Code2 className="size-3.5" />
        {variant !== "icon" && <span>{label}</span>}
      </button>
      {open && (
        <IntegrationSnippetDialog
          open={open}
          onOpenChange={setOpen}
          kind={kind}
          name={name}
          defaultLang={defaultLang}
        />
      )}
    </>
  );
}
