"use client";

import * as React from "react";
import { Popover } from "@base-ui/react/popover";
import { ChevronDownIcon, FolderIcon, PlusIcon, XIcon } from "lucide-react";

import { cn } from "@/lib/utils";

const FOLDER_RE = /^[a-zA-Z0-9_-]+$/;

export type FolderPickerProps = {
  value: string | null;
  onChange: (folder: string | null) => void;
  existingFolders: string[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  id?: string;
};

/** Combobox-style picker for the `folder` column shared across flag-platform
 *  entities. Lets the user pick an existing folder for the project/kind, type
 *  to filter, or commit a new folder name on the fly. Empty value = "No
 *  folder" (the row goes under the synthetic root bucket). */
export function FolderPicker({
  value,
  onChange,
  existingFolders,
  placeholder = "No folder",
  disabled,
  className,
  id,
}: FolderPickerProps) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const inputRef = React.useRef<HTMLInputElement>(null);

  const trimmed = query.trim();
  const valid = trimmed === "" || FOLDER_RE.test(trimmed);

  const matches = React.useMemo(() => {
    const q = trimmed.toLowerCase();
    return existingFolders
      .filter((f) => f && f.toLowerCase().includes(q))
      .sort((a, b) => a.localeCompare(b));
  }, [existingFolders, trimmed]);

  const canCreate = trimmed !== "" && valid && !existingFolders.includes(trimmed);

  React.useEffect(() => {
    if (open) {
      setQuery("");
      // Defer focus until popover content mounts.
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);

  const commit = (folder: string | null) => {
    onChange(folder);
    setOpen(false);
  };

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger
        id={id}
        type="button"
        disabled={disabled}
        className={cn(
          "inline-flex h-9 w-full items-center justify-between gap-2 rounded-md border border-[var(--se-line-2)] bg-[var(--se-bg-2)] px-3 text-[13px] outline-none transition-colors",
          "hover:border-[var(--se-line-3)]",
          "focus-visible:ring-2 focus-visible:ring-[var(--ring)]",
          "disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
      >
        <span className="flex min-w-0 items-center gap-2 truncate">
          <FolderIcon className="size-3.5 shrink-0 text-[var(--se-fg-3)]" />
          <span className={cn("truncate", !value && "dim-2")}>{value ?? placeholder}</span>
        </span>
        <span className="flex shrink-0 items-center gap-1">
          {value ? (
            <span
              role="button"
              tabIndex={0}
              aria-label="Clear folder"
              onClick={(e) => {
                e.stopPropagation();
                onChange(null);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  e.stopPropagation();
                  onChange(null);
                }
              }}
              className="-mr-1 inline-flex size-5 cursor-pointer items-center justify-center rounded text-[var(--se-fg-3)] hover:bg-[var(--se-bg-3)] hover:text-[var(--se-fg)]"
            >
              <XIcon className="size-3" />
            </span>
          ) : null}
          <ChevronDownIcon className="size-3.5 text-[var(--se-fg-3)]" />
        </span>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner sideOffset={6} align="start" className="z-[70]">
          <Popover.Popup
            className={cn(
              "z-[70] w-[var(--anchor-width)] min-w-[14rem] overflow-hidden rounded-md border border-[var(--se-line-2)] bg-[var(--se-bg-2)] shadow-[var(--se-shadow-pop)] outline-none",
              "data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95",
              "data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95",
            )}
          >
            <div className="border-b border-[var(--se-line)] p-1">
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && canCreate) {
                    e.preventDefault();
                    commit(trimmed);
                  }
                }}
                placeholder="Type to filter or create…"
                aria-invalid={!valid || undefined}
                className="h-7 w-full bg-transparent px-2 text-[13px] outline-none placeholder:text-[var(--se-fg-3)]"
              />
            </div>
            <div className="max-h-56 overflow-y-auto p-1">
              <button
                type="button"
                onClick={() => commit(null)}
                className={cn(
                  "flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-[13px] outline-none",
                  "hover:bg-[var(--se-bg-3)] focus-visible:bg-[var(--se-bg-3)]",
                  value === null ? "text-[var(--se-fg)]" : "dim-2",
                )}
              >
                <span className="italic">No folder</span>
              </button>
              {matches.map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => commit(f)}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-[13px] outline-none",
                    "hover:bg-[var(--se-bg-3)] focus-visible:bg-[var(--se-bg-3)]",
                    value === f && "text-[var(--se-fg)]",
                  )}
                >
                  <FolderIcon className="size-3.5 shrink-0 text-[var(--se-fg-3)]" />
                  <span className="truncate">{f}</span>
                </button>
              ))}
              {canCreate ? (
                <>
                  {matches.length > 0 ? (
                    <div className="my-1 h-px bg-[var(--se-line)]" aria-hidden />
                  ) : null}
                  <button
                    type="button"
                    onClick={() => commit(trimmed)}
                    className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-[13px] text-[var(--se-accent)] outline-none hover:bg-[var(--se-accent-soft)] focus-visible:bg-[var(--se-accent-soft)]"
                  >
                    <PlusIcon className="size-3.5 shrink-0" />
                    <span className="truncate">
                      Create &lsquo;<span className="font-mono">{trimmed}</span>&rsquo;
                    </span>
                  </button>
                </>
              ) : null}
              {!valid && trimmed !== "" ? (
                <p className="px-2 py-1.5 text-[11px] text-[var(--se-danger)]">
                  Folder must be alphanumeric, &lsquo;_&rsquo; or &lsquo;-&rsquo;.
                </p>
              ) : null}
            </div>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}
