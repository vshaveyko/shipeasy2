"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronDown,
  ChevronRight,
  Code2,
  Folder,
  MoreHorizontal,
  Pencil,
  Power,
  Search,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { deleteKillswitch } from "@/actions/killswitches";
import { KillswitchModal } from "./_components/killswitch-modal";
import { IntegrationSnippetButton, IntegrationSnippetDialog } from "@/components/integration";

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

type FolderGroup = { folder: string; rows: KillswitchRow[] };

function splitName(name: string): { folder: string; leaf: string } {
  const idx = name.indexOf(".");
  if (idx === -1) return { folder: "_default", leaf: name };
  return { folder: name.slice(0, idx), leaf: name.slice(idx + 1) };
}

function groupByFolder(rows: KillswitchRow[]): FolderGroup[] {
  const m = new Map<string, KillswitchRow[]>();
  for (const r of rows) {
    const { folder } = splitName(r.name);
    let arr = m.get(folder);
    if (!arr) {
      arr = [];
      m.set(folder, arr);
    }
    arr.push(r);
  }
  const out: FolderGroup[] = [];
  for (const [folder, group] of m) {
    group.sort((a, b) => a.name.localeCompare(b.name));
    out.push({ folder, rows: group });
  }
  out.sort((a, b) => a.folder.localeCompare(b.folder));
  return out;
}

export function KillswitchesContent({ initial }: { initial: KillswitchRow[] }) {
  const router = useRouter();
  const [filter, setFilter] = useState("");
  const [openFolders, setOpenFolders] = useState<Record<string, boolean>>(() => ({}));

  const [editing, setEditing] = useState<KillswitchRow | null>(null);
  const [snippetsFor, setSnippetsFor] = useState<KillswitchRow | null>(null);
  const [, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return initial;
    return initial.filter((r) => r.name.toLowerCase().includes(q));
  }, [initial, filter]);

  const groups = useMemo(() => groupByFolder(filtered), [filtered]);

  function isOpen(folder: string): boolean {
    if (folder in openFolders) return openFolders[folder];
    return true; // default open so users see content immediately
  }

  function toggleFolder(folder: string) {
    setOpenFolders((s) => ({ ...s, [folder]: !isOpen(folder) }));
  }

  function onDelete(row: KillswitchRow) {
    if (!confirm(`Delete killswitch "${row.name}"? This cannot be undone.`)) return;
    startTransition(async () => {
      try {
        await deleteKillswitch(row.id);
        toast.success(`Deleted ${row.name}`);
        router.refresh();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Delete failed");
      }
    });
  }

  return (
    <>
      <div className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--se-line)] bg-[var(--se-bg-1)]">
        <div className="flex items-center gap-3 border-b border-[var(--se-line)] px-4 py-3">
          <div className="text-[14px] font-medium">All killswitches</div>
          <div className="ml-auto flex h-8 w-[240px] items-center gap-2 rounded-[var(--radius-md)] border border-[var(--se-line-2)] bg-[var(--se-bg-2)] px-2.5 text-[13px]">
            <Search className="size-3 text-[var(--se-fg-3)]" />
            <input
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Filter folder.name"
              className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-[var(--se-fg-4)]"
            />
          </div>
        </div>

        <div
          className="grid gap-3 border-b border-[var(--se-line)] px-5 py-2"
          style={{
            gridTemplateColumns: "20px minmax(0,1fr) 80px 100px 110px 32px",
            background: "var(--se-bg-2)",
          }}
        >
          <span />
          <span className="t-caps dim-3">Name</span>
          <span className="t-caps dim-3">Default</span>
          <span className="t-caps dim-3">Switches</span>
          <span className="t-caps dim-3">Updated</span>
          <span />
        </div>

        {groups.map((g) => {
          const open = isOpen(g.folder);
          return (
            <div key={g.folder}>
              <button
                type="button"
                onClick={() => toggleFolder(g.folder)}
                className="grid w-full items-center gap-3 border-b border-[var(--se-line)] px-5 py-2 text-left transition-colors hover:bg-[var(--se-bg-2)]"
                style={{
                  gridTemplateColumns: "20px minmax(0,1fr) 80px 100px 110px 32px",
                }}
              >
                {open ? (
                  <ChevronDown className="size-3.5 text-[var(--se-fg-3)]" />
                ) : (
                  <ChevronRight className="size-3.5 text-[var(--se-fg-3)]" />
                )}
                <div className="flex items-center gap-2 font-mono text-[12px] font-medium text-[var(--se-fg-2)]">
                  <Folder className="size-3.5" />
                  {g.folder}
                  <span className="text-[var(--se-fg-4)]">·</span>
                  <span className="text-[11px] text-[var(--se-fg-3)]">
                    {g.rows.length} {g.rows.length === 1 ? "killswitch" : "killswitches"}
                  </span>
                </div>
                <span />
                <span />
                <span />
                <span />
              </button>

              {open
                ? g.rows.map((row) => {
                    const prod = row.envs.prod ?? row.envs.staging ?? row.envs.dev;
                    const value = prod?.value ?? false;
                    const switchCount = prod?.switches ? Object.keys(prod.switches).length : 0;
                    const { leaf } = splitName(row.name);
                    return (
                      <div
                        key={row.id}
                        data-killswitch-row={row.name}
                        className="grid items-center gap-3 border-b border-[var(--se-line)] px-5 py-3 transition-colors last:border-none hover:bg-[var(--se-bg-2)]"
                        style={{
                          gridTemplateColumns: "20px minmax(0,1fr) 80px 100px 110px 32px",
                        }}
                      >
                        <Power
                          className="size-3.5 ml-2"
                          style={{
                            color: value ? "var(--se-danger)" : "var(--se-fg-4)",
                          }}
                        />
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-[13px] font-medium">{leaf}</span>
                            {row.description ? (
                              <span className="truncate text-[11px] text-[var(--se-fg-3)]">
                                {row.description}
                              </span>
                            ) : null}
                          </div>
                        </div>
                        <span className={cn("se-badge", value ? "se-badge-killed" : "")}>
                          <span className="dot" />
                          {value ? "ON" : "OFF"}
                        </span>
                        <span className="font-mono text-[11px] text-[var(--se-fg-2)]">
                          {switchCount} {switchCount === 1 ? "switch" : "switches"}
                        </span>
                        <span className="font-mono text-[11px] text-[var(--se-fg-3)]">
                          {row.updatedAt.slice(0, 10)}
                        </span>
                        <div className="flex items-center justify-end gap-1">
                          <IntegrationSnippetButton
                            kind="killswitch"
                            name={row.name}
                            stopPropagation
                          />
                          <DropdownMenu>
                            <DropdownMenuTrigger
                              render={
                                <button
                                  type="button"
                                  aria-label="Row actions"
                                  className="grid size-7 place-items-center rounded-md text-[var(--se-fg-3)] hover:bg-[var(--se-bg-2)] hover:text-[var(--se-fg-1)]"
                                >
                                  <MoreHorizontal className="size-3.5" />
                                </button>
                              }
                            />
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => setEditing(row)}>
                                <Pencil className="size-3.5" /> Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => setSnippetsFor(row)}>
                                <Code2 className="size-3.5" /> Preview snippets
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => onDelete(row)}
                                className="text-[var(--se-danger)]"
                              >
                                <Trash2 className="size-3.5" /> Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    );
                  })
                : null}
            </div>
          );
        })}
      </div>

      {editing ? (
        <KillswitchModal
          open
          onOpenChange={(v) => {
            if (!v) setEditing(null);
          }}
          mode="edit"
          initial={{
            id: editing.id,
            name: editing.name,
            description: editing.description,
            value: (editing.envs.prod ?? editing.envs.staging ?? editing.envs.dev)?.value ?? false,
            switches:
              (editing.envs.prod ?? editing.envs.staging ?? editing.envs.dev)?.switches ?? {},
          }}
        />
      ) : null}

      {snippetsFor ? (
        <IntegrationSnippetDialog
          open
          onOpenChange={(v) => {
            if (!v) setSnippetsFor(null);
          }}
          kind="killswitch"
          name={snippetsFor.name}
        />
      ) : null}
    </>
  );
}
