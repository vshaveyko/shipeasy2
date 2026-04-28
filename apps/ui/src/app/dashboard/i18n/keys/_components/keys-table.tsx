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
  Braces,
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

/**
 * Emit folders (nested categories) first, then leaves (non-categorized keys),
 * recursively. Single-leaf folders still collapse to their leaf and sort with
 * the leaves at the current depth.
 */
function flattenSubtree(
  rows: FlatRow[],
  nodes: TreeNode[],
  depth: number,
  expanded: Set<string>,
): void {
  const folders: TreeNode[] = [];
  const leaves: TreeNode[] = [];
  for (const node of nodes) {
    const rendersAsFolder = node.children.length > 0 && node.leafCount > 1;
    if (rendersAsFolder) folders.push(node);
    else leaves.push(node);
  }
  folders.sort((a, b) => a.segment.localeCompare(b.segment));
  leaves.sort((a, b) => (a.leaf?.key ?? a.path).localeCompare(b.leaf?.key ?? b.path));

  for (const node of folders) {
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
  }
  for (const node of leaves) {
    if (node.children.length > 0 && node.leafCount === 1) {
      const single = findSingleLeaf(node);
      if (single?.leaf) {
        rows.push({ kind: "leaf", node: single, depth, displayKey: single.leaf.key });
        continue;
      }
    }
    if (node.leaf) rows.push({ kind: "leaf", node, depth });
  }
}

function buildFlatRows(
  sections: Section[],
  sectionTrees: Map<string, TreeNode[]>,
  sectionPages: Map<string, { keys: KeyRow[]; total: number }>,
  expanded: Set<string>,
  loadingPaths: Set<string>,
): FlatRow[] {
  const rows: FlatRow[] = [];
  // Top-level ordering: multi-key sections (folders) first, then single-key
  // sections that render as leaves. Alphabetical within each group.
  const folderSections: Section[] = [];
  const leafSections: Section[] = [];
  for (const sec of sections) {
    if (sec.count === 1 && sec.soleId && sec.soleKey) leafSections.push(sec);
    else folderSections.push(sec);
  }
  folderSections.sort((a, b) => a.prefix.localeCompare(b.prefix));
  leafSections.sort((a, b) => (a.soleKey ?? a.prefix).localeCompare(b.soleKey ?? b.prefix));
  const orderedSections = [...folderSections, ...leafSections];
  for (const sec of orderedSections) {
    // Single-key sections: sole data is embedded — render as a leaf directly,
    // no folder wrapper, no fetch needed.
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

    const isOpen = expanded.has(sec.prefix);
    const tree = sectionTrees.get(sec.prefix);

    // Section header row — a depth-0 folder in the tree table.
    rows.push({
      kind: "folder",
      path: sec.prefix,
      segment: sec.prefix,
      depth: 0,
      isOpen,
      leafCount: sec.count,
      loaded: !!tree,
    });

    if (!isOpen) continue;

    // Expanded section content.
    const page = sectionPages.get(sec.prefix);
    if (loadingPaths.has(sec.prefix) && !tree) {
      rows.push({ kind: "loading", path: sec.prefix, depth: 1 });
    } else if (tree) {
      // Every key in this section starts with `sec.prefix.` so the built tree
      // has exactly one root node whose segment equals the section prefix.
      // Rendering that root would duplicate the section title — descend one
      // level and use its children instead.
      const nodesToRender =
        tree.length === 1 && tree[0].segment === sec.prefix && tree[0].children.length > 0
          ? tree[0].children
          : tree;
      flattenSubtree(rows, nodesToRender, 1, expanded);
      if (page && page.keys.length < page.total) {
        rows.push({
          kind: "load-more",
          prefix: sec.prefix,
          depth: 1,
          loaded: page.keys.length,
          total: page.total,
        });
      }
    }
  }
  return rows;
}

// Search results: tree fully expanded (backend already filtered). Same
// folders-before-leaves recursive ordering as flattenSubtree.
function buildSearchFlatRows(keys: KeyRow[]): FlatRow[] {
  const rows: FlatRow[] = [];
  function expand(nodes: TreeNode[], depth: number) {
    const folders: TreeNode[] = [];
    const leaves: TreeNode[] = [];
    for (const node of nodes) {
      const rendersAsFolder = node.children.length > 0 && node.leafCount > 1;
      if (rendersAsFolder) folders.push(node);
      else leaves.push(node);
    }
    folders.sort((a, b) => a.segment.localeCompare(b.segment));
    leaves.sort((a, b) => (a.leaf?.key ?? a.path).localeCompare(b.leaf?.key ?? b.path));

    for (const node of folders) {
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
    }
    for (const node of leaves) {
      if (node.children.length > 0 && node.leafCount === 1) {
        const single = findSingleLeaf(node);
        if (single?.leaf) {
          rows.push({ kind: "leaf", node: single, depth, displayKey: single.leaf.key });
          continue;
        }
      }
      if (node.leaf) rows.push({ kind: "leaf", node, depth });
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
        // Invalidate section + page caches so updated value re-renders
        const topPrefix = key.split(".")[0]!;
        setSectionsByProfile((prev) => {
          const next = new Map(prev);
          next.delete(profileId!);
          return next;
        });
        setSectionPages((prev) => {
          const next = new Map(prev);
          next.delete(treeKey(topPrefix));
          return next;
        });
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
    estimateSize: () => 36,
    overscan: 8,
  });

  // ── Sticky section tracking ────────────────────────────────────────────────
  // Indices of section-header rows (depth-0 folders) in the flat list.
  const sectionFolderIndices = useMemo(() => {
    const out: number[] = [];
    for (let i = 0; i < flatRows.length; i++) {
      const r = flatRows[i];
      if (r.kind === "folder" && r.depth === 0) out.push(i);
    }
    return out;
  }, [flatRows]);

  // Index of the section that should be pinned at the top of the scroll area.
  const [pinnedIdx, setPinnedIdx] = useState<number | null>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    let raf = 0;
    const update = () => {
      const scrollTop = el.scrollTop;
      let found: number | null = null;
      for (const idx of sectionFolderIndices) {
        // getOffsetForIndex returns [offset, align]; fall back to estimate.
        const offset =
          (
            rowVirtualizer as unknown as {
              getOffsetForIndex?: (i: number) => [number, string];
            }
          ).getOffsetForIndex?.(idx)?.[0] ?? idx * 36;
        if (offset <= scrollTop + 0.5) found = idx;
        else break;
      }
      setPinnedIdx(found);
    };
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        update();
      });
    };
    update();
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      el.removeEventListener("scroll", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [sectionFolderIndices, rowVirtualizer]);

  // ── Row renderer ───────────────────────────────────────────────────────────
  // Shared column template keeps header + all row types aligned like a real table.
  const ROW_GRID = "grid grid-cols-[32px_32px_minmax(0,300px)_minmax(0,1fr)_80px] items-start";

  function renderFolderRow(row: Extract<FlatRow, { kind: "folder" }>) {
    const { path, segment, depth, isOpen, leafCount, loaded } = row;
    const isSection = depth === 0;

    const sectionKey = treeKey(depth === 0 ? path : path.split(".")[0]);
    const sectionTree = sectionTrees.get(sectionKey) ?? [];

    let sel: "none" | "some" | "all" = "none";
    if (loaded && !isSection) {
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
      <div
        className={cn(
          ROW_GRID,
          "min-h-9 border-b border-[var(--se-line)] last:border-0",
          isSection ? "bg-[var(--se-bg-2)]" : "hover:bg-[var(--se-bg-2)]",
        )}
      >
        {/* Checkbox */}
        <div className="flex h-9 items-center justify-center">
          {loaded || (isSection && sectionTree.length > 0) ? (
            <RowCheckbox
              checked={sel === "all"}
              indeterminate={sel === "some"}
              onChange={() => {
                if (isSection) {
                  const sec = sections.find((s) => s.prefix === path);
                  if (sec) toggleSection(sec);
                } else {
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
          ) : null}
        </div>
        {/* Chevron */}
        <button
          onClick={() => toggleFolder(path, isSection)}
          className="flex h-9 items-center justify-center rounded text-[var(--se-fg-3)] hover:text-foreground"
          aria-label={isOpen ? "Collapse" : "Expand"}
        >
          {isOpen ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />}
        </button>
        {/* Key col — folder label with depth indent */}
        <button
          onClick={() => toggleFolder(path, isSection)}
          className="flex h-9 min-w-0 items-center gap-1.5 pr-4 text-left"
          style={{ paddingLeft: Math.max(0, depth - 1) * 16 }}
        >
          {isSection ? (
            <span className="t-caps dim-3 mr-1.5 shrink-0 tracking-[0.08em]">{segment}</span>
          ) : (
            <span className="t-mono shrink-0 truncate text-[12px] text-foreground">{segment}</span>
          )}
          <span
            className="t-mono-xs shrink-0 rounded px-1.5 py-px text-[10px] text-[var(--se-fg-3)]"
            style={{
              background: "var(--se-bg-3)",
              border: "1px solid var(--se-line)",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {leafCount}
          </span>
        </button>
        {/* Value col — empty for folders */}
        <div />
        {/* Actions col — empty */}
        <div />
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
          ROW_GRID,
          "group min-h-9 border-b border-[var(--se-line)] last:border-0",
          isEditing
            ? "bg-[color-mix(in_oklab,var(--se-accent)_8%,transparent)]"
            : "hover:bg-[var(--se-bg-2)]",
        )}
      >
        {/* Checkbox */}
        <div className="flex h-9 items-center justify-center">
          <RowCheckbox
            checked={sel}
            onChange={() => toggleLeaf(leaf.id)}
            ariaLabel={`Select key ${leaf.key}`}
          />
        </div>
        {/* Chevron slot — empty */}
        <div />
        {/* Key */}
        <div
          className="flex min-w-0 flex-col py-2 pr-4"
          style={{ paddingLeft: Math.max(0, depth - 1) * 16 }}
          title={leaf.key}
        >
          <span className="flex min-w-0 items-center gap-1.5">
            <span className="t-mono truncate text-[12px] text-foreground">
              {displayKey ?? node.segment}
            </span>
            {leaf.variables && leaf.variables.length > 0 && (
              <span
                className="inline-flex shrink-0 items-center gap-0.5 rounded-[4px] px-1 py-px font-mono text-[10px]"
                style={{
                  background: "var(--se-accent-soft)",
                  color: "var(--se-accent)",
                  border: "1px solid color-mix(in oklab, var(--se-accent) 30%, transparent)",
                }}
                title={`Variables: ${leaf.variables.join(", ")}`}
              >
                <Braces className="size-2.5" />
                {leaf.variables.length}
              </span>
            )}
          </span>
          {leaf.description && (
            <span className="mt-0.5 truncate text-[10px] text-[var(--se-fg-3)]">
              {leaf.description}
            </span>
          )}
        </div>
        {/* Value */}
        <div className="flex min-w-0 flex-col py-2 pr-2">
          {draftId && (
            <div className="mb-1.5 flex items-baseline gap-1.5">
              <span className="t-caps dim-3 shrink-0 text-[9px] tracking-[0.08em]">ref</span>
              <span className="line-clamp-2 break-all text-xs text-[var(--se-fg-3)]">
                {leaf.value || <em>(empty)</em>}
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
              className="w-full resize-none rounded-[var(--radius-md)] border border-[var(--se-line-3)] bg-[var(--se-bg-1)] px-2 py-1.5 text-sm leading-snug text-foreground outline-none focus:border-[var(--se-accent)]"
              style={{
                boxShadow: "0 0 0 3px color-mix(in oklab, var(--se-accent) 18%, transparent)",
              }}
            />
          ) : (
            <button
              onClick={() => startEdit(leaf)}
              className="-ml-1.5 min-h-5 rounded-[var(--radius-sm)] px-1.5 py-0.5 text-left text-sm text-foreground hover:bg-[var(--se-bg-3)]"
              title="Click to edit"
            >
              {draftId ? (
                hasDraft ? (
                  <span className="break-all leading-snug">{draftKey!.value}</span>
                ) : (
                  <span className="italic text-[var(--se-fg-4)]">Click to translate</span>
                )
              ) : leaf.value ? (
                <span className="break-all leading-snug">{leaf.value}</span>
              ) : (
                <span className="italic text-[var(--se-fg-4)]">(empty)</span>
              )}
            </button>
          )}
          {draftId && hasDraft && !isEditing && (
            <span className="se-badge se-badge-paused mt-1 w-fit" title="Draft value exists">
              <span className="dot" />
              DRAFT
            </span>
          )}
        </div>
        {/* Actions */}
        <div className="flex h-9 items-center justify-end gap-0.5 pr-1.5">
          {isEditing ? (
            <>
              <Button
                size="icon-sm"
                variant="ghost"
                onClick={commitEdit}
                disabled={isPending}
                aria-label="Save (Ctrl+Enter)"
                title="Save (Ctrl+Enter)"
                className="text-[var(--se-accent)] hover:bg-[var(--se-accent-soft)]"
              >
                <Check className="size-3.5" />
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
          ) : (
            <>
              {draftId && (
                <Button
                  size="icon-xs"
                  variant="ghost"
                  disabled
                  title="Translate with AI (coming soon)"
                  className="opacity-0 transition-opacity group-hover:opacity-100"
                >
                  <Sparkles className="size-3 text-[var(--se-accent)]" />
                </Button>
              )}
              <form action={deleteKeyAction}>
                <input type="hidden" name="id" value={leaf.id} />
                <Button
                  size="icon-xs"
                  variant="ghost"
                  type="submit"
                  aria-label={`Delete ${leaf.key}`}
                  className="opacity-0 transition-opacity group-hover:opacity-100 hover:bg-[var(--se-danger-soft)] hover:text-[var(--se-danger)]"
                >
                  <Trash2 className="size-3 text-[var(--se-fg-3)]" />
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
      const pageSize = 200;
      const currentPage = Math.ceil(row.loaded / pageSize);
      const totalPages = Math.ceil(row.total / pageSize);
      const loading = loadingPaths.has(row.prefix);
      return (
        <div
          className={cn(
            ROW_GRID,
            "min-h-9 border-b border-[var(--se-line)] bg-[var(--se-bg-2)] last:border-0",
          )}
        >
          <div />
          <div />
          <div
            className="flex h-9 items-center gap-2 text-[11px] text-[var(--se-fg-3)]"
            style={{ paddingLeft: Math.max(0, row.depth - 1) * 16 }}
          >
            <span className="font-mono">
              Page {currentPage} of {totalPages} · {row.loaded} / {row.total}
            </span>
            <button
              onClick={() => loadSection(row.prefix, row.loaded)}
              disabled={loading}
              className="inline-flex items-center gap-1 rounded-[var(--radius-sm)] border border-[var(--se-line-2)] bg-[var(--se-bg-3)] px-2 py-0.5 font-mono text-[11px] text-[var(--se-fg-2)] hover:border-[var(--se-line-3)] hover:bg-[var(--se-bg-4)] hover:text-foreground disabled:opacity-50"
            >
              {loading ? <Loader2 className="size-3 animate-spin" /> : null}
              Next →
            </button>
          </div>
          <div />
          <div />
        </div>
      );
    }
    // loading
    return (
      <div className={cn(ROW_GRID, "min-h-9 border-b border-[var(--se-line)] last:border-0")}>
        <div />
        <div />
        <div className="flex h-9 items-center text-xs text-[var(--se-fg-3)]">
          <Loader2 className="mr-2 size-3 animate-spin" />
          Loading…
        </div>
        <div />
        <div />
      </div>
    );
  }

  // ── Empty / missing profile ────────────────────────────────────────────────

  if (profiles.length === 0) {
    return (
      <div className="rounded-[var(--radius-lg)] border border-[var(--se-line)] bg-[var(--se-bg-1)] py-12 text-center text-sm text-[var(--se-fg-3)]">
        No profiles yet.{" "}
        <a
          href="/dashboard/i18n/profiles/new"
          className="text-[var(--se-accent)] underline decoration-[var(--se-line-2)] underline-offset-4"
        >
          Create a profile
        </a>{" "}
        to start managing keys.
      </div>
    );
  }

  // ── Main render ────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      {/* ── Profile tabs + draft selector ── */}
      <div className="flex flex-wrap items-center gap-2 border-b border-[var(--se-line)] pb-3">
        <div className="env-tabs" role="tablist" aria-label="Profile">
          {profiles.map((p) => (
            <button
              key={p.id}
              role="tab"
              aria-selected={profileId === p.id}
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
              className={cn("env-tab", profileId === p.id && "active")}
            >
              {p.name}
            </button>
          ))}
        </div>

        {profileId && profileDrafts.length > 0 && (
          <>
            <span className="mx-1 h-5 w-px bg-[var(--se-line)]" />
            <div className="flex items-center gap-1.5">
              <span className="t-caps dim-3 tracking-[0.08em]">Draft</span>
              <select
                value={draftId ?? ""}
                onChange={(e) => {
                  setDraftId(e.target.value || null);
                  setEditing(null);
                  setSelected(new Set());
                }}
                className="h-7 rounded-[var(--radius-md)] border border-[var(--se-line-2)] bg-[var(--se-bg-2)] px-2 font-mono text-xs text-foreground outline-none focus:border-[var(--se-fg-3)]"
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
            <Sparkles className="size-3.5 text-[var(--se-accent)]" />
            Translate with AI
          </Button>
        </div>
      </div>

      {/* ── Toolbar ── */}
      <div className="flex items-center gap-2">
        <div className="relative">
          <svg
            className="pointer-events-none absolute left-2.5 top-1/2 size-3 -translate-y-1/2 text-[var(--se-fg-3)]"
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
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="h-7 w-52 rounded-[var(--radius-md)] border border-[var(--se-line-2)] bg-[var(--se-bg-2)] pl-7 pr-2.5 text-xs text-foreground outline-none placeholder:text-[var(--se-fg-4)] focus:border-[var(--se-fg-3)] focus:bg-[var(--se-bg-1)]"
          />
        </div>

        <button
          onClick={expanded.size > 0 ? collapseAll : expandAll}
          className="flex items-center gap-1 rounded-[var(--radius-sm)] border border-transparent px-2 py-1 text-xs text-[var(--se-fg-3)] hover:border-[var(--se-line-2)] hover:bg-[var(--se-bg-2)] hover:text-foreground"
          aria-label={expanded.size > 0 ? "Collapse all" : "Expand all"}
          title={expanded.size > 0 ? "Collapse all" : "Expand all"}
        >
          <ChevronsUpDown className="size-3" />
          {expanded.size > 0 ? "Collapse" : "Expand"}
        </button>

        <span
          className="t-mono-xs tracking-[0.02em] text-[var(--se-fg-3)]"
          style={{ fontVariantNumeric: "tabular-nums" }}
        >
          {sections.reduce((s, sec) => s + sec.count, 0)} keys
        </span>

        {(loadingSections || searchLoading) && (
          <Loader2 className="size-3 animate-spin text-[var(--se-fg-3)]" />
        )}

        {draftId && (
          <span className="se-badge se-badge-paused ml-auto">
            <span className="dot" />
            HAS DRAFT
          </span>
        )}
      </div>

      {/* ── Bulk actions bar ── */}
      <BulkActionsBar selected={selectedKeys} actions={bulkActions} onClear={clearSelection} />

      {/* ── Virtual table ── */}
      {!profileId ? (
        <div className="rounded-[var(--radius-lg)] border border-[var(--se-line)] bg-[var(--se-bg-1)] py-12 text-center text-sm text-[var(--se-fg-3)]">
          Select a profile above.
        </div>
      ) : searchLoading && searchResults === null ? (
        <div className="flex items-center justify-center rounded-[var(--radius-lg)] border border-[var(--se-line)] bg-[var(--se-bg-1)] py-12">
          <Loader2 className="size-5 animate-spin text-[var(--se-fg-3)]" />
        </div>
      ) : debouncedSearch && searchResults?.length === 0 ? (
        <div className="rounded-[var(--radius-lg)] border border-[var(--se-line)] bg-[var(--se-bg-1)] py-12 text-center text-sm text-[var(--se-fg-3)]">
          No keys match &ldquo;
          <span className="font-mono text-[var(--se-fg-2)]">{debouncedSearch}</span>&rdquo;
        </div>
      ) : loadingSections && sections.length === 0 ? (
        <div className="flex items-center justify-center rounded-[var(--radius-lg)] border border-[var(--se-line)] bg-[var(--se-bg-1)] py-12">
          <Loader2 className="size-5 animate-spin text-[var(--se-fg-3)]" />
        </div>
      ) : sections.length === 0 ? (
        <div className="rounded-[var(--radius-lg)] border border-[var(--se-line)] bg-[var(--se-bg-1)] py-12 text-center text-sm text-[var(--se-fg-3)]">
          No keys for this profile.
        </div>
      ) : (
        <div className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--se-line)] bg-[var(--se-bg-1)] text-sm">
          {/* Header */}
          <div className={cn(ROW_GRID, "border-b border-[var(--se-line)] bg-[var(--se-bg-2)]")}>
            <div className="flex h-9 items-center justify-center">
              <RowCheckbox
                checked={allVisibleSelected}
                indeterminate={someVisibleSelected && !allVisibleSelected}
                onChange={() =>
                  setSelected(allVisibleSelected ? new Set() : new Set(visLeaves.map((k) => k.id)))
                }
                ariaLabel="Select all visible keys"
              />
            </div>
            <div />
            <div className="t-caps dim-3 flex h-9 items-center pr-4 tracking-[0.08em]">KEY</div>
            <div className="t-caps dim-3 flex h-9 items-center tracking-[0.08em]">
              {draftId ? (
                <span>
                  <span className="text-[var(--se-fg-4)]">Published</span>
                  {" → "}
                  <span className="text-[var(--se-warn)]">Draft</span>
                </span>
              ) : (
                "VALUE"
              )}
            </div>
            <div />
          </div>

          {/* Virtual scroll body */}
          <div ref={scrollRef} className="relative max-h-[calc(100vh-22rem)] overflow-auto">
            {/* Sticky pinned section — floats at top while scrolling through the section's content */}
            {pinnedIdx !== null && flatRows[pinnedIdx]?.kind === "folder" && (
              <div
                className="sticky top-0 z-10 bg-[var(--se-bg-1)] shadow-[0_1px_0_0_var(--se-line)]"
                style={{ marginBottom: -36 }}
              >
                {renderRow(flatRows[pinnedIdx])}
              </div>
            )}
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
        <p className="text-xs text-[var(--se-fg-3)]">
          Editing draft — changes won&apos;t affect the published profile until you publish.{" "}
          <kbd className="se-kbd">Ctrl+Enter</kbd> to save, <kbd className="se-kbd">Esc</kbd> to
          cancel.
        </p>
      )}
    </div>
  );
}
