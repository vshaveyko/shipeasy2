import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { render as renderDsl, type Query as DslQuery } from "@shipeasy/query-dsl";

import { Page, PageBody } from "@/components/dashboard/page";
import { LinkButton } from "@/components/ui/link-button";
import { getMetric } from "@/lib/handlers/metrics";
import { authenticateAdmin } from "@/lib/admin-auth";
import { MetricSeriesChart } from "./series-chart";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ projectId: string; id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  try {
    const identity = await authenticateAdmin();
    const m = await getMetric(identity, id);
    return { title: `Metric · ${m.name}` };
  } catch {
    return { title: `Metric · ${id.slice(0, 8)}` };
  }
}

export default async function MetricDetailPage({
  params,
}: {
  params: Promise<{ projectId: string; id: string }>;
}) {
  const { projectId, id } = await params;
  const identity = await authenticateAdmin();
  let metric: Awaited<ReturnType<typeof getMetric>>;
  try {
    metric = await getMetric(identity, id);
  } catch {
    notFound();
  }

  const ir = metric.queryIr ?? null;
  const groupByLabels = ir?.groupBy?.labels ?? [];
  let dsl: string | null = null;
  if (ir) {
    try {
      dsl = renderDsl(ir as unknown as DslQuery);
    } catch {
      dsl = null;
    }
  }
  const irKind = ir?.agg?.kind;
  const aggDisplay =
    irKind === "quantile"
      ? `p${Math.round((ir?.agg?.p ?? 0.95) * 100)}`
      : irKind === "retention_Nd"
        ? `retention_${ir?.agg?.n ?? 7}d`
        : (irKind ?? metric.aggregation);
  const winsorize = metric.winsorizePct ?? null;
  const mde = metric.minDetectableEffect ?? null;
  const updated = metric.updatedAt
    ? new Date(metric.updatedAt).toISOString().slice(0, 16).replace("T", " ")
    : null;

  return (
    <Page>
      <PageBody className="space-y-4">
        <LinkButton
          variant="ghost"
          size="sm"
          className="-ml-2 w-fit"
          href={`/dashboard/${projectId}/metrics`}
        >
          <ArrowLeft className="size-3.5" />
          Metrics
        </LinkButton>
        <header className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-mono text-[18px] text-[var(--se-fg-1)]">{metric.name}</h1>
            <span className="rounded border border-[var(--se-line-2)] bg-[var(--se-bg-1)] px-1.5 py-0.5 font-mono text-[10.5px] uppercase tracking-[0.06em] text-[var(--se-fg-2)]">
              {aggDisplay}
            </span>
          </div>
          {dsl ? (
            <pre className="w-fit max-w-full whitespace-pre-wrap break-all rounded-md border border-[var(--se-line-2)] bg-[var(--se-bg-1)] px-2.5 py-1.5 font-mono text-[11.5px] leading-snug text-[var(--se-fg-2)]">
              {dsl}
            </pre>
          ) : null}
          <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 font-mono text-[11.5px]">
            <dt className="uppercase tracking-[0.06em] text-[var(--se-fg-3)]">Source event</dt>
            <dd className="text-[var(--se-fg-2)]">{metric.eventName}</dd>
            {metric.valuePath ? (
              <>
                <dt className="uppercase tracking-[0.06em] text-[var(--se-fg-3)]">Value</dt>
                <dd className="text-[var(--se-fg-2)]">{metric.valuePath}</dd>
              </>
            ) : null}
            {groupByLabels.length > 0 ? (
              <>
                <dt className="uppercase tracking-[0.06em] text-[var(--se-fg-3)]">
                  Group {ir?.groupBy?.op === "without" ? "without" : "by"}
                </dt>
                <dd className="text-[var(--se-fg-2)]">{groupByLabels.join(", ")}</dd>
              </>
            ) : null}
            {winsorize !== null ? (
              <>
                <dt className="uppercase tracking-[0.06em] text-[var(--se-fg-3)]">Winsorize</dt>
                <dd className="text-[var(--se-fg-2)]">p{winsorize}</dd>
              </>
            ) : null}
            {mde !== null ? (
              <>
                <dt className="uppercase tracking-[0.06em] text-[var(--se-fg-3)]">MDE</dt>
                <dd className="text-[var(--se-fg-2)]">{(mde * 100).toFixed(1)}%</dd>
              </>
            ) : null}
            {updated ? (
              <>
                <dt className="uppercase tracking-[0.06em] text-[var(--se-fg-3)]">Updated</dt>
                <dd className="text-[var(--se-fg-2)]">{updated}</dd>
              </>
            ) : null}
          </dl>
        </header>
        <section className="rounded-md border border-[var(--se-line-2)] bg-[var(--se-bg-1)] p-3">
          <MetricSeriesChart metricId={metric.id} groupByLabels={groupByLabels} />
        </section>
      </PageBody>
    </Page>
  );
}
