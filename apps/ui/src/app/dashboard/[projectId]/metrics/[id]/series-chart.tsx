"use client";

import { useMemo, useState } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import useSWR from "swr";

import { Skeleton } from "@/components/ui/skeleton";

type SeriesRow = { t: number; v: number; [k: string]: number | string };

type SeriesResponse = { sql: string; rows: SeriesRow[] };

const fetcher = async (url: string, body: unknown): Promise<SeriesResponse> => {
  const res = await fetch(url, {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`HTTP ${res.status}: ${text.slice(0, 200)}`);
  }
  return (await res.json()) as SeriesResponse;
};

const PALETTE = [
  "var(--se-accent)",
  "var(--se-purple)",
  "var(--se-info)",
  "var(--se-warn)",
  "var(--se-success)",
  "var(--se-fg-2)",
];

const WINDOW_OPTIONS = [
  { key: "24h", label: "24h", seconds: 86_400, bucket: 3600 },
  { key: "7d", label: "7d", seconds: 7 * 86_400, bucket: 3600 },
  { key: "30d", label: "30d", seconds: 30 * 86_400, bucket: 86_400 },
] as const;

type WindowKey = (typeof WINDOW_OPTIONS)[number]["key"];

export function MetricSeriesChart({
  metricId,
  groupByLabels = [],
  defaultWindow = "7d",
}: {
  metricId: string;
  groupByLabels?: string[];
  defaultWindow?: WindowKey;
}) {
  const [windowKey, setWindowKey] = useState<WindowKey>(defaultWindow);
  const opt = WINDOW_OPTIONS.find((o) => o.key === windowKey) ?? WINDOW_OPTIONS[1];
  const now = useMemo(() => Math.floor(Date.now() / 1000), [windowKey]);
  const body = useMemo(
    () => ({ from: now - opt.seconds, to: now, bucket: opt.bucket }),
    [now, opt.seconds, opt.bucket],
  );
  const key = `/api/admin/metrics/${metricId}/series`;
  const { data, error, isLoading } = useSWR<SeriesResponse>(
    [key, body],
    ([url, b]) => fetcher(url as string, b),
    { shouldRetryOnError: false, revalidateOnFocus: false },
  );

  const { chartRows, seriesKeys } = useMemo(() => {
    if (!data) return { chartRows: [] as Record<string, number>[], seriesKeys: ["v"] };
    if (groupByLabels.length === 0) {
      return {
        chartRows: data.rows.map((r) => ({ t: Number(r.t), v: Number(r.v) })),
        seriesKeys: ["v"],
      };
    }
    // Pivot: one row per t, one column per groupBy combination.
    const buckets = new Map<number, Record<string, number>>();
    const keys = new Set<string>();
    for (const r of data.rows) {
      const t = Number(r.t);
      const combo = groupByLabels.map((l) => String(r[l] ?? "—")).join(" · ");
      keys.add(combo);
      const row = buckets.get(t) ?? { t };
      row[combo] = Number(r.v);
      buckets.set(t, row);
    }
    const sorted = [...buckets.values()].sort((a, b) => (a.t as number) - (b.t as number));
    return { chartRows: sorted, seriesKeys: [...keys] };
  }, [data, groupByLabels]);

  const errMsg = error instanceof Error ? error.message : error ? "Failed to load series" : null;
  const isMissingToken = errMsg ? /CF_API_TOKEN/i.test(errMsg) : false;

  return (
    <div className="flex flex-col gap-3">
      <WindowTabs value={windowKey} onChange={setWindowKey} />
      {isLoading ? (
        <Skeleton className="h-[280px] w-full rounded-md" />
      ) : errMsg ? (
        <div className="flex h-[280px] flex-col items-center justify-center gap-2 rounded-md border border-dashed border-[var(--se-line-2)] bg-[var(--se-bg-1)] p-4 text-center">
          <div className="font-mono text-[11px] uppercase tracking-[0.08em] text-[var(--se-fg-3)]">
            {isMissingToken ? "Analytics token not configured" : "Series unavailable"}
          </div>
          <div className="max-w-md font-mono text-[12px] text-[var(--se-fg-2)]">
            {isMissingToken
              ? "Set CF_API_TOKEN on the UI worker to render this chart. See DEPLOY.md."
              : errMsg}
          </div>
        </div>
      ) : chartRows.length === 0 ? (
        <div className="flex h-[280px] items-center justify-center rounded-md border border-dashed border-[var(--se-line-2)] bg-[var(--se-bg-1)] text-[12px] text-[var(--se-fg-3)]">
          No data for the selected window.
        </div>
      ) : (
        <ChartBody chartRows={chartRows} seriesKeys={seriesKeys} sql={data?.sql} />
      )}
    </div>
  );
}

function ChartBody({
  chartRows,
  seriesKeys,
  sql,
}: {
  chartRows: Record<string, number>[];
  seriesKeys: string[];
  sql?: string;
}) {
  return (
    <>
      <div className="h-[280px] w-full">
        <ResponsiveContainer>
          <LineChart data={chartRows} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
            <CartesianGrid stroke="var(--se-line-2)" strokeDasharray="3 3" />
            <XAxis
              dataKey="t"
              tickFormatter={(t) => new Date(Number(t) * 1000).toISOString().slice(5, 16)}
              tick={{ fontSize: 10, fill: "var(--se-fg-3)" }}
              stroke="var(--se-line-2)"
            />
            <YAxis tick={{ fontSize: 10, fill: "var(--se-fg-3)" }} stroke="var(--se-line-2)" />
            <Tooltip
              labelFormatter={(t) => new Date(Number(t) * 1000).toISOString()}
              contentStyle={{
                background: "var(--se-bg-1)",
                border: "1px solid var(--se-line-2)",
                fontSize: 12,
              }}
            />
            {seriesKeys.length > 1 ? <Legend wrapperStyle={{ fontSize: 11 }} /> : null}
            {seriesKeys.map((k, i) => (
              <Line
                key={k}
                type="monotone"
                dataKey={k}
                stroke={PALETTE[i % PALETTE.length]}
                strokeWidth={1.5}
                dot={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
      {sql ? (
        <details className="rounded-md border border-[var(--se-line-2)] bg-[var(--se-bg-1)] p-2">
          <summary className="cursor-pointer font-mono text-[11px] text-[var(--se-fg-3)]">
            Compiled SQL
          </summary>
          <pre className="mt-2 overflow-x-auto font-mono text-[11.5px] text-[var(--se-fg-2)]">
            {sql}
          </pre>
        </details>
      ) : null}
    </>
  );
}

function WindowTabs({ value, onChange }: { value: WindowKey; onChange: (v: WindowKey) => void }) {
  return (
    <div
      role="tablist"
      className="inline-flex w-fit gap-1 rounded-md border border-[var(--se-line-2)] bg-[var(--se-bg-1)] p-0.5"
    >
      {WINDOW_OPTIONS.map((o) => {
        const active = o.key === value;
        return (
          <button
            key={o.key}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(o.key)}
            className={
              "rounded px-2 py-0.5 font-mono text-[11.5px] transition-colors " +
              (active
                ? "bg-[var(--se-bg-2)] text-[var(--se-fg-1)]"
                : "text-[var(--se-fg-3)] hover:text-[var(--se-fg-1)]")
            }
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
