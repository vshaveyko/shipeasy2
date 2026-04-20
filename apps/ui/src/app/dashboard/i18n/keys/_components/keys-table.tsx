"use client";

import { useState, useMemo, useRef, useCallback, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useVirtualizer } from "@tanstack/react-virtual";
import {
  ChevronRight,
  ChevronDown,
  Trash2,
  Sparkles,
  Check,
  X,
  ChevronsUpDown,
  Loader2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { KeyRow, DraftKeyRow } from "@/lib/handlers/i18n";
import {
  bulkDeleteKeysAction,
  updateKeyAction,
  upsertDraftKeyAction,
  deleteKeyAction,
} from "../actions";
import { useShipEasyI18n } from "@shipeasy/i18n-react";
import type { BulkAction } from "./bulk-actions";
import { BulkActionsBar } from "./bulk-actions-bar";
import { RowCheckbox } from "./row-checkbox";

// ── Types ──────────────────────────────────────────────────────────────────────

type Profile = { id: string; name: string };
type Draft = { id: string; name: string; profileId: string; status: string };
type Section = {
  prefix: string;
  count: number;
  soleId: string | null;
  soleKey: string | null;
  soleValue: string | null;
  soleDescription: string | null;
  soleVariables: string[] | null;
  soleProfileId: string | null;
  soleChunkId: string | null;
  soleUpdatedAt: string | null;
  soleUpdatedBy: string | null;
};

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

// Flat rows fed to the virtualizer
type FlatRow =
  | {
      kind: "folder";
      path: string;
      segment: string;
      depth: number;
      isOpen: boolean;
      leafCount: number;
      loaded: boolean;
    }
  | { kind: "leaf"; node: TreeNode; depth: number; displayKey?: string }
  | { kind: "loading"; path: string; depth: number }
  | { kind: "load-more"; prefix: string; depth: number; loaded: number; total: number };

// ── Tree helpers ───────────────────────────────────────────────────────────────

function findSingleLeaf(node: TreeNode): TreeNode | null {
  if (node.leaf) return node;
  for (const child of node.children) {
    const found = findSingleLeaf(child);
    if (found) return found;
  }
  return null;
}

function buildTree(keys: KeyRow[]): TreeNode[] {
  type Internal = {
    segment: string;
    path: string;
    childMap: Map<string, Internal>;
    leaf: KeyRow | null;
  };
  const rootMap = new Map<string, Internal>();
  for (const key of keys) {
    const segs = key.key.split(".");
    let cur = rootMap;
    for (let i = 0; i < segs.length; i++) {
      const seg = segs[i];
      const path = segs.slice(0, i + 1).join(".");
      if (!cur.has(seg)) cur.set(seg, { segment: seg, path, childMap: new Map(), leaf: null });
      const node = cur.get(seg)!;
      if (i === segs.length - 1) node.leaf = key;
      cur = node.childMap;
    }
  }
  function mat(map: Map<string, Internal>): TreeNode[] {
    return Array.from(map.values()).map((n) => {
      const children = mat(n.childMap);
      return {
        segment: n.segment,
        path: n.path,
        children,
        leaf: n.leaf,
        leafCount: (n.leaf ? 1 : 0) + children.reduce((s, c) => s + c.leafCount, 0),
      };
    });
  }
  return mat(rootMap);
}

function flattenSubtree(
  rows: FlatRow[],
  nodes: TreeNode[],
  depth: number,
  expanded: Set<string>,
): void {
  for (const node of nodes) {
    const hasKids = node.children.length > 0;
    if (hasKids) {
      // Collapse folders that contain exactly one key — show the leaf directly.
      if (node.leafCount === 1) {
        const single = findSingleLeaf(node);
        if (single?.leaf) {
          rows.push({ kind: "leaf", node: single, depth, displayKey: single.leaf.key });
          continue;
        }
      }
      const isOpen = expanded.has(node.path);
      rows.push({
        kind: "folder",
        path: node.path,
        segment: node.segment,
        depth,
        isOpen,
        leafCount: node.leafCount,
        loaded: true,
      });
      if (isOpen) flattenSubtree(rows, node.children, depth + 1, expanded);
    } else if (node.leaf) {
      rows.push({ kind: "leaf", node, depth });
    }
  }
}

function buildFlatRows(
  sections: Section[],
  sectionTrees: Map<string, TreeNode[]>,
  sectionPages: Map<string, { keys: KeyRow[]; total: number }>,
  expanded: Set<string>,
  loadingPaths: Set<string>,
): FlatRow[] {
  // Section folder rows are rendered in the nav panel above — only emit content.
  const rows: FlatRow[] = [];
  for (const sec of sections) {
    if (!expanded.has(sec.prefix)) continue;

    // Single-key sections: sole key data is embedded — render directly.
    if (sec.count === 1 && sec.soleId && sec.soleKey) {
      const soleKeyRow: KeyRow = {
        id: sec.soleId,
        key: sec.soleKey,
        value: sec.soleValue ?? "",
        description: sec.soleDescription ?? null,
        variables: sec.soleVariables,
        updatedAt: sec.soleUpdatedAt ?? "",
        updatedBy: sec.soleUpdatedBy ?? "",
        profileId: sec.soleProfileId ?? "",
        profileName: null,
        chunkId: sec.soleChunkId ?? "",
        chunkName: null,
      };
      const soleNode: TreeNode = {
        segment: sec.soleKey.split(".").pop() ?? sec.soleKey,
        path: sec.soleKey,
        children: [],
        leaf: soleKeyRow,
        leafCount: 1,
      };
      rows.push({ kind: "leaf", node: soleNode, depth: 0, displayKey: sec.soleKey });
      continue;
    }

    const tree = sectionTrees.get(sec.prefix);
    const page = sectionPages.get(sec.prefix);
    if (loadingPaths.has(sec.prefix)) {
      rows.push({ kind: "loading", path: sec.prefix, depth: 0 });
    } else if (tree) {
      flattenSubtree(rows, tree, 0, expanded);
      if (page && page.keys.length < page.total) {
        rows.push({
          kind: "load-more",
          prefix: sec.prefix,
          depth: 0,
          loaded: page.keys.length,
          total: page.total,
        });
      }
    }
  }
  return rows;
}

// Search results: tree fully expanded (backend already filtered)
function buildSearchFlatRows(keys: KeyRow[]): FlatRow[] {
  const rows: FlatRow[] = [];
  function expand(nodes: TreeNode[], depth: number) {
    for (const node of nodes) {
      if (node.children.length > 0) {
        if (node.leafCount === 1) {
          const single = findSingleLeaf(node);
          if (single?.leaf) {
            rows.push({ kind: "leaf", node: single, depth, displayKey: single.leaf.key });
            continue;
          }
        }
        rows.push({
          kind: "folder",
          path: node.path,
          segment: node.segment,
          depth,
          isOpen: true,
          leafCount: node.leafCount,
          loaded: true,
        });
        expand(node.children, depth + 1);
      } else if (node.leaf) {
        rows.push({ kind: "leaf", node, depth });
      }
    }
  }
  expand(buildTree(keys), 0);
  return rows;
}

// Collect all leaf KeyRow objects visible in flatRows
function visibleLeaves(rows: FlatRow[]): KeyRow[] {
  const out: KeyRow[] = [];
  for (const r of rows) {
    if (r.kind === "leaf" && r.node.leaf) out.push(r.node.leaf);
  }
  return out;
}

// All leaf IDs under a section (from its tree)
function leafIdsInTree(nodes: TreeNode[]): string[] {
  const out: string[] = [];
  const walk = (n: TreeNode) => {
    if (n.leaf) out.push(n.leaf.id);
    for (const c of n.children) walk(c);
  };
  for (const n of nodes) walk(n);
  return out;
}

function nodeSelection(node: TreeNode, selected: Set<string>): "none" | "some" | "all" {
  const ids = leafIdsInTree([node]);
  if (!ids.length) return "none";
  let hit = 0;
  for (const id of ids) if (selected.has(id)) hit++;
  if (hit === 0) return "none";
  if (hit === ids.length) return "all";
  return "some";
}

// ── Component ──────────────────────────────────────────────────────────────────

interface Props {
  profiles: Profile[];
  drafts: Draft[];
  draftKeysByDraft: Record<string, DraftKeyRow[]>;
}

export function KeysTable({ profiles, drafts, draftKeysByDraft }: Props) {
  const { t } = useShipEasyI18n();
  const router = useRouter();

  const [profileId, setProfileId] = useState<string | null>(profiles[0]?.id ?? null);
  const [draftId, setDraftId] = useState<string | null>(null);

  // ── Sections + lazy tree data ──────────────────────────────────────────────
  // sections by profileId
  const [sectionsByProfile, setSectionsByProfile] = useState<Map<string, Section[]>>(new Map());
  // paginated key pages by "profileId:prefix"
  const [sectionPages, setSectionPages] = useState<Map<string, { keys: KeyRow[]; total: number }>>(
    new Map(),
  );
  // derived trees — kept in sync with sectionPages
  const sectionTrees = useMemo(() => {
    const map = new Map<string, TreeNode[]>();
    for (const [k, page] of sectionPages) map.set(k, buildTree(page.keys));
    return map;
  }, [sectionPages]);
  // currently fetching
  const [loadingPaths, setLoadingPaths] = useState<Set<string>>(new Set());
  const [loadingSections, setLoadingSections] = useState(false);

  // ── UI state ───────────────────────────────────────────────────────────────
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [searchResults, setSearchResults] = useState<KeyRow[] | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [editing, setEditing] = useState<EditState | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [isPending, startTransition] = useTransition();

  const scrollRef = useRef<HTMLDivElement>(null);

  // ── Derived section key ────────────────────────────────────────────────────
  const treeKey = useCallback((prefix: string) => `${profileId}:${prefix}`, [profileId]);

  const sections = profileId ? (sectionsByProfile.get(profileId) ?? []) : [];

  // ── Debounce search input ──────────────────────────────────────────────────
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchInput), 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  // ── Backend search ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!debouncedSearch.trim() || !profileId) {
      setSearchResults(null);
      return;
    }
    setSearchLoading(true);
    fetch(
      `/api/admin/i18n/keys?profile_id=${profileId}&q=${encodeURIComponent(debouncedSearch)}&limit=500`,
    )
      .then((r) => r.json() as Promise<{ keys: KeyRow[]; total: number }>)
      .then((data) => setSearchResults(data.keys))
      .catch(console.error)
      .finally(() => setSearchLoading(false));
  }, [debouncedSearch, profileId]);

  // ── Load sections for current profile ─────────────────────────────────────
  useEffect(() => {
    if (!profileId) return;
    if (sectionsByProfile.has(profileId)) return;
    setLoadingSections(true);
    fetch(`/api/admin/i18n/keys/sections?profile_id=${profileId}`)
      .then((r) => r.json() as Promise<Section[]>)
      .then((data) => {
        setSectionsByProfile((prev) => new Map(prev).set(profileId, data));
      })
      .catch(console.error)
      .finally(() => setLoadingSections(false));
  }, [profileId, sectionsByProfile]);

  // ── Load keys for a section on expand ─────────────────────────────────────
  const loadSection = useCallback(
    (prefix: string, offset = 0) => {
      const key = treeKey(prefix);
      if (loadingPaths.has(prefix)) return;
      if (offset === 0 && sectionPages.has(key)) return;
      setLoadingPaths((prev) => new Set(prev).add(prefix));
      fetch(
        `/api/admin/i18n/keys?profile_id=${profileId}&prefix=${encodeURIComponent(prefix)}&limit=200&offset=${offset}`,
      )
        .then((r) => r.json() as Promise<{ keys: KeyRow[]; total: number }>)
        .then((page) => {
          setSectionPages((prev) => {
            const existing = prev.get(key);
            if (offset > 0 && existing) {
              return new Map(prev).set(key, {
                keys: [...existing.keys, ...page.keys],
                total: page.total,
              });
            }
            return new Map(prev).set(key, page);
          });
        })
        .catch(console.error)
        .finally(() =>
          setLoadingPaths((prev) => {
            const next = new Set(prev);
            next.delete(prefix);
            return next;
          }),
        );
    },
    [profileId, sectionPages, loadingPaths, treeKey],
  );

  // Re-load trees for sections that are expanded but whose cache was invalidated.
  useEffect(() => {
    if (!profileId || !sections.length) return;
    for (const path of expanded) {
      const topLevel = path.split(".")[0];
      const key = treeKey(topLevel);
      if (!sectionTrees.has(key) && !loadingPaths.has(topLevel)) {
        loadSection(topLevel);
      }
    }
  }, [profileId, sections, expanded, sectionTrees, loadingPaths, treeKey, loadSection]);

  // ── Flat rows for virtualizer ───────────────────────────────────────────────
  // Strip the "profileId:" prefix so buildFlatRows gets clean "prefix → tree" maps.
  const profileTreesMap = useMemo(
    () =>
      new Map(
        Array.from(sectionTrees.entries())
          .filter(([k]) => k.startsWith(`${profileId}:`))
          .map(([k, v]) => [k.slice(profileId!.length + 1), v]),
      ),
    [sectionTrees, profileId],
  );

  const profilePagesMap = useMemo(
    () =>
      new Map(
        Array.from(sectionPages.entries())
          .filter(([k]) => k.startsWith(`${profileId}:`))
          .map(([k, v]) => [k.slice(profileId!.length + 1), v]),
      ),
    [sectionPages, profileId],
  );

  const flatRows = useMemo(
    () =>
      searchResults !== null
        ? buildSearchFlatRows(searchResults)
        : buildFlatRows(sections, profileTreesMap, profilePagesMap, expanded, loadingPaths),
    [searchResults, sections, profileTreesMap, profilePagesMap, expanded, loadingPaths],
  );

  const visLeaves = useMemo(() => visibleLeaves(flatRows), [flatRows]);

  // ── Draft helpers ──────────────────────────────────────────────────────────
  const draftKeys = useMemo(
    () => (draftId ? (draftKeysByDraft[draftId] ?? []) : []),
    [draftId, draftKeysByDraft],
  );
  const draftKeyMap = useMemo(() => new Map(draftKeys.map((dk) => [dk.key, dk])), [draftKeys]);

  const profileDrafts = useMemo(
    () => drafts.filter((d) => d.profileId === profileId && d.status === "open"),
    [drafts, profileId],
  );

  // ── Expand / collapse ──────────────────────────────────────────────────────
  function toggleFolder(path: string, isSection: boolean) {
    const willOpen = !expanded.has(path);
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(path) ? next.delete(path) : next.add(path);
      return next;
    });
    if (willOpen && isSection) loadSection(path);
  }

  function expandAll() {
    const all = new Set<string>();
    for (const sec of sections) {
      all.add(sec.prefix);
      loadSection(sec.prefix);
      const tree = sectionTrees.get(treeKey(sec.prefix));
      if (tree) {
        const cf = (nodes: TreeNode[]) => {
          for (const n of nodes) {
            if (n.children.length > 0) {
              all.add(n.path);
              cf(n.children);
            }
          }
        };
        cf(tree);
      }
    }
    setExpanded(all);
  }

  function collapseAll() {
    setExpanded(new Set());
  }

  // ── Editing ────────────────────────────────────────────────────────────────
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

  // ── Selection ──────────────────────────────────────────────────────────────
  function toggleLeaf(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleNode(node: TreeNode) {
    const ids = leafIdsInTree([node]);
    setSelected((prev) => {
      const next = new Set(prev);
      const allSel = ids.every((id) => next.has(id));
      if (allSel) ids.forEach((id) => next.delete(id));
      else ids.forEach((id) => next.add(id));
      return next;
    });
  }

  function toggleSection(sec: Section) {
    // Single-key section: use the embedded sole id directly.
    if (sec.count === 1 && sec.soleId) {
      setSelected((prev) => {
        const next = new Set(prev);
        if (next.has(sec.soleId!)) next.delete(sec.soleId!);
        else next.add(sec.soleId!);
        return next;
      });
      return;
    }
    const key = treeKey(sec.prefix);
    const tree = sectionTrees.get(key) ?? [];
    const ids = leafIdsInTree(tree);
    const page = sectionPages.get(key);
    const fullyLoaded = page && page.keys.length >= page.total;
    if (!fullyLoaded && page && page.keys.length < page.total) {
      // Load remaining pages, then select — fire async without blocking UI.
      const loadAll = async () => {
        let offset = page.keys.length;
        while (offset < page.total) {
          await new Promise<void>((resolve) => {
            fetch(
              `/api/admin/i18n/keys?profile_id=${profileId}&prefix=${encodeURIComponent(sec.prefix)}&limit=200&offset=${offset}`,
            )
              .then((r) => r.json() as Promise<{ keys: KeyRow[]; total: number }>)
              .then((p) => {
                setSectionPages((prev) => {
                  const ex = prev.get(key);
                  return new Map(prev).set(key, {
                    keys: ex ? [...ex.keys, ...p.keys] : p.keys,
                    total: p.total,
                  });
                });
                offset += p.keys.length;
              })
              .catch(console.error)
              .finally(resolve);
          });
        }
        // After all pages loaded, select all.
        setSectionPages((snapshot) => {
          const all = leafIdsInTree(buildTree((snapshot.get(key) ?? { keys: [] }).keys));
          setSelected((prev) => {
            const next = new Set(prev);
            all.forEach((id) => next.add(id));
            return next;
          });
          return snapshot;
        });
      };
      void loadAll();
      return;
    }
    setSelected((prev) => {
      const next = new Set(prev);
      const allSel = ids.length > 0 && ids.every((id) => next.has(id));
      if (allSel) ids.forEach((id) => next.delete(id));
      else ids.forEach((id) => next.add(id));
      return next;
    });
  }

  function clearSelection() {
    setSelected(new Set());
  }

  // All loaded keys for the current profile (including from collapsed sections).
  const allLoadedKeys = useMemo(() => {
    const out: KeyRow[] = [];
    // Sole-key sections — use embedded data.
    for (const sec of sections) {
      if (sec.count === 1 && sec.soleId && sec.soleKey) {
        out.push({
          id: sec.soleId,
          key: sec.soleKey,
          value: sec.soleValue ?? "",
          description: sec.soleDescription ?? null,
          variables: sec.soleVariables,
          updatedAt: sec.soleUpdatedAt ?? "",
          updatedBy: sec.soleUpdatedBy ?? "",
          profileId: sec.soleProfileId ?? "",
          profileName: null,
          chunkId: sec.soleChunkId ?? "",
          chunkName: null,
        });
      }
    }
    for (const page of profilePagesMap.values()) {
      for (const k of page.keys) out.push(k);
    }
    return out;
  }, [sections, profilePagesMap]);

  const selectedKeys = useMemo(
    () => allLoadedKeys.filter((k) => selected.has(k.id)),
    [allLoadedKeys, selected],
  );

  // select-all header: only operates on currently visible leaves
  const allVisibleSelected = visLeaves.length > 0 && visLeaves.every((k) => selected.has(k.id));
  const someVisibleSelected = visLeaves.some((k) => selected.has(k.id));

  // ── Bulk actions ───────────────────────────────────────────────────────────
  const bulkActions = useMemo<BulkAction<KeyRow>[]>(
    () => [
      {
        id: "delete",
        label: "Delete",
        icon: Trash2,
        variant: "destructive",
        confirm: (items) =>
          `Delete ${items.length} key${items.length === 1 ? "" : "s"}? This cannot be undone.`,
        run: async (items) => {
          const fd = new FormData();
          for (const k of items) fd.append("ids", k.id);
          await bulkDeleteKeysAction(fd);
          // Invalidate loaded pages for affected sections so they reload
          const affectedPrefixes = new Set(items.map((k) => k.key.split(".")[0]));
          setSectionPages((prev) => {
            const next = new Map(prev);
            for (const p of affectedPrefixes) next.delete(treeKey(p));
            return next;
          });
          setSectionsByProfile((prev) => {
            const next = new Map(prev);
            next.delete(profileId!);
            return next;
          });
          router.refresh();
        },
      },
    ],
    [router, treeKey, profileId],
  );

  // ── Virtualizer ────────────────────────────────────────────────────────────
  const rowVirtualizer = useVirtualizer({
    count: flatRows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 40,
    overscan: 8,
  });

  // ── Row renderer ───────────────────────────────────────────────────────────

  function renderFolderRow(row: Extract<FlatRow, { kind: "folder" }>) {
    const { path, segment, depth, isOpen, leafCount, loaded } = row;
    const isSection = depth === 0;

    // For section-level selection
    const sectionKey = treeKey(depth === 0 ? path : path.split(".")[0]);
    const sectionTree = sectionTrees.get(sectionKey) ?? [];

    // Determine checkbox state for this folder
    let sel: "none" | "some" | "all" = "none";
    if (loaded && !isSection) {
      // find node in its parent tree
      const parentKey = treeKey(path.split(".")[0]);
      const tree = sectionTrees.get(parentKey) ?? [];
      const findNode = (nodes: TreeNode[]): TreeNode | null => {
        for (const n of nodes) {
          if (n.path === path) return n;
          const found = findNode(n.children);
          if (found) return found;
        }
        return null;
      };
      const node = findNode(tree);
      if (node) sel = nodeSelection(node, selected);
    } else if (isSection && sectionTree.length > 0) {
      const ids = leafIdsInTree(sectionTree);
      const hit = ids.filter((id) => selected.has(id)).length;
      sel = hit === 0 ? "none" : hit === ids.length ? "all" : "some";
    }

    return (
      <div className="flex min-h-10 items-center border-b last:border-0 hover:bg-muted/30">
        <div className="shrink-0" style={{ width: depth * 20 }} />
        {/* Checkbox */}
        <div className="flex size-8 shrink-0 items-center justify-center">
          {loaded || (isSection && sectionTree.length > 0) ? (
            <RowCheckbox
              checked={sel === "all"}
              indeterminate={sel === "some"}
              onChange={() => {
                if (isSection) {
                  const sec = sections.find((s) => s.prefix === path);
                  if (sec) toggleSection(sec);
                } else {
                  // Find the node in its section tree and toggle it
                  const parentKey = treeKey(path.split(".")[0]);
                  const tree = sectionTrees.get(parentKey) ?? [];
                  const findNode = (nodes: TreeNode[]): TreeNode | null => {
                    for (const n of nodes) {
                      if (n.path === path) return n;
                      const f = findNode(n.children);
                      if (f) return f;
                    }
                    return null;
                  };
                  const node = findNode(tree);
                  if (node) toggleNode(node);
                }
              }}
              ariaLabel={`Select subtree ${path}`}
            />
          ) : (
            <div className="size-3.5" />
          )}
        </div>
        {/* Chevron */}
        <button
          onClick={() => toggleFolder(path, isSection)}
          className="flex size-8 shrink-0 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground"
          aria-label={isOpen ? "Collapse" : "Expand"}
        >
          {isOpen ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />}
        </button>
        {/* Label */}
        <button
          onClick={() => toggleFolder(path, isSection)}
          className="min-w-0 flex-1 py-2.5 text-left"
        >
          <span className="font-mono text-xs font-semibold text-foreground">
            {segment}
            <span className="ml-1.5 font-normal text-muted-foreground/50">{leafCount}</span>
          </span>
        </button>
      </div>
    );
  }

  function renderLeafRow(row: Extract<FlatRow, { kind: "leaf" }>) {
    const { node, depth, displayKey } = row;
    const leaf = node.leaf!;
    const isEditing = editing?.keyId === leaf.id;
    const draftKey = draftKeyMap.get(leaf.key);
    const hasDraft = !!draftKey;
    const sel = selected.has(leaf.id);

    return (
      <div
        className={cn(
          "group flex min-h-10 items-start border-b last:border-0",
          isEditing ? "bg-blue-50/60 dark:bg-blue-950/20" : "hover:bg-muted/30",
        )}
      >
        <div className="shrink-0" style={{ width: depth * 20 }} />
        {/* Checkbox */}
        <div className="flex size-8 shrink-0 items-center justify-center">
          <RowCheckbox
            checked={sel}
            onChange={() => toggleLeaf(leaf.id)}
            ariaLabel={`Select key ${leaf.key}`}
          />
        </div>
        {/* No chevron — align with folder rows */}
        <div className="size-8 shrink-0" />
        {/* Key */}
        <button className="w-40 shrink-0 cursor-default py-2.5 pr-4 text-left" title={leaf.key}>
          <span className="truncate font-mono text-xs text-muted-foreground">
            {displayKey ?? node.segment}
          </span>
          {leaf.description && (
            <span className="mt-0.5 block truncate text-[10px] text-muted-foreground/50">
              {leaf.description}
            </span>
          )}
        </button>
        {/* Value */}
        <div className="flex min-w-0 flex-1 flex-col py-2 pr-2">
          {draftId && (
            <div className="mb-1.5 flex items-baseline gap-1.5">
              <span className="shrink-0 font-mono text-[9px] font-medium uppercase tracking-wider text-muted-foreground/40">
                ref
              </span>
              <span className="line-clamp-2 break-all text-xs text-muted-foreground/60">
                {leaf.value || <em>{t("common.empty")}</em>}
              </span>
            </div>
          )}
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
              onClick={() => startEdit(leaf)}
              className="-ml-1.5 min-h-5 rounded px-1.5 py-0.5 text-left text-sm hover:bg-muted/60"
              title={t("app.dashboard.i18n.keys._components.click_to_edit")}
            >
              {draftId ? (
                hasDraft ? (
                  <span className="break-all leading-snug">{draftKey!.value}</span>
                ) : (
                  <span className="italic text-muted-foreground/40">
                    {t("app.dashboard.i18n.keys._components.click_to_translate")}
                  </span>
                )
              ) : leaf.value ? (
                <span className="break-all leading-snug">{leaf.value}</span>
              ) : (
                <span className="italic text-muted-foreground/40">{t("common.empty")}</span>
              )}
            </button>
          )}
        </div>
        {/* Draft dot */}
        {draftId && hasDraft && !isEditing && (
          <div className="flex shrink-0 items-center py-3 pr-1">
            <div
              className="size-1.5 rounded-full bg-amber-400 dark:bg-amber-500"
              title={t("app.dashboard.i18n.keys._components.draft_value_exists")}
            />
          </div>
        )}
        {/* Actions */}
        <div className="flex shrink-0 items-center gap-0.5 py-2 pr-1.5">
          {isEditing ? (
            <>
              <Button
                size="icon-sm"
                variant="ghost"
                onClick={commitEdit}
                disabled={isPending}
                aria-label={t("app.dashboard.i18n.keys._components.save_ctrl_enter")}
                title={t("app.dashboard.i18n.keys._components.save_ctrl_enter")}
              >
                <Check className="size-3.5 text-green-600 dark:text-green-400" />
              </Button>
              <Button
                size="icon-sm"
                variant="ghost"
                onClick={cancelEdit}
                aria-label={t("app.dashboard.i18n.keys._components.cancel_esc")}
                title={t("app.dashboard.i18n.keys._components.cancel_esc")}
              >
                <X className="size-3.5" />
              </Button>
            </>
          ) : (
            <>
              {draftId && (
                <Button
                  size="icon-xs"
                  variant="ghost"
                  disabled
                  title={t("app.dashboard.i18n.keys._components.translate_with_ai_coming_soon")}
                  className="opacity-0 transition-opacity group-hover:opacity-100"
                >
                  <Sparkles className="size-3 text-violet-500" />
                </Button>
              )}
              <form action={deleteKeyAction}>
                <input type="hidden" name="id" value={leaf.id} />
                <Button
                  size="icon-xs"
                  variant="ghost"
                  type="submit"
                  aria-label={`Delete ${leaf.key}`}
                  className="opacity-0 transition-opacity group-hover:opacity-100"
                >
                  <Trash2 className="size-3 text-destructive" />
                </Button>
              </form>
            </>
          )}
        </div>
      </div>
    );
  }

  function renderRow(row: FlatRow): React.ReactNode {
    if (row.kind === "folder") return renderFolderRow(row);
    if (row.kind === "leaf") return renderLeafRow(row);
    if (row.kind === "load-more") {
      return (
        <div
          className="flex min-h-10 items-center border-b px-4 text-xs text-muted-foreground"
          style={{ paddingLeft: row.depth * 20 + 16 }}
        >
          <button
            onClick={() => loadSection(row.prefix, row.loaded)}
            className="flex items-center gap-1.5 rounded px-2 py-1 hover:bg-muted hover:text-foreground"
          >
            {loadingPaths.has(row.prefix) ? <Loader2 className="size-3 animate-spin" /> : null}
            Load more ({row.loaded} / {row.total})
          </button>
        </div>
      );
    }
    // loading
    return (
      <div
        className="flex min-h-10 items-center border-b px-4 text-xs text-muted-foreground"
        style={{ paddingLeft: row.depth * 20 + 32 }}
      >
        <Loader2 className="mr-2 size-3 animate-spin" />
        Loading…
      </div>
    );
  }

  // ── Empty / missing profile ────────────────────────────────────────────────

  if (profiles.length === 0) {
    return (
      <div className="rounded-lg border py-12 text-center text-sm text-muted-foreground">
        {t("common.no_profiles_yet")}{" "}
        <a href="/dashboard/i18n/profiles/new" className="underline underline-offset-4">
          {t("app.dashboard.i18n.keys._components.create_a_profile")}
        </a>{" "}
        {t("app.dashboard.i18n.keys._components.to_start_managing_keys")}
      </div>
    );
  }

  // ── Main render ────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      {/* ── Profile tabs + draft selector ── */}
      <div className="flex flex-wrap items-center gap-1.5 border-b pb-3">
        <div className="flex flex-wrap gap-1">
          {profiles.map((p) => (
            <button
              key={p.id}
              onClick={() => {
                setProfileId(p.id);
                setDraftId(null);
                setEditing(null);
                setSelected(new Set());
                setExpanded(new Set());
                setSearchInput("");
                setDebouncedSearch("");
                setSearchResults(null);
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
              <span className="text-xs text-muted-foreground">
                {t("app.dashboard.i18n.keys._components.draft")}
              </span>
              <select
                value={draftId ?? ""}
                onChange={(e) => {
                  setDraftId(e.target.value || null);
                  setEditing(null);
                  setSelected(new Set());
                }}
                className="h-7 rounded-lg border border-input bg-transparent px-2 text-xs outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/20"
              >
                <option value="">{t("app.dashboard.i18n.keys._components.published")}</option>
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
            {t("app.dashboard.i18n.keys._components.translate_with_ai")}
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
            placeholder={t("app.dashboard.i18n.keys._components.filter_keys")}
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="h-7 w-52 rounded-lg border border-input bg-transparent pl-7 pr-2.5 text-xs outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/20"
          />
        </div>

        <button
          onClick={expanded.size > 0 ? collapseAll : expandAll}
          className="flex items-center gap-1 rounded-lg border border-transparent px-2 py-1 text-xs text-muted-foreground hover:border-border hover:bg-muted hover:text-foreground"
          aria-label={expanded.size > 0 ? t("common.collapse_all") : t("common.expand_all")}
          title={expanded.size > 0 ? t("common.collapse_all") : t("common.expand_all")}
        >
          <ChevronsUpDown className="size-3" />
          {expanded.size > 0 ? t("common.collapse") : t("common.expand")}
        </button>

        <span className="text-xs text-muted-foreground">
          {sections.reduce((s, sec) => s + sec.count, 0)} {t("common.keys")}
        </span>

        {(loadingSections || searchLoading) && (
          <Loader2 className="size-3 animate-spin text-muted-foreground" />
        )}

        {draftId && (
          <span className="ml-auto flex items-center gap-1 text-xs text-muted-foreground">
            <span className="size-1.5 rounded-full bg-amber-400" />
            {t("app.dashboard.i18n.keys._components.has_draft")}
          </span>
        )}
      </div>

      {/* ── Bulk actions bar ── */}
      <BulkActionsBar selected={selectedKeys} actions={bulkActions} onClear={clearSelection} />

      {/* ── Virtual table ── */}
      {!profileId ? (
        <div className="rounded-lg border py-12 text-center text-sm text-muted-foreground">
          {t("app.dashboard.i18n.keys._components.select_a_profile_above")}
        </div>
      ) : searchLoading && searchResults === null ? (
        <div className="flex items-center justify-center rounded-lg border py-12">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        </div>
      ) : debouncedSearch && searchResults?.length === 0 ? (
        <div className="rounded-lg border py-12 text-center text-sm text-muted-foreground">
          No keys match &ldquo;{debouncedSearch}&rdquo;
        </div>
      ) : loadingSections && sections.length === 0 ? (
        <div className="flex items-center justify-center rounded-lg border py-12">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        </div>
      ) : sections.length === 0 ? (
        <div className="rounded-lg border py-12 text-center text-sm text-muted-foreground">
          {t("app.dashboard.i18n.keys._components.no_keys_for_this_profile")}
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border text-sm">
          {/* ── Sections nav panel (always visible) ── */}
          {!debouncedSearch && sections.length > 0 && (
            <div className="flex flex-wrap gap-1 border-b bg-muted/30 px-3 py-2">
              {sections.map((sec) => {
                const isOpen = expanded.has(sec.prefix);
                const key = treeKey(sec.prefix);
                const tree = sectionTrees.get(key) ?? [];
                const ids = sec.count === 1 && sec.soleId ? [sec.soleId] : leafIdsInTree(tree);
                const hit = ids.filter((id) => selected.has(id)).length;
                const selState: "none" | "some" | "all" =
                  hit === 0 ? "none" : hit === ids.length && ids.length > 0 ? "all" : "some";
                return (
                  <div
                    key={sec.prefix}
                    className={cn(
                      "flex items-center gap-1 rounded-md border px-2 py-1 text-xs transition-colors",
                      isOpen
                        ? "border-primary/30 bg-primary/5 text-foreground"
                        : "border-transparent text-muted-foreground hover:border-border hover:bg-muted hover:text-foreground",
                    )}
                  >
                    <RowCheckbox
                      checked={selState === "all"}
                      indeterminate={selState === "some"}
                      onChange={() => toggleSection(sec)}
                      ariaLabel={`Select section ${sec.prefix}`}
                    />
                    <button
                      onClick={() => toggleFolder(sec.prefix, true)}
                      className="flex items-center gap-1"
                    >
                      <span className="font-mono font-medium">{sec.prefix}</span>
                      <span className="text-muted-foreground/50">{sec.count}</span>
                      {isOpen ? (
                        <ChevronDown className="size-3 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="size-3 text-muted-foreground" />
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* Header */}
          <div className="flex items-center border-b bg-muted/50">
            <div className="flex w-8 shrink-0 items-center justify-center">
              <RowCheckbox
                checked={allVisibleSelected}
                indeterminate={someVisibleSelected && !allVisibleSelected}
                onChange={() =>
                  setSelected(allVisibleSelected ? new Set() : new Set(visLeaves.map((k) => k.id)))
                }
                ariaLabel="Select all visible keys"
              />
            </div>
            <div className="w-8 shrink-0" />
            <div className="w-40 shrink-0 py-2.5 pr-4 text-xs font-medium text-muted-foreground">
              {t("common.key")}
            </div>
            <div className="flex-1 py-2.5 text-xs font-medium text-muted-foreground">
              {draftId ? (
                <span>
                  <span className="text-muted-foreground/50">
                    {t("app.dashboard.i18n.keys._components.published")}
                  </span>
                  {" → "}
                  <span>{t("app.dashboard.i18n.keys._components.draft")}</span>
                </span>
              ) : (
                "Value"
              )}
            </div>
            <div className="w-16 shrink-0" />
          </div>

          {/* Virtual scroll body */}
          <div ref={scrollRef} className="max-h-[calc(100vh-22rem)] overflow-auto">
            <div style={{ height: rowVirtualizer.getTotalSize(), position: "relative" }}>
              {rowVirtualizer.getVirtualItems().map((vItem) => (
                <div
                  key={vItem.key}
                  data-index={vItem.index}
                  ref={rowVirtualizer.measureElement}
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    transform: `translateY(${vItem.start}px)`,
                  }}
                >
                  {renderRow(flatRows[vItem.index])}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Draft hint */}
      {draftId && (
        <p className="text-xs text-muted-foreground/60">
          {t(
            "app.dashboard.i18n.keys._components.editing_draft_changes_won_apos_t_affect_the_published_profil",
          )}{" "}
          <kbd className="rounded border px-1 font-mono text-[10px]">
            {t("app.dashboard.i18n.keys._components.ctrl_enter")}
          </kbd>{" "}
          {t("app.dashboard.i18n.keys._components.to_save")}{" "}
          <kbd className="rounded border px-1 font-mono text-[10px]">
            {t("app.dashboard.i18n.keys._components.esc")}
          </kbd>{" "}
          {t("app.dashboard.i18n.keys._components.to_cancel")}
        </p>
      )}
    </div>
  );
}
