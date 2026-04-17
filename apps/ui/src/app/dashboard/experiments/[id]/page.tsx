import { ArrowLeft } from "lucide-react";
import { auth } from "@/auth";
import { getExperiment, listExperimentResults } from "@/lib/handlers/experiments";
import { loadProject } from "@/lib/project";
import { PageHeader } from "@/components/dashboard/page-header";
import { StatCard } from "@/components/dashboard/stat-card";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LinkButton } from "@/components/ui/link-button";
import { getPlan } from "@shipeasy/core";
import { setExperimentStatusAction } from "../actions";
import { Button } from "@/components/ui/button";

function deriveVerdict(results: { pValue: number | null; srmDetected: number | null }[]): string {
  if (results.length === 0) return "—";
  const latest = results[results.length - 1];
  if (latest.srmDetected === 1) return "Invalid (SRM)";
  if (latest.pValue === null) return "Wait";
  if (latest.pValue < 0.05) return latest.pValue < 0 ? "Wait" : "Ship";
  return "Hold";
}

function fmtPct(v: number | null): string {
  if (v === null) return "—";
  return `${v >= 0 ? "+" : ""}${(v * 100).toFixed(2)}%`;
}

function fmtCi(lo: number | null, hi: number | null): string {
  if (lo === null || hi === null) return "—";
  return `[${lo >= 0 ? "+" : ""}${lo.toFixed(4)}, ${hi >= 0 ? "+" : ""}${hi.toFixed(4)}]`;
}

function statusBadge(status: string) {
  const variant =
    status === "running"
      ? "default"
      : status === "stopped"
        ? "secondary"
        : status === "archived"
          ? "outline"
          : "secondary";
  return <Badge variant={variant}>{status}</Badge>;
}

export default async function ExperimentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  const projectId = session?.user?.project_id;
  const identity = {
    projectId: projectId ?? "",
    actorEmail: session?.user?.email ?? "unknown",
    source: "jwt" as const,
  };

  let experiment: Awaited<ReturnType<typeof getExperiment>> | null = null;
  let results: Awaited<ReturnType<typeof listExperimentResults>>["results"] = [];
  let plan: ReturnType<typeof getPlan> | null = null;

  if (projectId) {
    try {
      experiment = await getExperiment(identity, id);
      const project = await loadProject(projectId);
      plan = getPlan(project.plan);
      const r = await listExperimentResults(identity, id);
      results = r.results;
    } catch {
      // DB unavailable in dev without wrangler
    }
  }

  // Group results by metric, then by date (latest per metric per group)
  const metricNames = [...new Set(results.map((r) => r.metric))];
  const latestByMetricGroup: Record<string, Record<string, (typeof results)[0]>> = {};
  for (const r of results) {
    if (!latestByMetricGroup[r.metric]) latestByMetricGroup[r.metric] = {};
    const cur = latestByMetricGroup[r.metric][r.groupName];
    if (!cur || r.ds > cur.ds) latestByMetricGroup[r.metric][r.groupName] = r;
  }

  const treatmentResults = results.filter((r) => r.groupName !== "control");
  const verdict = deriveVerdict(treatmentResults);

  const totalUsers = results
    .filter((r) => r.groupName === "control")
    .reduce((sum, r) => sum + (r.n ?? 0), 0);

  const startedAt = experiment
    ? ((experiment as { startedAt?: string | null }).startedAt ?? null)
    : null;
  const daysRunning = startedAt
    ? Math.floor((Date.now() - new Date(startedAt).getTime()) / 86_400_000)
    : 0;

  const name = experiment?.name ?? id;
  const status = experiment?.status ?? "draft";

  return (
    <div className="space-y-6">
      <LinkButton variant="ghost" size="sm" className="-ml-2" href="/dashboard/experiments">
        <ArrowLeft className="size-3.5" />
        Experiments
      </LinkButton>

      <PageHeader
        title={name}
        description={
          (experiment as { description?: string | null } | null)?.description ?? "Experiment detail"
        }
        actions={
          <>
            {statusBadge(status)}
            {status === "draft" && (
              <form action={setExperimentStatusAction}>
                <input type="hidden" name="id" value={id} />
                <input type="hidden" name="status" value="running" />
                <Button size="sm" type="submit">
                  Start
                </Button>
              </form>
            )}
            {status === "running" && (
              <form action={setExperimentStatusAction}>
                <input type="hidden" name="id" value={id} />
                <input type="hidden" name="status" value="stopped" />
                <Button size="sm" variant="outline" type="submit">
                  Stop
                </Button>
              </form>
            )}
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Status"
          value={status.charAt(0).toUpperCase() + status.slice(1)}
          hint="Experiment lifecycle state"
        />
        <StatCard
          label="Users / group"
          value={totalUsers > 0 ? String(totalUsers) : "—"}
          hint="Total control-group exposures"
        />
        <StatCard
          label="Days running"
          value={String(daysRunning)}
          hint="Days since experiment started"
        />
        <StatCard label="Verdict" value={verdict} hint="Ship / Hold / Wait / Invalid" />
      </div>

      {metricNames.length === 0 ? (
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
      ) : (
        metricNames.map((metric) => {
          const groupData = latestByMetricGroup[metric] ?? {};
          const groups = Object.values(groupData);
          const hasSrm = groups.some((g) => g.srmDetected === 1);
          const hasPeekWarning = groups.some((g) => g.peekWarning === 1);
          const hasSequential =
            plan?.sequential_testing && groups.some((g) => g.msprtSignificant !== null);

          return (
            <Card key={metric}>
              <CardHeader className="border-b pb-4">
                <div className="flex items-center gap-2">
                  <CardTitle>{metric}</CardTitle>
                  {hasSrm && <Badge variant="destructive">SRM detected</Badge>}
                  {hasPeekWarning && <Badge variant="outline">Peek warning</Badge>}
                </div>
                <CardDescription>Latest daily analysis results.</CardDescription>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-xs text-muted-foreground">
                        <th className="pb-2 pr-4">Group</th>
                        <th className="pb-2 pr-4">N</th>
                        <th className="pb-2 pr-4">Mean</th>
                        <th className="pb-2 pr-4">Delta</th>
                        <th className="pb-2 pr-4">95% CI</th>
                        <th className="pb-2 pr-4">p-value</th>
                        {hasSequential && <th className="pb-2">mSPRT</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {groups.map((g) => (
                        <tr key={g.groupName} className="border-b last:border-0">
                          <td className="py-2 pr-4 font-mono font-medium">{g.groupName}</td>
                          <td className="py-2 pr-4">{g.n ?? "—"}</td>
                          <td className="py-2 pr-4">{g.mean?.toFixed(4) ?? "—"}</td>
                          <td className="py-2 pr-4">{fmtPct(g.deltaPct)}</td>
                          <td className="py-2 pr-4 font-mono text-xs">
                            {fmtCi(g.ci95Low, g.ci95High)}
                          </td>
                          <td className="py-2 pr-4">{g.pValue?.toFixed(4) ?? "—"}</td>
                          {hasSequential && (
                            <td className="py-2">
                              {g.msprtSignificant === 1 ? (
                                <Badge variant="default">Sig</Badge>
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {!plan?.sequential_testing && (
                  <p className="mt-3 text-xs text-muted-foreground">
                    Sequential testing (mSPRT) is available on Pro plan and above.
                  </p>
                )}
              </CardContent>
            </Card>
          );
        })
      )}

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
            {experiment ? (
              <span>
                {(experiment as { groups?: { name: string; weight: number }[] }).groups
                  ?.map((g) => `${g.name} ${(g.weight / 100).toFixed(0)}%`)
                  .join(" / ")}
                {" — Allocation "}
                {(
                  ((experiment as { allocationPct?: number }).allocationPct ?? 10000) / 100
                ).toFixed(0)}
                {"%. Universe: "}
                {(experiment as { universe?: string }).universe ?? "default"}.
              </span>
            ) : (
              "Loading…"
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
