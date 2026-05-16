import { unstable_noStore as noStore } from "next/cache";
import { ArrowLeft, Copy, MoreHorizontal, Share2 } from "lucide-react";
import { eq } from "drizzle-orm";
import { auth } from "@/auth";
import { getExperiment, listExperimentResults } from "@/lib/handlers/experiments";
import { loadProject } from "@/lib/project";
import { getEnv } from "@/lib/env";
import { LinkButton } from "@/components/ui/link-button";
import { Button } from "@/components/ui/button";
import { getDb } from "@shipeasy/core";
import { experimentMetrics, metrics as metricsTable, universes } from "@shipeasy/core/db/schema";
import { ExperimentStatusButtons } from "./experiment-status-buttons";
import {
  ResultsClient,
  type ResultsMetricRow,
  type ResultsTimeseriesPoint,
  type ResultsViewModel,
  type Verdict,
} from "./results-client";

const LOWER_BETTER = /latency|jank|refund|churn|error|crash|bounce|fail|abandon|no_results|cost|time_to|wait/i;

function isLowerBetter(metricName: string) {
  return LOWER_BETTER.test(metricName);
}

type ResultRow = Awaited<ReturnType<typeof listExperimentResults>>["results"][number];

function latestPerGroup(
  rows: ResultRow[],
  metric: string,
): Record<string, ResultRow> {
  const out: Record<string, ResultRow> = {};
  for (const r of rows) {
    if (r.metric !== metric) continue;
    const cur = out[r.groupName];
    if (!cur || r.ds > cur.ds) out[r.groupName] = r;
  }
  return out;
}

function buildMetricRow(
  metricName: string,
  agg: string,
  treatment: ResultRow | undefined,
  alpha: number,
  isGuard: boolean,
): ResultsMetricRow {
  const lowerBetter = isLowerBetter(metricName);
  const ci: [number, number] | null =
    treatment?.ci95Low != null && treatment?.ci95High != null
      ? [treatment.ci95Low, treatment.ci95High]
      : null;
  const delta = treatment?.delta ?? null;
  const deltaPct = treatment?.deltaPct ?? null;
  const p = treatment?.pValue ?? null;
  const sig = p != null && p < alpha;
  let pass: boolean | undefined;
  if (isGuard) {
    if (!ci || !sig) pass = true;
    else {
      const isPos = ci[0] > 0;
      const isNeg = ci[1] < 0;
      const goodChange = lowerBetter ? isNeg : isPos;
      pass = !(sig && !goodChange);
    }
  }
  return {
    name: metricName,
    agg,
    delta,
    deltaPct,
    ci,
    p,
    sig,
    lowerBetter,
    pass,
  };
}

function deriveVerdict({
  status,
  goal,
  guards,
  srm,
  daysRunning,
  minRuntime,
  hasAnyResults,
  hasPeekWarning,
}: {
  status: string;
  goal: ResultsMetricRow | undefined;
  guards: ResultsMetricRow[];
  srm: boolean;
  daysRunning: number;
  minRuntime: number;
  hasAnyResults: boolean;
  hasPeekWarning: boolean;
}): Verdict {
  if (status === "draft") return "draft";
  if (srm) return "invalid";
  if (status === "running") {
    if (!hasAnyResults) return "wait";
    if (daysRunning < minRuntime || hasPeekWarning) return "wait";
  }
  if (!goal) return "wait";
  const ci = goal.ci;
  const sig = goal.sig;
  const goalGood =
    ci != null && (goal.lowerBetter ? ci[1] < 0 : ci[0] > 0);
  const guardFailed = guards.some((g) => g.pass === false);
  if (guardFailed) return "hold";
  if (sig && goalGood) return "ship";
  return "wait";
}

function titleFor(verdict: Verdict, ctx: {
  status: string;
  daysRunning: number;
  minRuntime: number;
  goal?: ResultsMetricRow;
  worstGuard?: ResultsMetricRow;
  stoppedAgo?: number;
}): { title: string; why: string } {
  if (verdict === "draft")
    return {
      title: "Draft — not started.",
      why: "No users have been assigned yet. Finish the launch checklist to begin.",
    };
  if (verdict === "invalid")
    return {
      title: "Results not trustworthy.",
      why: "Group sizes don't match configured weights — assignment imbalance, tracking bug, or bot traffic.",
    };
  if (verdict === "hold") {
    const g = ctx.worstGuard;
    const guardName = g?.name ?? "a guardrail";
    const lift = g?.delta != null ? `${g.delta > 0 ? "+" : ""}${(g.delta * 100).toFixed(1)}%` : "";
    return {
      title: "Hold — a guardrail regressed.",
      why: `Goal looks promising, but **${guardName}** moved ${lift}. Resolve before shipping.`,
    };
  }
  if (verdict === "ship") {
    const liftStr =
      ctx.goal?.delta != null
        ? `${ctx.goal.delta > 0 ? "+" : ""}${(ctx.goal.delta * 100).toFixed(1)}pp`
        : "";
    if (ctx.status === "stopped") {
      const ago = ctx.stoppedAgo != null ? `${ctx.stoppedAgo}d` : "recently";
      return {
        title: `Shipped ${ago} ago.`,
        why: `Final analysis frozen at day ${ctx.daysRunning}. Goal significant with no regressions.`,
      };
    }
    return {
      title: "Ship it.",
      why: `Goal lifted **${liftStr}** with no guardrail regressions. min_runtime reached.`,
    };
  }
  // wait
  if (ctx.daysRunning < ctx.minRuntime) {
    return {
      title: "Wait — keep collecting.",
      why: `Day **${ctx.daysRunning} of ${ctx.minRuntime}** min_runtime. Peeking now would inflate false-positive risk.`,
    };
  }
  return {
    title: "Wait — no clear signal yet.",
    why: "Goal hasn't crossed significance. Keep collecting or revise hypothesis.",
  };
}

function buildTimeseries(
  rows: ResultRow[],
  metric: string,
  treatmentGroup: string,
): ResultsTimeseriesPoint[] {
  const filtered = rows.filter((r) => r.metric === metric);
  const byDs = new Map<string, ResultsTimeseriesPoint>();
  for (const r of filtered) {
    if (!byDs.has(r.ds)) byDs.set(r.ds, { ds: r.ds, control: null, treatment: null });
    const p = byDs.get(r.ds)!;
    if (r.groupName === "control") p.control = r.mean ?? null;
    if (r.groupName === treatmentGroup) p.treatment = r.mean ?? null;
  }
  return [...byDs.values()].sort((a, b) => (a.ds < b.ds ? -1 : 1));
}

function ownerColor(seed: string): string {
  const palette = ["#7c5cff", "#22a06b", "#f5a623", "#3b82f6", "#ec4899", "#06b6d4"];
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return palette[h % palette.length];
}

export default async function ExperimentDetailPage({
  params,
}: {
  params: Promise<{ projectId: string; id: string }>;
}) {
  noStore();
  const { projectId: routeProjectId, id } = await params;
  const session = await auth();
  const projectId = session?.user?.project_id ?? routeProjectId;
  const identity = {
    projectId: projectId ?? "",
    actorEmail: session?.user?.email ?? "unknown",
    source: "jwt" as const,
  };

  let experiment: Awaited<ReturnType<typeof getExperiment>> | null = null;
  let results: ResultRow[] = [];
  let attachedMetrics: { metricId: string; role: string; name: string; aggregation: string }[] = [];
  let universeRow: { name: string; unitType: string; holdoutRange: [number, number] | null } | null = null;
  let projectName: string | null = null;

  if (projectId) {
    try {
      experiment = await getExperiment(identity, id);
      const project = await loadProject(projectId);
      projectName = project.name;
      const r = await listExperimentResults(identity, id);
      results = r.results;
      const env = getEnv();
      const db = getDb(env.DB);
      const attached = await db
        .select({
          metricId: experimentMetrics.metricId,
          role: experimentMetrics.role,
          name: metricsTable.name,
          aggregation: metricsTable.aggregation,
        })
        .from(experimentMetrics)
        .innerJoin(metricsTable, eq(experimentMetrics.metricId, metricsTable.id))
        .where(eq(experimentMetrics.experimentId, id));
      attachedMetrics = attached;
      const expData = experiment as { universe?: string } | null;
      if (expData?.universe) {
        const uni = await db
          .select({
            name: universes.name,
            unitType: universes.unitType,
            holdoutRange: universes.holdoutRange,
          })
          .from(universes)
          .where(eq(universes.name, expData.universe))
          .limit(1);
        universeRow = uni[0] ?? null;
      }
    } catch {
      // DB unavailable in dev without wrangler
    }
  }

  const exp = experiment as {
    name?: string;
    description?: string | null;
    tag?: string | null;
    universe?: string | null;
    targetingGate?: string | null;
    allocationPct?: number;
    significanceThreshold?: number;
    minRuntimeDays?: number;
    minSampleSize?: number;
    sequentialTesting?: boolean;
    cupedFrozenAt?: string | null;
    hashVersion?: number;
    salt?: string;
    params?: Record<string, string>;
    groups?: { name: string; weight: number }[];
    status?: string;
    startedAt?: string | null;
    stoppedAt?: string | null;
    updatedAt?: string;
  } | null;

  const name = exp?.name ?? id;
  const status = (exp?.status ?? "draft") as ResultsViewModel["status"];
  const groups = exp?.groups ?? [];
  const treatmentGroup = groups.find((g) => g.name !== "control")?.name ?? "treatment";
  const alpha = exp?.significanceThreshold ?? 0.05;
  const minRuntime = exp?.minRuntimeDays ?? 0;
  const minSample = exp?.minSampleSize ?? 0;
  const allocation =
    (exp?.allocationPct ?? 0) >= 10000 ? 100 : Math.round((exp?.allocationPct ?? 0) / 100);

  const startedAt = exp?.startedAt ?? null;
  const stoppedAt = exp?.stoppedAt ?? null;
  const daysRunning = startedAt
    ? Math.max(
        0,
        Math.floor((Date.now() - new Date(startedAt).getTime()) / 86_400_000),
      )
    : 0;
  const stoppedAgo = stoppedAt
    ? Math.max(
        0,
        Math.floor((Date.now() - new Date(stoppedAt).getTime()) / 86_400_000),
      )
    : undefined;
  const daysGoal = Math.max(minRuntime, daysRunning, 1);

  const goalAttached = attachedMetrics.find((m) => m.role === "goal");
  const guardAttached = attachedMetrics.filter((m) => m.role === "guardrail");
  const secAttached = attachedMetrics.filter((m) => m.role === "secondary");

  const latestForMetric = (metricName: string) => latestPerGroup(results, metricName);

  const goalLatest = goalAttached ? latestForMetric(goalAttached.name) : {};
  const goalControl = goalLatest["control"];
  const goalTreatment = goalLatest[treatmentGroup];

  const goal: ResultsMetricRow | undefined = goalAttached
    ? buildMetricRow(goalAttached.name, goalAttached.aggregation, goalTreatment, alpha, false)
    : undefined;

  const guards: ResultsMetricRow[] = guardAttached.map((m) => {
    const t = latestForMetric(m.name)[treatmentGroup];
    return buildMetricRow(m.name, m.aggregation, t, alpha, true);
  });
  const secs: ResultsMetricRow[] = secAttached.map((m) => {
    const t = latestForMetric(m.name)[treatmentGroup];
    return buildMetricRow(m.name, m.aggregation, t, alpha, false);
  });

  const usersPerGroup: number[] = groups.map((g) => {
    if (!goalAttached) {
      // any metric, take latest n by group
      const anyMetric = [...new Set(results.map((r) => r.metric))][0];
      if (!anyMetric) return 0;
      return latestPerGroup(results, anyMetric)[g.name]?.n ?? 0;
    }
    return goalLatest[g.name]?.n ?? 0;
  });

  const srmDetected = results.some((r) => r.srmDetected === 1);
  const peekWarning = results.some((r) => r.peekWarning === 1);
  const hasAnyResults = results.length > 0;
  const isFinal = status === "stopped" || results.some((r) => r.isFinal === 1);

  const worstGuard = guards.filter((g) => g.pass === false)[0];

  const verdict = deriveVerdict({
    status,
    goal,
    guards,
    srm: srmDetected,
    daysRunning,
    minRuntime,
    hasAnyResults,
    hasPeekWarning: peekWarning,
  });

  const { title, why } = titleFor(verdict, {
    status,
    daysRunning,
    minRuntime,
    goal,
    worstGuard,
    stoppedAgo,
  });

  const rawNumbers =
    goalControl?.mean != null && goalTreatment?.mean != null && goalTreatment.pValue != null
      ? {
          ctrl: goalControl.mean,
          test: goalTreatment.mean,
          delta: goalTreatment.delta ?? goalTreatment.mean - goalControl.mean,
          deltaPct: goalTreatment.deltaPct ?? 0,
          p: goalTreatment.pValue,
        }
      : undefined;

  // SRM details
  const expectedPerGroup: number[] | undefined = srmDetected
    ? groups.map((g) => {
        const m = goalAttached?.name ?? [...new Set(results.map((r) => r.metric))][0];
        if (!m) return 0;
        return latestPerGroup(results, m)[g.name]?.expectedN ?? 0;
      })
    : undefined;
  const srmLatestP =
    srmDetected && goalAttached
      ? latestForMetric(goalAttached.name)[treatmentGroup]?.srmPValue ?? null
      : null;
  // Chi-square approximation from p-value isn't trivial; show the SDK-stored p directly.
  const srm = srmDetected
    ? { chiSq: 0, chiSqP: srmLatestP ?? 0 }
    : undefined;

  const timeseries = goalAttached
    ? buildTimeseries(results, goalAttached.name, treatmentGroup)
    : [];

  const ownerEmail = session?.user?.email ?? "anon";
  const owner = {
    initial: (ownerEmail[0] ?? "?").toUpperCase(),
    color: ownerColor(ownerEmail),
    name: ownerEmail,
  };

  const draftChecklist =
    verdict === "draft"
      ? [
          { label: `Goal metric · ${goalAttached?.name ?? "not attached"}`, done: !!goalAttached },
          {
            label: `Group weights sum to 10000 (${groups.reduce((s, g) => s + g.weight, 0)})`,
            done: groups.reduce((s, g) => s + g.weight, 0) === 10000,
          },
          {
            label: `Universe · ${exp?.universe ?? "—"}${universeRow?.holdoutRange ? ` · holdout ${universeRow.holdoutRange[0]}–${universeRow.holdoutRange[1]}` : ""}`,
            done: !!exp?.universe,
          },
          {
            label: `Targeting gate · ${exp?.targetingGate ?? "none"}`,
            done: true,
          },
          { label: "Allocation set", done: (exp?.allocationPct ?? 0) > 0 },
          {
            label: `At least one guardrail attached (${guardAttached.length})`,
            done: guardAttached.length > 0,
          },
        ]
      : undefined;

  const holdoutPct = universeRow?.holdoutRange
    ? Math.round(((universeRow.holdoutRange[1] - universeRow.holdoutRange[0]) / 10000) * 100)
    : 0;

  // Activity feed from real fields + plausible mock entries.
  const activity = [
    ...(stoppedAt
      ? [
          {
            who: ownerEmail,
            av: owner.initial,
            color: owner.color,
            what: <>Stopped experiment.</>,
            when: stoppedAt.slice(0, 16).replace("T", " "),
          },
        ]
      : []),
    {
      who: "Shipeasy",
      av: "S",
      bot: true,
      what: (
        <>
          Auto-analysis run · {goalTreatment?.pValue != null ? `p = ${goalTreatment.pValue.toFixed(3)}` : "no p-value yet"}
          {worstGuard ? <> · <b>{worstGuard.name}</b> regressed.</> : null}
        </>
      ),
      when: results.length > 0 ? `latest ds ${results[results.length - 1].ds}` : "pending",
    },
    ...(startedAt
      ? [
          {
            who: ownerEmail,
            av: owner.initial,
            color: owner.color,
            what: (
              <>
                Started experiment via <b>shipeasy.experiment.start()</b>.
              </>
            ),
            when: startedAt.slice(0, 16).replace("T", " "),
          },
        ]
      : []),
    {
      who: ownerEmail,
      av: owner.initial,
      color: owner.color,
      what: <>Created experiment.</>,
      when: exp?.updatedAt ? exp.updatedAt.slice(0, 16).replace("T", " ") : "—",
    },
  ];

  const vm: ResultsViewModel = {
    id,
    name,
    status,
    verdict,
    title,
    why,
    days: daysRunning,
    daysGoal,
    isFinal,
    stoppedAgo,
    usersPerGroup,
    expectedPerGroup,
    rawNumbers,
    goal,
    guards,
    secs,
    srm,
    showResults: verdict !== "invalid" && hasAnyResults,
    peekWarning,
    timeseries,
    draftChecklist,
    projectId: projectId ?? "",
    meta: {
      hypothesis: exp?.description?.trim() ?? `${treatmentGroup} vs control on ${exp?.universe ?? "default"}`,
      success: goalAttached
        ? `${goalAttached.name} improves vs control with no guardrail regression at α = ${alpha}.`
        : `Attach a goal metric and define success criteria.`,
      universe: exp?.universe ?? "default",
      unit: universeRow?.unitType ?? "user_id",
      holdoutPct,
      holdoutRange: universeRow?.holdoutRange ?? undefined,
      allocation,
      groups,
      gate: exp?.targetingGate ?? null,
      hashVersion: `sha256_v${exp?.hashVersion ?? 1}`,
      cupedFrozenAt: exp?.cupedFrozenAt ?? null,
      alpha,
      minSample,
      minRuntime,
      sequential: !!exp?.sequentialTesting,
      owner,
      tag: exp?.tag ?? null,
      paramsSchema: exp?.params ?? {},
      startedAt,
      stoppedAt,
      updatedAt: exp?.updatedAt ?? new Date().toISOString(),
      estTrafficPerDay: 0,
      project: projectName ?? projectId ?? "—",
      env: "prod",
      layer: exp?.universe ?? "default",
      tags: exp?.tag ? [exp.tag] : [],
      activity,
      subscribers: [],
    },
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center justify-between gap-4 px-6 pt-6 pb-2">
        <LinkButton
          variant="ghost"
          size="sm"
          className="-ml-2"
          href={`/dashboard/${projectId}/experiments`}
        >
          <ArrowLeft className="size-3.5" />
          Experiments
        </LinkButton>
      </div>
      <ResultsClient
        vm={vm}
        actions={
          <>
            <ExperimentStatusButtons id={id} status={status} />
            <Button size="sm" variant="outline">
              <Copy className="size-3" /> Duplicate
            </Button>
            <Button size="sm" variant="outline">
              <Share2 className="size-3" /> Share
            </Button>
            <Button size="sm" variant="ghost">
              <MoreHorizontal className="size-3.5" />
            </Button>
          </>
        }
      />
    </div>
  );
}
