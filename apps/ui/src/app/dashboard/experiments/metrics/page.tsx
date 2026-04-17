import { Gauge } from "lucide-react";
import { auth } from "@/auth";
import { listMetrics } from "@/lib/handlers/metrics";
import { EmptyState } from "@/components/dashboard/empty-state";
import { PageHeader } from "@/components/dashboard/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createMetricAction, deleteMetricAction } from "./actions";

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

      <Card>
        <CardHeader className="border-b pb-4">
          <CardTitle>New metric</CardTitle>
          <CardDescription>
            Define a metric by picking an event and aggregation type.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-4">
          <form action={createMetricAction} className="grid gap-3 sm:grid-cols-4">
            <div className="grid gap-1.5">
              <Label htmlFor="metric-name">Name</Label>
              <Input
                id="metric-name"
                name="name"
                placeholder="purchase_rate"
                className="font-mono"
                required
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="metric-event">Event name</Label>
              <Input
                id="metric-event"
                name="event_name"
                placeholder="purchase"
                className="font-mono"
                required
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="metric-agg">Aggregation</Label>
              <select
                id="metric-agg"
                name="aggregation"
                className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <option value="count_users">count_users</option>
                <option value="count_events">count_events</option>
                <option value="sum">sum</option>
                <option value="avg">avg</option>
                <option value="retention_Nd">retention_Nd</option>
              </select>
            </div>
            <div className="flex items-end">
              <Button size="sm" type="submit">
                New metric
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

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
