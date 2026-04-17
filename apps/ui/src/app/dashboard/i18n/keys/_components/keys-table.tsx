"use client";

import { useState, useMemo, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronRight,
  ChevronDown,
  Trash2,
  Sparkles,
  Check,
  X,
  ChevronsUpDown,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { KeyRow, DraftKeyRow } from "@/lib/handlers/i18n";
import { updateKeyAction, upsertDraftKeyAction, deleteKeyAction } from "../actions";

// ── Types ─────────────────────────────────────────────────────────────────────

type Profile = { id: string; name: string };
type Draft = { id: string; name: string; profileId: string; status: string };

interface TreeNode {
  segment: string;
  path: string;
  children: TreeNode[];
  leaf: KeyRow | null;
  leafCount: number;
}

interface EditState {
  keyId: string;
  key: string;
  value: string;
  isDraft: boolean;
}

// ── Tree builder ──────────────────────────────────────────────────────────────

function buildTree(keys: KeyRow[]): TreeNode[] {
  type Internal = {
    segment: string;
    path: string;
    childMap: Map<string, Internal>;
    leaf: KeyRow | null;
  };

  const rootMap = new Map<string, Internal>();

  for (const key of keys) {
    const segments = key.key.split(".");
    let cur = rootMap;
    for (let i = 0; i < segments.length; i++) {
      const seg = segments[i];
      const path = segments.slice(0, i + 1).join(".");
      if (!cur.has(seg)) cur.set(seg, { segment: seg, path, childMap: new Map(), leaf: null });
      const node = cur.get(seg)!;
      if (i === segments.length - 1) node.leaf = key;
      cur = node.childMap;
    }
  }

  function materialize(map: Map<string, Internal>): TreeNode[] {
    return Array.from(map.values()).map((n) => {
      const children = materialize(n.childMap);
      const leafCount = (n.leaf ? 1 : 0) + children.reduce((s, c) => s + c.leafCount, 0);
      return { segment: n.segment, path: n.path, children, leaf: n.leaf, leafCount };
    });
  }

  return materialize(rootMap);
}

// ── Component ─────────────────────────────────────────────────────────────────

interface Props {
  profiles: Profile[];
  drafts: Draft[];
  keysByProfile: Record<string, KeyRow[]>;
  draftKeysByDraft: Record<string, DraftKeyRow[]>;
}

export function KeysTable({ profiles, drafts, keysByProfile, draftKeysByDraft }: Props) {
  const router = useRouter();
  const [profileId, setProfileId] = useState<string | null>(profiles[0]?.id ?? null);
  const [draftId, setDraftId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<EditState | null>(null);
  const [isPending, startTransition] = useTransition();

  const keys = useMemo(
    () => (profileId ? (keysByProfile[profileId] ?? []) : []),
    [profileId, keysByProfile],
  );

  const draftKeys = useMemo(
    () => (draftId ? (draftKeysByDraft[draftId] ?? []) : []),
    [draftId, draftKeysByDraft],
  );

  const draftKeyMap = useMemo(() => new Map(draftKeys.map((dk) => [dk.key, dk])), [draftKeys]);

  const filteredKeys = useMemo(() => {
    if (!search.trim()) return keys;
    const q = search.toLowerCase();
    return keys.filter((k) => k.key.toLowerCase().includes(q) || k.value.toLowerCase().includes(q));
  }, [keys, search]);

  const tree = useMemo(() => buildTree(filteredKeys), [filteredKeys]);

  // When searching, expand everything automatically
  const allPaths = useMemo(() => {
    const paths = new Set<string>();
    function collect(nodes: TreeNode[]) {
      for (const n of nodes) {
        if (n.children.length > 0) {
          paths.add(n.path);
          collect(n.children);
        }
      }
    }
    collect(tree);
    return paths;
  }, [tree]);

  const effectiveExpanded = search.trim() ? allPaths : expanded;

  const profileDrafts = useMemo(
    () => drafts.filter((d) => d.profileId === profileId && d.status === "open"),
    [drafts, profileId],
  );

  function toggle(path: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(path) ? next.delete(path) : next.add(path);
      return next;
    });
  }

  function expandAll() {
    setExpanded(new Set(allPaths));
  }

  function collapseAll() {
    setExpanded(new Set());
  }

  function startEdit(leaf: KeyRow) {
    const dk = draftKeyMap.get(leaf.key);
    const value = draftId ? (dk?.value ?? leaf.value) : leaf.value;
    setEditing({ keyId: leaf.id, key: leaf.key, value, isDraft: !!draftId });
  }

  function cancelEdit() {
    setEditing(null);
  }

  function commitEdit() {
    if (!editing) return;
    const { keyId, key, value, isDraft } = editing;
    startTransition(async () => {
      const fd = new FormData();
      if (isDraft && draftId) {
        fd.set("draftId", draftId);
        fd.set("key", key);
        fd.set("value", value);
        await upsertDraftKeyAction(fd);
      } else {
        fd.set("id", keyId);
        fd.set("value", value);
        await updateKeyAction(fd);
      }
      setEditing(null);
      router.refresh();
    });
  }

  // ── Row renderer ──────────────────────────────────────────────────────────

  function renderNodes(nodes: TreeNode[], depth: number): React.ReactNode {
    return nodes.map((node) => {
      const isOpen = effectiveExpanded.has(node.path);
      const hasKids = node.children.length > 0;
      const isEditing = editing?.keyId === node.leaf?.id;
      const draftKey = node.leaf ? draftKeyMap.get(node.leaf.key) : undefined;
      const hasDraft = !!draftKey;

      return (
        <div key={node.path}>
          <div
            className={cn(
              "group flex min-h-10 items-start border-b last:border-0",
              isEditing ? "bg-blue-50/60 dark:bg-blue-950/20" : "hover:bg-muted/30",
            )}
          >
            {/* Indent spacer */}
            <div className="shrink-0" style={{ width: depth * 20 }} />

            {/* Chevron */}
            <div className="flex size-8 shrink-0 items-center justify-center">
              {hasKids && (
                <button
                  onClick={() => toggle(node.path)}
                  className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                  aria-label={isOpen ? "Collapse" : "Expand"}
                >
                  {isOpen ? (
                    <ChevronDown className="size-3.5" />
                  ) : (
                    <ChevronRight className="size-3.5" />
                  )}
                </button>
              )}
            </div>

            {/* Key segment */}
            <button
              className={cn(
                "flex min-w-0 shrink-0 flex-col py-2.5 pr-4 text-left",
                hasKids ? "w-44 cursor-pointer" : "w-40 cursor-default",
              )}
              onClick={() => hasKids && toggle(node.path)}
              title={node.path}
            >
              <span
                className={cn(
                  "truncate font-mono text-xs",
                  hasKids ? "font-semibold text-foreground" : "text-muted-foreground",
                )}
              >
                {node.segment}
                {hasKids && (
                  <span className="ml-1.5 font-normal text-muted-foreground/50">
                    {node.leafCount}
                  </span>
                )}
              </span>
              {node.leaf?.description && !hasKids && (
                <span className="mt-0.5 truncate text-[10px] text-muted-foreground/50">
                  {node.leaf.description}
                </span>
              )}
            </button>

            {/* Value area (leaves only) */}
            {!hasKids && node.leaf ? (
              <div className="flex min-w-0 flex-1 flex-col py-2 pr-2">
                {/* Published reference shown only in draft mode */}
                {draftId && (
                  <div className="mb-1.5 flex items-baseline gap-1.5">
                    <span className="shrink-0 font-mono text-[9px] font-medium uppercase tracking-wider text-muted-foreground/40">
                      ref
                    </span>
                    <span className="line-clamp-2 break-all text-xs text-muted-foreground/60">
                      {node.leaf.value || <em>empty</em>}
                    </span>
                  </div>
                )}

                {/* Editable value */}
                {isEditing ? (
                  <textarea
                    autoFocus
                    value={editing!.value}
                    rows={2}
                    onChange={(e) =>
                      setEditing((prev) => (prev ? { ...prev, value: e.target.value } : prev))
                    }
                    onKeyDown={(e) => {
                      if (e.key === "Escape") cancelEdit();
                      if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) commitEdit();
                    }}
                    className="w-full resize-none rounded-md border border-ring bg-background px-2 py-1.5 text-sm leading-snug outline-none ring-2 ring-ring/20 focus:ring-ring/40"
                  />
                ) : (
                  <button
                    onClick={() => startEdit(node.leaf!)}
                    className="min-h-5 rounded px-1.5 py-0.5 -ml-1.5 text-left text-sm hover:bg-muted/60"
                    title="Click to edit"
                  >
                    {draftId ? (
                      hasDraft ? (
                        <span className="break-all leading-snug">{draftKey!.value}</span>
                      ) : (
                        <span className="italic text-muted-foreground/40">click to translate…</span>
                      )
                    ) : node.leaf.value ? (
                      <span className="break-all leading-snug">{node.leaf.value}</span>
                    ) : (
                      <span className="italic text-muted-foreground/40">empty</span>
                    )}
                  </button>
                )}
              </div>
            ) : (
              <div className="flex-1" />
            )}

            {/* Draft dot */}
            {draftId && !hasKids && hasDraft && !isEditing && (
              <div className="flex shrink-0 items-center py-3 pr-1">
                <div
                  className="size-1.5 rounded-full bg-amber-400 dark:bg-amber-500"
                  title="Draft value exists"
                />
              </div>
            )}

            {/* Actions */}
            <div className="flex shrink-0 items-center gap-0.5 py-2 pr-1.5">
              {!hasKids && isEditing ? (
                <>
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    onClick={commitEdit}
                    disabled={isPending}
                    aria-label="Save (Ctrl+Enter)"
                    title="Save (Ctrl+Enter)"
                  >
                    <Check className="size-3.5 text-green-600 dark:text-green-400" />
                  </Button>
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    onClick={cancelEdit}
                    aria-label="Cancel (Esc)"
                    title="Cancel (Esc)"
                  >
                    <X className="size-3.5" />
                  </Button>
                </>
              ) : !hasKids && node.leaf ? (
                <>
                  {draftId && (
                    <Button
                      size="icon-xs"
                      variant="ghost"
                      disabled
                      title="Translate with AI (coming soon)"
                      className="opacity-0 transition-opacity group-hover:opacity-100"
                    >
                      <Sparkles className="size-3 text-violet-500" />
                    </Button>
                  )}
                  <form action={deleteKeyAction}>
                    <input type="hidden" name="id" value={node.leaf.id} />
                    <Button
                      size="icon-xs"
                      variant="ghost"
                      type="submit"
                      aria-label={`Delete ${node.leaf.key}`}
                      className="opacity-0 transition-opacity group-hover:opacity-100"
                    >
                      <Trash2 className="size-3 text-destructive" />
                    </Button>
                  </form>
                </>
              ) : null}
            </div>
          </div>

          {/* Recursive children */}
          {hasKids && isOpen && renderNodes(node.children, depth + 1)}
        </div>
      );
    });
  }

  // ── Render ────────────────────────────────────────────────────────────────

  if (profiles.length === 0) {
    return (
      <div className="rounded-lg border py-12 text-center text-sm text-muted-foreground">
        No profiles yet.{" "}
        <a href="/dashboard/i18n/profiles/new" className="underline underline-offset-4">
          Create a profile
        </a>{" "}
        to start managing keys.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* ── Profile tabs + Draft selector ── */}
      <div className="flex flex-wrap items-center gap-1.5 border-b pb-3">
        <div className="flex flex-wrap gap-1">
          {profiles.map((p) => (
            <button
              key={p.id}
              onClick={() => {
                setProfileId(p.id);
                setDraftId(null);
                setEditing(null);
              }}
              className={cn(
                "rounded-lg px-3 py-1 font-mono text-xs font-medium transition-colors",
                profileId === p.id
                  ? "bg-primary text-primary-foreground"
                  : "border border-transparent text-muted-foreground hover:border-border hover:bg-muted hover:text-foreground",
              )}
            >
              {p.name}
            </button>
          ))}
        </div>

        {profileId && profileDrafts.length > 0 && (
          <>
            <span className="mx-1 text-border">|</span>
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-muted-foreground">Draft</span>
              <select
                value={draftId ?? ""}
                onChange={(e) => {
                  setDraftId(e.target.value || null);
                  setEditing(null);
                }}
                className="h-7 rounded-lg border border-input bg-transparent px-2 text-xs outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/20"
              >
                <option value="">Published</option>
                {profileDrafts.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>
          </>
        )}

        <div className="ml-auto">
          <Button size="sm" variant="outline" disabled className="gap-1.5 text-xs">
            <Sparkles className="size-3.5 text-violet-500" />
            Translate with AI
          </Button>
        </div>
      </div>

      {/* ── Toolbar ── */}
      <div className="flex items-center gap-2">
        <div className="relative">
          <svg
            className="pointer-events-none absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            type="text"
            placeholder="Filter keys…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-7 w-52 rounded-lg border border-input bg-transparent pl-7 pr-2.5 text-xs outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/20"
          />
        </div>

        <button
          onClick={expanded.size > 0 ? collapseAll : expandAll}
          className="flex items-center gap-1 rounded-lg border border-transparent px-2 py-1 text-xs text-muted-foreground hover:border-border hover:bg-muted hover:text-foreground"
          title={expanded.size > 0 ? "Collapse all" : "Expand all"}
        >
          <ChevronsUpDown className="size-3" />
          {expanded.size > 0 ? "Collapse" : "Expand"}
        </button>

        <span className="text-xs text-muted-foreground">
          {filteredKeys.length} {filteredKeys.length === 1 ? "key" : "keys"}
        </span>

        {draftId && (
          <span className="ml-auto flex items-center gap-1 text-xs text-muted-foreground">
            <span className="size-1.5 rounded-full bg-amber-400" />
            has draft
          </span>
        )}
      </div>

      {/* ── Table ── */}
      {!profileId ? (
        <div className="rounded-lg border py-12 text-center text-sm text-muted-foreground">
          Select a profile above.
        </div>
      ) : filteredKeys.length === 0 ? (
        <div className="rounded-lg border py-12 text-center text-sm text-muted-foreground">
          {search.trim() ? "No keys match your filter." : "No keys for this profile."}
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border text-sm">
          {/* Header */}
          <div className="flex items-center gap-0 border-b bg-muted/50">
            <div className="w-8 shrink-0" />
            <div className="w-8 shrink-0" />
            <div className="w-40 shrink-0 py-2.5 pr-4 text-xs font-medium text-muted-foreground">
              Key
            </div>
            <div className="flex-1 py-2.5 text-xs font-medium text-muted-foreground">
              {draftId ? (
                <span>
                  <span className="text-muted-foreground/50">Published</span>
                  {" → "}
                  <span>Draft</span>
                </span>
              ) : (
                "Value"
              )}
            </div>
            <div className="w-16 shrink-0 py-2.5 pr-1.5 text-right text-xs font-medium text-muted-foreground" />
          </div>

          {renderNodes(tree, 0)}
        </div>
      )}

      {/* Draft hint */}
      {draftId && (
        <p className="text-xs text-muted-foreground/60">
          Editing draft. Changes won&apos;t affect the published profile until merged.{" "}
          <kbd className="rounded border px-1 font-mono text-[10px]">Ctrl+Enter</kbd> to save,{" "}
          <kbd className="rounded border px-1 font-mono text-[10px]">Esc</kbd> to cancel.
        </p>
      )}
    </div>
  );
}
