"use client";

import { useOptimistic, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import useSWR from "swr";

import { projectIdFromPathname } from "@/lib/project-path";
import { ExternalLink, MoreHorizontal, Shield, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { HeroEmptyState } from "@/components/dashboard/hero-empty-state";
import { Button } from "@/components/ui/button";
import { ActionForm } from "@/components/ui/action-form";
import { StatusBadge } from "@/components/ui/status-badge";
import { type UnifiedListColumn } from "@/components/shell/unified-list";
import { ListPage, type ListPageTab } from "@/components/shell/list-page";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { IntegrationSnippetButton } from "@/components/integration";
import { deleteGateAction, enableGateAction } from "./actions";
import { NewGateWizard } from "./new-gate-wizard";
import { EmbeddedGateEditor, type EmbeddedGateRow } from "./embedded-gate-editor";

type GateRow = EmbeddedGateRow;

type GateTabKey = "all" | "enabled" | "paused";

const GATE_TABS: readonly { key: GateTabKey; label: string }[] = [
  { key: "all", label: "All" },
  { key: "enabled", label: "Enabled" },
  { key: "paused", label: "Paused" },
] as const;

const fetcher = async (url: string): Promise<GateRow[]> => {
  const res = await fetch(url, { credentials: "same-origin" });
  if (!res.ok) throw new Error(`${url} → HTTP ${res.status}`);
  const acc: GateRow[] = [];
  let next: string | null | undefined;
  let page = (await res.json()) as { data?: GateRow[]; next_cursor?: string | null } | GateRow[];
  if (Array.isArray(page)) return page;
  acc.push(...(page.data ?? []));
  next = page.next_cursor ?? null;
  while (next) {
    const r = await fetch(`${url}?cursor=${encodeURIComponent(next)}`, {
      credentials: "same-origin",
    });
    if (!r.ok) break;
    page = (await r.json()) as { data?: GateRow[]; next_cursor?: string | null };
    acc.push(...(page.data ?? []));
    next = page.next_cursor ?? null;
  }
  return acc;
};

export function GatesContent() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const projectId = projectIdFromPathname(pathname) ?? "";
  const openId = searchParams.get("open");
  const [newOpen, setNewOpen] = useState(searchParams.get("new") === "1");

  const { data, isLoading, mutate } = useSWR<GateRow[]>("/api/admin/gates", fetcher, {
    dedupingInterval: 0,
  });
  const gates = data ?? [];

  // Counts come from the backend (single SQL aggregate) — never iterate rows
  // on the client to derive totals. Keeps the stat trio + filter tab labels
  // accurate even when the list is paginated and only a slice is in scope.
  const { data: countsData, mutate: mutateCounts } = useSWR<{
    total: number;
    enabled: number;
    paused: number;
  }>(
    "/api/admin/gates/counts",
    async (url: string) => {
      const res = await fetch(url, { credentials: "same-origin" });
      if (!res.ok) throw new Error(`${url} → HTTP ${res.status}`);
      return res.json();
    },
    { dedupingInterval: 0 },
  );
  const counts = countsData ?? { total: 0, enabled: 0, paused: 0 };

  const [optimisticGates, setOptimisticEnabled] = useOptimistic(
    gates,
    (prev, { id, enabled }: { id: string; enabled: boolean }) =>
      prev.map((g) => (g.id === id ? { ...g, enabled } : g)),
  );

  const [, startTransition] = useTransition();
  const [filter, setFilter] = useState("");
  const [tab, setTab] = useState<GateTabKey>("all");
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  function setSelected(id: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (id) params.set("open", id);
    else params.delete("open");
    const qs = params.toString();
    router.replace(`${pathname}${qs ? `?${qs}` : ""}`, { scroll: false });
  }

  function setNewWizardOpen(open: boolean) {
    setNewOpen(open);
  }

  const total = counts.total;
  const enabledCount = counts.enabled;
  const paused = counts.paused;

  const tabCounts: Record<GateTabKey, number> = {
    all: total,
    enabled: enabledCount,
    paused,
  };

  const filtered = optimisticGates.filter((g) => {
    if (tab === "enabled" && !g.enabled) return false;
    if (tab === "paused" && g.enabled) return false;
    if (filter && !g.name.toLowerCase().includes(filter.toLowerCase())) return false;
    return true;
  });

  const tabs: readonly ListPageTab<GateTabKey>[] = GATE_TABS.map((t) => ({
    ...t,
    count: tabCounts[t.key],
  }));

  if (!isLoading && total === 0) {
    return (
      <>
        <HeroEmptyState
          kind="gates"
          extraAction={
            <Button size="lg" type="button" onClick={() => setNewWizardOpen(true)}>
              Define your first gate
            </Button>
          }
        />
        <NewGateWizard open={newOpen} onOpenChange={setNewWizardOpen} projectId={projectId} />
      </>
    );
  }

  function toggleGate(gate: GateRow, nextEnabled: boolean) {
    startTransition(async () => {
      setOptimisticEnabled({ id: gate.id, enabled: nextEnabled });
      const fd = new FormData();
      fd.append("id", gate.id);
      fd.append("enabled", String(nextEnabled));
      const result = await enableGateAction(fd);
      if (!result.ok) {
        toast.error(result.error);
      } else {
        await Promise.all([mutate(), mutateCounts()]);
      }
    });
  }

  const columns = listColumns({
    onToggle: toggleGate,
    onDelete: (id) => setPendingDeleteId(id),
  });

  const pendingDelete = pendingDeleteId
    ? optimisticGates.find((g) => g.id === pendingDeleteId)
    : null;

  return (
    <>
      <ListPage<GateRow, GateTabKey>
        title="Gates"
        description="Gates toggle features on and off per user, attribute, or percentage. Edge-cached — evaluations run against KV in under 5ms."
        stats={[
          { label: "Total", value: total },
          { label: "Enabled", value: enabledCount, tone: "accent" },
          { label: "Paused", value: paused, tone: paused > 0 ? "warn" : "muted" },
        ]}
        actions={
          <Button size="sm" type="button" onClick={() => setNewWizardOpen(true)}>
            New gate
          </Button>
        }
        tabs={tabs}
        tab={tab}
        onTabChange={setTab}
        filter={filter}
        onFilterChange={setFilter}
        filterPlaceholder="Filter gates"
        list={{
          items: filtered,
          getId: (g) => g.id,
          columns,
          selectedId: openId,
          onSelect: setSelected,
          loading: isLoading,
          railHeader: "Gates",
          renderRail: (gate, active) => <RailRow gate={gate} active={active} />,
          detailHeader: (gate) => (
            <div className="flex min-w-0 items-center gap-2">
              <Shield
                className="size-3.5 shrink-0"
                style={{
                  color: Boolean(gate.enabled) ? "var(--se-accent)" : "var(--se-fg-4)",
                }}
              />
              <span className="truncate font-mono text-[13px] text-[var(--se-fg)]">
                {gate.name}
              </span>
            </div>
          ),
          renderDetail: (gate) => (
            <DetailPane
              gate={gate}
              projectId={projectId}
              onToggle={toggleGate}
              onDelete={() => setPendingDeleteId(gate.id)}
            />
          ),
        }}
      />

      <Dialog
        open={Boolean(pendingDelete)}
        onOpenChange={(o) => {
          if (!o) setPendingDeleteId(null);
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete gate?</DialogTitle>
            <DialogDescription>
              <span className="font-mono text-[12px] text-[var(--se-fg-2)]">
                {pendingDelete?.name}
              </span>{" "}
              will be permanently removed. SDKs that read this gate will fall back to{" "}
              <code>false</code>. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setPendingDeleteId(null)}
            >
              Cancel
            </Button>
            {pendingDelete && (
              <ActionForm
                action={deleteGateAction}
                loading="Deleting gate…"
                success="Gate deleted"
                onSuccess={() => {
                  setPendingDeleteId(null);
                  if (openId === pendingDelete.id) setSelected(null);
                  mutate();
                  mutateCounts();
                }}
              >
                <input type="hidden" name="id" value={pendingDelete.id} />
                <Button
                  type="submit"
                  size="sm"
                  className="bg-[var(--se-danger)] text-white hover:bg-[var(--se-danger)]/90"
                >
                  Delete gate
                </Button>
              </ActionForm>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <NewGateWizard open={newOpen} onOpenChange={setNewWizardOpen} projectId={projectId} />
    </>
  );
}

function ruleCountOf(gate: GateRow): number {
  return Array.isArray(gate.rules) ? gate.rules.length : 0;
}

function listColumns({
  onToggle,
  onDelete,
}: {
  onToggle: (gate: GateRow, next: boolean) => void;
  onDelete: (id: string) => void;
}): UnifiedListColumn<GateRow>[] {
  return [
    {
      key: "name",
      label: "Gate",
      render: (gate) => {
        const isEnabled = Boolean(gate.enabled);
        return (
          <div className="flex min-w-0 items-center gap-2">
            <Shield
              className="size-3.5 shrink-0"
              style={{ color: isEnabled ? "var(--se-accent)" : "var(--se-fg-4)" }}
            />
            <span className="truncate font-mono text-[13px] font-medium">{gate.name}</span>
          </div>
        );
      },
    },
    {
      key: "rollout",
      label: "Rollout",
      width: 110,
      render: (gate) => (
        <span
          className="font-mono text-[11px] text-[var(--se-fg-2)]"
          style={{ fontVariantNumeric: "tabular-nums" }}
        >
          {Math.round((gate.rolloutPct ?? 0) / 100)}%
        </span>
      ),
    },
    {
      key: "rules",
      label: "Rules",
      width: 90,
      render: (gate) => {
        const c = ruleCountOf(gate);
        return (
          <span className="font-mono text-[11px] text-[var(--se-fg-2)]">
            {c} rule{c === 1 ? "" : "s"}
          </span>
        );
      },
    },
    {
      key: "status",
      label: "Status",
      width: 120,
      render: (gate) =>
        Boolean(gate.enabled) ? (
          <StatusBadge tone="live">ENABLED</StatusBadge>
        ) : (
          <StatusBadge tone="neutral">DISABLED</StatusBadge>
        ),
    },
    {
      key: "toggle",
      label: "",
      width: 64,
      render: (gate) => {
        const isEnabled = Boolean(gate.enabled);
        return (
          <button
            type="button"
            aria-label={isEnabled ? "Disable gate" : "Enable gate"}
            className={`se-toggle ${isEnabled ? "on" : ""}`}
            onClick={(e) => {
              e.stopPropagation();
              onToggle(gate, !isEnabled);
            }}
          />
        );
      },
    },
    {
      key: "snippet",
      label: "",
      width: 32,
      render: (gate) => <IntegrationSnippetButton kind="gate" name={gate.name} stopPropagation />,
    },
    {
      key: "actions",
      label: "",
      width: 32,
      render: (gate) => (
        <div onClick={(e) => e.stopPropagation()}>
          <DropdownMenu>
            <DropdownMenuTrigger
              aria-label={`Actions for ${gate.name}`}
              className="inline-flex size-7 items-center justify-center rounded-md text-[var(--se-fg-3)] hover:bg-[var(--se-bg-3)] hover:text-[var(--se-fg-1)]"
            >
              <MoreHorizontal className="size-3" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuItem
                onClick={() => onDelete(gate.id)}
                className="text-[var(--se-danger)] focus:bg-[var(--se-danger-soft)] focus:text-[var(--se-danger)]"
              >
                <Trash2 className="size-3.5" />
                Delete gate
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ),
    },
  ];
}

function RailRow({ gate, active }: { gate: GateRow; active: boolean }) {
  const isEnabled = Boolean(gate.enabled);
  return (
    <>
      <Shield
        className="size-3.5 shrink-0"
        style={{ color: isEnabled ? "var(--se-accent)" : "var(--se-fg-4)" }}
      />
      <div className="min-w-0 flex-1">
        <div className="truncate font-mono text-[12.5px] text-[var(--se-fg)]">{gate.name}</div>
        <div className="t-mono-xs dim-2 truncate">
          {Math.round((gate.rolloutPct ?? 0) / 100)}% · {ruleCountOf(gate)} rule
          {ruleCountOf(gate) === 1 ? "" : "s"}
        </div>
      </div>
      <span
        aria-hidden
        className="size-1.5 shrink-0 rounded-full"
        style={{
          background: isEnabled ? "var(--se-accent)" : "var(--se-fg-4)",
          boxShadow: active
            ? "0 0 0 3px color-mix(in oklab, var(--se-accent) 25%, transparent)"
            : "none",
        }}
      />
    </>
  );
}

function DetailPane({
  gate,
  projectId,
  onToggle,
  onDelete,
}: {
  gate: GateRow;
  projectId: string;
  onToggle: (gate: GateRow, next: boolean) => void;
  onDelete: () => void;
}) {
  const isEnabled = Boolean(gate.enabled);
  return (
    <div className="flex min-w-0 flex-col">
      <header className="sticky top-0 z-10 flex flex-wrap items-center gap-2 border-b border-[var(--se-line)] bg-[var(--se-bg-1)]/95 px-6 py-3 backdrop-blur">
        {isEnabled ? (
          <StatusBadge tone="live" pulse>
            ENABLED
          </StatusBadge>
        ) : (
          <StatusBadge tone="neutral">DISABLED</StatusBadge>
        )}
        <button
          type="button"
          aria-label={isEnabled ? "Disable gate" : "Enable gate"}
          className={`se-toggle ${isEnabled ? "on" : ""}`}
          onClick={() => onToggle(gate, !isEnabled)}
        />
        <div className="ml-auto flex items-center gap-2">
          <IntegrationSnippetButton kind="gate" name={gate.name} />
          <a
            className="inline-flex items-center gap-1 rounded-md border border-[var(--se-line)] px-2.5 py-1 text-[12px] text-[var(--se-fg-2)] hover:bg-[var(--se-bg-2)] hover:text-[var(--se-fg)]"
            href={`/dashboard/${projectId}/gates/${gate.id}`}
            data-testid="gate-detail-standalone-link"
          >
            Open standalone <ExternalLink className="size-3" />
          </a>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onDelete}
            aria-label="Delete gate from detail pane"
            className="text-[var(--se-danger)] hover:bg-[var(--se-danger-soft)] hover:text-[var(--se-danger)]"
          >
            <Trash2 className="size-3.5" /> Delete
          </Button>
        </div>
      </header>

      <EmbeddedGateEditor gate={gate} />
    </div>
  );
}
