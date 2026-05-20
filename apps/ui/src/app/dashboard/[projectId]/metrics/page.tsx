import type { Metadata } from "next";

import { render as renderDsl, type Query as DslQuery } from "@shipeasy/query-dsl";

import { authenticateAdmin } from "@/lib/admin-auth";
import { listMetrics } from "@/lib/handlers/metrics";

import { MetricsContent } from "./metrics-content";
import type { RegisteredMetric } from "./registered-metrics-section";

export const metadata: Metadata = { title: "Metrics" };

type SearchParams = Promise<{
  demo?: string;
  setup?: string;
  view?: string;
  open?: string;
}>;

export default async function MetricsPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;

  const identity = await authenticateAdmin();
  let registered: RegisteredMetric[] = [];
  try {
    const rows = await listMetrics(identity);
    registered = rows.map((r) => {
      let query = r.query ?? null;
      if (!query && r.queryIr) {
        try {
          query = renderDsl(r.queryIr as unknown as DslQuery);
        } catch {
          query = null;
        }
      }
      const irKind = r.queryIr?.agg?.kind;
      const aggDisplay =
        irKind === "quantile"
          ? `p${Math.round((r.queryIr?.agg?.p ?? 0.95) * 100)}`
          : irKind === "retention_Nd"
            ? `retention_${r.queryIr?.agg?.n ?? 7}d`
            : (irKind ?? r.aggregation);
      return {
        id: r.id,
        name: r.name,
        folder: r.folder ?? null,
        eventName: r.eventName,
        aggregation: aggDisplay,
        valuePath: r.valuePath ?? null,
        query,
        updatedAt: r.updatedAt,
      };
    });
  } catch {
    registered = [];
  }

  const hasRegistered = registered.length > 0;
  const initialView =
    params.view === "dashboard"
      ? "dashboard"
      : params.demo === "1" || params.view === "list" || hasRegistered
        ? "list"
        : "empty";

  return <MetricsContent initialView={initialView} registered={registered} />;
}
