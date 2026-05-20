"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import useSWR from "swr";
import { ChevronDown, ChevronRight, ExternalLink, Plus, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Sparkline } from "@/components/ui/sparkline";
import { StatusBadge } from "@/components/ui/status-badge";

export type RegisteredMetric = {
  id: string;
  name: string;
  folder: string | null;
  eventName: string;
  aggregation: string;
  valuePath: string | null;
  query: string | null;
  updatedAt: string;
};

function relativeTime(iso: string): string {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "—";
  const diffMs = Date.now() - t;
  const min = Math.round(diffMs / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const d = Math.round(hr / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(iso).toISOString().slice(0, 10);
}

export function RegisteredMetricsSection({
  projectId,
  metrics,
  onCreate,
}: {
  projectId: string;
  metrics: RegisteredMetric[];
  onCreate?: () => void;
}) {
  const [open, setOpen] = useState(true);
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return metrics;
    return metrics.filter(
      (m) =>
        m.name.toLowerCase().includes(needle) ||
        m.eventName.toLowerCase().includes(needle) ||
        (m.query ?? "").toLowerCase().includes(needle) ||
        (m.folder ?? "").toLowerCase().includes(needle),
    );
  }, [metrics, q]);

  if (metrics.length === 0) return null;

  return (
    <section className="mb-4 rounded-md border border-[var(--se-line-2)] bg-[var(--se-bg-1)]">
      <header className="flex items-center justify-between gap-3 border-b border-[var(--se-line-2)] px-3 py-2">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-1.5 font-mono text-[11.5px] uppercase tracking-[0.08em] text-[var(--se-fg-2)] hover:text-[var(--se-fg)]"
        >
          {open ? <ChevronDown className="size-3" /> : <ChevronRight className="size-3" />}
          Registered metrics
          <span className="rounded bg-[var(--se-bg-2)] px-1.5 py-px font-mono text-[10.5px] text-[var(--se-fg-3)]">
            {metrics.length}
          </span>
        </button>
        {open ? (
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2 top-1/2 size-3 -translate-y-1/2 text-[var(--se-fg-3)]" />
              <input
                type="text"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Filter metrics"
                className="h-7 w-56 rounded border border-[var(--se-line-2)] bg-[var(--se-bg-0,var(--se-bg))] pl-7 pr-2 font-mono text-[12px] text-[var(--se-fg-1)] placeholder:text-[var(--se-fg-3)] focus:border-[var(--se-accent)] focus:outline-none"
              />
            </div>
            {onCreate ? (
              <Button size="sm" onClick={onCreate}>
                <Plus className="size-3" /> New metric
              </Button>
            ) : null}
          </div>
        ) : null}
      </header>
      {open ? (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-[var(--se-line-2)] text-[10.5px] uppercase tracking-[0.06em] text-[var(--se-fg-3)]">
                <th className="px-3 py-1.5 font-medium">Metric</th>
                <th className="px-3 py-1.5 font-medium">Agg</th>
                <th className="px-3 py-1.5 font-medium">Event</th>
                <th className="hidden px-3 py-1.5 font-medium md:table-cell">Trend · 7d</th>
                <th className="px-3 py-1.5 text-right font-medium">Current</th>
                <th className="px-3 py-1.5 text-right font-medium">Δ 7d</th>
                <th className="px-3 py-1.5 font-medium">Updated</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-3 py-4 text-center font-mono text-[12px] text-[var(--se-fg-3)]"
                  >
                    No metrics match “{q}”.
                  </td>
                </tr>
              ) : (
                filtered.map((m) => (
                  <tr
                    key={m.id}
                    className="group border-b border-[var(--se-line-2)]/50 transition-colors hover:bg-[var(--se-bg-2)]"
                  >
                    <td className="px-3 py-2 align-top">
                      <Link
                        href={`/dashboard/${projectId}/metrics/${m.id}`}
                        className="flex min-w-0 items-center gap-1.5 font-mono text-[13px] text-[var(--se-fg-1)] hover:text-[var(--se-accent)]"
                      >
                        <span className="truncate">{m.name}</span>
                        <ExternalLink className="size-3 shrink-0 opacity-0 transition-opacity group-hover:opacity-60" />
                      </Link>
                      {m.folder ? (
                        <div className="mt-0.5 font-mono text-[10.5px] uppercase tracking-[0.06em] text-[var(--se-fg-3)]">
                          {m.folder}
                        </div>
                      ) : null}
                    </td>
                    <td className="px-3 py-2 align-top">
                      <StatusBadge tone="neutral">{m.aggregation}</StatusBadge>
                    </td>
                    <td className="px-3 py-2 align-top">
                      <span className="font-mono text-[12px] text-[var(--se-fg-2)]">
                        {m.eventName}
                      </span>
                    </td>
                    <td className="hidden px-3 py-2 align-top md:table-cell">
                      <MetricSparkCell metricId={m.id} fallback={m.query} mode="sparkline" />
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-right align-top">
                      <MetricSparkCell metricId={m.id} mode="current" />
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-right align-top">
                      <MetricSparkCell metricId={m.id} mode="delta" />
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 align-top font-mono text-[11.5px] text-[var(--se-fg-3)]">
                      {relativeTime(m.updatedAt)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      ) : null}
    </section>
  );
}

type SeriesRow = { t: number; v: number };
type SeriesResp = { rows: SeriesRow[] };

const seriesFetcher = async ([url, body]: [string, unknown]): Promise<SeriesResp> => {
  const res = await fetch(url, {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status}: ${text.slice(0, 80)}`);
  }
  return (await res.json()) as SeriesResp;
};

function MetricSparkCell({
  metricId,
  mode,
  fallback,
}: {
  metricId: string;
  mode: "sparkline" | "current" | "delta";
  fallback?: string | null;
}) {
  const now = useMemo(() => Math.floor(Date.now() / 1000), []);
  const body = useMemo(() => ({ from: now - 7 * 86_400, to: now, bucket: 86_400 }), [now]);
  const { data, error, isLoading } = useSWR<SeriesResp>(
    [`/api/admin/metrics/${metricId}/series`, body],
    seriesFetcher,
    { shouldRetryOnError: false, revalidateOnFocus: false, dedupingInterval: 60_000 },
  );

  if (isLoading) {
    return <span className="t-mono-xs dim-2">…</span>;
  }
  if (error || !data || data.rows.length === 0) {
    if (mode === "sparkline") {
      return (
        <code className="block max-w-[280px] truncate font-mono text-[11px] text-[var(--se-fg-3)]">
          {fallback ?? "—"}
        </code>
      );
    }
    return <span className="t-mono-xs dim-2">—</span>;
  }

  const sorted = [...data.rows].sort((a, b) => a.t - b.t);
  const points = sorted.map((r) => Number(r.v) || 0);
  const last = points[points.length - 1];
  const first = points[0];

  if (mode === "sparkline") {
    if (points.length < 2) return <span className="t-mono-xs dim-2">—</span>;
    return (
      <Sparkline
        points={points}
        width={120}
        height={22}
        intent={last >= first ? "accent" : "danger"}
      />
    );
  }
  if (mode === "current") {
    return (
      <span
        className="font-mono text-[12.5px] text-[var(--se-fg-1)]"
        style={{ fontVariantNumeric: "tabular-nums" }}
      >
        {formatValue(last)}
      </span>
    );
  }
  // delta
  if (!Number.isFinite(first) || first === 0) return <span className="t-mono-xs dim-2">—</span>;
  const pct = ((last - first) / Math.abs(first)) * 100;
  const tone = pct > 0 ? "var(--se-accent)" : pct < 0 ? "var(--se-danger)" : "var(--se-fg-2)";
  return (
    <span
      className="font-mono text-[11.5px]"
      style={{ color: tone, fontVariantNumeric: "tabular-nums" }}
    >
      {pct > 0 ? "+" : ""}
      {pct.toFixed(1)}%
    </span>
  );
}

function formatValue(v: number): string {
  if (!Number.isFinite(v)) return "—";
  if (Math.abs(v) >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (Math.abs(v) >= 1_000) return `${(v / 1_000).toFixed(1)}k`;
  if (Math.abs(v) < 1) return v.toFixed(3);
  return v.toFixed(1);
}
