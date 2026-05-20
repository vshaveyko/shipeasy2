"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Activity, ArrowRight, BookOpen, Plus, Zap } from "lucide-react";
import type { SortingState } from "@tanstack/react-table";

import { projectIdFromPathname } from "@/lib/project-path";
import { Page, PageBody, PageHeader } from "@/components/dashboard/page";
import { HeroEmptyState } from "@/components/dashboard/hero-empty-state";
import { Button } from "@/components/ui/button";
import { NumericDelta } from "@/components/ui/numeric-delta";
import { Sparkline } from "@/components/ui/sparkline";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  DataListPage,
  buildListToolbar,
  type DataListPageTab,
} from "@/components/shell/data-list-page";
import {
  DataTableMaster,
  parseSortParam,
  formatSortParam,
  type DataTableColumn,
} from "@/components/data-table";
import { folderGroupStorageKey } from "@/lib/folder-groups";

import { customEvents, type CustomEvent } from "./mock-data";
import { MetricsDashboard } from "./dashboard";
import { EmbeddedEventDetail } from "./embedded-event-detail";
import { NewMetricWizard } from "./new-metric-wizard";
import { RegisteredMetricsSection, type RegisteredMetric } from "./registered-metrics-section";

type View = "empty" | "list" | "dashboard";

type MetricsTabKey = "all" | "conversion" | "funnel" | "event" | "error";

const METRICS_TABS: readonly { key: MetricsTabKey; label: string }[] = [
  { key: "all", label: "All" },
  { key: "conversion", label: "Conversion" },
  { key: "funnel", label: "Funnel" },
  { key: "event", label: "Event" },
  { key: "error", label: "Error" },
] as const;

function isMetricsTab(value: string | null): value is MetricsTabKey {
  return value === "conversion" || value === "funnel" || value === "event" || value === "error";
}

export function MetricsContent({
  initialView = "empty",
  registered = [],
}: {
  initialView?: View;
  registered?: RegisteredMetric[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const projectId = projectIdFromPathname(pathname) ?? "";

  const setupOpen = searchParams.get("setup") === "1";
  const openName = searchParams.get("open");
  const viewParam = searchParams.get("view");
  const demoActive = searchParams.get("demo") === "1";

  const view: View =
    viewParam === "dashboard"
      ? "dashboard"
      : viewParam === "list" || demoActive || initialView !== "empty"
        ? "list"
        : "empty";

  /* URL-synced UI state */
  const filter = searchParams.get("q") ?? "";
  const tabParam = searchParams.get("tab");
  const tab: MetricsTabKey = isMetricsTab(tabParam) ? tabParam : "all";
  const sorting = parseSortParam(searchParams.get("sort"));

  function setParam(updates: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [k, v] of Object.entries(updates)) {
      if (v === null || v === "") params.delete(k);
      else params.set(k, v);
    }
    const qs = params.toString();
    router.replace(`${pathname}${qs ? `?${qs}` : ""}`, { scroll: false });
  }

  const setOpen = (name: string | null) => setParam({ open: name });
  const setSetupOpen = (open: boolean) => setParam({ setup: open ? "1" : null });
  const setFilter = (next: string) => setParam({ q: next || null });
  const setTab = (next: MetricsTabKey) => setParam({ tab: next === "all" ? null : next });
  const setSorting = (next: SortingState) => setParam({ sort: formatSortParam(next) });
  const setView = (v: View, opts?: { closeSetup?: boolean }) => {
    const setup: Record<string, string | null> = opts?.closeSetup ? { setup: null } : {};
    if (v === "empty") {
      setParam({ demo: null, view: null, open: null, ...setup });
      return;
    }
    setParam({
      demo: "1",
      view: v === "dashboard" ? "dashboard" : null,
      open: v === "list" ? searchParams.get("open") : null,
      ...setup,
    });
  };

  const wizard = (
    <NewMetricWizard
      open={setupOpen}
      onOpenChange={setSetupOpen}
      projectId={projectId}
      onComplete={() => setView("list", { closeSetup: true })}
    />
  );

  if (view === "empty") {
    return (
      <>
        <HeroEmptyState
          kind="metrics"
          extraAction={
            <>
              <Button variant="ghost" size="lg" onClick={() => setView("list")}>
                Skip to demo data <ArrowRight className="size-3" />
              </Button>
              <Button size="lg" onClick={() => setSetupOpen(true)}>
                <Zap className="size-3.5" /> Start in 60 seconds
              </Button>
            </>
          }
        />
        {wizard}
      </>
    );
  }

  if (view === "dashboard") {
    return (
      <Page>
        <PageHeader
          title="Metrics"
          description="Auto-collected web vitals plus the events you register with log()."
          actions={
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => setView("list")}>
                Show events list <ArrowRight className="size-3" />
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setSetupOpen(true)}>
                <BookOpen className="size-3" /> Setup guide
              </Button>
              <Button size="sm" onClick={() => setSetupOpen(true)}>
                <Plus className="size-3" /> Register event
              </Button>
            </div>
          }
        />
        <PageBody>
          <MetricsDashboard
            onOpenSetup={() => setSetupOpen(true)}
            onCreate={() => setSetupOpen(true)}
            onEditEvent={(e) => {
              setParam({ view: null, demo: "1", open: e.name });
            }}
          />
        </PageBody>
        {wizard}
      </Page>
    );
  }

  const events = customEvents;
  const total = events.length;
  const conversions = events.filter((e) => e.kind === "conversion").length;
  const tabCounts: Record<MetricsTabKey, number> = {
    all: total,
    conversion: conversions,
    funnel: events.filter((e) => e.kind === "funnel").length,
    event: events.filter((e) => e.kind === "event").length,
    error: events.filter((e) => e.kind === "error").length,
  };
  const metricsTabs: readonly DataListPageTab<MetricsTabKey>[] = METRICS_TABS.map((t) => ({
    ...t,
    count: tabCounts[t.key],
  }));
  const q = filter.trim().toLowerCase();
  const filtered = events.filter((e) => {
    if (tab !== "all" && e.kind !== tab) return false;
    if (q && !e.name.toLowerCase().includes(q)) return false;
    return true;
  });

  const toolbar = buildListToolbar<MetricsTabKey>({
    tabs: metricsTabs,
    tab,
    onTabChange: setTab,
    filter,
    onFilterChange: setFilter,
    filterPlaceholder: "Filter events",
    filterAriaLabel: "Filter events",
  });

  return (
    <>
      {registered.length > 0 ? (
        <div className="px-4 pt-4">
          <RegisteredMetricsSection
            projectId={projectId}
            metrics={registered}
            onCreate={() => setSetupOpen(true)}
          />
        </div>
      ) : null}
      <DataListPage
        title="Metrics"
        description={
          registered.length > 0
            ? "Aggregations registered via the wizard or CLI, plus the events they roll up over."
            : "Custom events you've registered with log(). Auto-collected web vitals + errors stream in parallel — open any event to see its SDK call and trend."
        }
        stats={[
          { label: "Events", value: total },
          { label: "Conversions", value: conversions, tone: conversions > 0 ? "accent" : "muted" },
          { label: "Auto vitals", value: "ON", tone: "info" },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => setView("dashboard")}>
              Show full dashboard
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setSetupOpen(true)}>
              <BookOpen className="size-3" /> Setup guide
            </Button>
            <Button size="sm" onClick={() => setSetupOpen(true)}>
              <Plus className="size-3" /> Register event
            </Button>
          </div>
        }
      >
        <DataTableMaster<CustomEvent>
          rows={filtered}
          getRowId={(e) => e.name}
          columns={listColumns()}
          getFolder={(e) => e.folder}
          groupingDisabled={q !== ""}
          groupStorageKey={folderGroupStorageKey("metrics", projectId)}
          columnVisibilityStorageKey={`shipeasy.columns.metrics.${projectId}`}
          sorting={sorting}
          onSortingChange={setSorting}
          selectedId={openName}
          onSelect={setOpen}
          toolbar={toolbar}
          railHeader="Events"
          railCount={total}
          renderCompactRow={(ev, active) => <RailRow event={ev} active={active} />}
          detailHeader={(ev) => (
            <div className="flex min-w-0 items-center gap-2">
              <Activity className="size-3.5 shrink-0" style={{ color: "var(--se-accent)" }} />
              <span className="truncate font-mono text-[13px] text-[var(--se-fg)]">{ev.name}</span>
            </div>
          )}
          renderDetail={(ev) => <EmbeddedEventDetail event={ev} />}
        />
      </DataListPage>
      {wizard}
    </>
  );
}

const TONE_BY_KIND: Record<CustomEvent["kind"], "live" | "completed" | "killed" | "neutral"> = {
  conversion: "live",
  funnel: "completed",
  error: "killed",
  event: "neutral",
};

function listColumns(): DataTableColumn<CustomEvent>[] {
  return [
    {
      id: "name",
      header: "Event",
      canHide: false,
      sortAccessor: (e) => e.name.toLowerCase(),
      cell: (e) => (
        <div className="flex min-w-0 items-center gap-2">
          <Activity className="size-3.5 shrink-0" style={{ color: "var(--se-accent)" }} />
          <div className="min-w-0">
            <div className="truncate font-mono text-[13px] font-medium text-[var(--se-fg)]">
              {e.name}
            </div>
            <div className="t-mono-xs dim-2 truncate">{e.props.slice(0, 3).join(" · ")}</div>
          </div>
        </div>
      ),
    },
    {
      id: "kind",
      header: "Type",
      width: 120,
      sortAccessor: (e) => e.kind,
      cell: (e) => <StatusBadge tone={TONE_BY_KIND[e.kind]}>{e.kind.toUpperCase()}</StatusBadge>,
    },
    {
      id: "volume",
      header: "Volume · 24h",
      width: 120,
      sortAccessor: (e) => e.volume,
      cell: (e) => (
        <span
          className="font-mono text-[12.5px] text-[var(--se-fg)]"
          style={{ fontVariantNumeric: "tabular-nums" }}
        >
          {e.volume}
        </span>
      ),
    },
    {
      id: "vsprev",
      header: "vs prev",
      width: 110,
      sortAccessor: (e) => e.vsPrev,
      cell: (e) => <NumericDelta value={Number(e.vsPrev.toFixed(1))} />,
    },
    {
      id: "trend",
      header: "Trend",
      width: 120,
      cell: (e) => (
        <Sparkline
          points={e.spark}
          width={96}
          height={22}
          intent={e.vsPrev >= 0 ? "accent" : "danger"}
        />
      ),
    },
    {
      id: "persession",
      header: "Per session",
      width: 100,
      sortAccessor: (e) => e.perSession,
      cell: (e) => (
        <span className="font-mono text-[11.5px] text-[var(--se-fg-3)]">{e.perSession}</span>
      ),
    },
  ];
}

function RailRow({ event, active }: { event: CustomEvent; active: boolean }) {
  return (
    <>
      <Activity className="size-3.5 shrink-0" style={{ color: "var(--se-accent)" }} />
      <div className="min-w-0 flex-1">
        <div className="truncate font-mono text-[12.5px] text-[var(--se-fg)]">{event.name}</div>
        <div className="t-mono-xs dim-2 truncate">
          {event.volume} · {event.perSession}/sess
        </div>
      </div>
      <span
        aria-hidden
        className="size-1.5 shrink-0 rounded-full"
        style={{
          background: event.vsPrev >= 0 ? "var(--se-accent)" : "var(--se-danger)",
          boxShadow: active
            ? "0 0 0 3px color-mix(in oklab, var(--se-accent) 25%, transparent)"
            : "none",
        }}
      />
    </>
  );
}
