import { Gauge } from "lucide-react";
import { auth } from "@/auth";
import { listMetrics } from "@/lib/handlers/metrics";
import { EmptyState } from "@/components/dashboard/empty-state";
import { PageHeader } from "@/components/dashboard/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MetricForm } from "./metric-form";
import { deleteMetricAction } from "./actions";

const AGG_TYPES = [
  {
    type: "count_users",
    title: "count_users",
    hint: "Did the user do X at least once? Binary conversion-style metrics.",
  },
  { type: "sum", title: "sum", hint: "Total value per user — revenue, orders, time spent." },
  { type: "avg", title: "avg", hint: "Mean value per user — load time, steps per session." },
  {
    type: "retention_Nd",
    title: "retention_Nd",
    hint: "Did the user come back on day N after exposure?",
  },
];

export default async function MetricsPage() {
  const session = await auth();
  const projectId = session?.user?.project_id;

  let metrics: Awaited<ReturnType<typeof listMetrics>> = [];
  if (projectId) {
    try {
      metrics = await listMetrics({
        projectId,
        actorEmail: session?.user?.email ?? "unknown",
        source: "jwt",
      });
    } catch {
      // DB not available in dev without wrangler
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Metrics"
        description="Metrics turn raw events into experiment-comparable numbers."
      />

      <MetricForm />

      {metrics.length === 0 ? (
        <EmptyState
          icon={Gauge}
          title="No metrics yet"
          description="Define a metric by picking an event, an aggregation type, and (optionally) a filter."
        />
      ) : (
        <div className="rounded-lg border">
          {metrics.map((m) => (
            <div
              key={m.id}
              className="flex items-center justify-between border-b px-4 py-3 last:border-0"
            >
              <div className="flex items-center gap-3">
                <span className="font-mono text-sm font-medium">{m.name}</span>
                <span className="text-xs text-muted-foreground">
                  {m.aggregation} on {m.eventName}
                </span>
              </div>
              <form action={deleteMetricAction}>
                <input type="hidden" name="id" value={m.id} />
                <Button
                  size="sm"
                  variant="ghost"
                  type="submit"
                  className="text-destructive hover:text-destructive"
                >
                  Delete
                </Button>
              </form>
            </div>
          ))}
        </div>
      )}

      <Card>
        <CardHeader className="border-b pb-4">
          <CardTitle>Aggregation types</CardTitle>
          <CardDescription>Reference for choosing the right metric shape.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 pt-4 sm:grid-cols-2 lg:grid-cols-4">
          {AGG_TYPES.map((a) => (
            <div key={a.type} className="rounded-lg border bg-background p-3">
              <div className="font-mono text-sm">{a.title}</div>
              <div className="mt-1 text-xs text-muted-foreground">{a.hint}</div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
