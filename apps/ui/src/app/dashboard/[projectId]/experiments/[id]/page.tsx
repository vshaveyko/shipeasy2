import { unstable_noStore as noStore } from "next/cache";
import { ArrowLeft, Clock, Code, ShieldCheck, Sparkles } from "lucide-react";
import { eq } from "drizzle-orm";
import { auth } from "@/auth";
import { getExperiment, listExperimentResults } from "@/lib/handlers/experiments";
import { listMetrics } from "@/lib/handlers/metrics";
import { loadProject } from "@/lib/project";
import { getEnv } from "@/lib/env";
import { Page, PageBody } from "@/components/dashboard/page";
import { LinkButton } from "@/components/ui/link-button";
import { getPlan, getDb } from "@shipeasy/core";
import { experimentMetrics, metrics as metricsTable } from "@shipeasy/core/db/schema";
import { ExperimentStatusButtons } from "./experiment-status-buttons";
import { MetricsPanel } from "./metrics-panel";

function deriveVerdict(results: { pValue: number | null; srmDetected: number | null }[]): string {
  if (results.length === 0) return "Wait";
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

function fmtDuration(startedAt: string | null): string {
  if (!startedAt) return "—";
  const ms = Date.now() - new Date(startedAt).getTime();
  const days = Math.floor(ms / 86_400_000);
  const hours = Math.floor((ms % 86_400_000) / 3_600_000);
  if (days === 0) return `${hours}h`;
  return `${days}d ${hours}h running`;
}

const STATUS_BADGE: Record<string, string> = {
  running: "se-badge se-badge-live",
  draft: "se-badge",
  stopped: "se-badge se-badge-paused",
  archived: "se-badge se-badge-completed",
};

export default async function ExperimentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  noStore();
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
  let allMetrics: { id: string; name: string }[] = [];
  let attachedMetrics: { metricId: string; role: string; name: string }[] = [];

  if (projectId) {
    try {
      experiment = await getExperiment(identity, id);
      const project = await loadProject(projectId);
      plan = getPlan(project.plan);
      const r = await listExperimentResults(identity, id);
      results = r.results;
      const env = getEnv();
      const db = getDb(env.DB);
      const attached = await db
        .select({
          metricId: experimentMetrics.metricId,
          role: experimentMetrics.role,
          name: metricsTable.name,
        })
        .from(experimentMetrics)
        .innerJoin(metricsTable, eq(experimentMetrics.metricId, metricsTable.id))
        .where(eq(experimentMetrics.experimentId, id));
      attachedMetrics = attached;
      const rawMetrics = await listMetrics(identity);
      allMetrics = rawMetrics.map((m) => ({ id: m.id, name: m.name }));
    } catch {
      // DB unavailable in dev without wrangler
    }
  }

  const guardrailMetrics = attachedMetrics.filter((m) => m.role === "guardrail");
  const secondaryMetrics = attachedMetrics.filter((m) => m.role === "secondary");
  const primaryMetric = attachedMetrics.find((m) => m.role === "primary")?.name;

  // Group results by metric, then by group (latest per metric per group)
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
    groups?: { name: string; weight: number }[];
  } | null;

  const name = exp?.name ?? id;
  const status = experiment?.status ?? "draft";
  const minRuntimeDays = exp?.minRuntimeDays ?? 0;
  const minSampleSize = exp?.minSampleSize ?? 0;
  const groups = exp?.groups ?? [];
  const allocationPct =
    (exp?.allocationPct ?? 0) >= 10000 ? 100 : Math.round((exp?.allocationPct ?? 0) / 100);

  const dayLabel =
    status === "running" && minRuntimeDays > 0
      ? `DAY ${Math.min(daysRunning + 1, minRuntimeDays)} OF ${minRuntimeDays}`
      : status === "running"
        ? `DAY ${daysRunning + 1}`
        : null;

  const hypothesis = exp?.description?.trim() ?? null;

  return (
    <Page>
      {/* Top bar with breadcrumb + actions */}
      <div className="flex items-center justify-between gap-4">
        <LinkButton
          variant="ghost"
          size="sm"
          className="-ml-2"
          href={`/dashboard/${projectId}/experiments`}
        >
          <ArrowLeft className="size-3.5" />
          Experiments
        </LinkButton>
        <ExperimentStatusButtons id={id} status={status} />
      </div>

      <PageBody className="space-y-5">
        {/* Header card */}
        <div className="rounded-[var(--radius-lg)] border border-[var(--se-line)] bg-[var(--se-bg-1)] p-6">
          <div className="flex flex-wrap items-center gap-3">
            <span className={STATUS_BADGE[status] ?? "se-badge"}>
              <span className="dot" />
              {status.toUpperCase()}
              {dayLabel ? ` · ${dayLabel}` : ""}
            </span>
            <span className="t-mono-xs dim-2">{id}</span>
            {exp?.tag ? (
              <span className="rounded-full border border-[var(--se-line-2)] bg-[var(--se-bg-3)] px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide text-[var(--se-fg-3)]">
                {exp.tag}
              </span>
            ) : null}
          </div>
          <h1 className="mt-3 text-[28px] font-medium tracking-[-0.02em]">{name}</h1>
          {hypothesis ? (
            <p className="mt-1 max-w-[80ch] text-[14px] leading-[1.55] text-[var(--se-fg-2)]">
              {hypothesis}
            </p>
          ) : (
            <p className="mt-1 max-w-[80ch] text-[14px] leading-[1.55] text-[var(--se-fg-3)]">
              {groups.length > 0 ? `${groups.map((g) => g.name).join(" vs ")} on ` : ""}
              <span className="t-mono dim">
                universe · {exp?.universe ?? "default"}
                {exp?.targetingGate ? ` · gate · ${exp.targetingGate}` : ""}
              </span>
            </p>
          )}
          <div className="mt-4 flex flex-wrap items-center gap-4 text-[13px]">
            <span className="t-mono-xs dim-2 inline-flex items-center gap-1.5">
              <Clock className="size-3" />
              {fmtDuration(startedAt)}
            </span>
            <span className="text-[var(--se-fg-4)]">·</span>
            <span className="t-mono-xs dim-2">
              {groups.length} variant{groups.length === 1 ? "" : "s"} · {allocationPct}% allocation
            </span>
            {primaryMetric ? (
              <>
                <span className="text-[var(--se-fg-4)]">·</span>
                <span className="t-mono-xs dim-2">primary · {primaryMetric}</span>
              </>
            ) : null}
          </div>
        </div>

        {/* Top stats */}
        <div className="grid gap-3 md:grid-cols-4">
          <StatTile
            label="Users / control"
            value={totalUsers > 0 ? totalUsers.toLocaleString() : "—"}
            hint={
              minSampleSize > 0 ? `target · ${minSampleSize.toLocaleString()}` : "no minimum set"
            }
          />
          <StatTile
            label="Days running"
            value={String(daysRunning)}
            hint={
              minRuntimeDays > 0
                ? `min · ${minRuntimeDays} day${minRuntimeDays === 1 ? "" : "s"}`
                : status === "running"
                  ? "live"
                  : status
            }
          />
          <StatTile
            label="Verdict"
            value={verdict}
            hint={
              metricNames.length > 0
                ? `${metricNames.length} metric${metricNames.length === 1 ? "" : "s"} tracked`
                : "awaiting results"
            }
            valueColor={
              verdict === "Ship"
                ? "var(--se-accent)"
                : verdict === "Hold"
                  ? "var(--se-warn)"
                  : verdict.startsWith("Invalid")
                    ? "var(--se-danger)"
                    : undefined
            }
          />
          <StatTile
            label="Significance"
            value={
              treatmentResults.length > 0
                ? `${(
                    ((treatmentResults[treatmentResults.length - 1].pValue ?? 1) >= 0
                      ? 1 - (treatmentResults[treatmentResults.length - 1].pValue ?? 1)
                      : 0) * 100
                  ).toFixed(1)}%`
                : "—"
            }
            hint={`threshold · ${((exp?.significanceThreshold ?? 0.05) * 100).toFixed(1)}%`}
          />
        </div>

        {/* Tabs */}
        <div
          role="tablist"
          aria-label="Experiment view tabs"
          className="flex items-center gap-0 border-b border-[var(--se-line)]"
        >
          {[
            { k: "overview", label: "Overview", active: true },
            { k: "metrics", label: "Metrics" },
            { k: "variants", label: "Variants" },
            { k: "segments", label: "Segments" },
            { k: "events", label: "Events" },
            { k: "timeline", label: "Timeline" },
            { k: "config", label: "Config" },
          ].map((t) => (
            <button
              key={t.k}
              role="tab"
              aria-selected={!!t.active}
              type="button"
              disabled={!t.active}
              className={`relative -mb-px flex items-center gap-1.5 px-3.5 py-2.5 text-[13px] transition-colors border-b-[1.5px] border-transparent ${
                t.active
                  ? "border-[var(--se-accent)] text-foreground"
                  : "text-[var(--se-fg-3)] cursor-not-allowed"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Body: 2-col layout */}
        <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
          <div className="space-y-5">
            {/* Variants card */}
            <div className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--se-line)] bg-[var(--se-bg-1)]">
              <div className="flex items-center gap-3 border-b border-[var(--se-line)] px-5 py-3.5">
                <div className="text-[14px] font-medium">Variants</div>
                <span className="ml-auto t-mono-xs dim-2">
                  {groups.length === 2 && groups[0].weight === groups[1].weight
                    ? "50/50 split · sticky by user_id"
                    : "custom split · sticky by user_id"}
                </span>
              </div>
              {groups.length === 0 ? (
                <div className="px-5 py-6 text-[13px] text-[var(--se-fg-3)]">
                  No variants configured.
                </div>
              ) : (
                groups.map((g, i) => {
                  const isControl = i === 0;
                  const weightPct = Math.round(g.weight / 100);
                  const groupResult =
                    metricNames.length > 0
                      ? latestByMetricGroup[metricNames[0]]?.[g.name]
                      : undefined;
                  return (
                    <div
                      key={g.name}
                      className="grid items-center gap-4 border-b border-[var(--se-line)] px-5 py-3.5 last:border-none"
                      style={{
                        gridTemplateColumns: "40px minmax(0,1fr) 80px 120px 1fr",
                        background: !isControl
                          ? "color-mix(in oklab, var(--se-accent) 5%, transparent)"
                          : undefined,
                      }}
                    >
                      <div
                        className="grid size-8 place-items-center rounded-md font-mono text-[12px] font-semibold"
                        style={{
                          background: isControl ? "var(--se-bg-3)" : "var(--se-accent)",
                          color: isControl ? "inherit" : "var(--se-accent-fg)",
                          border: isControl ? "1px solid var(--se-line-2)" : "none",
                        }}
                      >
                        {String.fromCharCode(65 + i)}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <b className="truncate font-mono text-[13px]">{g.name}</b>
                          {isControl ? (
                            <span className="rounded-full border border-[var(--se-line-2)] bg-[var(--se-bg-3)] px-1.5 py-px font-mono text-[10px] uppercase tracking-wide text-[var(--se-fg-3)]">
                              baseline
                            </span>
                          ) : null}
                        </div>
                      </div>
                      <div
                        className="font-mono text-[13px]"
                        style={{ fontVariantNumeric: "tabular-nums" }}
                      >
                        {weightPct}%
                      </div>
                      <div>
                        <div className="t-caps dim-2 mb-0.5">
                          {primaryMetric ?? metricNames[0] ?? "Mean"}
                        </div>
                        <div
                          className="font-mono text-[14px]"
                          style={{
                            fontVariantNumeric: "tabular-nums",
                            color:
                              !isControl && (groupResult?.deltaPct ?? 0) > 0
                                ? "var(--se-accent)"
                                : !isControl && (groupResult?.deltaPct ?? 0) < 0
                                  ? "var(--se-danger)"
                                  : undefined,
                          }}
                        >
                          {groupResult?.mean !== null && groupResult?.mean !== undefined
                            ? groupResult.mean.toFixed(3)
                            : "—"}
                          {!isControl && groupResult?.deltaPct
                            ? ` · ${fmtPct(groupResult.deltaPct)}`
                            : ""}
                        </div>
                      </div>
                      <div>
                        <div className="h-1 overflow-hidden rounded-full bg-[var(--se-bg-3)]">
                          <div
                            className="h-full"
                            style={{
                              width: `${weightPct}%`,
                              background: isControl ? "var(--se-fg-3)" : "var(--se-accent)",
                            }}
                          />
                        </div>
                        <div className="t-mono-xs dim-2 mt-1.5">
                          {groupResult?.n != null ? `${groupResult.n.toLocaleString()} users` : "—"}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Per-metric results */}
            {metricNames.length === 0 ? (
              <div className="rounded-[var(--radius-lg)] border border-dashed border-[var(--se-line)] bg-[var(--se-bg-1)]/40 px-5 py-10 text-center text-[13px] text-[var(--se-fg-3)]">
                No results yet. Start the experiment and we&apos;ll run a Welch significance
                analysis daily.
              </div>
            ) : (
              <div className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--se-line)] bg-[var(--se-bg-1)]">
                <div className="flex items-center gap-3 border-b border-[var(--se-line)] px-5 py-3.5">
                  <div className="text-[14px] font-medium">Secondary metrics</div>
                  <span className="ml-auto t-mono-xs dim-2">
                    {metricNames.length} metric{metricNames.length === 1 ? "" : "s"}
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-[13px]">
                    <thead>
                      <tr className="border-b border-[var(--se-line)] text-left">
                        <th className="t-caps dim-3 px-5 py-2 font-normal">Metric</th>
                        <th className="t-caps dim-3 px-3 py-2 text-right font-normal">Control</th>
                        <th className="t-caps dim-3 px-3 py-2 text-right font-normal">Treatment</th>
                        <th className="t-caps dim-3 px-3 py-2 text-right font-normal">Lift</th>
                        <th className="t-caps dim-3 px-5 py-2 text-right font-normal">p-value</th>
                      </tr>
                    </thead>
                    <tbody>
                      {metricNames.map((metric) => {
                        const groupData = latestByMetricGroup[metric] ?? {};
                        const control = groupData["control"];
                        const treatment = Object.entries(groupData).find(
                          ([k]) => k !== "control",
                        )?.[1];
                        const lift = treatment?.deltaPct ?? null;
                        const liftColor =
                          lift !== null
                            ? lift > 0
                              ? "var(--se-accent)"
                              : "var(--se-danger)"
                            : "var(--se-fg-4)";
                        return (
                          <tr
                            key={metric}
                            className="border-b border-[var(--se-line)] last:border-none"
                          >
                            <td className="px-5 py-2.5 font-mono">{metric}</td>
                            <td
                              className="px-3 py-2.5 text-right font-mono"
                              style={{ fontVariantNumeric: "tabular-nums" }}
                            >
                              {control?.mean?.toFixed(3) ?? "—"}
                            </td>
                            <td
                              className="px-3 py-2.5 text-right font-mono"
                              style={{ fontVariantNumeric: "tabular-nums" }}
                            >
                              {treatment?.mean?.toFixed(3) ?? "—"}
                            </td>
                            <td
                              className="px-3 py-2.5 text-right font-mono"
                              style={{ fontVariantNumeric: "tabular-nums", color: liftColor }}
                            >
                              {fmtPct(lift)}
                            </td>
                            <td
                              className="px-5 py-2.5 text-right font-mono"
                              style={{ fontVariantNumeric: "tabular-nums" }}
                            >
                              {treatment?.pValue?.toFixed(4) ?? "—"}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* MetricsPanel — preserve existing attach UX */}
            <MetricsPanel
              experimentId={id}
              allMetrics={allMetrics}
              guardrailMetrics={guardrailMetrics}
              secondaryMetrics={secondaryMetrics}
            />
          </div>

          {/* Right rail */}
          <div className="rounded-[var(--radius-lg)] border border-[var(--se-line)] bg-[var(--se-bg-1)]">
            {hypothesis ? (
              <RailSection label="Hypothesis">
                <p className="text-[13px] leading-[1.55] text-[var(--se-fg-2)]">{hypothesis}</p>
              </RailSection>
            ) : null}

            <RailSection label="Configuration">
              <KV k="Primary metric" v={primaryMetric ?? "—"} mono />
              <KV k="Universe" v={exp?.universe ?? "default"} mono />
              <KV
                k="Analysis"
                v={exp?.sequentialTesting ? "Sequential · mSPRT" : "Welch · daily"}
              />
              <KV
                k="Min. sample"
                v={minSampleSize > 0 ? minSampleSize.toLocaleString() : "—"}
                mono
              />
              <KV
                k="Significance"
                v={`${((exp?.significanceThreshold ?? 0.05) * 100).toFixed(1)}%`}
                mono
              />
              <KV
                k="Min. runtime"
                v={
                  minRuntimeDays > 0
                    ? `${minRuntimeDays} day${minRuntimeDays === 1 ? "" : "s"}`
                    : "—"
                }
              />
            </RailSection>

            <RailSection label="Audience">
              <div className="flex flex-wrap gap-1">
                <Tag>universe · {exp?.universe ?? "default"}</Tag>
                {exp?.targetingGate ? <Tag>gate · {exp.targetingGate}</Tag> : null}
                <Tag>allocation · {allocationPct}%</Tag>
              </div>
            </RailSection>

            <RailSection label="Guardrails">
              {guardrailMetrics.length === 0 ? (
                <p className="text-[12.5px] text-[var(--se-fg-3)]">No guardrails attached yet.</p>
              ) : (
                <div className="space-y-2">
                  {guardrailMetrics.map((m) => (
                    <div key={m.metricId} className="flex items-center gap-2">
                      <ShieldCheck className="size-3 text-[var(--se-accent)]" />
                      <span className="flex-1 text-[13px]">{m.name}</span>
                      <span className="t-mono-xs dim-2">attached</span>
                    </div>
                  ))}
                </div>
              )}
            </RailSection>

            <RailSection label="Activity" last>
              <ActivityRow
                live={status === "running"}
                title={
                  startedAt ? `Experiment started` : status === "draft" ? "Draft created" : status
                }
                subtitle={startedAt ? new Date(startedAt).toLocaleString() : "—"}
              />
              {plan?.cuped_enabled ? (
                <ActivityRow title="CUPED active" subtitle="variance reduction enabled" />
              ) : null}
              {!plan?.sequential_testing ? (
                <ActivityRow
                  title="Sequential testing unavailable"
                  subtitle="upgrade to Pro for mSPRT"
                  icon={<Sparkles className="size-3" />}
                />
              ) : null}
              <ActivityRow
                title="View SDK snippet"
                subtitle="how to gate code on this experiment"
                icon={<Code className="size-3" />}
              />
            </RailSection>
          </div>
        </div>
      </PageBody>
    </Page>
  );
}

function StatTile({
  label,
  value,
  hint,
  valueColor,
}: {
  label: string;
  value: string;
  hint: string;
  valueColor?: string;
}) {
  return (
    <div className="rounded-[var(--radius-md)] border border-[var(--se-line)] bg-[var(--se-bg-1)] px-4 py-3.5">
      <div className="t-caps dim-3">{label}</div>
      <div
        className="mt-1 text-[22px] font-medium leading-tight tracking-tight"
        style={{ fontVariantNumeric: "tabular-nums", color: valueColor ?? undefined }}
      >
        {value}
      </div>
      <div className="t-mono-xs dim-2 mt-1">{hint}</div>
    </div>
  );
}

function RailSection({
  label,
  children,
  last,
}: {
  label: string;
  children: React.ReactNode;
  last?: boolean;
}) {
  return (
    <div className={"px-5 py-4" + (last ? "" : " border-b border-[var(--se-line)]")}>
      <div className="t-caps dim-3 mb-2.5">{label}</div>
      {children}
    </div>
  );
}

function KV({ k, v, mono }: { k: string; v: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between py-1 text-[13px]">
      <span className="text-[var(--se-fg-3)]">{k}</span>
      <span
        className={mono ? "font-mono text-[12px]" : "text-[12.5px]"}
        style={{ fontVariantNumeric: "tabular-nums" }}
      >
        {v}
      </span>
    </div>
  );
}

function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full border border-[var(--se-line-2)] bg-[var(--se-bg-3)] px-2 py-0.5 font-mono text-[10.5px] text-[var(--se-fg-2)]">
      {children}
    </span>
  );
}

function ActivityRow({
  title,
  subtitle,
  live,
  icon,
}: {
  title: string;
  subtitle: string;
  live?: boolean;
  icon?: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3 py-1.5">
      {icon ? (
        <span className="mt-1 inline-flex size-3 items-center justify-center text-[var(--se-fg-3)]">
          {icon}
        </span>
      ) : (
        <span
          className="mt-1.5 inline-block size-1.5 shrink-0 rounded-full"
          style={{
            background: live ? "var(--se-accent)" : "var(--se-fg-4)",
          }}
        />
      )}
      <div className="min-w-0 flex-1">
        <div className="text-[13px]">{title}</div>
        <div className="t-mono-xs dim-2 mt-0.5 truncate">{subtitle}</div>
      </div>
    </div>
  );
}
