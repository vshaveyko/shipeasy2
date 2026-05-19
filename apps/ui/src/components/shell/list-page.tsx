"use client";

import { Search } from "lucide-react";
import type { ReactNode } from "react";

import { Page, PageBody, PageHeader } from "@/components/dashboard/page";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UnifiedList, type UnifiedListProps } from "@/components/shell/unified-list";

type StatTrioItem = {
  label: ReactNode;
  value: ReactNode;
  tone?: "accent" | "warn" | "danger" | "info" | "purple" | "muted";
};

export type ListPageTab<K extends string> = {
  key: K;
  label: ReactNode;
  count?: number;
};

export type ListPageProps<T, K extends string = string> = {
  /** PageHeader slots. */
  title: string;
  description?: string;
  kicker?: ReactNode;
  stats?: StatTrioItem[];
  actions?: ReactNode;
  /** Optional Tabs strip rendered left-aligned in the UnifiedList toolbar. */
  tabs?: readonly ListPageTab<K>[];
  tab?: K;
  onTabChange?: (next: K) => void;
  /** Optional controlled filter input rendered right-aligned in the toolbar. */
  filter?: string;
  onFilterChange?: (next: string) => void;
  filterPlaceholder?: string;
  filterAriaLabel?: string;
  /** Extra slot appended after tabs / before the filter input. */
  toolbarExtra?: ReactNode;
  /** Content rendered above the UnifiedList (e.g. a Banner). */
  banner?: ReactNode;
  /** Forwarded to UnifiedList. */
  list: Omit<UnifiedListProps<T>, "toolbar">;
};

/**
 * Shared shell for every list-style admin route (gates, killswitches, configs,
 * metrics, experiments). Wraps `Page` + `PageHeader` (with right-aligned stat
 * trio) + a UnifiedList whose toolbar combines a Tabs strip on the left and a
 * filter input on the right — the same shape the experiments page already
 * uses. Per-feature pages stay in charge of state (open record, current tab,
 * filter text), counts, and row rendering; this component only owns layout.
 */
export function ListPage<T, K extends string = string>({
  title,
  description,
  kicker,
  stats,
  actions,
  tabs,
  tab,
  onTabChange,
  filter,
  onFilterChange,
  filterPlaceholder,
  filterAriaLabel,
  toolbarExtra,
  banner,
  list,
}: ListPageProps<T, K>) {
  const hasTabs = tabs && tabs.length > 0;
  const hasFilter = onFilterChange !== undefined;

  const toolbar =
    hasTabs || hasFilter || toolbarExtra ? (
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
        {toolbarExtra}
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
    ) : undefined;

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
        <UnifiedList<T> {...list} toolbar={toolbar} />
      </PageBody>
    </Page>
  );
}
