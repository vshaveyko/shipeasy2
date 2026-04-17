import { ArrowLeft } from "lucide-react";

import { PageHeader } from "@/components/dashboard/page-header";
import { StatCard } from "@/components/dashboard/stat-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LinkButton } from "@/components/ui/link-button";

export default async function ExperimentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <div className="space-y-6">
      <LinkButton variant="ghost" size="sm" className="-ml-2" href="/dashboard/experiments">
        <ArrowLeft className="size-3.5" />
        Experiments
      </LinkButton>

      <PageHeader
        title={id}
        description="Does a redesigned checkout increase conversion without hurting load time?"
        actions={
          <>
            <Badge variant="secondary">draft</Badge>
            <Button variant="outline" size="sm">
              Edit
            </Button>
            <Button size="sm">Start</Button>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Status" value="Draft" hint="Not yet collecting data" />
        <StatCard label="Users / group" value="—" hint="Awaiting first exposures" />
        <StatCard label="Days running" value="0" hint="Min 7 days on Free plan" />
        <StatCard label="Verdict" value="—" hint="Ship / Hold / Wait / Invalid" />
      </div>

      <Card>
        <CardHeader className="border-b pb-4">
          <CardTitle>Goal metric</CardTitle>
          <CardDescription>
            Confidence intervals will render here once the analysis cron produces results.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="rounded-lg border border-dashed bg-card/50 p-10 text-center text-sm text-muted-foreground">
            No results yet. Start the experiment and we&apos;ll compute a Welch t-test daily.
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="border-b pb-4">
            <CardTitle>Guardrails</CardTitle>
            <CardDescription>Metrics we never want to regress.</CardDescription>
          </CardHeader>
          <CardContent className="pt-4 text-sm text-muted-foreground">
            Add guardrail metrics from the experiment edit screen.
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="border-b pb-4">
            <CardTitle>Setup</CardTitle>
            <CardDescription>Traffic split and exposure rules.</CardDescription>
          </CardHeader>
          <CardContent className="pt-4 text-sm text-muted-foreground">
            50 / 50 split — control vs test. Allocation 100%. Universe: default.
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
