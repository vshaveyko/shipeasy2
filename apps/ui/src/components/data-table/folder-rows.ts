import type { ReactNode } from "react";

/**
 * Render item produced by {@link buildFolderRenderList}. The table layer
 * consumes a single flat list so virtualization is straightforward: every
 * entry has a stable id and either renders a folder header row or a data
 * row.
 */
export type FolderRenderItem<TRow> =
  | {
      kind: "header";
      id: string;
      folderId: string;
      label: ReactNode;
      count: number;
      collapsed: boolean;
    }
  | { kind: "row"; id: string; folderId: string; row: TRow };

export type FolderRenderListOptions<TRow> = {
  rows: TRow[];
  getRowId: (row: TRow) => string;
  getFolder: (row: TRow) => string | null | undefined;
  collapsed: ReadonlySet<string>;
  /** Optional override for the "No folder" bucket label. */
  rootLabel?: ReactNode;
};

export const FOLDER_ROOT_ID = "__root__";

export function folderIdOf(rawFolder: string | null | undefined): string {
  const trimmed = (rawFolder ?? "").trim();
  return trimmed === "" ? FOLDER_ROOT_ID : trimmed;
}

export function buildFolderRenderList<TRow>(
  opts: FolderRenderListOptions<TRow>,
): FolderRenderItem<TRow>[] {
  const { rows, getRowId, getFolder, collapsed, rootLabel } = opts;
  const buckets = new Map<string, TRow[]>();
  for (const row of rows) {
    const id = folderIdOf(getFolder(row));
    const bucket = buckets.get(id);
    if (bucket) bucket.push(row);
    else buckets.set(id, [row]);
  }
  const folderIds = [...buckets.keys()].sort((a, b) => {
    if (a === FOLDER_ROOT_ID && b !== FOLDER_ROOT_ID) return 1;
    if (b === FOLDER_ROOT_ID && a !== FOLDER_ROOT_ID) return -1;
    return a.localeCompare(b);
  });

  const out: FolderRenderItem<TRow>[] = [];
  for (const folderId of folderIds) {
    const items = buckets.get(folderId)!;
    const isCollapsed = collapsed.has(folderId);
    out.push({
      kind: "header",
      id: `__folder__:${folderId}`,
      folderId,
      label: folderId === FOLDER_ROOT_ID ? (rootLabel ?? "No folder") : folderId,
      count: items.length,
      collapsed: isCollapsed,
    });
    if (!isCollapsed) {
      for (const row of items) {
        out.push({ kind: "row", id: getRowId(row), folderId, row });
      }
    }
  }
  return out;
}

/** Build a flat render list with no folder bucketing. */
export function buildFlatRenderList<TRow>(opts: {
  rows: TRow[];
  getRowId: (row: TRow) => string;
}): FolderRenderItem<TRow>[] {
  return opts.rows.map((row) => ({
    kind: "row" as const,
    id: opts.getRowId(row),
    folderId: FOLDER_ROOT_ID,
    row,
  }));
}
