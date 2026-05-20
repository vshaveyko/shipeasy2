"use client";

import { useMemo, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ExternalLink, MoreHorizontal, Power, Trash2 } from "lucide-react";
import useSWR from "swr";
import { toast } from "sonner";
import type { SortingState } from "@tanstack/react-table";

import { projectIdFromPathname } from "@/lib/project-path";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  DataListPage,
  buildListToolbar,
  type DataListPageTab,
} from "@/components/shell/data-list-page";
import {
  DataTableMaster,
  useCursorPages,
  useSearchParamMutator,
  parseSortParam,
  formatSortParam,
  type DataTableColumn,
} from "@/components/data-table";
import { folderGroupStorageKey } from "@/lib/folder-groups";
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
import { HeroEmptyState } from "@/components/dashboard/hero-empty-state";
import { IntegrationSnippetButton } from "@/components/integration";
import { deleteKillswitch } from "@/actions/killswitches";
import { NewKillswitchWizard } from "./new-killswitch-wizard";
import { ReadKillswitchView } from "./read-killswitch-view";

type EnvKey = "dev" | "staging" | "prod";

export type KillswitchRow = {
  id: string;
  name: string;
  description: string | null;
  folder: string | null;
  updatedAt: string;
  envs: Partial<
    Record<
      EnvKey,
      { value: boolean; switches?: Record<string, boolean>; version: number; publishedAt: string }
    >
  >;
};

function splitName(name: string): { folder: string; leaf: string } {
  const idx = name.indexOf(".");
  if (idx === -1) return { folder: "_default", leaf: name };
  return { folder: name.slice(0, idx), leaf: name.slice(idx + 1) };
}

type KsTabKey = "all" | "on" | "off";

const KS_TABS: readonly { key: KsTabKey; label: string }[] = [
  { key: "all", label: "All" },
  { key: "on", label: "ON" },
  { key: "off", label: "OFF" },
] as const;

function activeEnv(row: KillswitchRow) {
  return row.envs.prod ?? row.envs.staging ?? row.envs.dev;
}

export function KillswitchesContent({ initial }: { initial: KillswitchRow[] }) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const setParams = useSearchParamMutator();
  const projectId = projectIdFromPathname(pathname) ?? "";
  const openId = searchParams.get("open");
  const [newOpen, setNewOpen] = useState(searchParams.get("new") === "1");

  /* URL-synced UI state */
  const filter = searchParams.get("q") ?? "";
  const setFilter = (next: string) => setParams({ q: next || null });
  const tabParam = searchParams.get("tab");
  const tab: KsTabKey = tabParam === "on" || tabParam === "off" ? tabParam : "all";
  const setTab = (next: KsTabKey) => setParams({ tab: next === "all" ? null : next });
  const sorting = parseSortParam(searchParams.get("sort"));
  const setSorting = (next: SortingState) => setParams({ sort: formatSortParam(next) });

  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [deleting, startTransition] = useTransition();

  // Initial rows are SSR-provided; the cursor hook supplies future pages once
  // the user scrolls past the initial slice. SWRInfinite seeds page 0 with
  // a real fetch, so the SSR data still drives first paint.
  const {
    rows: livePages,
    isLoading,
    isLoadingMore,
    hasMore,
    loadMore,
  } = useCursorPages<KillswitchRow>({ baseUrl: "/api/admin/killswitches" });
  const rows = livePages.length > 0 ? livePages : initial;

  function setSelected(id: string | null) {
    setParams({ open: id });
  }

  function setNewWizardOpen(open: boolean) {
    setNewOpen(open);
  }

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    return rows.filter((r) => {
      const on = Boolean(activeEnv(r)?.value);
      if (tab === "on" && !on) return false;
      if (tab === "off" && on) return false;
      if (q && !r.name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [rows, filter, tab]);

  const { data: countsData } = useSWR<{ total: number; on: number; off: number }>(
    "/api/admin/killswitches/counts",
    async (url: string) => {
      const res = await fetch(url, { credentials: "same-origin" });
      if (!res.ok) throw new Error(`${url} → HTTP ${res.status}`);
      return res.json();
    },
    { dedupingInterval: 0 },
  );
  const total = countsData?.total ?? 0;
  const onCount = countsData?.on ?? 0;
  const offCount = countsData?.off ?? 0;
  const tabs: readonly DataListPageTab<KsTabKey>[] = KS_TABS.map((t) => ({
    ...t,
    count: t.key === "all" ? total : t.key === "on" ? onCount : offCount,
  }));

  if (initial.length === 0) {
    return (
      <>
        <HeroEmptyState
          kind="killswitches"
          ctaLabel="Create killswitch"
          extraAction={
            <Button size="lg" type="button" onClick={() => setNewWizardOpen(true)}>
              <Power className="size-3.5" /> Create killswitch
            </Button>
          }
        />
        <NewKillswitchWizard open={newOpen} onOpenChange={setNewWizardOpen} projectId={projectId} />
      </>
    );
  }

  const pendingDelete = pendingDeleteId ? rows.find((r) => r.id === pendingDeleteId) : null;

  function confirmDeleteRow(row: KillswitchRow) {
    startTransition(async () => {
      try {
        await deleteKillswitch(row.id);
        toast.success(`Deleted ${row.name}`);
        setPendingDeleteId(null);
        if (openId === row.id) setSelected(null);
        router.refresh();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Delete failed");
      }
    });
  }

  const columns: DataTableColumn<KillswitchRow>[] = listColumns({
    onDelete: (id) => setPendingDeleteId(id),
  });

  const toolbar = buildListToolbar<KsTabKey>({
    tabs,
    tab,
    onTabChange: setTab,
    filter,
    onFilterChange: setFilter,
    filterPlaceholder: "Filter folder.name",
  });

  return (
    <>
      <DataListPage
        title="Killswitches"
        description="Static on/off configs delivered as-is to the client. Each can carry per-key overrides that take precedence over the default value."
        stats={[
          { label: "Total", value: total },
          { label: "ON", value: onCount, tone: onCount > 0 ? "danger" : "muted" },
          { label: "OFF", value: offCount, tone: "accent" },
        ]}
        actions={
          <Button size="sm" type="button" onClick={() => setNewWizardOpen(true)}>
            New killswitch
          </Button>
        }
      >
        <DataTableMaster<KillswitchRow>
          rows={filtered}
          getRowId={(r) => r.id}
          columns={columns}
          loading={isLoading && rows.length === 0}
          getFolder={(r) => r.folder}
          groupingDisabled={filter.trim() !== ""}
          groupStorageKey={folderGroupStorageKey("killswitches", projectId)}
          columnVisibilityStorageKey={`shipeasy.columns.killswitches.${projectId}`}
          sorting={sorting}
          onSortingChange={setSorting}
          hasMore={hasMore}
          loadingMore={isLoadingMore}
          onLoadMore={loadMore}
          selectedId={openId}
          onSelect={setSelected}
          toolbar={toolbar}
          railHeader="Killswitches"
          railCount={total}
          renderCompactRow={(row, active) => <RailRow row={row} active={active} />}
          detailHeader={(row) => (
            <div className="flex min-w-0 items-center gap-2">
              <Power
                className="size-3.5 shrink-0"
                style={{
                  color: activeEnv(row)?.value ? "var(--se-danger)" : "var(--se-fg-4)",
                }}
              />
              <span className="truncate font-mono text-[13px] text-[var(--se-fg)]">{row.name}</span>
            </div>
          )}
          renderDetail={(row) => (
            <DetailPane
              row={row}
              projectId={projectId}
              onDelete={() => setPendingDeleteId(row.id)}
            />
          )}
        />
      </DataListPage>

      <Dialog
        open={Boolean(pendingDelete)}
        onOpenChange={(o) => {
          if (!o && !deleting) setPendingDeleteId(null);
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete killswitch?</DialogTitle>
            <DialogDescription>
              <span className="font-mono text-[12px] text-[var(--se-fg-2)]">
                {pendingDelete?.name}
              </span>{" "}
              will be permanently removed. SDKs that read this killswitch will fall back to their
              code-side default. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setPendingDeleteId(null)}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={deleting}
              onClick={() => {
                if (pendingDelete) confirmDeleteRow(pendingDelete);
              }}
              className="bg-[var(--se-danger)] text-white hover:bg-[var(--se-danger)]/90"
            >
              {deleting ? "Deleting…" : "Delete killswitch"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <NewKillswitchWizard open={newOpen} onOpenChange={setNewWizardOpen} projectId={projectId} />
    </>
  );
}

function listColumns({
  onDelete,
}: {
  onDelete: (id: string) => void;
}): DataTableColumn<KillswitchRow>[] {
  return [
    {
      id: "name",
      header: "Killswitch",
      canHide: false,
      sortAccessor: (row) => row.name.toLowerCase(),
      cell: (row) => {
        const on = Boolean(activeEnv(row)?.value);
        return (
          <div className="flex min-w-0 items-center gap-2">
            <Power
              className="size-3.5 shrink-0"
              style={{ color: on ? "var(--se-danger)" : "var(--se-fg-4)" }}
            />
            <span className="truncate font-mono text-[13px] font-medium">{row.name}</span>
            {row.description ? (
              <span className="truncate text-[11px] text-[var(--se-fg-3)]">{row.description}</span>
            ) : null}
          </div>
        );
      },
    },
    {
      id: "default",
      header: "Default",
      width: 100,
      sortAccessor: (row) => (activeEnv(row)?.value ? 1 : 0),
      cell: (row) => {
        const on = Boolean(activeEnv(row)?.value);
        return on ? (
          <StatusBadge tone="killed">ON</StatusBadge>
        ) : (
          <StatusBadge tone="neutral">OFF</StatusBadge>
        );
      },
    },
    {
      id: "switches",
      header: "Switches",
      width: 100,
      sortAccessor: (row) => {
        const env = activeEnv(row);
        return env?.switches ? Object.keys(env.switches).length : 0;
      },
      cell: (row) => {
        const env = activeEnv(row);
        const n = env?.switches ? Object.keys(env.switches).length : 0;
        return (
          <span className="font-mono text-[11px] text-[var(--se-fg-2)]">
            {n} switch{n === 1 ? "" : "es"}
          </span>
        );
      },
    },
    {
      id: "updated",
      header: "Updated",
      width: 110,
      sortAccessor: (row) => row.updatedAt,
      cell: (row) => (
        <span className="font-mono text-[11px] text-[var(--se-fg-3)]">
          {row.updatedAt.slice(0, 10)}
        </span>
      ),
    },
    {
      id: "snippet",
      header: "",
      width: 32,
      canHide: false,
      cell: (row) => <IntegrationSnippetButton kind="killswitch" name={row.name} stopPropagation />,
    },
    {
      id: "actions",
      header: "",
      width: 32,
      canHide: false,
      cell: (row) => (
        <div onClick={(e) => e.stopPropagation()}>
          <DropdownMenu>
            <DropdownMenuTrigger
              aria-label={`Actions for ${row.name}`}
              className="inline-flex size-7 items-center justify-center rounded-md text-[var(--se-fg-3)] hover:bg-[var(--se-bg-3)] hover:text-[var(--se-fg-1)]"
            >
              <MoreHorizontal className="size-3" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuItem
                onClick={() => onDelete(row.id)}
                className="text-[var(--se-danger)] focus:bg-[var(--se-danger-soft)] focus:text-[var(--se-danger)]"
              >
                <Trash2 className="size-3.5" />
                Delete killswitch
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ),
    },
  ];
}

function RailRow({ row, active }: { row: KillswitchRow; active: boolean }) {
  const env = activeEnv(row);
  const on = Boolean(env?.value);
  const switchCount = env?.switches ? Object.keys(env.switches).length : 0;
  const { leaf } = splitName(row.name);
  return (
    <>
      <Power
        className="size-3.5 shrink-0"
        style={{ color: on ? "var(--se-danger)" : "var(--se-fg-4)" }}
      />
      <div className="min-w-0 flex-1">
        <div className="truncate font-mono text-[12.5px] text-[var(--se-fg)]">{leaf}</div>
        <div className="t-mono-xs dim-2 truncate">
          {on ? "ON" : "OFF"} · {switchCount} switch{switchCount === 1 ? "" : "es"}
        </div>
      </div>
      <span
        aria-hidden
        className="size-1.5 shrink-0 rounded-full"
        style={{
          background: on ? "var(--se-danger)" : "var(--se-fg-4)",
          boxShadow: active
            ? "0 0 0 3px color-mix(in oklab, var(--se-danger) 25%, transparent)"
            : "none",
        }}
      />
    </>
  );
}

function DetailPane({
  row,
  projectId,
  onDelete,
}: {
  row: KillswitchRow;
  projectId: string;
  onDelete: () => void;
}) {
  const env = activeEnv(row);
  const on = Boolean(env?.value);
  return (
    <div className="flex min-w-0 flex-col">
      <header className="sticky top-0 z-10 flex flex-wrap items-center gap-2 border-b border-[var(--se-line)] bg-[var(--se-bg-1)]/95 px-6 py-3 backdrop-blur">
        {on ? (
          <StatusBadge tone="killed" pulse>
            ON
          </StatusBadge>
        ) : (
          <StatusBadge tone="neutral">OFF</StatusBadge>
        )}
        <span className="t-mono-xs dim">
          {env?.switches ? Object.keys(env.switches).length : 0} switches
        </span>
        <div className="ml-auto flex items-center gap-2">
          <IntegrationSnippetButton kind="killswitch" name={row.name} />
          <a
            className="inline-flex items-center gap-1 rounded-md border border-[var(--se-line)] px-2.5 py-1 text-[12px] text-[var(--se-fg-2)] hover:bg-[var(--se-bg-2)] hover:text-[var(--se-fg)]"
            href={`/dashboard/${projectId}/killswitches/${row.id}`}
            data-testid="killswitch-detail-standalone-link"
          >
            Open standalone <ExternalLink className="size-3" />
          </a>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onDelete}
            aria-label="Delete killswitch from detail pane"
            className="text-[var(--se-danger)] hover:bg-[var(--se-danger-soft)] hover:text-[var(--se-danger)]"
          >
            <Trash2 className="size-3.5" /> Delete
          </Button>
        </div>
      </header>

      <ReadKillswitchView row={row} />
    </div>
  );
}
