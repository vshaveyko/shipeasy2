"use client";

import * as React from "react";
import { ChevronDownIcon, ChevronLeftIcon, ChevronRightIcon, XIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Table, TBody, TH, THead, TR, TD } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Kbd } from "@/components/ui/kbd";

export type UnifiedListColumn<T> = {
  key: string;
  label: React.ReactNode;
  render: (row: T) => React.ReactNode;
  className?: string;
  width?: number | string;
};

export type UnifiedListGroup<T> = {
  id: string;
  label: React.ReactNode;
  items: T[];
};

export type UnifiedListProps<T> = {
  items: T[];
  getId: (row: T) => string;
  columns: UnifiedListColumn<T>[];
  renderRail: (row: T, active: boolean) => React.ReactNode;
  renderDetail: (row: T) => React.ReactNode;
  selectedId?: string | null;
  onSelect: (id: string | null) => void;
  loading?: boolean;
  emptyState?: React.ReactNode;
  toolbar?: React.ReactNode;
  railGroups?: UnifiedListGroup<T>[];
  /** Optional folder-aware grouping for the full-table layer. When supplied
   *  (and the list pane is in full-table mode), rows are bucketed under
   *  collapsible folder header rows. Persistence of the collapsed set is
   *  controlled by `groupStorageKey`. */
  tableGroups?: UnifiedListGroup<T>[];
  groupStorageKey?: string;
  railHeader?: React.ReactNode;
  detailHeader?: (row: T) => React.ReactNode;
  className?: string;
  minHeight?: number | string;
};

export function UnifiedList<T>({
  items,
  getId,
  columns,
  renderRail,
  renderDetail,
  selectedId = null,
  onSelect,
  loading = false,
  emptyState,
  toolbar,
  railGroups,
  tableGroups,
  groupStorageKey,
  railHeader,
  detailHeader,
  className,
  minHeight,
}: UnifiedListProps<T>) {
  const open = selectedId != null;
  const selected = React.useMemo(
    () => (open ? (items.find((row) => getId(row) === selectedId) ?? null) : null),
    [items, getId, selectedId, open],
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

  const groups: UnifiedListGroup<T>[] = railGroups ?? [{ id: "all", label: "All", items }];

  // Folder-aware collapse state for the full-table layer. Persisted per
  // (entity-kind, project) via `groupStorageKey`. Default = all expanded.
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
      // ignore parse errors — fall back to all expanded
    }
  }, [groupStorageKey]);
  const toggleCollapse = React.useCallback(
    (id: string) => {
      setCollapsed((prev) => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        if (groupStorageKey) {
          try {
            localStorage.setItem(groupStorageKey, JSON.stringify({ collapsed: [...next] }));
          } catch {
            // ignore quota errors — collapse state is best-effort
          }
        }
        return next;
      });
    },
    [groupStorageKey],
  );

  return (
    <section
      data-slot="unified-list"
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
          <div className="min-h-0 flex-1 overflow-auto">
            {loading ? (
              <UnifiedListSkeleton columns={columns} />
            ) : items.length === 0 ? (
              (emptyState ?? (
                <div className="dim flex h-full items-center justify-center text-[13px]">
                  No records yet.
                </div>
              ))
            ) : (
              <Table>
                <THead>
                  <tr>
                    {columns.map((c) => (
                      <TH
                        key={c.key}
                        className={cn(c.className)}
                        style={c.width ? { width: c.width } : undefined}
                      >
                        {c.label}
                      </TH>
                    ))}
                  </tr>
                </THead>
                <TBody>
                  {tableGroups && tableGroups.length > 0
                    ? tableGroups.map((g) => {
                        const isCollapsed = collapsed.has(g.id);
                        return (
                          <React.Fragment key={g.id}>
                            <tr
                              data-folder-header
                              className="cursor-pointer bg-[var(--se-bg-2)] text-[var(--se-fg-2)] outline-none hover:bg-[var(--se-bg-3)]"
                              onClick={() => toggleCollapse(g.id)}
                            >
                              <td
                                colSpan={columns.length}
                                className="px-3 py-1.5 text-[12px] font-medium"
                              >
                                <span className="inline-flex items-center gap-1.5">
                                  {isCollapsed ? (
                                    <ChevronRightIcon className="size-3.5 text-[var(--se-fg-3)]" />
                                  ) : (
                                    <ChevronDownIcon className="size-3.5 text-[var(--se-fg-3)]" />
                                  )}
                                  <span>{g.label}</span>
                                  <span className="t-mono-xs dim-2 ml-1 rounded bg-[var(--se-bg-3)] px-1.5 py-0.5">
                                    {g.items.length}
                                  </span>
                                </span>
                              </td>
                            </tr>
                            {!isCollapsed &&
                              g.items.map((row) => {
                                const id = getId(row);
                                return (
                                  <TR key={id} interactive onClick={() => onSelect(id)}>
                                    {columns.map((c) => (
                                      <TD key={c.key} className={c.className}>
                                        {c.render(row)}
                                      </TD>
                                    ))}
                                  </TR>
                                );
                              })}
                          </React.Fragment>
                        );
                      })
                    : items.map((row) => {
                        const id = getId(row);
                        return (
                          <TR key={id} interactive onClick={() => onSelect(id)}>
                            {columns.map((c) => (
                              <TD key={c.key} className={c.className}>
                                {c.render(row)}
                              </TD>
                            ))}
                          </TR>
                        );
                      })}
                </TBody>
              </Table>
            )}
          </div>
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
              {items.length}
            </span>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">
            {groups.map((g) => (
              <React.Fragment key={g.id}>
                {groups.length > 1 ? (
                  <div className="t-caps dim-2 px-3.5 pb-1 pt-2.5">{g.label}</div>
                ) : null}
                {g.items.map((row) => {
                  const id = getId(row);
                  const active = id === selectedId;
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => onSelect(id)}
                      data-active={active ? "true" : undefined}
                      className={cn(
                        "flex w-full items-center gap-2 px-3.5 py-2 text-left text-[13px] outline-none transition-colors",
                        "hover:bg-[var(--se-bg-2)] focus-visible:bg-[var(--se-bg-2)]",
                        active &&
                          "bg-[color-mix(in_oklab,var(--se-accent)_7%,var(--se-bg-2))] [box-shadow:inset_2px_0_0_var(--se-accent)]",
                      )}
                    >
                      {renderRail(row, active)}
                    </button>
                  );
                })}
              </React.Fragment>
            ))}
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
        {open && selected ? (
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
                <div className="min-w-0 flex-1">{detailHeader(selected)}</div>
              </div>
            ) : null}
            <div className="min-h-0 flex-1 overflow-y-auto">{renderDetail(selected)}</div>
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

function UnifiedListSkeleton<T>({ columns }: { columns: UnifiedListColumn<T>[] }) {
  return (
    <Table>
      <THead>
        <tr>
          {columns.map((c) => (
            <TH key={c.key} className={c.className}>
              {c.label}
            </TH>
          ))}
        </tr>
      </THead>
      <TBody>
        {Array.from({ length: 8 }).map((_, i) => (
          <TR key={i}>
            {columns.map((c) => (
              <TD key={c.key} className={c.className}>
                <Skeleton className="h-4 w-[60%]" />
              </TD>
            ))}
          </TR>
        ))}
      </TBody>
    </Table>
  );
}
