"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

const SEGMENT_RE = /^[a-z0-9](?:[a-z0-9_-]*[a-z0-9])?$/;
/** Configs allow the reserved `_default` namespace as the folder. */
const FOLDER_RE = /^(?:_default|[a-z0-9](?:[a-z0-9_-]*[a-z0-9])?)$/;

export type FolderNameValue = {
  folder: string;
  leaf: string;
  folderValid: boolean;
  leafValid: boolean;
  /** `${folder}.${leaf}` when both segments parse, otherwise empty string. */
  fullName: string;
};

/** Two-input folder + leaf editor producing a single `folder.name` slug.
 *
 * Same shape used by configs + killswitches. Every entity creation wizard
 * uses this so users develop muscle memory ("first the folder, then the
 * name"). Folder is rendered narrow (25% of width) — the leaf is the part
 * users tweak more often.
 */
export function FolderNameInput({
  folder,
  leaf,
  onFolderChange,
  onLeafChange,
  folderPlaceholder = "checkout",
  leafPlaceholder = "shipping",
  folderAutoFocus = true,
  folderId = "fn-folder",
  leafId = "fn-leaf",
  folderTestId,
  leafTestId,
  /** Allow the reserved `_default` namespace as the folder (configs only). */
  allowDefaultFolder = false,
}: {
  folder: string;
  leaf: string;
  onFolderChange: (v: string) => void;
  onLeafChange: (v: string) => void;
  folderPlaceholder?: string;
  leafPlaceholder?: string;
  folderAutoFocus?: boolean;
  folderId?: string;
  leafId?: string;
  folderTestId?: string;
  leafTestId?: string;
  allowDefaultFolder?: boolean;
}) {
  const folderTrim = folder.trim();
  const leafTrim = leaf.trim();
  const folderRe = allowDefaultFolder ? FOLDER_RE : SEGMENT_RE;
  const folderValid = folderRe.test(folderTrim);
  const leafValid = SEGMENT_RE.test(leafTrim);
  const folderError = folderTrim.length > 0 && !folderValid;
  const leafError = leafTrim.length > 0 && !leafValid;

  return (
    <div className="grid grid-cols-[25%_auto_1fr] items-center gap-2">
      <input
        id={folderId}
        aria-label="Folder"
        aria-invalid={folderError || undefined}
        value={folder}
        onChange={(e) => onFolderChange(e.target.value)}
        placeholder={folderPlaceholder}
        data-testid={folderTestId}
        autoFocus={folderAutoFocus}
        className={cn(
          "h-9 w-full rounded-md border bg-[var(--se-bg-2)] px-3 font-mono text-[13.5px] font-medium outline-none transition-colors hover:bg-[var(--se-bg-3)] focus:bg-[var(--se-bg-1)]",
          folderError
            ? "border-[var(--se-danger)] focus:border-[var(--se-danger)]"
            : "border-[var(--se-line-2)] hover:border-[var(--se-line-3)] focus:border-[var(--se-accent)]",
        )}
      />
      <span className="font-mono text-[14px] text-[var(--se-fg-3)]">.</span>
      <input
        id={leafId}
        aria-label="Name"
        aria-invalid={leafError || undefined}
        value={leaf}
        onChange={(e) => onLeafChange(e.target.value)}
        placeholder={leafPlaceholder}
        data-testid={leafTestId}
        className={cn(
          "h-9 w-full rounded-md border bg-[var(--se-bg-2)] px-3 font-mono text-[13.5px] font-medium outline-none transition-colors hover:bg-[var(--se-bg-3)] focus:bg-[var(--se-bg-1)]",
          leafError
            ? "border-[var(--se-danger)] focus:border-[var(--se-danger)]"
            : "border-[var(--se-line-2)] hover:border-[var(--se-line-3)] focus:border-[var(--se-accent)]",
        )}
      />
    </div>
  );
}

/** Derive validation state from a folder/leaf pair. Used by parent wizards
 * to drive their `step.isValid()` predicate without duplicating regex. */
export function deriveFolderName(
  folder: string,
  leaf: string,
  opts: { allowDefaultFolder?: boolean } = {},
): FolderNameValue {
  const folderTrim = folder.trim();
  const leafTrim = leaf.trim();
  const folderRe = opts.allowDefaultFolder ? FOLDER_RE : SEGMENT_RE;
  const folderValid = folderRe.test(folderTrim);
  const leafValid = SEGMENT_RE.test(leafTrim);
  return {
    folder: folderTrim,
    leaf: leafTrim,
    folderValid,
    leafValid,
    fullName: folderValid && leafValid ? `${folderTrim}.${leafTrim}` : "",
  };
}
