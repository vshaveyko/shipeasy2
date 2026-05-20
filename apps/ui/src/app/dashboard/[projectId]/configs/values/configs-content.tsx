"use client";

import { useMemo, useState, useTransition } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import useSWR from "swr";
import { ExternalLink, MoreHorizontal, SlidersHorizontal, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { SortingState } from "@tanstack/react-table";

import { projectIdFromPathname } from "@/lib/project-path";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { folderGroupStorageKey } from "@/lib/folder-groups";
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
import type { ConfigSummary } from "@/lib/handlers/configs";
import { NewConfigWizard } from "./new-config-wizard";
import { EmbeddedConfigEditor } from "./embedded-config-editor";

export type ConfigRow = ConfigSummary;

function fieldCountOf(c: ConfigRow): number {
  const props = (c.schema as { properties?: Record<string, unknown> } | null | undefined)
    ?.properties;
  return props ? Object.keys(props).length : 0;
}

type ConfigTabKey = "all" | "live" | "draft" | "empty";

const CONFIG_TABS: readonly { key: ConfigTabKey; label: string }[] = [
  { key: "all", label: "All" },
  { key: "live", label: "Live" },
  { key: "draft", label: "Draft" },
  { key: "empty", label: "Empty" },
] as const;

function draftCountOf(c: ConfigRow): number {
  return Object.keys(c.drafts ?? {}).length;
}

function publishedEnvCount(c: ConfigRow): number {
  return Object.keys(c.envs ?? {}).length;
}

export function ConfigsContent({ initial }: { initial: ConfigRow[] }) {
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
  const tab: ConfigTabKey =
    tabParam === "live" || tabParam === "draft" || tabParam === "empty" ? tabParam : "all";
  const setTab = (next: ConfigTabKey) => setParams({ tab: next === "all" ? null : next });
  const sorting = parseSortParam(searchParams.get("sort"));
  const setSorting = (next: SortingState) => setParams({ sort: formatSortParam(next) });

  const {
    rows: livePages,
    isLoading,
    isLoadingMore,
    hasMore,
    loadMore,
    mutate,
  } = useCursorPages<ConfigRow>({ baseUrl: "/api/admin/configs" });
  const rows = livePages.length > 0 ? livePages : initial;

  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [deleting, startTransition] = useTransition();

  function setSelected(id: string | null) {
    setParams({ open: id });
  }

  function setNewWizardOpen(open: boolean) {
    setNewOpen(open);
  }

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    return rows.filter((r) => {
      const envs = publishedEnvCount(r);
      const drafts = draftCountOf(r);
      if (tab === "live" && envs < 3) return false;
      if (tab === "draft" && drafts === 0) return false;
      if (tab === "empty" && envs > 0) return false;
      if (q && !r.name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [rows, filter, tab]);

  const { data: countsData } = useSWR<{
    total: number;
    live: number;
    draft: number;
    empty: number;
  }>(
    "/api/admin/configs/counts",
    async (url: string) => {
      const res = await fetch(url, { credentials: "same-origin" });
      if (!res.ok) throw new Error(`${url} → HTTP ${res.status}`);
      return res.json();
    },
    { dedupingInterval: 0 },
  );
  const total = countsData?.total ?? 0;
  const liveCount = countsData?.live ?? 0;
  const draftTotal = countsData?.draft ?? 0;
  const emptyCount = countsData?.empty ?? 0;
  const tabCounts: Record<ConfigTabKey, number> = {
    all: total,
    live: liveCount,
    draft: draftTotal,
    empty: emptyCount,
  };
  const tabs: readonly DataListPageTab<ConfigTabKey>[] = CONFIG_TABS.map((t) => ({
    ...t,
    count: tabCounts[t.key],
  }));

  // Counts arrive via SWR; the empty-branch decision uses the synchronously
  // loaded row count (via initial + SWR fallback) so the hero state doesn't
  // flash on first paint while /api/admin/configs/counts is in flight.
  if (rows.length === 0 && !isLoading) {
    return (
      <>
        <HeroEmptyState
          kind="configs"
          extraAction={
            <Button size="lg" type="button" onClick={() => setNewWizardOpen(true)}>
              Define your first config
            </Button>
          }
        />
        <NewConfigWizard
          open={newOpen}
          onOpenChange={setNewWizardOpen}
          projectId={projectId}
          onCreated={() => mutate()}
        />
      </>
    );
  }

  const pendingDelete = pendingDeleteId ? rows.find((r) => r.id === pendingDeleteId) : null;

  function confirmDeleteRow(row: ConfigRow) {
    startTransition(async () => {
      const res = await fetch(`/api/admin/configs/${row.id}`, { method: "DELETE" });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        toast.error(body.error ?? `Failed to delete (${res.status})`);
        return;
      }
      toast.success(`Deleted ${row.name}`);
      setPendingDeleteId(null);
      if (openId === row.id) setSelected(null);
      await mutate();
    });
  }

  const columns: DataTableColumn<ConfigRow>[] = listColumns({
    onDelete: (id) => setPendingDeleteId(id),
  });

  const toolbar = buildListToolbar<ConfigTabKey>({
    tabs,
    tab,
    onTabChange: setTab,
    filter,
    onFilterChange: setFilter,
    filterPlaceholder: "Filter configs",
  });

  return (
    <>
      <DataListPage
        title="Configs"
        description="Schema-driven configuration with per-environment publishing. Edge-cached — SDK reads hit KV in under 5ms."
        stats={[
          { label: "Total", value: total },
          { label: "Published", value: liveCount, tone: "accent" },
          {
            label: "Drafts",
            value: draftTotal,
            tone: draftTotal > 0 ? "warn" : "muted",
          },
        ]}
        actions={
          <Button size="sm" type="button" onClick={() => setNewWizardOpen(true)}>
            New config
          </Button>
        }
      >
        <DataTableMaster<ConfigRow>
          rows={filtered}
          getRowId={(r) => r.id}
          columns={columns}
          loading={isLoading && rows.length === 0}
          getFolder={(r) => r.folder}
          groupingDisabled={filter.trim() !== ""}
          groupStorageKey={folderGroupStorageKey("configs", projectId)}
          columnVisibilityStorageKey={`shipeasy.columns.configs.${projectId}`}
          sorting={sorting}
          onSortingChange={setSorting}
          hasMore={hasMore}
          loadingMore={isLoadingMore}
          onLoadMore={loadMore}
          selectedId={openId}
          onSelect={setSelected}
          toolbar={toolbar}
          railHeader="Configs"
          railCount={total}
          renderCompactRow={(row, active) => <RailRow row={row} active={active} />}
          detailHeader={(row) => (
            <div className="flex min-w-0 items-center gap-2">
              <SlidersHorizontal
                className="size-3.5 shrink-0"
                style={{
                  color: draftCountOf(row) ? "var(--se-warn)" : "var(--se-accent)",
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
              onDeleted={async () => {
                setSelected(null);
                await mutate();
              }}
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
            <DialogTitle>Delete config?</DialogTitle>
            <DialogDescription>
              <span className="font-mono text-[12px] text-[var(--se-fg-2)]">
                {pendingDelete?.name}
              </span>{" "}
              will be permanently removed. SDKs that read this config will fall back to their
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
              {deleting ? "Deleting…" : "Delete config"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <NewConfigWizard
        open={newOpen}
        onOpenChange={setNewWizardOpen}
        projectId={projectId}
        onCreated={() => mutate()}
      />
    </>
  );
}

function listColumns({
  onDelete,
}: {
  onDelete: (id: string) => void;
}): DataTableColumn<ConfigRow>[] {
  return [
    {
      id: "name",
      header: "Config",
      canHide: false,
      sortAccessor: (row) => row.name.toLowerCase(),
      cell: (row) => {
        const drafts = draftCountOf(row);
        return (
          <div className="flex min-w-0 items-center gap-2">
            <SlidersHorizontal
              className="size-3.5 shrink-0"
              style={{ color: drafts ? "var(--se-warn)" : "var(--se-accent)" }}
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
      id: "fields",
      header: "Fields",
      width: 90,
      sortAccessor: (row) => fieldCountOf(row),
      cell: (row) => {
        const n = fieldCountOf(row);
        return (
          <span className="font-mono text-[11px] text-[var(--se-fg-2)]">
            {n} field{n === 1 ? "" : "s"}
          </span>
        );
      },
    },
    {
      id: "envs",
      header: "Published",
      width: 110,
      sortAccessor: (row) => publishedEnvCount(row),
      cell: (row) => {
        const n = publishedEnvCount(row);
        return (
          <span className="font-mono text-[11px] text-[var(--se-fg-2)]">
            {n}/3 env{n === 1 ? "" : "s"}
          </span>
        );
      },
    },
    {
      id: "drafts",
      header: "Status",
      width: 120,
      sortAccessor: (row) => {
        const d = draftCountOf(row);
        if (d > 0) return 1;
        return publishedEnvCount(row) > 0 ? 2 : 0;
      },
      cell: (row) => {
        const d = draftCountOf(row);
        return d > 0 ? (
          <StatusBadge tone="paused">DRAFT</StatusBadge>
        ) : publishedEnvCount(row) > 0 ? (
          <StatusBadge tone="live">LIVE</StatusBadge>
        ) : (
          <StatusBadge tone="neutral">EMPTY</StatusBadge>
        );
      },
    },
    {
      id: "updated",
      header: "Updated",
      width: 110,
      sortAccessor: (row) => row.updatedAt ?? "",
      cell: (row) => (
        <span className="font-mono text-[11px] text-[var(--se-fg-3)]">
          {row.updatedAt?.slice(0, 10) ?? "—"}
        </span>
      ),
    },
    {
      id: "snippet",
      header: "",
      width: 32,
      canHide: false,
      cell: (row) => <IntegrationSnippetButton kind="config" name={row.name} stopPropagation />,
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
                Delete config
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ),
    },
  ];
}

function RailRow({ row, active }: { row: ConfigRow; active: boolean }) {
  const drafts = draftCountOf(row);
  const fields = fieldCountOf(row);
  return (
    <>
      <SlidersHorizontal
        className="size-3.5 shrink-0"
        style={{ color: drafts ? "var(--se-warn)" : "var(--se-accent)" }}
      />
      <div className="min-w-0 flex-1">
        <div className="truncate font-mono text-[12.5px] text-[var(--se-fg)]">{row.name}</div>
        <div className="t-mono-xs dim-2 truncate">
          {fields} field{fields === 1 ? "" : "s"}
          {drafts ? ` · ${drafts} draft` : ""}
        </div>
      </div>
      <span
        aria-hidden
        className="size-1.5 shrink-0 rounded-full"
        style={{
          background: drafts ? "var(--se-warn)" : "var(--se-accent)",
          boxShadow: active
            ? "0 0 0 3px color-mix(in oklab, var(--se-accent) 25%, transparent)"
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
  onDeleted,
}: {
  row: ConfigRow;
  projectId: string;
  onDelete: () => void;
  onDeleted: () => void;
}) {
  return (
    <div className="flex min-w-0 flex-col">
      <header className="sticky top-0 z-10 flex flex-wrap items-center gap-2 border-b border-[var(--se-line)] bg-[var(--se-bg-1)]/95 px-6 py-3 backdrop-blur">
        {draftCountOf(row) ? (
          <StatusBadge tone="paused">DRAFT</StatusBadge>
        ) : publishedEnvCount(row) > 0 ? (
          <StatusBadge tone="live">LIVE</StatusBadge>
        ) : (
          <StatusBadge tone="neutral">EMPTY</StatusBadge>
        )}
        <div className="ml-auto flex items-center gap-2">
          <IntegrationSnippetButton kind="config" name={row.name} />
          <a
            className="inline-flex items-center gap-1 rounded-md border border-[var(--se-line)] px-2.5 py-1 text-[12px] text-[var(--se-fg-2)] hover:bg-[var(--se-bg-2)] hover:text-[var(--se-fg)]"
            href={`/dashboard/${projectId}/configs/values/${row.id}`}
            data-testid="config-detail-standalone-link"
          >
            Open standalone <ExternalLink className="size-3" />
          </a>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onDelete}
            aria-label="Delete config from detail pane"
            className="text-[var(--se-danger)] hover:bg-[var(--se-danger-soft)] hover:text-[var(--se-danger)]"
          >
            <Trash2 className="size-3.5" /> Delete
          </Button>
        </div>
      </header>

      <EmbeddedConfigEditor configId={row.id} onDeleted={onDeleted} />
    </div>
  );
}
