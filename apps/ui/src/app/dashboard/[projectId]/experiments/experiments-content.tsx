"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import useSWR from "swr";
import { FlaskConical, Play, Plus, Search, Square, Trash2 } from "lucide-react";

import { projectIdFromPathname } from "@/lib/project-path";

import { HeroEmptyState } from "@/components/dashboard/hero-empty-state";
import { Page, PageBody } from "@/components/dashboard/page";
import { Button } from "@/components/ui/button";
import { LinkButton } from "@/components/ui/link-button";
import { ActionForm } from "@/components/ui/action-form";
import { IntegrationSnippetButton } from "@/components/integration";
import { StatusBadge } from "@/components/ui/status-badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  UnifiedList,
  type UnifiedListColumn,
  type UnifiedListGroup,
} from "@/components/shell/unified-list";
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
  tag?: string | null;
  updatedAt?: string | null;
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

const fetcher = async (url: string): Promise<ExperimentRow[]> => {
  const res = await fetch(url, { credentials: "same-origin" });
  if (!res.ok) throw new Error(`${url} → HTTP ${res.status}`);
  const body = (await res.json()) as ExperimentRow[] | { data: ExperimentRow[] };
  return Array.isArray(body) ? body : (body.data ?? []);
};

function variantCount(groups: unknown): number {
  return Array.isArray(groups) ? groups.length : 0;
}

function trafficPct(allocationPct: number): number {
  return allocationPct >= 10000 ? 100 : Math.round((allocationPct ?? 0) / 100);
}

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  return iso.slice(0, 10);
}

export function ExperimentsContent() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const projectId = projectIdFromPathname(pathname) ?? "";
  const openId = searchParams.get("open");
  const [newOpen, setNewOpen] = useState(searchParams.get("new") === "1");

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

  const setParam = useCallback(
    (key: string, value: string | null) => {
      const next = new URLSearchParams(searchParams.toString());
      if (value === null) next.delete(key);
      else next.set(key, value);
      router.replace(`${pathname}?${next.toString()}`, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  const handleSelect = useCallback(
    (id: string | null) => {
      setParam("open", id);
    },
    [setParam],
  );

  const openWizard = useCallback(() => setNewOpen(true), []);
  const closeWizard = useCallback(() => setNewOpen(false), []);

  // Auto-select status tab when openId belongs to a non-matching tab
  useEffect(() => {
    if (!openId) return;
    const row = experiments.find((e) => e.id === openId);
    if (row && tab !== "all" && row.status !== tab) setTab("all");
  }, [openId, experiments, tab]);

  const railGroups: UnifiedListGroup<ExperimentRow>[] = useMemo(() => {
    const buckets: Record<StatusKey, ExperimentRow[]> = {
      running: [],
      draft: [],
      stopped: [],
      archived: [],
    };
    for (const exp of visible) {
      const k = (exp.status in buckets ? exp.status : "draft") as StatusKey;
      buckets[k].push(exp);
    }
    const order: StatusKey[] = ["running", "draft", "stopped", "archived"];
    return order
      .filter((k) => buckets[k].length > 0)
      .map((k) => ({
        id: k,
        label: `${TAB_LABELS[k]} · ${buckets[k].length}`,
        items: buckets[k],
      }));
  }, [visible]);

  const columns: UnifiedListColumn<ExperimentRow>[] = useMemo(
    () => [
      {
        key: "name",
        label: "Experiment",
        render: (exp) => (
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
                {exp.tag ? (
                  <span className="rounded-full border border-[var(--se-line-2)] bg-[var(--se-bg-3)] px-1.5 py-px font-mono text-[10px] uppercase tracking-wide text-[var(--se-fg-3)]">
                    {exp.tag}
                  </span>
                ) : null}
              </div>
              <div className="t-mono-xs dim-2 mt-0.5 truncate">
                {exp.description ?? `universe · ${exp.universe ?? "default"}`}
              </div>
            </div>
          </div>
        ),
      },
      {
        key: "status",
        label: "Status",
        width: 110,
        render: (exp) => (
          <StatusBadge tone={STATUS_TONE[exp.status] ?? "neutral"}>
            {exp.status.toUpperCase()}
          </StatusBadge>
        ),
      },
      {
        key: "traffic",
        label: <span className="text-right block">Traffic</span>,
        width: 90,
        className: "text-right",
        render: (exp) => (
          <span
            className="font-mono text-[12px] text-[var(--se-fg-2)]"
            style={{ fontVariantNumeric: "tabular-nums" }}
          >
            {trafficPct(exp.allocationPct)}%
          </span>
        ),
      },
      {
        key: "variants",
        label: <span className="text-right block">Variants</span>,
        width: 90,
        className: "text-right",
        render: (exp) => (
          <span
            className="font-mono text-[12px] text-[var(--se-fg-2)]"
            style={{ fontVariantNumeric: "tabular-nums" }}
          >
            {variantCount(exp.groups)}
          </span>
        ),
      },
      {
        key: "updated",
        label: <span className="text-right block">Updated</span>,
        width: 110,
        className: "text-right",
        render: (exp) => (
          <span className="t-mono-xs dim-2">{fmtDate(exp.updatedAt ?? exp.startedAt ?? null)}</span>
        ),
      },
      {
        key: "snippet",
        label: "",
        width: 40,
        render: (exp) => (
          <span onClick={(e) => e.stopPropagation()}>
            <IntegrationSnippetButton kind="experiment" name={exp.name} stopPropagation />
          </span>
        ),
      },
      {
        key: "actions",
        label: "",
        width: 60,
        className: "text-right",
        render: (exp) => (
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

  // Empty state
  if (experiments.length === 0) {
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
        {headerActions}
      </div>

      <PageBody className="space-y-3">
        <UnifiedList<ExperimentRow>
          items={visible}
          getId={(row) => row.id}
          columns={columns}
          loading={isLoading}
          selectedId={openId}
          onSelect={handleSelect}
          railGroups={railGroups}
          railHeader="Experiments"
          toolbar={
            <>
              <Tabs value={tab} onValueChange={(v) => setTab(v as TabKey)}>
                <TabsList>
                  {(Object.keys(TAB_LABELS) as TabKey[]).map((k) => (
                    <TabsTrigger key={k} value={k}>
                      {TAB_LABELS[k]}
                      <span className="ml-1 font-mono text-[10.5px] text-[var(--se-fg-4)]">
                        {counts[k]}
                      </span>
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
              <div className="ml-auto flex h-7 w-[260px] items-center gap-2 rounded-[var(--radius-md)] border border-[var(--se-line-2)] bg-[var(--se-bg-2)] px-2.5 text-[13px]">
                <Search className="size-3 text-[var(--se-fg-3)]" />
                <input
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  placeholder="Filter by name, tag, or universe"
                  aria-label="Filter experiments"
                  className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-[var(--se-fg-4)]"
                />
              </div>
            </>
          }
          renderRail={(exp) => (
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
      </PageBody>

      <NewExperimentWizard
        open={newOpen}
        onOpenChange={(v) => (v ? openWizard() : closeWizard())}
        projectId={projectId}
        onCreated={() => {
          void mutate();
          closeWizard();
        }}
      />
    </Page>
  );
}
