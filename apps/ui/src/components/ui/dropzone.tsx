"use client";

import * as React from "react";
import { UploadCloud, FileText, X } from "lucide-react";

import { cn } from "@/lib/utils";

interface DropzoneProps {
  onFiles?: (files: File[]) => void;
  accept?: string;
  multiple?: boolean;
  disabled?: boolean;
  className?: string;
  /** Override the inner content (icon + title + sub). */
  children?: React.ReactNode;
  title?: React.ReactNode;
  hint?: React.ReactNode;
}

function Dropzone({
  onFiles,
  accept,
  multiple = false,
  disabled,
  className,
  children,
  title = "Drop files here, or click to browse",
  hint = "PNG · JPG · CSV · up to 10 MB",
}: DropzoneProps) {
  const [drag, setDrag] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const open = () => inputRef.current?.click();

  const handleFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    onFiles?.(Array.from(files));
  };

  return (
    <div
      data-slot="dropzone"
      role="button"
      tabIndex={0}
      aria-disabled={disabled}
      onClick={() => !disabled && open()}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          if (!disabled) open();
        }
      }}
      onDragOver={(e) => {
        e.preventDefault();
        if (!disabled) setDrag(true);
      }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDrag(false);
        if (disabled) return;
        handleFiles(e.dataTransfer.files);
      }}
      className={cn(
        "flex cursor-default flex-col items-center gap-2 rounded-[var(--radius-lg)] border border-dashed border-[var(--se-line-3)] bg-[var(--se-bg-2)] p-6 text-center outline-none transition-colors",
        "hover:border-[var(--se-fg-3)] hover:bg-[var(--se-bg-3)]",
        "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        drag &&
          "border-solid border-[var(--se-accent)] bg-[color-mix(in_oklab,var(--se-accent)_6%,var(--se-bg-2))]",
        disabled && "cursor-not-allowed opacity-50",
        className,
      )}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        disabled={disabled}
        className="sr-only"
        onChange={(e) => handleFiles(e.target.files)}
      />
      {children ?? (
        <>
          <span className="grid size-9 place-items-center rounded-[var(--radius-md)] border border-[var(--se-line-2)] bg-[var(--se-bg-3)] text-[var(--se-fg-3)]">
            <UploadCloud className="size-4" />
          </span>
          <span className="text-[13px] font-medium text-[var(--se-fg)]">{title}</span>
          <span className="font-mono text-[11.5px] text-[var(--se-fg-3)]">{hint}</span>
        </>
      )}
    </div>
  );
}

interface FileChipProps extends React.ComponentProps<"div"> {
  name: React.ReactNode;
  size?: React.ReactNode;
  onRemove?: () => void;
}

function FileChip({ className, name, size, onRemove, ...props }: FileChipProps) {
  return (
    <div
      data-slot="file-chip"
      className={cn(
        "flex items-center gap-2.5 rounded-[var(--radius-md)] border border-[var(--se-line)] bg-[var(--se-bg-2)] px-2.5 py-2",
        className,
      )}
      {...props}
    >
      <FileText className="size-4 shrink-0 text-[var(--se-fg-3)]" />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="truncate text-[12.5px] text-[var(--se-fg)]">{name}</span>
        {size != null ? (
          <span className="font-mono text-[10.5px] text-[var(--se-fg-4)]">{size}</span>
        ) : null}
      </div>
      {onRemove ? (
        <button
          type="button"
          onClick={onRemove}
          aria-label="Remove file"
          className="grid size-5 cursor-pointer place-items-center rounded text-[var(--se-fg-3)] hover:bg-[var(--se-bg-3)] hover:text-[var(--se-fg)]"
        >
          <X className="size-3" />
        </button>
      ) : null}
    </div>
  );
}

export { Dropzone, FileChip };
