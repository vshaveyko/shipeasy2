import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { ApiError } from "@shipeasy/core";
import { metrics, events as eventsTable, type MetricQueryIR } from "@shipeasy/core/db/schema";
import { compile, type AggKind, type Registry, type MetricDef } from "@shipeasy/query-dsl";
import { scopedDb } from "../db";
import { getEnvAsync } from "../env";
import type { AdminIdentity } from "../admin-auth";

const seriesInputSchema = z.object({
  from: z.number().int().nonnegative(),
  to: z.number().int().nonnegative(),
  bucket: z.number().int().min(60).max(86_400).default(3600),
});

export type MetricSeriesRow = {
  t: number;
  v: number;
  [label: string]: number | string;
};

export async function getMetricSeries(
  identity: AdminIdentity,
  metricId: string,
  input: unknown,
): Promise<{ sql: string; rows: MetricSeriesRow[] }> {
  const parsed = seriesInputSchema.parse(input);
  if (parsed.to <= parsed.from) {
    throw new ApiError("`to` must be > `from`", 400);
  }

  const env = await getEnvAsync();
  const s = scopedDb(identity.projectId);
  const metricRows = await s.selectWhere(metrics, eq(metrics.id, metricId));
  if (metricRows.length === 0) throw new ApiError("Metric not found", 404);
  const metric = metricRows[0];
  if (!metric.queryIr) {
    throw new ApiError("Metric has no IR yet — re-save it to populate query_ir.", 422);
  }

  const eventRows = await s.selectWhere(
    eventsTable,
    and(eq(eventsTable.projectId, identity.projectId), eq(eventsTable.name, metric.eventName))!,
  );
  if (eventRows.length === 0) throw new ApiError("Source event not found", 404);

  const def: MetricDef = {
    dataset: "shipeasy_metric_events",
    eventName: metric.eventName,
    defaultValueColumn: "double1",
    properties: (eventRows[0].properties ?? []).map((p) => ({ name: p.name, type: p.type })),
  };
  const registry: Registry = { [metric.eventName]: def };

  const ir = metric.queryIr as MetricQueryIR;
  const sql = compile(
    {
      agg: ir.agg as AggKind,
      metric: ir.metric,
      valueLabel: ir.valueLabel,
      filters: ir.filters ?? [],
      groupBy: ir.groupBy,
    },
    { bucket: parsed.bucket, timeRange: { from: parsed.from, to: parsed.to } },
    registry,
  );

  const token = (env as unknown as { CF_API_TOKEN?: string }).CF_API_TOKEN;
  const accountId = env.CF_ACCOUNT_ID;
  if (!token) {
    throw new ApiError(
      "CF_API_TOKEN secret is not configured on the UI worker — set it via `wrangler secret put CF_API_TOKEN`.",
      503,
    );
  }
  if (!accountId) {
    throw new ApiError("CF_ACCOUNT_ID is not configured", 503);
  }

  // Cloudflare Analytics Engine SQL API takes the SQL as the raw request body
  // (Content-Type: text/plain), not a JSON-wrapped { query }. Wrapping in
  // JSON produces a parser error: "Expected an SQL statement, found: {".
  const res = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${accountId}/analytics_engine/sql`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "text/plain",
      },
      body: sql,
    },
  );
  if (!res.ok) {
    const text = await res.text();
    throw new ApiError(`Analytics Engine error ${res.status}: ${text.slice(0, 300)}`, 502);
  }
  const data = (await res.json()) as { data?: MetricSeriesRow[] };
  const rows: MetricSeriesRow[] = data.data ?? [];

  return { sql, rows };
}
