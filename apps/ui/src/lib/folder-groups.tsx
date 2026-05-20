"use client";

import type { ReactNode } from "react";
import type { UnifiedListGroup } from "@/components/shell/unified-list";

/** Entity kinds that participate in folder grouping. The kind shows up in
 *  localStorage keys so collapse state is per-(kind, project). */
export type FolderEntityKind =
  | "experiments"
  | "gates"
  | "configs"
  | "killswitches"
  | "universes"
  | "metrics"
  | "events";

/** Build folder-keyed groups suitable for `tableGroups` / `railGroups` on
 *  the UnifiedList. Items with a null/empty folder go to a single root
 *  bucket labelled "No folder" and rendered last so user-named folders
 *  surface first. Returns `undefined` when grouping should be suppressed
 *  (e.g. while a search filter is active). */
export function buildFolderGroups<T>(opts: {
  items: T[];
  getFolder: (row: T) => string | null | undefined;
  /** When true, returns `undefined` so callers can fall back to flat
   *  rendering. */
  suppressed?: boolean;
}): UnifiedListGroup<T>[] | undefined {
  const { items, getFolder, suppressed } = opts;
  if (suppressed) return undefined;
  const byFolder = new Map<string, T[]>();
  for (const row of items) {
    const folder = (getFolder(row) ?? "").trim();
    const arr = byFolder.get(folder);
    if (arr) arr.push(row);
    else byFolder.set(folder, [row]);
  }
  const keys = [...byFolder.keys()].sort((a, b) => {
    if (a === "" && b !== "") return 1;
    if (b === "" && a !== "") return -1;
    return a.localeCompare(b);
  });
  return keys.map<UnifiedListGroup<T>>((k) => ({
    id: k === "" ? "__root__" : k,
    label: k === "" ? folderRootLabel() : k,
    items: byFolder.get(k)!,
  }));
}

/** Stable localStorage key for collapse state, keyed per (kind, project). */
export function folderGroupStorageKey(kind: FolderEntityKind, projectId: string): string {
  return `shipeasy.folders.${kind}.${projectId}`;
}

/** Label rendered for the synthetic root bucket. Exported so callers that
 *  hand-build groups (e.g. with secondary tabs) stay visually identical. */
export function folderRootLabel(): ReactNode {
  return <span className="italic dim-2">No folder</span>;
}
