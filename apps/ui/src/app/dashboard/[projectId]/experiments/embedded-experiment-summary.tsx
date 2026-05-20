"use client";

import { ArrowUpRightIcon, FlaskConicalIcon, TargetIcon, ShieldCheckIcon } from "lucide-react";
import Link from "next/link";

import { ActionForm } from "@/components/ui/action-form";
import { Button } from "@/components/ui/button";
import { LinkButton } from "@/components/ui/link-button";
import { Banner } from "@/components/ui/banner";
import { Sparkline } from "@/components/ui/sparkline";
import { StatusBadge } from "@/components/ui/status-badge";
import { setExperimentStatusAction } from "./actions";
import type { ExperimentRow } from "./experiments-content";

const STATUS_TONE: Record<string, "live" | "draft" | "paused" | "completed" | "neutral"> = {
  running: "live",
  draft: "draft",
  stopped: "paused",
  archived: "completed",
};

function variantList(groups: unknown): { name: string; weight: number }[] {
  if (!Array.isArray(groups)) return [];
  return groups
    .filter(
      (g): g is { name: string; weight: number } =>
        !!g && typeof g === "object" && "name" in g && "weight" in g,
    )
    .map((g) => ({ name: String(g.name), weight: Number(g.weight) || 0 }));
}

export function EmbeddedExperimentSummary({
  experiment,
  projectId,
  onMutated,
  onDeleted: _onDeleted,
}: {
  experiment: ExperimentRow;
  projectId: string;
  onMutated?: () => void;
  onDeleted?: () => void;
}) {
  const exp = experiment;
  const allocation = exp.allocationPct >= 10000 ? 100 : Math.round((exp.allocationPct ?? 0) / 100);
  const variants = variantList(exp.groups);
  const isDraft = exp.status === "draft";
  const isRunning = exp.status === "running";

  return (
    <div className="flex flex-col gap-4 p-5">
      <header className="flex items-start gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-md border border-[var(--se-line-2)] bg-[var(--se-accent-soft)] text-[var(--se-accent)]">
          <FlaskConicalIcon className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="t-caps dim-2">Experiment</div>
          <h2 className="truncate font-mono text-[18px] font-medium leading-tight">{exp.name}</h2>
          {exp.description ? (
            <p className="mt-1 max-w-[64ch] text-[13px] text-muted-foreground">{exp.description}</p>
          ) : null}
        </div>
        <StatusBadge tone={STATUS_TONE[exp.status] ?? "neutral"}>
          {exp.status.toUpperCase()}
        </StatusBadge>
      </header>

      {isDraft ? (
        <Banner
          intent="info"
          title="Draft"
          action={
            <LinkButton
              size="sm"
              variant="outline"
              href={`/dashboard/${projectId}/experiments/${exp.id}`}
            >
              Open full view
              <ArrowUpRightIcon className="size-3" />
            </LinkButton>
          }
        >
          Attach a goal metric and at least one guardrail in the full editor before starting.
        </Banner>
      ) : null}

      <div className="grid gap-2 md:grid-cols-3">
        <Stat label="Allocation" value={`${allocation}%`} />
        <Stat label="Variants" value={String(variants.length)} />
        <Stat label="Universe" value={exp.universe ?? "default"} mono />
      </div>

      <MetricsBlock projectId={projectId} experiment={exp} />

      <section className="rounded-md border border-[var(--se-line)] bg-[var(--se-bg-1)]">
        <header className="t-caps dim-2 border-b border-[var(--se-line)] px-3 py-2">
          Variants
        </header>
        <div className="p-3">
          {variants.length === 0 ? (
            <p className="dim text-[12.5px]">No variants configured yet.</p>
          ) : (
            <div className="flex flex-col gap-1.5">
              {variants.map((v) => (
                <div
                  key={v.name}
                  className="flex items-center justify-between gap-2 rounded border border-[var(--se-line-2)] bg-[var(--se-bg-2)] px-2.5 py-1.5"
                >
                  <span className="font-mono text-[12.5px]">{v.name}</span>
                  <span
                    className="font-mono text-[11.5px] text-[var(--se-fg-3)]"
                    style={{ fontVariantNumeric: "tabular-nums" }}
                  >
                    {Math.round(v.weight / 100)}%
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="rounded-md border border-[var(--se-line)] bg-[var(--se-bg-1)] p-3">
        <div className="flex items-center justify-between gap-2">
          <div className="t-caps dim-2">Lifecycle</div>
          <div className="flex items-center gap-2">
            {isDraft ? (
              <ActionForm
                action={setExperimentStatusAction}
                loading="Starting experiment…"
                success="Experiment started"
                onSuccess={() => onMutated?.()}
              >
                <input type="hidden" name="id" value={exp.id} />
                <input type="hidden" name="status" value="running" />
                <Button size="sm" type="submit">
                  Start experiment
                </Button>
              </ActionForm>
            ) : null}
            {isRunning ? (
              <ActionForm
                action={setExperimentStatusAction}
                loading="Stopping experiment…"
                success="Experiment stopped"
                onSuccess={() => onMutated?.()}
              >
                <input type="hidden" name="id" value={exp.id} />
                <input type="hidden" name="status" value="stopped" />
                <Button size="sm" variant="outline" type="submit">
                  Stop experiment
                </Button>
              </ActionForm>
            ) : null}
            <LinkButton
              size="sm"
              variant="ghost"
              href={`/dashboard/${projectId}/experiments/${exp.id}`}
              data-testid="experiment-detail-fullview-link"
            >
              Open full view
              <ArrowUpRightIcon className="size-3" />
            </LinkButton>
          </div>
        </div>
        <div className="mt-3 grid gap-2 md:grid-cols-2 text-[12.5px]">
          <div>
            <div className="t-caps dim-3">Started</div>
            <div className="font-mono">
              {exp.startedAt ? exp.startedAt.slice(0, 16).replace("T", " ") : "—"}
            </div>
          </div>
          <div>
            <div className="t-caps dim-3">Updated</div>
            <div className="font-mono">
              {exp.updatedAt ? exp.updatedAt.slice(0, 16).replace("T", " ") : "—"}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function Stat({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="rounded-md border border-[var(--se-line)] bg-[var(--se-bg-1)] p-3">
      <div className="t-caps dim-2">{label}</div>
      <div
        className={mono ? "mt-1 font-mono text-[18px]" : "mt-1 text-[18px]"}
        style={{ fontVariantNumeric: "tabular-nums" }}
      >
        {value}
      </div>
    </div>
  );
}

function MetricsBlock({ projectId, experiment }: { projectId: string; experiment: ExperimentRow }) {
  const goal = experiment.goalMetric ?? null;
  const guardrails = experiment.guardrails ?? [];
  const lift = experiment.primaryLiftPct;
  const sig = experiment.significancePct;
  const sample = experiment.sampleSize;
  const trend = experiment.trendPct ?? [];
  const liftTone =
    lift == null ? "var(--se-fg-3)" : lift > 0 ? "var(--se-accent)" : "var(--se-danger)";

  return (
    <section className="rounded-md border border-[var(--se-line)] bg-[var(--se-bg-1)]">
      <header className="t-caps dim-2 flex items-center gap-1.5 border-b border-[var(--se-line)] px-3 py-2">
        <TargetIcon className="size-3 text-[var(--se-accent)]" />
        Goal
      </header>
      <div className="p-3">
        {goal ? (
          <div className="flex flex-wrap items-center gap-4">
            <Link
              href={`/dashboard/${projectId}/metrics/${goal.id}`}
              className="font-mono text-[13.5px] text-[var(--se-fg-1)] hover:text-[var(--se-accent)]"
            >
              {goal.name}
            </Link>
            <div className="flex items-baseline gap-2">
              <span
                className="font-mono text-[18px]"
                style={{ color: liftTone, fontVariantNumeric: "tabular-nums" }}
              >
                {lift == null ? "—" : `${lift > 0 ? "+" : ""}${lift.toFixed(1)}%`}
              </span>
              <span className="t-mono-xs dim-2">primary lift</span>
            </div>
            {sig != null ? (
              <div className="flex items-baseline gap-1.5 font-mono text-[12px] text-[var(--se-fg-2)]">
                <span style={{ fontVariantNumeric: "tabular-nums" }}>{sig.toFixed(1)}%</span>
                <span className="t-mono-xs dim-2">sig</span>
              </div>
            ) : null}
            {sample != null ? (
              <div className="flex items-baseline gap-1.5 font-mono text-[12px] text-[var(--se-fg-2)]">
                <span style={{ fontVariantNumeric: "tabular-nums" }}>{formatN(sample)}</span>
                <span className="t-mono-xs dim-2">n</span>
              </div>
            ) : null}
            {trend.length > 1 ? (
              <div className="ml-auto">
                <Sparkline
                  points={trend}
                  width={140}
                  height={28}
                  intent={(lift ?? 0) >= 0 ? "accent" : "danger"}
                />
              </div>
            ) : null}
          </div>
        ) : (
          <p className="t-mono-xs dim-2">No goal metric attached.</p>
        )}
      </div>
      <header className="t-caps dim-2 flex items-center gap-1.5 border-y border-[var(--se-line)] px-3 py-2">
        <ShieldCheckIcon className="size-3" />
        Guardrails
        <span className="ml-1 rounded bg-[var(--se-bg-2)] px-1.5 py-px font-mono text-[10.5px] text-[var(--se-fg-3)]">
          {guardrails.length}
        </span>
      </header>
      <div className="p-3">
        {guardrails.length === 0 ? (
          <p className="t-mono-xs dim-2">No guardrails attached.</p>
        ) : (
          <ul className="flex flex-col gap-1">
            {guardrails.map((g) => (
              <li key={g.id}>
                <Link
                  href={`/dashboard/${projectId}/metrics/${g.id}`}
                  className="font-mono text-[12.5px] text-[var(--se-fg-2)] hover:text-[var(--se-accent)]"
                >
                  {g.name}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

function formatN(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}
