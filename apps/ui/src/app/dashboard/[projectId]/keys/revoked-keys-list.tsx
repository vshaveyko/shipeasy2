"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { loadRevokedKeysAction } from "./actions";

export type RevokedKeyRow = {
  id: string;
  type: string;
  created_at: string | null;
  revoked_at: string | null;
  expires_at: string | null;
  created_by_email: string | null;
};

const GRID_COLS = "70px minmax(0,1fr) 160px 130px 130px 80px";

export function RevokedKeysList({
  initialRows,
  initialHasMore,
  initialNextOffset,
}: {
  initialRows: RevokedKeyRow[];
  initialHasMore: boolean;
  initialNextOffset: number;
}) {
  const [rows, setRows] = useState<RevokedKeyRow[]>(initialRows);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [nextOffset, setNextOffset] = useState(initialNextOffset);
  const [isPending, startTransition] = useTransition();
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const loadMore = useCallback(() => {
    if (!hasMore || isPending) return;
    startTransition(async () => {
      const page = await loadRevokedKeysAction(nextOffset);
      setRows((prev) => [...prev, ...page.rows]);
      setHasMore(page.hasMore);
      setNextOffset(page.nextOffset);
    });
  }, [hasMore, isPending, nextOffset]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !hasMore) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) loadMore();
      },
      { rootMargin: "120px" },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [loadMore, hasMore]);

  if (rows.length === 0) return null;

  return (
    <div className="rounded-lg border bg-muted/10">
      <div className="border-b px-4 py-2 text-xs font-medium text-muted-foreground">Revoked</div>
      <div
        className="grid gap-3 border-b bg-muted/20 px-4 py-2 text-[10px] uppercase tracking-wide text-muted-foreground"
        style={{ gridTemplateColumns: GRID_COLS }}
      >
        <span>Type</span>
        <span>Key ID</span>
        <span>Owner</span>
        <span>Created</span>
        <span>Revoked</span>
        <span />
      </div>
      {rows.map((key) => (
        <div
          key={key.id}
          className="grid items-center gap-3 border-b px-4 py-3 text-muted-foreground/80 opacity-60 last:border-0"
          style={{ gridTemplateColumns: GRID_COLS }}
        >
          <Badge variant="secondary" className="w-fit">
            {key.type}
          </Badge>
          <span className="truncate font-mono text-xs">{key.id}</span>
          <span className="truncate text-xs">{key.created_by_email ?? "—"}</span>
          <span className="text-xs">
            {key.created_at ? new Date(key.created_at).toLocaleDateString() : "—"}
          </span>
          <span className="text-xs">
            {key.revoked_at ? new Date(key.revoked_at).toLocaleDateString() : "—"}
          </span>
          <span />
        </div>
      ))}
      <div ref={sentinelRef} />
      {isPending && (
        <div className="px-4 py-3 text-center text-xs text-muted-foreground">Loading…</div>
      )}
      {!hasMore && rows.length > 10 && (
        <div className="px-4 py-3 text-center text-xs text-muted-foreground">End of list</div>
      )}
    </div>
  );
}
