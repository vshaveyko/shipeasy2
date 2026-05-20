"use client";

import * as React from "react";
import { ChevronLeftIcon, XIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Kbd } from "@/components/ui/kbd";
import { DataTable, type DataTableProps } from "./data-table";

export type DataTableMasterProps<TRow> = Omit<
  DataTableProps<TRow>,
  "compact" | "selectedId" | "onSelectRow"
> & {
  /** Currently selected row id (drives the detail pane). Pass `null` to
   *  show only the table. */
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  /** Compact renderer used in the left rail when a row is selected. */
  renderCompactRow: (row: TRow, active: boolean) => React.ReactNode;
  /** Detail body shown on the right when `selectedId` resolves to a row. */
  renderDetail: (row: TRow) => React.ReactNode;
  /** Optional header strip rendered above the detail body. */
  detailHeader?: (row: TRow) => React.ReactNode;
  /** Optional toolbar rendered above the table when no row is open. The
   *  outer ListPage usually owns this; passing it again here is only useful
   *  when DataTableMaster is used outside of ListPage. */
  toolbar?: React.ReactNode;
  /** Header strip rendered above the left rail (e.g. "Gates · 42"). */
  railHeader?: React.ReactNode;
  /** Total record count displayed in the rail header. Falls back to
   *  `props.rows.length` when omitted. */
  railCount?: number;
  minHeight?: number | string;
  className?: string;
};

/**
 * Two-pane shell built on top of {@link DataTable}. Mirrors the rail+detail
 * UX of the legacy `UnifiedList`: in the closed state the DataTable fills
 * the section; when a row is selected the table collapses to a 280px left
 * rail (compact renderer) and a detail pane slides in on the right.
 */
export function DataTableMaster<TRow>(props: DataTableMasterProps<TRow>) {
  const {
    selectedId,
    onSelect,
    renderCompactRow,
    renderDetail,
    detailHeader,
    toolbar,
    railHeader,
    railCount,
    minHeight,
    className,
    rows,
    getRowId,
    ...tableProps
  } = props;

  const open = selectedId != null;
  const selectedRow = React.useMemo(
    () => (open ? (rows.find((r) => getRowId(r) === selectedId) ?? null) : null),
    [rows, getRowId, selectedId, open],
  );

  React.useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.stopPropagation();
        onSelect(null);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onSelect]);

  const recordCount = railCount ?? rows.length;

  return (
    <section
      data-slot="data-table-master"
      data-open={open ? "true" : "false"}
      className={cn(
        "relative flex w-full min-h-0 flex-1 overflow-hidden rounded-[var(--radius-lg)] border border-[var(--se-line)] bg-[var(--se-bg-1)]",
        className,
      )}
      style={{
        minHeight: typeof minHeight === "number" ? `${minHeight}px` : minHeight,
        transition: "flex var(--dur-fold) var(--ease-fold)",
      }}
    >
      {/* List pane: full table OR collapsed rail */}
      <div
        data-slot="list-pane"
        className={cn(
          "relative flex flex-col overflow-hidden",
          open
            ? "w-[280px] min-w-[280px] max-w-[280px] border-r border-[var(--se-line)]"
            : "flex-1",
        )}
        style={{
          transition:
            "width var(--dur-fold) var(--ease-fold), min-width var(--dur-fold) var(--ease-fold), max-width var(--dur-fold) var(--ease-fold)",
        }}
      >
        {/* Full-table layer */}
        <div
          data-slot="pane-full"
          className={cn(
            "absolute inset-0 flex flex-col transition-opacity duration-200",
            open ? "pointer-events-none opacity-0" : "opacity-100",
          )}
        >
          {toolbar ? (
            <div className="flex shrink-0 items-center gap-2 border-b border-[var(--se-line)] px-3 py-2">
              {toolbar}
            </div>
          ) : null}
          <DataTable<TRow>
            {...tableProps}
            rows={rows}
            getRowId={getRowId}
            selectedId={null}
            onSelectRow={onSelect}
            compact={false}
            renderCompactRow={renderCompactRow}
          />
        </div>

        {/* Rail layer */}
        <div
          data-slot="pane-rail"
          className={cn(
            "absolute inset-0 flex flex-col transition-opacity duration-200",
            open ? "opacity-100 delay-[140ms]" : "pointer-events-none opacity-0",
          )}
        >
          <div className="flex h-[42px] shrink-0 items-center justify-between border-b border-[var(--se-line)] px-3.5">
            <div className="t-caps dim min-w-0 flex-1 truncate">{railHeader ?? "Records"}</div>
            <span className="t-mono-xs dim-2 rounded bg-[var(--se-bg-3)] px-1.5 py-0.5">
              {recordCount}
            </span>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">
            <DataTable<TRow>
              {...tableProps}
              rows={rows}
              getRowId={getRowId}
              selectedId={selectedId}
              onSelectRow={onSelect}
              compact
              renderCompactRow={renderCompactRow}
            />
          </div>
        </div>
      </div>

      {/* Detail pane */}
      <div
        data-slot="detail-pane"
        className={cn(
          "relative flex min-w-0 flex-col overflow-hidden",
          open ? "flex-1 opacity-100" : "pointer-events-none w-0 flex-none opacity-0",
        )}
        style={{
          transform: open ? "none" : "translateX(24px)",
          transition:
            "opacity 260ms 160ms ease-out, transform 260ms 160ms cubic-bezier(.2,.7,.2,1), width var(--dur-fold) var(--ease-fold)",
        }}
      >
        {open && selectedRow ? (
          <>
            {detailHeader ? (
              <div className="flex items-center gap-2 border-b border-[var(--se-line)] px-4 py-2.5">
                <button
                  type="button"
                  onClick={() => onSelect(null)}
                  className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[12px] text-[var(--se-fg-2)] outline-none transition-colors hover:bg-[var(--se-bg-2)] hover:text-[var(--se-fg)] focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
                  aria-label="Show full table"
                >
                  <ChevronLeftIcon className="size-3.5" />
                  Show full table
                </button>
                <div className="min-w-0 flex-1">{detailHeader(selectedRow)}</div>
              </div>
            ) : null}
            <div className="min-h-0 flex-1 overflow-y-auto">{renderDetail(selectedRow)}</div>
            <button
              type="button"
              onClick={() => onSelect(null)}
              aria-label="Close (Esc)"
              className="group absolute right-3 top-3 z-10 grid size-7 place-items-center rounded-full border border-[var(--se-line-2)] bg-[var(--se-bg-2)] text-[var(--se-fg-3)] outline-none transition-colors hover:bg-[var(--se-bg-3)] hover:text-[var(--se-fg)] focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
            >
              <XIcon className="size-3.5" />
              <span className="pointer-events-none absolute right-[calc(100%+8px)] top-1/2 -translate-y-1/2 whitespace-nowrap opacity-0 transition-opacity group-hover:opacity-100">
                <Kbd>Esc</Kbd>
              </span>
            </button>
          </>
        ) : null}
      </div>
    </section>
  );
}
