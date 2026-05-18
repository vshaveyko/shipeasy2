"use client";

import { useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Activity, ArrowRight, BookOpen, Plus, Search, Zap } from "lucide-react";

import { projectIdFromPathname } from "@/lib/project-path";
import { Page, PageBody, PageHeader } from "@/components/dashboard/page";
import { HeroEmptyState } from "@/components/dashboard/hero-empty-state";
import { Button } from "@/components/ui/button";
import { NumericDelta } from "@/components/ui/numeric-delta";
import { Sparkline } from "@/components/ui/sparkline";
import { StatusBadge } from "@/components/ui/status-badge";
import { UnifiedList, type UnifiedListColumn } from "@/components/shell/unified-list";

import { customEvents, type CustomEvent } from "./mock-data";
import { MetricsDashboard } from "./dashboard";
import { EmbeddedEventDetail } from "./embedded-event-detail";
import { NewMetricWizard } from "./new-metric-wizard";

type View = "empty" | "list" | "dashboard";

export function MetricsContent({ initialView = "empty" }: { initialView?: View }) {
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

  const [filter, setFilter] = useState("");

  function setParam(updates: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [k, v] of Object.entries(updates)) {
      if (v === null) params.delete(k);
      else params.set(k, v);
    }
    const qs = params.toString();
    router.replace(`${pathname}${qs ? `?${qs}` : ""}`, { scroll: false });
  }

  const setOpen = (name: string | null) => setParam({ open: name });
  const setSetupOpen = (open: boolean) => setParam({ setup: open ? "1" : null });
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
      <Page>
        <PageBody>
          <HeroEmptyState
            kind="metrics"
            extraAction={
              <>
                <Button variant="ghost" size="sm" onClick={() => setView("list")}>
                  Skip to demo data <ArrowRight className="size-3" />
                </Button>
                <Button size="sm" onClick={() => setSetupOpen(true)}>
                  <Zap className="size-3.5" /> Start in 60 seconds
                </Button>
              </>
            }
          />
        </PageBody>
        {wizard}
      </Page>
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
  const filtered = filter
    ? events.filter((e) => e.name.toLowerCase().includes(filter.toLowerCase()))
    : events;

  return (
    <Page>
      <PageHeader
        kicker={`${total} custom event${total === 1 ? "" : "s"} · ${conversions} conversions · auto vitals on`}
        title="Metrics"
        description="Custom events you've registered with log(). Auto-collected web vitals + errors stream in parallel — open any event to see its SDK call and trend."
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
      />
      <PageBody>
        <UnifiedList<CustomEvent>
          items={filtered}
          getId={(e) => e.name}
          columns={listColumns()}
          selectedId={openName}
          onSelect={setOpen}
          railHeader="Events"
          toolbar={
            <>
              <div className="t-caps dim text-[12px]">All events</div>
              <div className="ml-auto flex h-8 w-[220px] items-center gap-2 rounded-[var(--radius-md)] border border-[var(--se-line-2)] bg-[var(--se-bg-2)] px-2.5 text-[13px]">
                <Search className="size-3 text-[var(--se-fg-3)]" />
                <input
                  placeholder="Filter events"
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-[var(--se-fg-4)]"
                  aria-label="Filter events"
                />
              </div>
            </>
          }
          renderRail={(ev, active) => <RailRow event={ev} active={active} />}
          detailHeader={(ev) => (
            <div className="flex min-w-0 items-center gap-2">
              <Activity className="size-3.5 shrink-0" style={{ color: "var(--se-accent)" }} />
              <span className="truncate font-mono text-[13px] text-[var(--se-fg)]">{ev.name}</span>
            </div>
          )}
          renderDetail={(ev) => <EmbeddedEventDetail event={ev} />}
        />
      </PageBody>
      {wizard}
    </Page>
  );
}

const TONE_BY_KIND: Record<CustomEvent["kind"], "live" | "completed" | "killed" | "neutral"> = {
  conversion: "live",
  funnel: "completed",
  error: "killed",
  event: "neutral",
};

function listColumns(): UnifiedListColumn<CustomEvent>[] {
  return [
    {
      key: "name",
      label: "Event",
      render: (e) => (
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
      key: "kind",
      label: "Type",
      width: 120,
      render: (e) => <StatusBadge tone={TONE_BY_KIND[e.kind]}>{e.kind.toUpperCase()}</StatusBadge>,
    },
    {
      key: "volume",
      label: "Volume · 24h",
      width: 120,
      render: (e) => (
        <span
          className="font-mono text-[12.5px] text-[var(--se-fg)]"
          style={{ fontVariantNumeric: "tabular-nums" }}
        >
          {e.volume}
        </span>
      ),
    },
    {
      key: "vsprev",
      label: "vs prev",
      width: 110,
      render: (e) => <NumericDelta value={Number(e.vsPrev.toFixed(1))} />,
    },
    {
      key: "trend",
      label: "Trend",
      width: 120,
      render: (e) => (
        <Sparkline
          points={e.spark}
          width={96}
          height={22}
          intent={e.vsPrev >= 0 ? "accent" : "danger"}
        />
      ),
    },
    {
      key: "persession",
      label: "Per session",
      width: 100,
      render: (e) => (
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
