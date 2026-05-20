"use client";

import * as React from "react";
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
  type VisibilityState,
} from "@tanstack/react-table";
import {
  ArrowDownIcon,
  ArrowUpDownIcon,
  ArrowUpIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  Columns3Icon,
  Loader2Icon,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Table, TBody, TH, THead, TR, TD } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  buildFlatRenderList,
  buildFolderRenderList,
  FOLDER_ROOT_ID,
  folderIdOf,
  type FolderRenderItem,
} from "./folder-rows";

/* ────────────────────────────────────────────────────────────────────────────
 * Public API
 * ──────────────────────────────────────────────────────────────────────────── */

export type DataTableColumn<TRow> = {
  /** Stable id — used for visibility state, sorting state, persistence. */
  id: string;
  /** Header cell content. */
  header: React.ReactNode;
  /** Body cell renderer. */
  cell: (row: TRow) => React.ReactNode;
  /** Fixed pixel width for the column. */
  width?: number | string;
  /** Extra classes applied to <th> and <td>. */
  className?: string;
  /** Allow the user to hide this column via the column-visibility menu.
   *  Defaults to `true`. Set `false` for fixed columns like row actions. */
  canHide?: boolean;
  /** Render the column hidden by default (user can still re-enable). */
  defaultHidden?: boolean;
  /** Label rendered in the visibility menu. Falls back to `header`. */
  visibilityLabel?: React.ReactNode;
  /** When provided, the column becomes sortable. Return a primitive
   *  (string/number/boolean/Date) to sort by. */
  sortAccessor?: (row: TRow) => unknown;
};

export type DataTableProps<TRow> = {
  rows: TRow[];
  getRowId: (row: TRow) => string;
  columns: DataTableColumn<TRow>[];

  loading?: boolean;
  emptyState?: React.ReactNode;

  /* Folder grouping ----------------------------------------------------- */
  getFolder?: (row: TRow) => string | null | undefined;
  /** Suppress folder grouping (e.g. while a filter is active). */
  groupingDisabled?: boolean;
  /** localStorage key for the collapsed folder set. Omit for in-memory only. */
  groupStorageKey?: string;
  folderRootLabel?: React.ReactNode;

  /* Sort ---------------------------------------------------------------- */
  /** Initial sorting state when uncontrolled. Ignored if `sorting` is passed. */
  initialSort?: SortingState;
  /** Controlled sorting state. Pair with `onSortingChange` to sync to URL or
   *  any external store. When omitted, sort is internal-state-only. */
  sorting?: SortingState;
  onSortingChange?: (next: SortingState) => void;

  /* Column visibility --------------------------------------------------- */
  /** localStorage key persisting column visibility per (entity, project). */
  columnVisibilityStorageKey?: string;

  /* Infinite scroll ----------------------------------------------------- */
  hasMore?: boolean;
  loadingMore?: boolean;
  onLoadMore?: () => void;

  /* Row selection (single, drives Master detail) ------------------------ */
  selectedId?: string | null;
  onSelectRow?: (id: string | null) => void;

  /* Compact rail mode --------------------------------------------------- */
  /** When true, render a single-column list using `renderCompactRow`.
   *  Folder grouping still applies. Used by DataTableMaster to render the
   *  left rail when a detail pane is open. */
  compact?: boolean;
  renderCompactRow?: (row: TRow, active: boolean) => React.ReactNode;

  className?: string;
};

/* ────────────────────────────────────────────────────────────────────────────
 * Implementation
 * ──────────────────────────────────────────────────────────────────────────── */

export function DataTable<TRow>(props: DataTableProps<TRow>) {
  const {
    rows,
    getRowId,
    columns,
    loading = false,
    emptyState,
    getFolder,
    groupingDisabled = false,
    groupStorageKey,
    folderRootLabel,
    initialSort,
    sorting: controlledSorting,
    onSortingChange,
    columnVisibilityStorageKey,
    hasMore = false,
    loadingMore = false,
    onLoadMore,
    selectedId,
    onSelectRow,
    compact = false,
    renderCompactRow,
    className,
  } = props;

  /* Persisted folder collapse state ------------------------------------- */
  const [collapsed, setCollapsed] = React.useState<Set<string>>(() => new Set());
  React.useEffect(() => {
    if (!groupStorageKey) return;
    try {
      const raw = localStorage.getItem(groupStorageKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed?.collapsed)) {
          setCollapsed(new Set(parsed.collapsed.filter((s: unknown) => typeof s === "string")));
        }
      }
    } catch {
      /* ignore — fall back to all-expanded */
    }
  }, [groupStorageKey]);
  const toggleCollapse = React.useCallback(
    (folderId: string) => {
      setCollapsed((prev) => {
        const next = new Set(prev);
        if (next.has(folderId)) next.delete(folderId);
        else next.add(folderId);
        if (groupStorageKey) {
          try {
            localStorage.setItem(groupStorageKey, JSON.stringify({ collapsed: [...next] }));
          } catch {
            /* quota errors are best-effort */
          }
        }
        return next;
      });
    },
    [groupStorageKey],
  );

  /* TanStack table instance --------------------------------------------- */
  const tanstackColumns = React.useMemo<ColumnDef<TRow>[]>(
    () => columns.map((c) => columnToDef(c)),
    [columns],
  );

  // Sorting: controlled when `controlledSorting` is supplied, otherwise local.
  const [internalSorting, setInternalSorting] = React.useState<SortingState>(initialSort ?? []);
  const sorting = controlledSorting ?? internalSorting;
  const handleSortingChange = React.useCallback(
    (updater: SortingState | ((prev: SortingState) => SortingState)) => {
      const next = typeof updater === "function" ? updater(sorting) : updater;
      if (controlledSorting !== undefined) {
        onSortingChange?.(next);
      } else {
        setInternalSorting(next);
        onSortingChange?.(next);
      }
    },
    [controlledSorting, onSortingChange, sorting],
  );
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>(() =>
    initialVisibilityFromColumns(columns),
  );

  // Load persisted visibility (once, on mount).
  React.useEffect(() => {
    if (!columnVisibilityStorageKey) return;
    try {
      const raw = localStorage.getItem(columnVisibilityStorageKey);
      if (raw) {
        const parsed = JSON.parse(raw) as VisibilityState;
        if (parsed && typeof parsed === "object") setColumnVisibility(parsed);
      }
    } catch {
      /* ignore */
    }
  }, [columnVisibilityStorageKey]);

  // Persist visibility on change.
  React.useEffect(() => {
    if (!columnVisibilityStorageKey) return;
    try {
      localStorage.setItem(columnVisibilityStorageKey, JSON.stringify(columnVisibility));
    } catch {
      /* ignore */
    }
  }, [columnVisibilityStorageKey, columnVisibility]);

  const table = useReactTable<TRow>({
    data: rows,
    columns: tanstackColumns,
    state: { sorting, columnVisibility },
    onSortingChange: handleSortingChange,
    onColumnVisibilityChange: setColumnVisibility,
    getRowId: (row) => getRowId(row),
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    enableSortingRemoval: true,
  });

  /* Flat render list (rows interleaved with folder header markers) ------ */
  const sortedRowModel = table.getSortedRowModel();
  const sortedRows = React.useMemo(
    () => sortedRowModel.rows.map((r) => r.original),
    [sortedRowModel],
  );

  const renderList = React.useMemo<FolderRenderItem<TRow>[]>(() => {
    if (!groupingDisabled && getFolder != null) {
      return buildFolderRenderList<TRow>({
        rows: sortedRows,
        getRowId,
        getFolder,
        collapsed,
        rootLabel: folderRootLabel,
      });
    }
    return buildFlatRenderList<TRow>({ rows: sortedRows, getRowId });
  }, [groupingDisabled, getFolder, sortedRows, getRowId, collapsed, folderRootLabel]);

  /* Infinite-scroll sentinel -------------------------------------------- */
  const sentinelRef = React.useRef<HTMLDivElement | null>(null);
  React.useEffect(() => {
    if (!hasMore || !onLoadMore) return;
    const el = sentinelRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            onLoadMore();
            break;
          }
        }
      },
      { rootMargin: "200px 0px 0px 0px" },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [hasMore, onLoadMore]);

  /* Render -------------------------------------------------------------- */
  const visibleLeafColumns = table.getVisibleLeafColumns();
  const colCount = visibleLeafColumns.length;
  const hideableColumns = columns.filter((c) => c.canHide !== false);

  if (loading && rows.length === 0) {
    return <DataTableSkeleton columns={columns} compact={compact} className={className} />;
  }

  if (!loading && rows.length === 0) {
    return (
      <div className={cn("flex h-full min-h-[200px] items-center justify-center", className)}>
        {emptyState ?? <div className="dim text-[13px]">No records yet.</div>}
      </div>
    );
  }

  /* Compact rail variant: single-column list ---------------------------- */
  if (compact) {
    return (
      <div data-slot="data-table" className={cn("flex h-full flex-col", className)}>
        {renderList.map((item) =>
          item.kind === "header" ? (
            <FolderHeaderRailRow
              key={item.id}
              item={item}
              onToggle={() => toggleCollapse(item.folderId)}
            />
          ) : (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectRow?.(item.id)}
              data-active={item.id === selectedId ? "true" : undefined}
              data-nested={item.folderId !== FOLDER_ROOT_ID ? "true" : undefined}
              className={cn(
                "flex w-full items-center gap-2 py-2 pr-3.5 text-left text-[13px] outline-none transition-colors",
                "hover:bg-[var(--se-bg-2)] focus-visible:bg-[var(--se-bg-2)]",
                item.folderId !== FOLDER_ROOT_ID ? "pl-7" : "pl-3.5",
                item.id === selectedId &&
                  "bg-[color-mix(in_oklab,var(--se-accent)_7%,var(--se-bg-2))] [box-shadow:inset_2px_0_0_var(--se-accent)]",
              )}
            >
              {renderCompactRow?.(item.row, item.id === selectedId)}
            </button>
          ),
        )}
        {hasMore ? (
          <div
            ref={sentinelRef}
            className="flex items-center justify-center px-3 py-2 text-[12px] text-[var(--se-fg-3)]"
          >
            {loadingMore ? <Loader2Icon className="size-3.5 animate-spin" /> : null}
          </div>
        ) : null}
      </div>
    );
  }

  /* Full table variant -------------------------------------------------- */
  return (
    <div data-slot="data-table" className={cn("flex h-full flex-col overflow-hidden", className)}>
      <div className="min-h-0 flex-1 overflow-auto">
        <Table>
          <THead>
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id}>
                {hg.headers.map((h) => {
                  const col = columns.find((c) => c.id === h.column.id);
                  const sortable = h.column.getCanSort();
                  const sortDir = h.column.getIsSorted();
                  return (
                    <TH
                      key={h.id}
                      className={col?.className}
                      style={col?.width ? { width: col.width } : undefined}
                    >
                      {sortable ? (
                        <button
                          type="button"
                          onClick={h.column.getToggleSortingHandler()}
                          className="-mx-1 inline-flex items-center gap-1 rounded px-1 py-0.5 outline-none hover:bg-[var(--se-bg-2)] focus-visible:bg-[var(--se-bg-2)]"
                        >
                          {flexRender(h.column.columnDef.header, h.getContext())}
                          {sortDir === "asc" ? (
                            <ArrowUpIcon className="size-3 text-[var(--se-fg-2)]" />
                          ) : sortDir === "desc" ? (
                            <ArrowDownIcon className="size-3 text-[var(--se-fg-2)]" />
                          ) : (
                            <ArrowUpDownIcon className="size-3 text-[var(--se-fg-4)]" />
                          )}
                        </button>
                      ) : (
                        flexRender(h.column.columnDef.header, h.getContext())
                      )}
                    </TH>
                  );
                })}
                {hideableColumns.length > 0 ? (
                  <TH
                    aria-label="Toggle columns"
                    className="w-[34px] text-right"
                    style={{ width: 34 }}
                  >
                    <ColumnVisibilityMenu
                      columns={columns}
                      visibility={columnVisibility}
                      onChange={setColumnVisibility}
                    />
                  </TH>
                ) : null}
              </tr>
            ))}
          </THead>
          <TBody>
            {renderList.map((item) => {
              if (item.kind === "header") {
                return (
                  <FolderHeaderTableRow
                    key={item.id}
                    item={item}
                    colSpan={colCount + (hideableColumns.length > 0 ? 1 : 0)}
                    onToggle={() => toggleCollapse(item.folderId)}
                  />
                );
              }
              const isActive = selectedId != null && item.id === selectedId;
              const nested = item.folderId !== FOLDER_ROOT_ID;
              return (
                <TR
                  key={item.id}
                  interactive
                  active={isActive}
                  data-nested={nested ? "true" : undefined}
                  onClick={() => onSelectRow?.(item.id)}
                >
                  {visibleLeafColumns.map((leaf, idx) => {
                    const col = columns.find((c) => c.id === leaf.id);
                    const isFirst = idx === 0;
                    return (
                      <TD key={leaf.id} className={cn(col?.className, isFirst && nested && "pl-8")}>
                        {col ? col.cell(item.row) : null}
                      </TD>
                    );
                  })}
                  {hideableColumns.length > 0 ? <TD aria-hidden /> : null}
                </TR>
              );
            })}
          </TBody>
        </Table>
        {hasMore ? (
          <div
            ref={sentinelRef}
            className="flex items-center justify-center border-t border-[var(--se-line)] px-3 py-3 text-[12px] text-[var(--se-fg-3)]"
          >
            {loadingMore ? (
              <>
                <Loader2Icon className="mr-1.5 size-3.5 animate-spin" />
                <span>Loading more…</span>
              </>
            ) : (
              <span className="dim-2">Scroll for more</span>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
 * Sub-components
 * ──────────────────────────────────────────────────────────────────────────── */

function FolderHeaderTableRow<TRow>({
  item,
  colSpan,
  onToggle,
}: {
  item: Extract<FolderRenderItem<TRow>, { kind: "header" }>;
  colSpan: number;
  onToggle: () => void;
}) {
  return (
    <tr
      data-folder-header
      className="cursor-pointer bg-[var(--se-bg-2)] text-[var(--se-fg-2)] outline-none hover:bg-[var(--se-bg-3)]"
      onClick={onToggle}
    >
      <td colSpan={colSpan} className="px-3 py-1.5 text-[12px] font-medium">
        <span className="inline-flex items-center gap-1.5">
          {item.collapsed ? (
            <ChevronRightIcon className="size-3.5 text-[var(--se-fg-3)]" />
          ) : (
            <ChevronDownIcon className="size-3.5 text-[var(--se-fg-3)]" />
          )}
          <span>
            {item.folderId === FOLDER_ROOT_ID ? (
              <em className="not-italic dim-2">No folder</em>
            ) : (
              item.label
            )}
          </span>
          <span className="t-mono-xs dim-2 ml-1 rounded bg-[var(--se-bg-3)] px-1.5 py-0.5">
            {item.count}
          </span>
        </span>
      </td>
    </tr>
  );
}

function FolderHeaderRailRow<TRow>({
  item,
  onToggle,
}: {
  item: Extract<FolderRenderItem<TRow>, { kind: "header" }>;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      data-folder-header
      onClick={onToggle}
      className="flex w-full items-center gap-1.5 bg-[var(--se-bg-2)] px-3.5 py-1.5 text-left text-[12px] font-medium text-[var(--se-fg-2)] outline-none hover:bg-[var(--se-bg-3)]"
    >
      {item.collapsed ? (
        <ChevronRightIcon className="size-3.5 text-[var(--se-fg-3)]" />
      ) : (
        <ChevronDownIcon className="size-3.5 text-[var(--se-fg-3)]" />
      )}
      <span className="truncate">
        {item.folderId === FOLDER_ROOT_ID ? (
          <em className="not-italic dim-2">No folder</em>
        ) : (
          item.label
        )}
      </span>
      <span className="t-mono-xs dim-2 ml-auto rounded bg-[var(--se-bg-3)] px-1.5 py-0.5">
        {item.count}
      </span>
    </button>
  );
}

function ColumnVisibilityMenu<TRow>({
  columns,
  visibility,
  onChange,
}: {
  columns: DataTableColumn<TRow>[];
  visibility: VisibilityState;
  onChange: React.Dispatch<React.SetStateAction<VisibilityState>>;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Toggle columns"
        className="inline-flex size-6 items-center justify-center rounded text-[var(--se-fg-3)] hover:bg-[var(--se-bg-3)] hover:text-[var(--se-fg-1)]"
        onClick={(e) => e.stopPropagation()}
      >
        <Columns3Icon className="size-3.5" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Columns</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {columns
            .filter((c) => c.canHide !== false)
            .map((c) => {
              // Visibility is true unless explicitly set false.
              const visible = visibility[c.id] !== false;
              return (
                <DropdownMenuCheckboxItem
                  key={c.id}
                  checked={visible}
                  onCheckedChange={(checked) =>
                    onChange((prev) => ({ ...prev, [c.id]: Boolean(checked) }))
                  }
                  onSelect={(e) => e.preventDefault()}
                >
                  {c.visibilityLabel ?? c.header}
                </DropdownMenuCheckboxItem>
              );
            })}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function DataTableSkeleton<TRow>({
  columns,
  compact,
  className,
}: {
  columns: DataTableColumn<TRow>[];
  compact: boolean;
  className?: string;
}) {
  if (compact) {
    return (
      <div className={cn("flex flex-col gap-2 p-3", className)}>
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-7 w-full" />
        ))}
      </div>
    );
  }
  return (
    <div className={cn("min-h-0 flex-1 overflow-auto", className)}>
      <Table>
        <THead>
          <tr>
            {columns.map((c) => (
              <TH
                key={c.id}
                className={c.className}
                style={c.width ? { width: c.width } : undefined}
              >
                {c.header}
              </TH>
            ))}
          </tr>
        </THead>
        <TBody>
          {Array.from({ length: 8 }).map((_, i) => (
            <TR key={i}>
              {columns.map((c) => (
                <TD key={c.id} className={c.className}>
                  <Skeleton className="h-4 w-[60%]" />
                </TD>
              ))}
            </TR>
          ))}
        </TBody>
      </Table>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
 * Helpers
 * ──────────────────────────────────────────────────────────────────────────── */

function columnToDef<TRow>(c: DataTableColumn<TRow>): ColumnDef<TRow> {
  const baseCell = ({ row }: { row: { original: TRow } }) => c.cell(row.original);
  if (c.sortAccessor) {
    return {
      id: c.id,
      accessorFn: (row) => c.sortAccessor!(row),
      header: () => c.header,
      cell: baseCell as ColumnDef<TRow>["cell"],
      enableSorting: true,
      enableHiding: c.canHide !== false,
      size: typeof c.width === "number" ? c.width : undefined,
    };
  }
  return {
    id: c.id,
    header: () => c.header,
    cell: baseCell as ColumnDef<TRow>["cell"],
    enableSorting: false,
    enableHiding: c.canHide !== false,
    size: typeof c.width === "number" ? c.width : undefined,
  };
}

function initialVisibilityFromColumns<TRow>(columns: DataTableColumn<TRow>[]): VisibilityState {
  const out: VisibilityState = {};
  for (const c of columns) {
    if (c.defaultHidden) out[c.id] = false;
  }
  return out;
}

/* Re-exports kept for ergonomic imports from consumers. */
export { folderIdOf, FOLDER_ROOT_ID };
