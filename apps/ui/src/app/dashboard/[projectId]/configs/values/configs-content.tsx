"use client";

import { useMemo, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import useSWR from "swr";
import {
  ExternalLink,
  Folder,
  MoreHorizontal,
  Search,
  SlidersHorizontal,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { projectIdFromPathname } from "@/lib/project-path";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  UnifiedList,
  type UnifiedListColumn,
  type UnifiedListGroup,
} from "@/components/shell/unified-list";
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
import { Page, PageBody, PageHeader } from "@/components/dashboard/page";
import { HeroEmptyState } from "@/components/dashboard/hero-empty-state";
import { IntegrationSnippetButton } from "@/components/integration";
import type { ConfigSummary } from "@/lib/handlers/configs";
import { NewConfigWizard } from "./new-config-wizard";
import { EmbeddedConfigEditor } from "./embedded-config-editor";

export type ConfigRow = ConfigSummary;

const fetcher = async (url: string): Promise<ConfigRow[]> => {
  const res = await fetch(url, { credentials: "same-origin" });
  if (!res.ok) throw new Error(`${url} → HTTP ${res.status}`);
  const acc: ConfigRow[] = [];
  let next: string | null | undefined;
  let page = (await res.json()) as
    | { data?: ConfigRow[]; next_cursor?: string | null }
    | ConfigRow[];
  if (Array.isArray(page)) return page;
  acc.push(...(page.data ?? []));
  next = page.next_cursor ?? null;
  while (next) {
    const r = await fetch(`${url}?cursor=${encodeURIComponent(next)}`, {
      credentials: "same-origin",
    });
    if (!r.ok) break;
    page = (await r.json()) as { data?: ConfigRow[]; next_cursor?: string | null };
    acc.push(...(page.data ?? []));
    next = page.next_cursor ?? null;
  }
  return acc;
};

function namespaceOf(name: string): string {
  const i = name.indexOf(".");
  return i === -1 ? "misc" : name.slice(0, i);
}

function fieldCountOf(c: ConfigRow): number {
  const props = (c.schema as { properties?: Record<string, unknown> } | null | undefined)
    ?.properties;
  return props ? Object.keys(props).length : 0;
}

function draftCountOf(c: ConfigRow): number {
  return Object.keys(c.drafts ?? {}).length;
}

function publishedEnvCount(c: ConfigRow): number {
  return Object.keys(c.envs ?? {}).length;
}

export function ConfigsContent({ initial }: { initial: ConfigRow[] }) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const projectId = projectIdFromPathname(pathname) ?? "";
  const openId = searchParams.get("open");
  const newOpen = searchParams.get("new") === "1";

  const { data, isLoading, mutate } = useSWR<ConfigRow[]>("/api/admin/configs", fetcher, {
    fallbackData: initial,
    dedupingInterval: 0,
  });
  const rows = data ?? [];

  const [filter, setFilter] = useState("");
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [deleting, startTransition] = useTransition();

  function setSelected(id: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (id) params.set("open", id);
    else params.delete("open");
    const qs = params.toString();
    router.replace(`${pathname}${qs ? `?${qs}` : ""}`, { scroll: false });
  }

  function setNewWizardOpen(open: boolean) {
    const params = new URLSearchParams(searchParams.toString());
    if (open) params.set("new", "1");
    else params.delete("new");
    const qs = params.toString();
    router.replace(`${pathname}${qs ? `?${qs}` : ""}`, { scroll: false });
  }

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => r.name.toLowerCase().includes(q));
  }, [rows, filter]);

  const railGroups: UnifiedListGroup<ConfigRow>[] = useMemo(() => {
    const m = new Map<string, ConfigRow[]>();
    for (const r of filtered) {
      const ns = namespaceOf(r.name);
      let arr = m.get(ns);
      if (!arr) {
        arr = [];
        m.set(ns, arr);
      }
      arr.push(r);
    }
    const groups: UnifiedListGroup<ConfigRow>[] = [];
    for (const [ns, list] of m) {
      list.sort((a, b) => a.name.localeCompare(b.name));
      groups.push({
        id: `ns:${ns}`,
        label: (
          <span className="flex items-center gap-1.5">
            <Folder className="size-3" /> {ns}
            <span className="dim-3">·</span>
            <span className="t-mono-xs dim">{list.length}</span>
          </span>
        ),
        items: list,
      });
    }
    groups.sort((a, b) => String(a.id).localeCompare(String(b.id)));
    return groups;
  }, [filtered]);

  const total = rows.length;
  const draftTotal = rows.reduce((acc, r) => acc + draftCountOf(r), 0);

  if (isLoading && total === 0) {
    return (
      <Page>
        <PageHeader
          title="Configs"
          description="Schema-driven configuration with per-environment publishing."
        />
        <PageBody>
          <UnifiedList<ConfigRow>
            items={[]}
            getId={(r) => r.id}
            columns={listColumns({ onDelete: () => {} })}
            renderRail={() => null}
            renderDetail={() => null}
            onSelect={() => {}}
            loading
          />
        </PageBody>
      </Page>
    );
  }

  if (total === 0) {
    return (
      <Page>
        <PageHeader
          title="Configs"
          description="Schema-driven configuration with per-environment publishing."
        />
        <PageBody>
          <HeroEmptyState kind="configs" ctaHref={`/dashboard/${projectId}/configs/values?new=1`} />
        </PageBody>
        <NewConfigWizard
          open={newOpen}
          onOpenChange={setNewWizardOpen}
          projectId={projectId}
          onCreated={() => mutate()}
        />
      </Page>
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

  const columns = listColumns({ onDelete: (id) => setPendingDeleteId(id) });

  return (
    <Page>
      <PageHeader
        kicker={`${total} config${total === 1 ? "" : "s"}${draftTotal ? ` · ${draftTotal} unpublished draft${draftTotal === 1 ? "" : "s"}` : ""}`}
        title="Configs"
        description="Schema-driven configuration with per-environment publishing. Edge-cached — SDK reads hit KV in under 5ms."
        actions={
          <Button size="sm" type="button" onClick={() => setNewWizardOpen(true)}>
            New config
          </Button>
        }
      />
      <PageBody>
        <UnifiedList<ConfigRow>
          items={filtered}
          getId={(r) => r.id}
          columns={columns}
          selectedId={openId}
          onSelect={setSelected}
          railHeader="Configs"
          railGroups={railGroups}
          toolbar={
            <>
              <div className="t-caps dim text-[12px]">All configs</div>
              <div className="ml-auto flex h-8 w-[240px] items-center gap-2 rounded-[var(--radius-md)] border border-[var(--se-line-2)] bg-[var(--se-bg-2)] px-2.5 text-[13px]">
                <Search className="size-3 text-[var(--se-fg-3)]" />
                <input
                  placeholder="Filter configs"
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-[var(--se-fg-4)]"
                />
              </div>
            </>
          }
          renderRail={(row, active) => <RailRow row={row} active={active} />}
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
      </PageBody>

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
    </Page>
  );
}

function listColumns({
  onDelete,
}: {
  onDelete: (id: string) => void;
}): UnifiedListColumn<ConfigRow>[] {
  return [
    {
      key: "name",
      label: "Config",
      render: (row) => {
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
      key: "fields",
      label: "Fields",
      width: 90,
      render: (row) => {
        const n = fieldCountOf(row);
        return (
          <span className="font-mono text-[11px] text-[var(--se-fg-2)]">
            {n} field{n === 1 ? "" : "s"}
          </span>
        );
      },
    },
    {
      key: "envs",
      label: "Published",
      width: 110,
      render: (row) => {
        const n = publishedEnvCount(row);
        return (
          <span className="font-mono text-[11px] text-[var(--se-fg-2)]">
            {n}/3 env{n === 1 ? "" : "s"}
          </span>
        );
      },
    },
    {
      key: "drafts",
      label: "Status",
      width: 120,
      render: (row) => {
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
      key: "updated",
      label: "Updated",
      width: 110,
      render: (row) => (
        <span className="font-mono text-[11px] text-[var(--se-fg-3)]">
          {row.updatedAt?.slice(0, 10) ?? "—"}
        </span>
      ),
    },
    {
      key: "snippet",
      label: "",
      width: 32,
      render: (row) => <IntegrationSnippetButton kind="config" name={row.name} stopPropagation />,
    },
    {
      key: "actions",
      label: "",
      width: 32,
      render: (row) => (
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
