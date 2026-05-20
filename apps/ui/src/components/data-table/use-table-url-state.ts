"use client";

import { useCallback } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { SortingState } from "@tanstack/react-table";

/**
 * Single shared mutator over the current route's query string. Returns a
 * function that merges the supplied (key → value | null) patch into the URL
 * via `router.replace`. Passing `null` removes the param. All mutations go
 * through one `router.replace` call so multi-key updates land atomically
 * without intermediate renders that would drop earlier writes.
 */
export function useSearchParamMutator() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  return useCallback(
    (patch: Record<string, string | null>) => {
      const next = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(patch)) {
        if (value == null || value === "") next.delete(key);
        else next.set(key, value);
      }
      const qs = next.toString();
      router.replace(`${pathname}${qs ? `?${qs}` : ""}`, { scroll: false });
    },
    [router, pathname, searchParams],
  );
}

/** Read a single string-typed query param (returns `null` when missing). */
export function useUrlParam(name: string): string | null {
  const searchParams = useSearchParams();
  return searchParams.get(name);
}

/* ────────────────────────────────────────────────────────────────────────────
 * Sort encoding
 *
 * Single-column sort, stripe-style: `?sort=name` (asc) / `?sort=-name` (desc).
 * No param ⇒ unsorted (empty SortingState). Passing an unknown column id is
 * tolerated — the table will silently ignore it.
 * ──────────────────────────────────────────────────────────────────────────── */

export function parseSortParam(raw: string | null): SortingState {
  if (!raw) return [];
  const trimmed = raw.trim();
  if (trimmed === "") return [];
  const desc = trimmed.startsWith("-");
  const id = desc ? trimmed.slice(1) : trimmed;
  if (!id) return [];
  return [{ id, desc }];
}

export function formatSortParam(sorting: SortingState): string | null {
  if (!sorting || sorting.length === 0) return null;
  const first = sorting[0];
  if (!first) return null;
  return `${first.desc ? "-" : ""}${first.id}`;
}
