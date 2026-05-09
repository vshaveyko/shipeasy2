"use client";

import { useState, useTransition, type ChangeEvent } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { ActionResult } from "@/lib/action-result";

interface Option {
  value: string;
  label: string;
}

interface Props {
  id: string;
  name: string;
  value: string;
  options: readonly Option[];
  action: (formData: FormData) => Promise<ActionResult>;
  ariaLabel: string;
  className?: string;
}

export function InlineSelect({ id, name, value, options, action, ariaLabel, className }: Props) {
  const [current, setCurrent] = useState(value);
  const [pending, startTransition] = useTransition();

  function handleChange(e: ChangeEvent<HTMLSelectElement>) {
    const next = e.target.value;
    const prev = current;
    setCurrent(next);
    const fd = new FormData();
    fd.set("id", id);
    fd.set(name, next);
    startTransition(() => {
      toast.promise(
        action(fd).then((result) => {
          if (!result.ok) {
            setCurrent(prev);
            throw new Error(result.error);
          }
          return result.message ?? "Updated";
        }),
        {
          loading: "Saving…",
          success: (msg) => msg as string,
          error: (err: Error) => err.message,
        },
      );
    });
  }

  return (
    <select
      aria-label={ariaLabel}
      value={current}
      onChange={handleChange}
      disabled={pending}
      className={cn(
        "rounded border border-[var(--se-line-2)] bg-[var(--se-bg-2)] px-2 py-1 text-[12px] text-[var(--se-fg)] disabled:opacity-60",
        className,
      )}
      onClick={(e) => e.stopPropagation()}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}
