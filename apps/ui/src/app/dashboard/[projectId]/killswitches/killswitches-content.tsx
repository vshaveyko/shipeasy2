"use client";

import { useMemo, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ExternalLink, Folder, MoreHorizontal, Power, Search, Trash2 } from "lucide-react";
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
import { deleteKillswitch } from "@/actions/killswitches";
import { NewKillswitchWizard } from "./new-killswitch-wizard";
import { EmbeddedKillswitchEditor } from "./embedded-killswitch-editor";

type EnvKey = "dev" | "staging" | "prod";

export type KillswitchRow = {
  id: string;
  name: string;
  description: string | null;
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

function activeEnv(row: KillswitchRow) {
  return row.envs.prod ?? row.envs.staging ?? row.envs.dev;
}

export function KillswitchesContent({ initial }: { initial: KillswitchRow[] }) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const projectId = projectIdFromPathname(pathname) ?? "";
  const openId = searchParams.get("open");
  const newOpen = searchParams.get("new") === "1";

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
    if (!q) return initial;
    return initial.filter((r) => r.name.toLowerCase().includes(q));
  }, [initial, filter]);

  const railGroups: UnifiedListGroup<KillswitchRow>[] = useMemo(() => {
    const m = new Map<string, KillswitchRow[]>();
    for (const r of filtered) {
      const { folder } = splitName(r.name);
      let arr = m.get(folder);
      if (!arr) {
        arr = [];
        m.set(folder, arr);
      }
      arr.push(r);
    }
    const groups: UnifiedListGroup<KillswitchRow>[] = [];
    for (const [folder, rows] of m) {
      rows.sort((a, b) => a.name.localeCompare(b.name));
      groups.push({
        id: `folder:${folder}`,
        label: (
          <span className="flex items-center gap-1.5">
            <Folder className="size-3" /> {folder}
            <span className="dim-3">·</span>
            <span className="t-mono-xs dim">{rows.length}</span>
          </span>
        ),
        items: rows,
      });
    }
    groups.sort((a, b) => String(a.id).localeCompare(String(b.id)));
    return groups;
  }, [filtered]);

  const total = initial.length;
  const onCount = initial.filter((r) => activeEnv(r)?.value).length;

  if (total === 0) {
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

  const pendingDelete = pendingDeleteId ? initial.find((r) => r.id === pendingDeleteId) : null;

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

  const columns = listColumns({ onDelete: (id) => setPendingDeleteId(id) });

  return (
    <Page>
      <PageHeader
        kicker={`${total} killswitch${total === 1 ? "" : "es"} · ${onCount} ON · ${total - onCount} OFF`}
        title="Killswitches"
        description="Static on/off configs delivered as-is to the client. Each can carry per-key overrides that take precedence over the default value."
        actions={
          <Button size="sm" type="button" onClick={() => setNewWizardOpen(true)}>
            New killswitch
          </Button>
        }
      />
      <PageBody>
        <UnifiedList<KillswitchRow>
          items={filtered}
          getId={(r) => r.id}
          columns={columns}
          selectedId={openId}
          onSelect={setSelected}
          railHeader="Killswitches"
          railGroups={railGroups}
          toolbar={
            <>
              <div className="t-caps dim text-[12px]">All killswitches</div>
              <div className="ml-auto flex h-8 w-[240px] items-center gap-2 rounded-[var(--radius-md)] border border-[var(--se-line-2)] bg-[var(--se-bg-2)] px-2.5 text-[13px]">
                <Search className="size-3 text-[var(--se-fg-3)]" />
                <input
                  placeholder="Filter folder.name"
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
              <Power
                className="size-3.5 shrink-0"
                style={{ color: activeEnv(row)?.value ? "var(--se-danger)" : "var(--se-fg-4)" }}
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
      </PageBody>

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
    </Page>
  );
}

function listColumns({
  onDelete,
}: {
  onDelete: (id: string) => void;
}): UnifiedListColumn<KillswitchRow>[] {
  return [
    {
      key: "name",
      label: "Killswitch",
      render: (row) => {
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
      key: "default",
      label: "Default",
      width: 100,
      render: (row) => {
        const on = Boolean(activeEnv(row)?.value);
        return on ? (
          <StatusBadge tone="killed">ON</StatusBadge>
        ) : (
          <StatusBadge tone="neutral">OFF</StatusBadge>
        );
      },
    },
    {
      key: "switches",
      label: "Switches",
      width: 100,
      render: (row) => {
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
      key: "updated",
      label: "Updated",
      width: 110,
      render: (row) => (
        <span className="font-mono text-[11px] text-[var(--se-fg-3)]">
          {row.updatedAt.slice(0, 10)}
        </span>
      ),
    },
    {
      key: "snippet",
      label: "",
      width: 32,
      render: (row) => (
        <IntegrationSnippetButton kind="killswitch" name={row.name} stopPropagation />
      ),
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

      <EmbeddedKillswitchEditor row={row} />
    </div>
  );
}
