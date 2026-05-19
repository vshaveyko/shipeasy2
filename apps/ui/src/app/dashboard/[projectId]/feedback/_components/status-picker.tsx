"use client";

import { useState, useTransition } from "react";
import { ChevronDown, Check } from "lucide-react";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import type { ActionResult } from "@/lib/action-result";

export type Tone =
  | "neutral"
  | "blue"
  | "amber"
  | "violet"
  | "cyan"
  | "green"
  | "red"
  | "orange"
  | "rose";

export interface StatusOption {
  value: string;
  label: string;
  tone: Tone;
}

interface Props {
  id: string;
  name: string;
  value: string;
  options: readonly StatusOption[];
  action: (formData: FormData) => Promise<ActionResult>;
  ariaLabel: string;
}

const TONE_DOT: Record<Tone, string> = {
  neutral: "bg-[var(--se-fg-4)]",
  blue: "bg-blue-500",
  amber: "bg-amber-500",
  violet: "bg-violet-500",
  cyan: "bg-cyan-500",
  green: "bg-emerald-500",
  red: "bg-rose-500",
  orange: "bg-orange-500",
  rose: "bg-rose-400",
};

const TONE_PILL: Record<Tone, string> = {
  neutral:
    "bg-[var(--se-bg-3)] text-[var(--se-fg-2)] ring-[var(--se-line)] hover:bg-[var(--se-bg-2)]",
  blue: "bg-blue-500/12 text-blue-700 ring-blue-500/25 hover:bg-blue-500/18 dark:text-blue-300",
  amber:
    "bg-amber-500/15 text-amber-800 ring-amber-500/30 hover:bg-amber-500/22 dark:text-amber-300",
  violet:
    "bg-violet-500/12 text-violet-700 ring-violet-500/25 hover:bg-violet-500/18 dark:text-violet-300",
  cyan: "bg-cyan-500/12 text-cyan-700 ring-cyan-500/25 hover:bg-cyan-500/18 dark:text-cyan-300",
  green:
    "bg-emerald-500/12 text-emerald-700 ring-emerald-500/25 hover:bg-emerald-500/18 dark:text-emerald-300",
  red: "bg-rose-500/12 text-rose-700 ring-rose-500/25 hover:bg-rose-500/18 dark:text-rose-300",
  orange:
    "bg-orange-500/12 text-orange-700 ring-orange-500/25 hover:bg-orange-500/18 dark:text-orange-300",
  rose: "bg-rose-400/12 text-rose-700 ring-rose-400/25 hover:bg-rose-400/18 dark:text-rose-300",
};

export function StatusPicker({ id, name, value, options, action, ariaLabel }: Props) {
  const [current, setCurrent] = useState(value);
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);

  const selected = options.find((o) => o.value === current) ?? options[0];

  function commit(next: string) {
    if (next === current) {
      setOpen(false);
      return;
    }
    const prev = current;
    setCurrent(next);
    setOpen(false);
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
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger
        aria-label={ariaLabel}
        disabled={pending}
        className={cn(
          "inline-flex h-6 max-w-full items-center gap-1.5 rounded-full px-2 text-[11.5px] font-medium ring-1 ring-inset transition-colors disabled:opacity-60",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/40",
          TONE_PILL[selected.tone],
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <span className={cn("size-1.5 shrink-0 rounded-full", TONE_DOT[selected.tone])} />
        <span className="truncate">{selected.label}</span>
        <ChevronDown className="size-3 shrink-0 opacity-60" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" sideOffset={4} className="min-w-[10rem]">
        {options.map((o) => {
          const active = o.value === current;
          return (
            <DropdownMenuItem key={o.value} onClick={() => commit(o.value)} className="gap-2 pr-2">
              <span className={cn("size-1.5 shrink-0 rounded-full", TONE_DOT[o.tone])} />
              <span className="flex-1">{o.label}</span>
              {active ? <Check className="size-3.5 opacity-70" /> : null}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
