"use client";

import { useCallback, useMemo } from "react";
import useSWRInfinite from "swr/infinite";

type CursorPage<T> = {
  data: T[];
  next_cursor: string | null;
};

type Fetcher<T> = (url: string) => Promise<CursorPage<T>>;

async function defaultFetcher<T>(url: string): Promise<CursorPage<T>> {
  const res = await fetch(url, { credentials: "same-origin" });
  if (!res.ok) throw new Error(`${url} → HTTP ${res.status}`);
  const json = (await res.json()) as CursorPage<T> | T[];
  if (Array.isArray(json)) {
    return { data: json, next_cursor: null };
  }
  return { data: json.data ?? [], next_cursor: json.next_cursor ?? null };
}

export type UseCursorPagesOptions<T> = {
  /** Base URL of a paginated admin endpoint. The hook appends `?cursor=` and
   *  optionally `?limit=` as query params. */
  baseUrl: string | null;
  /** Page size hint passed to the server. Defaults to the server's own
   *  default (100). Set lower for tighter infinite-scroll cadence. */
  limit?: number;
  /** Optional custom fetcher — primarily for tests. */
  fetcher?: Fetcher<T>;
};

export type UseCursorPagesResult<T> = {
  rows: T[];
  isLoading: boolean;
  isLoadingMore: boolean;
  hasMore: boolean;
  error: unknown;
  loadMore: () => void;
  mutate: () => Promise<unknown>;
};

/**
 * SWR-Infinite hook over an admin endpoint that returns the standard
 * `{ data, next_cursor }` envelope. Pages are stitched into a single `rows`
 * array; the caller does not deal with cursors directly.
 *
 * Usage:
 *
 *   const { rows, hasMore, loadMore, mutate } = useCursorPages<Gate>({
 *     baseUrl: "/api/admin/gates",
 *   });
 */
export function useCursorPages<T>(opts: UseCursorPagesOptions<T>): UseCursorPagesResult<T> {
  const { baseUrl, limit, fetcher } = opts;
  // Stabilise the fetcher reference: SWRInfinite refetches whenever its
  // fetcher identity changes, so unmemoised inline fetchers (or even
  // `(fetcher ?? defaultFetcher)` recomputed each render) trigger infinite
  // refetch loops and `isLoading` never settles.
  const resolvedFetcher = useMemo<Fetcher<T>>(
    () => fetcher ?? (defaultFetcher as Fetcher<T>),
    [fetcher],
  );

  const getKey = useCallback(
    (pageIndex: number, previousPage: CursorPage<T> | null): string | null => {
      if (baseUrl == null) return null;
      if (previousPage && previousPage.next_cursor == null) return null;
      const params = new URLSearchParams();
      if (limit != null) params.set("limit", String(limit));
      if (pageIndex > 0 && previousPage?.next_cursor) {
        params.set("cursor", previousPage.next_cursor);
      }
      const qs = params.toString();
      return qs ? `${baseUrl}?${qs}` : baseUrl;
    },
    [baseUrl, limit],
  );

  const { data, error, isLoading, isValidating, size, setSize, mutate } = useSWRInfinite<
    CursorPage<T>
  >(getKey, resolvedFetcher, {
    revalidateFirstPage: false,
    revalidateOnFocus: false,
    dedupingInterval: 0,
  });

  const rows = useMemo<T[]>(() => {
    if (!data) return [];
    const out: T[] = [];
    for (const page of data) {
      if (page && Array.isArray(page.data)) out.push(...page.data);
    }
    return out;
  }, [data]);

  const lastPage = data?.[data.length - 1];
  const hasMore = Boolean(lastPage?.next_cursor);
  const isLoadingMore = isValidating && size > 0 && data != null && data.length < size;

  const loadMore = useCallback(() => {
    if (!hasMore) return;
    void setSize((s) => s + 1);
  }, [hasMore, setSize]);

  return {
    rows,
    isLoading,
    isLoadingMore,
    hasMore,
    error,
    loadMore,
    mutate,
  };
}
