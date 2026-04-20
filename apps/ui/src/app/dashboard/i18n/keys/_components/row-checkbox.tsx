"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

interface Props {
  checked: boolean;
  indeterminate?: boolean;
  onChange: () => void;
  ariaLabel: string;
  className?: string;
}

/**
 * Thin wrapper over a native checkbox that supports the tri-state
 * `indeterminate` visual. Used in both the leaf rows and folder rows of the
 * keys table so folder selection reflects descendant selection.
 */
export function RowCheckbox({ checked, indeterminate, onChange, ariaLabel, className }: Props) {
  const ref = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (ref.current) ref.current.indeterminate = Boolean(indeterminate && !checked);
  }, [indeterminate, checked]);

  return (
    <input
      ref={ref}
      type="checkbox"
      checked={checked}
      onChange={onChange}
      aria-label={ariaLabel}
      className={cn(
        "size-3.5 shrink-0 cursor-pointer rounded border-input accent-primary",
        className,
      )}
    />
  );
}
