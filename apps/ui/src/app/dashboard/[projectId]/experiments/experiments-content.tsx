"use client";

import { useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import useSWR from "swr";
import {
  ArrowRight,
  Code,
  Filter,
  FlaskConical,
  MoreHorizontal,
  Play,
  Plus,
  Search,
  Sparkles,
  Square,
} from "lucide-react";

import { projectIdFromPathname } from "@/lib/project-path";

import { HeroEmptyState } from "@/components/dashboard/hero-empty-state";
import { Page, PageBody, PageHeader } from "@/components/dashboard/page";
import { Button } from "@/components/ui/button";
import { LinkButton } from "@/components/ui/link-button";
import { ActionForm } from "@/components/ui/action-form";
import { IntegrationSnippetButton } from "@/components/integration";
import { cn } from "@/lib/utils";
import { deleteExperimentAction, setExperimentStatusAction } from "./actions";

interface ExperimentRow {
  id: string;
  name: string;
  universe?: string | null;
  allocationPct: number;
  groups: unknown;
  status: string;
  startedAt?: string | null;
  description?: string | null;
  tag?: string | null;
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

const STATUS_BADGE: Record<string, string> = {
  running: "se-badge se-badge-live",
  draft: "se-badge",
  stopped: "se-badge se-badge-paused",
  archived: "se-badge se-badge-completed",
};

const STATUS_ICON_COLOR: Record<string, string> = {
  running: "var(--se-accent)",
  draft: "var(--se-fg-3)",
  stopped: "var(--se-warn)",
  archived: "var(--se-fg-3)",
};

const fetcher = async (url: string): Promise<ExperimentRow[]> => {
  const res = await fetch(url, { credentials: "same-origin" });
  if (!res.ok) throw new Error(`${url} → HTTP ${res.status}`);
  const body = (await res.json()) as ExperimentRow[] | { data: ExperimentRow[] };
  return Array.isArray(body) ? body : (body.data ?? []);
};

export function ExperimentsContent() {
  const pathname = usePathname();
  const projectId = projectIdFromPathname(pathname) ?? "";
  const { data, isLoading, mutate } = useSWR<ExperimentRow[]>("/api/admin/experiments", fetcher, {
    dedupingInterval: 0,
  });
  const experiments = useMemo(() => data ?? [], [data]);

  const [tab, setTab] = useState<TabKey>("all");
  const [filter, setFilter] = useState("");

  const counts = useMemo(() => {
    const c: Record<TabKey, number> = {
      all: experiments.length,
      running: 0,
      draft: 0,
      stopped: 0,
      archived: 0,
    };
    for (const exp of experiments) {
      if (exp.status in c) c[exp.status as StatusKey]++;
    }
    return c;
  }, [experiments]);

  const visible = useMemo(() => {
    const q = filter.trim().toLowerCase();
    return experiments.filter((exp) => {
      if (tab !== "all" && exp.status !== tab) return false;
      if (!q) return true;
      return (
        exp.name.toLowerCase().includes(q) ||
        (exp.tag ?? "").toLowerCase().includes(q) ||
        (exp.universe ?? "").toLowerCase().includes(q)
      );
    });
  }, [experiments, tab, filter]);

  if (isLoading) {
    return (
      <Page>
        <PageHeader
          title="Experiments"
          description="Run A/B tests on metrics with guardrails. Results compute daily once an experiment starts."
        />
        <PageBody>
          <div className="text-muted-foreground text-sm">Loading…</div>
        </PageBody>
      </Page>
    );
  }

  if (experiments.length === 0) {
    return (
      <Page>
        <PageHeader
          title="Experiments"
          description="Run A/B tests on metrics with guardrails. Results compute daily once an experiment starts."
          actions={
            <LinkButton size="sm" href={`/dashboard/${projectId}/experiments/new`}>
              <Plus className="size-3" />
              New experiment
            </LinkButton>
          }
        />
        <PageBody>
          <HeroEmptyState kind="experiments" />
        </PageBody>
      </Page>
    );
  }

  return (
    <Page>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="t-caps dim-2 mb-2">
            {counts.running} running · {experiments.length} total
            {counts.archived > 0 ? ` · ${counts.archived} archived` : ""}
          </div>
          <h1 className="text-[24px] font-medium tracking-tight">Experiments</h1>
          <p className="mt-1 max-w-[60ch] text-[13.5px] text-muted-foreground">
            Feature tests with auto-collected metrics, traffic allocation, and significance
            calculated continuously.
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <HeaderStat label="Running" value={counts.running} />
          <div className="h-9 w-px bg-[var(--se-line)]" />
          <HeaderStat
            label="Drafts"
            value={counts.draft}
            valueColor={counts.draft > 0 ? "var(--se-fg-2)" : undefined}
          />
          <div className="h-9 w-px bg-[var(--se-line)]" />
          <HeaderStat
            label="Stopped"
            value={counts.stopped}
            valueColor={counts.stopped > 0 ? "var(--se-warn)" : undefined}
          />
          <div className="ml-2 flex items-center gap-2">
            <Button size="sm" variant="secondary" disabled title="Coming soon">
              <Sparkles className="size-3" />
              Ask Claude
            </Button>
            <LinkButton size="sm" href={`/dashboard/${projectId}/experiments/new`}>
              <Plus className="size-3" />
              New experiment
            </LinkButton>
          </div>
        </div>
      </div>

      <PageBody className="space-y-4">
        {/* Tabs */}
        <div
          role="tablist"
          aria-label="Experiment status filter"
          className="flex items-center gap-0 border-b border-[var(--se-line)]"
        >
          {(Object.keys(TAB_LABELS) as TabKey[]).map((k) => (
            <button
              key={k}
              role="tab"
              aria-selected={tab === k}
              type="button"
              onClick={() => setTab(k)}
              className={cn(
                "relative -mb-px flex items-center gap-1.5 px-3.5 py-2.5 text-[13px] transition-colors",
                "border-b-[1.5px] border-transparent",
                tab === k
                  ? "border-[var(--se-accent)] text-foreground"
                  : "text-[var(--se-fg-3)] hover:text-[var(--se-fg-2)]",
              )}
            >
              {TAB_LABELS[k]}
              <span
                className="font-mono text-[10.5px]"
                style={{ color: tab === k ? "var(--se-fg-3)" : "var(--se-fg-4)" }}
              >
                {counts[k]}
              </span>
            </button>
          ))}
        </div>

        {/* Filter row */}
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-[260px] items-center gap-2 rounded-[var(--radius-md)] border border-[var(--se-line-2)] bg-[var(--se-bg-2)] px-2.5 text-[13px]">
            <Search className="size-3 text-[var(--se-fg-3)]" />
            <input
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Filter by name, tag, or universe"
              className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-[var(--se-fg-4)]"
            />
          </div>
          <Button size="sm" variant="ghost" disabled title="Coming soon">
            <Filter className="size-3" />
            Owner
          </Button>
          <Button size="sm" variant="ghost" disabled title="Coming soon">
            <Filter className="size-3" />
            Tag
          </Button>
          <div className="ml-auto flex items-center gap-2">
            <Button size="sm" variant="ghost" disabled title="Coming soon">
              Sort: Recent
            </Button>
            <Button size="sm" variant="secondary" disabled title="Coming soon">
              <Code className="size-3" />
              Export
            </Button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--se-line)] bg-[var(--se-bg-1)]">
          <div
            className="grid items-center gap-3 border-b border-[var(--se-line)] px-5 py-2"
            style={{
              gridTemplateColumns: "28px minmax(0,1fr) 110px 90px 110px 130px 90px 90px 60px 80px",
              background: "var(--se-bg-2)",
            }}
          >
            <span />
            <span className="t-caps dim-3">Experiment</span>
            <span className="t-caps dim-3">Status</span>
            <span className="t-caps dim-3 text-right">Traffic</span>
            <span className="t-caps dim-3 text-right">Primary lift</span>
            <span className="t-caps dim-3">Trend</span>
            <span className="t-caps dim-3 text-right">Sig.</span>
            <span className="t-caps dim-3 text-right">Sample</span>
            <span />
            <span />
          </div>

          {visible.length === 0 ? (
            <div className="px-5 py-12 text-center text-[13px] text-[var(--se-fg-3)]">
              No experiments match this filter.
            </div>
          ) : (
            visible.map((exp) => {
              const variantCount = Array.isArray(exp.groups) ? exp.groups.length : 0;
              const trafficPct =
                exp.allocationPct >= 10000 ? 100 : Math.round((exp.allocationPct ?? 0) / 100);
              return (
                <div
                  key={exp.id}
                  className="group/row grid items-center gap-3 border-b border-[var(--se-line)] px-5 py-3 last:border-none hover:bg-[var(--se-bg-2)]"
                  style={{
                    gridTemplateColumns:
                      "28px minmax(0,1fr) 110px 90px 110px 130px 90px 90px 60px 80px",
                  }}
                >
                  <div
                    className="grid size-7 place-items-center rounded-md"
                    style={{
                      background:
                        exp.status === "running" ? "var(--se-accent-soft)" : "var(--se-bg-3)",
                      color: STATUS_ICON_COLOR[exp.status] ?? "var(--se-fg-3)",
                      border: "1px solid var(--se-line-2)",
                    }}
                  >
                    <FlaskConical className="size-3" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <a
                        href={`/dashboard/${projectId}/experiments/${exp.id}`}
                        className="block truncate font-mono text-[13px] font-medium hover:underline"
                      >
                        {exp.name}
                      </a>
                      {exp.tag ? (
                        <span className="rounded-full border border-[var(--se-line-2)] bg-[var(--se-bg-3)] px-1.5 py-px font-mono text-[10px] uppercase tracking-wide text-[var(--se-fg-3)]">
                          {exp.tag}
                        </span>
                      ) : null}
                    </div>
                    <div className="t-mono-xs dim-2 mt-0.5 truncate">
                      {exp.description ?? `universe · ${exp.universe ?? "default"}`}
                      {exp.description ? null : variantCount ? ` · ${variantCount} variants` : ""}
                    </div>
                  </div>
                  <div className="flex justify-start">
                    <span className={STATUS_BADGE[exp.status] ?? "se-badge"}>
                      <span className="dot" />
                      {exp.status.toUpperCase()}
                    </span>
                  </div>
                  <div
                    className="text-right font-mono text-[12px] text-[var(--se-fg-2)]"
                    style={{ fontVariantNumeric: "tabular-nums" }}
                  >
                    {trafficPct}%
                  </div>
                  <div
                    className="text-right font-mono text-[12px] text-[var(--se-fg-4)]"
                    style={{ fontVariantNumeric: "tabular-nums" }}
                  >
                    —
                  </div>
                  <div className="text-[var(--se-fg-4)]">
                    <SparkPlaceholder />
                  </div>
                  <div
                    className="text-right font-mono text-[12px] text-[var(--se-fg-4)]"
                    style={{ fontVariantNumeric: "tabular-nums" }}
                  >
                    —
                  </div>
                  <div
                    className="text-right font-mono text-[12px] text-[var(--se-fg-4)]"
                    style={{ fontVariantNumeric: "tabular-nums" }}
                  >
                    —
                  </div>
                  <div className="flex justify-start">
                    <span
                      className="grid size-6 place-items-center rounded-full text-[10px] font-medium"
                      style={{
                        background: "var(--se-bg-3)",
                        color: "var(--se-fg-3)",
                        border: "1px solid var(--se-line-2)",
                      }}
                      aria-hidden
                    >
                      —
                    </span>
                  </div>
                  <div className="flex items-center justify-end gap-1 opacity-60 group-hover/row:opacity-100">
                    <IntegrationSnippetButton kind="experiment" name={exp.name} stopPropagation />
                    {exp.status === "draft" ? (
                      <ActionForm
                        action={setExperimentStatusAction}
                        loading="Starting experiment…"
                        success="Experiment started"
                        onSuccess={() => mutate()}
                      >
                        <input type="hidden" name="id" value={exp.id} />
                        <input type="hidden" name="status" value="running" />
                        <Button
                          size="sm"
                          variant="ghost"
                          type="submit"
                          aria-label="Start experiment"
                        >
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
                        <Button
                          size="sm"
                          variant="ghost"
                          type="submit"
                          aria-label="Stop experiment"
                        >
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
                          <MoreHorizontal className="size-3" />
                        </Button>
                      </ActionForm>
                    ) : (
                      <Button size="sm" variant="ghost" disabled aria-label="More">
                        <MoreHorizontal className="size-3" />
                      </Button>
                    )}
                  </div>
                </div>
              );
            })
          )}

          <div className="flex items-center gap-2 border-t border-[var(--se-line)] px-5 py-3">
            <span className="t-mono-xs dim-2">
              {visible.length} of {experiments.length} shown
            </span>
            <div className="ml-auto flex items-center gap-2 text-[var(--se-fg-3)]">
              <ArrowRight className="size-3 rotate-180 opacity-30" />
              <span className="t-mono-xs">page 1</span>
              <ArrowRight className="size-3 opacity-30" />
            </div>
          </div>
        </div>
      </PageBody>
    </Page>
  );
}

function HeaderStat({
  label,
  value,
  valueColor,
}: {
  label: string;
  value: number | string;
  valueColor?: string;
}) {
  return (
    <div className="text-right">
      <div className="t-caps dim-3">{label}</div>
      <div
        className="mt-0.5 text-[18px] font-medium leading-none"
        style={{ fontVariantNumeric: "tabular-nums", color: valueColor ?? undefined }}
      >
        {value}
      </div>
    </div>
  );
}

function SparkPlaceholder() {
  return (
    <svg
      width="92"
      height="22"
      viewBox="0 0 92 22"
      preserveAspectRatio="none"
      className="text-[var(--se-fg-4)]"
    >
      <line
        x1="2"
        y1="11"
        x2="90"
        y2="11"
        stroke="currentColor"
        strokeWidth="1"
        strokeDasharray="2 3"
        opacity={0.5}
      />
    </svg>
  );
}
