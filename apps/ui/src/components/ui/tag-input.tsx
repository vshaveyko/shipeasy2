"use client";

import * as React from "react";
import { X } from "lucide-react";

import { cn } from "@/lib/utils";

interface TagInputProps {
  value: string[];
  onValueChange: (next: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  /** Limit on number of tags (defaults to no limit). */
  max?: number;
  /** Validate a candidate tag — return false to reject. */
  validate?: (candidate: string) => boolean;
  inputProps?: Omit<
    React.InputHTMLAttributes<HTMLInputElement>,
    "value" | "onChange" | "onKeyDown" | "placeholder" | "disabled"
  >;
}

function TagInput({
  value,
  onValueChange,
  placeholder = "Add tag…",
  disabled,
  className,
  max,
  validate,
  inputProps,
}: TagInputProps) {
  const [draft, setDraft] = React.useState("");

  const commit = (raw: string) => {
    const tag = raw.trim();
    if (!tag) return;
    if (value.includes(tag)) return;
    if (validate && !validate(tag)) return;
    if (max != null && value.length >= max) return;
    onValueChange([...value, tag]);
    setDraft("");
  };

  const remove = (i: number) => {
    onValueChange(value.filter((_, idx) => idx !== i));
  };

  const onKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      commit(draft);
    } else if (e.key === "Backspace" && !draft && value.length > 0) {
      e.preventDefault();
      remove(value.length - 1);
    }
  };

  return (
    <div
      data-slot="tag-input"
      data-disabled={disabled || undefined}
      className={cn(
        "flex min-h-9 w-full flex-wrap items-center gap-1.5 rounded-[var(--radius-md)] border border-[var(--se-line-2)] bg-[var(--se-bg-2)] px-2 py-1 text-[13px] transition-colors",
        "focus-within:border-[var(--se-fg-3)] focus-within:bg-[var(--se-bg-1)] focus-within:ring-3 focus-within:ring-ring/40",
        "data-disabled:cursor-not-allowed data-disabled:opacity-60",
        className,
      )}
    >
      {value.map((tag, i) => (
        <span
          key={`${tag}-${i}`}
          className="inline-flex items-center gap-1.5 rounded-[var(--radius-sm)] border border-[var(--se-line)] bg-[var(--se-bg-3)] py-px pl-2 pr-1 font-mono text-[11.5px] leading-snug text-[var(--se-fg)]"
        >
          {tag}
          <button
            type="button"
            disabled={disabled}
            onClick={() => remove(i)}
            aria-label={`Remove ${tag}`}
            className="grid size-3.5 cursor-pointer place-items-center rounded text-[var(--se-fg-3)] hover:bg-[var(--se-bg-4)] hover:text-[var(--se-fg)] disabled:pointer-events-none"
          >
            <X className="size-2.5" />
          </button>
        </span>
      ))}
      <input
        {...inputProps}
        value={draft}
        disabled={disabled}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={onKey}
        placeholder={value.length === 0 ? placeholder : ""}
        className="flex-1 min-w-[80px] border-0 bg-transparent py-0.5 text-[13px] text-[var(--se-fg)] outline-none placeholder:text-[var(--se-fg-4)] disabled:pointer-events-none"
      />
    </div>
  );
}

export { TagInput };
