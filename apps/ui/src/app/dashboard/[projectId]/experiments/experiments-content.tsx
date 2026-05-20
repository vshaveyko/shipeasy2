"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import useSWR from "swr";
import { FlaskConical, Play, Plus, Square, Trash2 } from "lucide-react";
import type { SortingState } from "@tanstack/react-table";

import { projectIdFromPathname } from "@/lib/project-path";

import { HeroEmptyState } from "@/components/dashboard/hero-empty-state";
import {
  DataListPage,
  buildListToolbar,
  type DataListPageTab,
} from "@/components/shell/data-list-page";
import { Button } from "@/components/ui/button";
import { LinkButton } from "@/components/ui/link-button";
import { ActionForm } from "@/components/ui/action-form";
import { IntegrationSnippetButton } from "@/components/integration";
import { StatusBadge } from "@/components/ui/status-badge";
import { Sparkline } from "@/components/ui/sparkline";
import {
  DataTableMaster,
  useCursorPages,
  useSearchParamMutator,
  parseSortParam,
  formatSortParam,
  type DataTableColumn,
} from "@/components/data-table";
import { folderGroupStorageKey } from "@/lib/folder-groups";
import { deleteExperimentAction, setExperimentStatusAction } from "./actions";
import { NewExperimentWizard } from "./new-experiment-wizard";
import { EmbeddedExperimentSummary } from "./embedded-experiment-summary";

export interface ExperimentRow {
  id: string;
  name: string;
  universe?: string | null;
  allocationPct: number;
  groups: unknown;
  status: string;
  startedAt?: string | null;
  description?: string | null;
  folder?: string | null;
  updatedAt?: string | null;
  goalMetric?: { id: string; name: string } | null;
  guardrailCount?: number;
  guardrails?: { id: string; name: string }[];
  primaryLiftPct?: number | null;
  significancePct?: number | null;
  sampleSize?: number | null;
  trendPct?: number[];
}

type StatusKey = "running" | "draft" | "stopped" | "archived";
type TabKey = "all" | StatusKey;

const TAB_LABELS: Record<TabKey, string> = {
  all: "All",
  running: "Running",
  draft: "Draft",
  stopped: "Stopped",
  archived: "Archived",
};

const STATUS_TONE: Record<string, "live" | "draft" | "paused" | "completed" | "neutral"> = {
  running: "live",
  draft: "draft",
  stopped: "paused",
  archived: "completed",
};

const STATUS_ORDER: Record<string, number> = {
  running: 0,
  draft: 1,
  stopped: 2,
  archived: 3,
};

function variantCount(groups: unknown): number {
  return Array.isArray(groups) ? groups.length : 0;
}

function formatSample(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}

function trafficPct(allocationPct: number): number {
  return allocationPct >= 10000 ? 100 : Math.round((allocationPct ?? 0) / 100);
}

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  return iso.slice(0, 10);
}

function isTabKey(value: string | null): value is TabKey {
  return value === "running" || value === "draft" || value === "stopped" || value === "archived";
}

export function ExperimentsContent() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const setParams = useSearchParamMutator();
  const projectId = projectIdFromPathname(pathname) ?? "";
  const openId = searchParams.get("open");
  const [newOpen, setNewOpen] = useState(searchParams.get("new") === "1");

  /* URL-synced UI state */
  const filter = searchParams.get("q") ?? "";
  const setFilter = (next: string) => setParams({ q: next || null });
  const tabParam = searchParams.get("tab");
  const tab: TabKey = isTabKey(tabParam) ? tabParam : "all";
  const setTab = (next: TabKey) => setParams({ tab: next === "all" ? null : next });
  const sorting = parseSortParam(searchParams.get("sort"));
  const setSorting = (next: SortingState) => setParams({ sort: formatSortParam(next) });

  const {
    rows: experiments,
    isLoading,
    isLoadingMore,
    hasMore,
    loadMore,
    mutate,
  } = useCursorPages<ExperimentRow>({ baseUrl: "/api/admin/experiments" });

  // Counts come from the backend (single GROUP BY) — never iterate rows on
  // the client to derive totals. Falls back to zeros during the initial
  // SWR cycle.
  const { data: countsData } = useSWR<Record<TabKey, number>>(
    "/api/admin/experiments/counts",
    async (url: string) => {
      const res = await fetch(url, { credentials: "same-origin" });
      if (!res.ok) throw new Error(`${url} → HTTP ${res.status}`);
      return res.json();
    },
    { dedupingInterval: 0 },
  );
  const counts: Record<TabKey, number> = {
    all: countsData?.all ?? 0,
    running: countsData?.running ?? 0,
    draft: countsData?.draft ?? 0,
    stopped: countsData?.stopped ?? 0,
    archived: countsData?.archived ?? 0,
  };

  const visible = useMemo(() => {
    const q = filter.trim().toLowerCase();
    return experiments.filter((exp) => {
      if (tab !== "all" && exp.status !== tab) return false;
      if (!q) return true;
      return (
        exp.name.toLowerCase().includes(q) ||
        (exp.folder ?? "").toLowerCase().includes(q) ||
        (exp.universe ?? "").toLowerCase().includes(q)
      );
    });
  }, [experiments, tab, filter]);

  const handleSelect = useCallback((id: string | null) => setParams({ open: id }), [setParams]);

  const openWizard = useCallback(() => setNewOpen(true), []);
  const closeWizard = useCallback(() => setNewOpen(false), []);

  // Auto-select "all" tab when openId belongs to a non-matching tab
  useEffect(() => {
    if (!openId) return;
    const row = experiments.find((e) => e.id === openId);
    if (row && tab !== "all" && row.status !== tab) {
      setParams({ tab: null });
    }
  }, [openId, experiments, tab, setParams]);

  const columns: DataTableColumn<ExperimentRow>[] = useMemo(
    () => [
      {
        id: "name",
        header: "Experiment",
        canHide: false,
        sortAccessor: (exp) => exp.name.toLowerCase(),
        cell: (exp) => (
          <div className="flex min-w-0 items-center gap-2.5">
            <span
              className="grid size-7 shrink-0 place-items-center rounded-md border border-[var(--se-line-2)]"
              style={{
                background: exp.status === "running" ? "var(--se-accent-soft)" : "var(--se-bg-3)",
                color: exp.status === "running" ? "var(--se-accent)" : "var(--se-fg-3)",
              }}
            >
              <FlaskConical className="size-3.5" />
            </span>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="truncate font-mono text-[13px] font-medium">{exp.name}</span>
              </div>
              <div className="t-mono-xs dim-2 mt-0.5 truncate">
                {exp.description ?? `universe · ${exp.universe ?? "default"}`}
              </div>
            </div>
          </div>
        ),
      },
      {
        id: "status",
        header: "Status",
        width: 110,
        sortAccessor: (exp) => STATUS_ORDER[exp.status] ?? 99,
        cell: (exp) => (
          <StatusBadge tone={STATUS_TONE[exp.status] ?? "neutral"}>
            {exp.status.toUpperCase()}
          </StatusBadge>
        ),
      },
      {
        id: "traffic",
        header: <span className="text-right block">Traffic</span>,
        width: 90,
        className: "text-right",
        sortAccessor: (exp) => exp.allocationPct ?? 0,
        cell: (exp) => (
          <span
            className="font-mono text-[12px] text-[var(--se-fg-2)]"
            style={{ fontVariantNumeric: "tabular-nums" }}
          >
            {trafficPct(exp.allocationPct)}%
          </span>
        ),
      },
      {
        id: "goal",
        header: "Goal",
        width: 200,
        sortAccessor: (exp) => exp.goalMetric?.name ?? "",
        cell: (exp) =>
          exp.goalMetric ? (
            <div className="flex min-w-0 flex-col">
              <span className="truncate font-mono text-[12px] text-[var(--se-fg-2)]">
                {exp.goalMetric.name}
              </span>
              {exp.guardrailCount ? (
                <span className="t-mono-xs dim-2">
                  +{exp.guardrailCount} guardrail{exp.guardrailCount === 1 ? "" : "s"}
                </span>
              ) : null}
            </div>
          ) : (
            <span className="t-mono-xs dim-2">—</span>
          ),
      },
      {
        id: "primaryLift",
        header: <span className="text-right block">Primary lift</span>,
        width: 110,
        className: "text-right",
        sortAccessor: (exp) => exp.primaryLiftPct ?? Number.NEGATIVE_INFINITY,
        cell: (exp) => {
          const v = exp.primaryLiftPct;
          if (v == null) return <span className="t-mono-xs dim-2">—</span>;
          const tone = v > 0 ? "var(--se-accent)" : v < 0 ? "var(--se-danger)" : "var(--se-fg-2)";
          return (
            <span
              className="font-mono text-[12px]"
              style={{ color: tone, fontVariantNumeric: "tabular-nums" }}
            >
              {v > 0 ? "+" : ""}
              {v.toFixed(1)}%
            </span>
          );
        },
      },
      {
        id: "trend",
        header: "Trend",
        width: 140,
        cell: (exp) =>
          exp.trendPct && exp.trendPct.length > 1 ? (
            <Sparkline
              points={exp.trendPct}
              width={120}
              height={22}
              intent={(exp.primaryLiftPct ?? 0) >= 0 ? "accent" : "danger"}
            />
          ) : (
            <span className="t-mono-xs dim-2">—</span>
          ),
      },
      {
        id: "sig",
        header: <span className="text-right block">Sig.</span>,
        width: 80,
        className: "text-right",
        sortAccessor: (exp) => exp.significancePct ?? -1,
        cell: (exp) =>
          exp.significancePct != null ? (
            <span
              className="font-mono text-[12px] text-[var(--se-fg-2)]"
              style={{ fontVariantNumeric: "tabular-nums" }}
            >
              {exp.significancePct.toFixed(1)}%
            </span>
          ) : (
            <span className="t-mono-xs dim-2">—</span>
          ),
      },
      {
        id: "sample",
        header: <span className="text-right block">Sample</span>,
        width: 90,
        className: "text-right",
        sortAccessor: (exp) => exp.sampleSize ?? -1,
        cell: (exp) =>
          exp.sampleSize != null ? (
            <span
              className="font-mono text-[12px] text-[var(--se-fg-2)]"
              style={{ fontVariantNumeric: "tabular-nums" }}
            >
              {formatSample(exp.sampleSize)}
            </span>
          ) : (
            <span className="t-mono-xs dim-2">—</span>
          ),
      },
      {
        id: "variants",
        header: <span className="text-right block">Variants</span>,
        width: 90,
        className: "text-right",
        sortAccessor: (exp) => variantCount(exp.groups),
        cell: (exp) => (
          <span
            className="font-mono text-[12px] text-[var(--se-fg-2)]"
            style={{ fontVariantNumeric: "tabular-nums" }}
          >
            {variantCount(exp.groups)}
          </span>
        ),
      },
      {
        id: "updated",
        header: <span className="text-right block">Updated</span>,
        width: 110,
        className: "text-right",
        sortAccessor: (exp) => exp.updatedAt ?? exp.startedAt ?? "",
        cell: (exp) => (
          <span className="t-mono-xs dim-2">{fmtDate(exp.updatedAt ?? exp.startedAt ?? null)}</span>
        ),
      },
      {
        id: "snippet",
        header: "",
        width: 40,
        canHide: false,
        cell: (exp) => (
          <span onClick={(e) => e.stopPropagation()}>
            <IntegrationSnippetButton kind="experiment" name={exp.name} stopPropagation />
          </span>
        ),
      },
      {
        id: "actions",
        header: "",
        width: 60,
        canHide: false,
        className: "text-right",
        cell: (exp) => (
          <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
            {exp.status === "draft" ? (
              <ActionForm
                action={setExperimentStatusAction}
                loading="Starting experiment…"
                success="Experiment started"
                onSuccess={() => mutate()}
              >
                <input type="hidden" name="id" value={exp.id} />
                <input type="hidden" name="status" value="running" />
                <Button size="sm" variant="ghost" type="submit" aria-label="Start experiment">
                  <Play className="size-3" />
                </Button>
              </ActionForm>
            ) : null}
            {exp.status === "running" ? (
              <ActionForm
                action={setExperimentStatusAction}
                loading="Stopping experiment…"
                success="Experiment stopped"
                onSuccess={() => mutate()}
              >
                <input type="hidden" name="id" value={exp.id} />
                <input type="hidden" name="status" value="stopped" />
                <Button size="sm" variant="ghost" type="submit" aria-label="Stop experiment">
                  <Square className="size-3" />
                </Button>
              </ActionForm>
            ) : null}
            {exp.status !== "running" && exp.status !== "archived" ? (
              <ActionForm
                action={deleteExperimentAction}
                loading="Deleting experiment…"
                success="Experiment deleted"
                onSuccess={() => mutate()}
              >
                <input type="hidden" name="id" value={exp.id} />
                <Button
                  size="sm"
                  variant="ghost"
                  type="submit"
                  aria-label="Delete experiment"
                  className="text-[var(--se-fg-3)] hover:bg-[var(--se-danger-soft)] hover:text-[var(--se-danger)]"
                >
                  <Trash2 className="size-3" />
                </Button>
              </ActionForm>
            ) : null}
          </div>
        ),
      },
    ],
    [mutate],
  );

  const headerActions = (
    <div className="flex items-center gap-2">
      <LinkButton size="sm" variant="ghost" href={`/dashboard/${projectId}/experiments/new`}>
        Advanced wizard
      </LinkButton>
      <Button size="sm" onClick={openWizard}>
        <Plus className="size-3" />
        New experiment
      </Button>
    </div>
  );

  // Empty state — gate on !isLoading so the hero copy doesn't flash before
  // the first cursor page resolves.
  if (!isLoading && experiments.length === 0) {
    return (
      <>
        <HeroEmptyState
          kind="experiments"
          extraAction={
            <div className="flex items-center gap-2">
              <Button onClick={openWizard} className="h-10 px-4 text-[14px]">
                <Plus className="size-3.5" />
                New experiment
              </Button>
              <LinkButton
                variant="ghost"
                href={`/dashboard/${projectId}/experiments/new`}
                className="h-10 px-4 text-[14px]"
              >
                Advanced wizard
              </LinkButton>
            </div>
          }
        />
        <NewExperimentWizard
          open={newOpen}
          onOpenChange={(v) => (v ? openWizard() : closeWizard())}
          projectId={projectId}
          onCreated={() => {
            void mutate();
            closeWizard();
          }}
        />
      </>
    );
  }

  const tabs: readonly DataListPageTab<TabKey>[] = (Object.keys(TAB_LABELS) as TabKey[]).map(
    (k) => ({
      key: k,
      label: TAB_LABELS[k],
      count: counts[k],
    }),
  );

  const toolbar = buildListToolbar<TabKey>({
    tabs,
    tab,
    onTabChange: setTab,
    filter,
    onFilterChange: setFilter,
    filterPlaceholder: "Filter by name, folder, or universe",
    filterAriaLabel: "Filter experiments",
  });

  return (
    <>
      <DataListPage
        title="Experiments"
        description="Feature tests with auto-collected metrics, traffic allocation, and significance calculated continuously."
        stats={[
          {
            label: "Running",
            value: counts.running,
            tone: counts.running > 0 ? "accent" : "muted",
          },
          { label: "Drafts", value: counts.draft, tone: counts.draft > 0 ? "warn" : "muted" },
          { label: "Total", value: counts.all },
        ]}
        actions={headerActions}
      >
        <DataTableMaster<ExperimentRow>
          rows={visible}
          getRowId={(row) => row.id}
          columns={columns}
          loading={isLoading}
          getFolder={(e) => e.folder}
          groupingDisabled={filter.trim() !== ""}
          groupStorageKey={folderGroupStorageKey("experiments", projectId)}
          columnVisibilityStorageKey={`shipeasy.columns.experiments.${projectId}`}
          sorting={sorting}
          onSortingChange={setSorting}
          hasMore={hasMore}
          loadingMore={isLoadingMore}
          onLoadMore={loadMore}
          selectedId={openId}
          onSelect={handleSelect}
          toolbar={toolbar}
          railHeader="Experiments"
          railCount={counts.all}
          renderCompactRow={(exp) => (
            <span className="flex w-full min-w-0 items-center gap-2">
              <FlaskConical className="size-3 shrink-0 text-[var(--se-fg-3)]" />
              <span className="min-w-0 flex-1 truncate font-mono text-[12.5px]">{exp.name}</span>
              <span className="t-mono-xs dim-2 shrink-0">
                {trafficPct(exp.allocationPct)}% · {variantCount(exp.groups)}v
              </span>
              <span
                aria-hidden
                className="size-1.5 shrink-0 rounded-full"
                style={{
                  background:
                    exp.status === "running"
                      ? "var(--se-accent)"
                      : exp.status === "stopped"
                        ? "var(--se-warn)"
                        : "var(--se-fg-4)",
                }}
              />
            </span>
          )}
          renderDetail={(exp) => (
            <EmbeddedExperimentSummary
              experiment={exp}
              projectId={projectId}
              onDeleted={() => {
                void mutate();
                handleSelect(null);
              }}
              onMutated={() => void mutate()}
            />
          )}
          detailHeader={(exp) => (
            <div className="flex min-w-0 items-center gap-3">
              <span className="truncate font-mono text-[13px] font-medium">{exp.name}</span>
              <StatusBadge tone={STATUS_TONE[exp.status] ?? "neutral"}>
                {exp.status.toUpperCase()}
              </StatusBadge>
              <div className="ml-auto flex items-center gap-1">
                <IntegrationSnippetButton kind="experiment" name={exp.name} stopPropagation />
                <LinkButton
                  size="sm"
                  variant="ghost"
                  href={`/dashboard/${projectId}/experiments/${exp.id}`}
                  data-testid="experiment-detail-standalone-link"
                >
                  Open full view
                </LinkButton>
                <ActionForm
                  action={deleteExperimentAction}
                  loading="Deleting experiment…"
                  success="Experiment deleted"
                  onSuccess={() => {
                    void mutate();
                    handleSelect(null);
                  }}
                >
                  <input type="hidden" name="id" value={exp.id} />
                  <Button
                    size="sm"
                    variant="ghost"
                    type="submit"
                    aria-label="Delete experiment"
                    className="text-[var(--se-fg-3)] hover:bg-[var(--se-danger-soft)] hover:text-[var(--se-danger)]"
                    disabled={exp.status === "running" || exp.status === "archived"}
                  >
                    <Trash2 className="size-3" />
                  </Button>
                </ActionForm>
              </div>
            </div>
          )}
          emptyState={
            <div className="dim flex h-full items-center justify-center px-5 py-12 text-center text-[13px]">
              No experiments match this filter.
            </div>
          }
        />
      </DataListPage>

      <NewExperimentWizard
        open={newOpen}
        onOpenChange={(v) => (v ? openWizard() : closeWizard())}
        projectId={projectId}
        onCreated={() => {
          void mutate();
          closeWizard();
        }}
      />
    </>
  );
}
