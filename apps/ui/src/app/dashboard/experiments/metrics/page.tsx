import { Gauge } from "lucide-react";

import { EmptyState } from "@/components/dashboard/empty-state";
import { PageHeader } from "@/components/dashboard/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const AGG_TYPES = [
  {
    type: "count_users",
    title: "count_users",
    hint: "Did the user do X at least once? Binary conversion-style metrics.",
  },
  {
    type: "sum",
    title: "sum",
    hint: "Total value per user — revenue, orders, time spent.",
  },
  {
    type: "avg",
    title: "avg",
    hint: "Mean value per user — load time, steps per session.",
  },
  {
    type: "retention_Nd",
    title: "retention_Nd",
    hint: "Did the user come back on day N after exposure?",
  },
];

export default function MetricsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Metrics"
        description="Metrics turn raw events into experiment-comparable numbers."
        actions={
          <Button size="sm" disabled>
            New metric
          </Button>
        }
      />

      <EmptyState
        icon={Gauge}
        title="No metrics yet"
        description="Define a metric by picking an event, an aggregation type, and (optionally) a filter."
      />

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
