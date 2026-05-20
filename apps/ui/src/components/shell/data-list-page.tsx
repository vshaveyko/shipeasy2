"use client";

import { Search } from "lucide-react";
import type { ReactNode } from "react";

import { Page, PageBody, PageHeader } from "@/components/dashboard/page";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

type StatTrioItem = {
  label: ReactNode;
  value: ReactNode;
  tone?: "accent" | "warn" | "danger" | "info" | "purple" | "muted";
};

export type DataListPageTab<K extends string> = {
  key: K;
  label: ReactNode;
  count?: number;
};

export type DataListPageProps = {
  /* PageHeader slots */
  title: string;
  description?: string;
  kicker?: ReactNode;
  stats?: StatTrioItem[];
  actions?: ReactNode;

  /* Banner (e.g. plan-limit warning) rendered above the table */
  banner?: ReactNode;

  /* Body: a DataTable / DataTableMaster (or any custom content). */
  children: ReactNode;
};

/**
 * Layout shell for routes that render a {@link DataTable} (or
 * {@link DataTableMaster}). Renders Page + PageHeader + optional banner +
 * the caller's body. The body's outer card (border, toolbar) is owned by
 * the table component, not this shell.
 */
export function DataListPage({
  title,
  description,
  kicker,
  stats,
  actions,
  banner,
  children,
}: DataListPageProps) {
  return (
    <Page>
      <PageHeader
        title={title}
        description={description}
        kicker={kicker}
        stats={stats}
        actions={actions}
      />
      <PageBody className="space-y-3">
        {banner}
        {children}
      </PageBody>
    </Page>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
 * Shared toolbar builder
 *
 * Builds the standard tabs-on-left / filter-on-right toolbar used by every
 * admin list. The toolbar JSX is meant to be passed as the `toolbar` prop on
 * DataTableMaster / DataTable.
 * ──────────────────────────────────────────────────────────────────────────── */

export type BuildListToolbarOptions<K extends string> = {
  tabs?: readonly DataListPageTab<K>[];
  tab?: K;
  onTabChange?: (next: K) => void;
  filter?: string;
  onFilterChange?: (next: string) => void;
  filterPlaceholder?: string;
  filterAriaLabel?: string;
  /** Slot inserted after tabs / before the filter input. */
  extra?: ReactNode;
};

export function buildListToolbar<K extends string>(opts: BuildListToolbarOptions<K>): ReactNode {
  const {
    tabs,
    tab,
    onTabChange,
    filter,
    onFilterChange,
    filterPlaceholder,
    filterAriaLabel,
    extra,
  } = opts;
  const hasTabs = tabs && tabs.length > 0;
  const hasFilter = onFilterChange !== undefined;
  if (!hasTabs && !hasFilter && !extra) return null;

  return (
    <>
      {hasTabs && tab !== undefined && onTabChange ? (
        <Tabs value={tab} onValueChange={(v) => onTabChange(v as K)}>
          <TabsList>
            {tabs.map((t) => (
              <TabsTrigger key={t.key} value={t.key}>
                {t.label}
                {typeof t.count === "number" ? (
                  <span className="ml-1 font-mono text-[10.5px] text-[var(--se-fg-4)]">
                    {t.count}
                  </span>
                ) : null}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      ) : null}
      {extra}
      {hasFilter ? (
        <div className="ml-auto flex h-7 w-[260px] items-center gap-2 rounded-[var(--radius-md)] border border-[var(--se-line-2)] bg-[var(--se-bg-2)] px-2.5 text-[13px]">
          <Search className="size-3 text-[var(--se-fg-3)]" />
          <input
            value={filter ?? ""}
            onChange={(e) => onFilterChange(e.target.value)}
            placeholder={filterPlaceholder}
            aria-label={filterAriaLabel ?? filterPlaceholder}
            className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-[var(--se-fg-4)]"
          />
        </div>
      ) : null}
    </>
  );
}
