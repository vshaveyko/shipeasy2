import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Circle,
  FlaskConical,
  Gauge,
  Heart,
  KeyRound,
  Pin,
  Power,
  Shield,
  Sliders,
  Sparkles,
  Zap,
} from "lucide-react";

import { Banner } from "@/components/ui/banner";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import type { HomeActivityEntry, HomeState, HomeStateKind } from "./state";

interface CockpitProps {
  projectId: string;
  state: HomeState;
  firstName?: string;
}

function heroCopy(kind: HomeStateKind, name: string, counts: HomeState["counts"]) {
  if (kind === "first-run") {
    return {
      eyebrow: "New workspace — let's wire it up",
      title: (
        <>
          Welcome. <span className="text-[var(--se-accent)]">Three minutes</span> to live data.
        </>
      ),
      sub: "Install the SDK, fire a test event, and Shipeasy starts collecting vitals, errors, and your own logs immediately. Experiments, gates, and configs activate as soon as init() runs.",
    };
  }
  if (kind === "quiet") {
    return {
      eyebrow: "LIVE · everything green",
      title: (
        <>
          Good morning, <em className="font-serif italic">{name}</em>.{" "}
          <span className="text-[var(--se-accent)]">Quiet day</span> — nothing on fire.
        </>
      ),
      sub: `${counts.experiments} experiment${counts.experiments === 1 ? "" : "s"}, ${counts.gates} gate${counts.gates === 1 ? "" : "s"}, and ${counts.configs} config${counts.configs === 1 ? "" : "s"} are live. Killswitches green, gates green.`,
    };
  }
  return {
    eyebrow: "LIVE · attention needed",
    title: (
      <>
        Morning, <em className="font-serif italic">{name}</em>.{" "}
        <span className="text-[var(--se-accent)]">
          {counts.runningExperiments} experiment{counts.runningExperiments === 1 ? "" : "s"}
        </span>{" "}
        running.
      </>
    ),
    sub: "Decisions waiting on you below. Open one to review variants, verdict, and lifecycle.",
  };
}

const STAT_TONE = {
  accent:
    "border-[color-mix(in_oklab,var(--se-accent)_35%,transparent)] bg-[var(--se-accent-soft)]",
  neutral: "border-[var(--se-line)] bg-[var(--se-bg-1)]",
  warn: "border-[color-mix(in_oklab,var(--se-warn)_35%,transparent)] bg-[var(--se-warn-soft)]",
} as const;

function HeroStat({
  label,
  value,
  unit,
  hint,
  tone = "neutral",
}: {
  label: string;
  value: string | number;
  unit?: string;
  hint?: string;
  tone?: keyof typeof STAT_TONE;
}) {
  return (
    <div className={`rounded-[var(--radius-md)] border px-4 py-3 ${STAT_TONE[tone]}`}>
      <div className="font-mono text-[10.5px] uppercase tracking-[0.08em] text-[var(--se-fg-4)]">
        {label}
      </div>
      <div className="mt-1 text-[24px] font-medium leading-none tracking-[-0.02em] tabular-nums">
        {value}
        {unit ? <span className="ml-1 text-[12.5px] text-[var(--se-fg-3)]">{unit}</span> : null}
      </div>
      {hint ? <div className="mt-1 text-[11.5px] text-[var(--se-fg-3)]">{hint}</div> : null}
    </div>
  );
}

function PulseStrip({ pulse, kind }: { pulse: number[]; kind: HomeStateKind }) {
  const max = Math.max(1, ...pulse);
  const total = pulse.reduce((a, b) => a + b, 0);
  return (
    <div data-slot="home-pulse" className="space-y-2">
      <div className="flex items-baseline justify-between">
        <span className="font-mono text-[10.5px] uppercase tracking-[0.08em] text-[var(--se-fg-4)]">
          Last 24h · {total} {total === 1 ? "event" : "events"}
        </span>
        <span className="font-mono text-[10px] text-[var(--se-fg-4)]">−24h ··· now</span>
      </div>
      <div className="flex h-10 items-end gap-[3px]">
        {pulse.map((value, i) => {
          const ratio = value / max;
          const intensity =
            value === 0
              ? "bg-[var(--se-line)]"
              : kind === "busy"
                ? "bg-[var(--se-accent)]"
                : "bg-[color-mix(in_oklab,var(--se-accent)_55%,transparent)]";
          return (
            <span
              key={i}
              className={`flex-1 rounded-[2px] transition-all ${intensity}`}
              style={{ height: `${Math.max(8, ratio * 100)}%`, opacity: value === 0 ? 0.6 : 1 }}
              aria-label={`${value} events ${23 - i}h ago`}
            />
          );
        })}
      </div>
    </div>
  );
}

function Hero({ state, firstName }: { state: HomeState; firstName?: string }) {
  const copy = heroCopy(state.kind, firstName ?? "there", state.counts);
  const { counts } = state;

  return (
    <header data-slot="home-hero" data-state={state.kind} className="space-y-5">
      <PulseStrip pulse={state.pulse24h} kind={state.kind} />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <div className="space-y-3">
          <div className="font-mono text-[10.5px] uppercase tracking-[0.08em] text-[var(--se-fg-3)]">
            {copy.eyebrow}
          </div>
          <h1 className="text-[32px] font-medium leading-[1.1] tracking-[-0.02em]">{copy.title}</h1>
          <p className="max-w-[60ch] text-[13.5px] leading-[1.55] text-[var(--se-fg-2)]">
            {copy.sub}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2 self-start">
          {state.kind === "first-run" ? (
            <>
              <HeroStat label="Setup" value="2" unit="of 6" hint="4 steps to go" />
              <HeroStat label="Records" value="0" hint="waiting on first event" />
              <HeroStat label="Team" value="1" unit="· you" hint="invite to enable reviews" />
              <HeroStat label="Status" value="▶" unit="ready" hint="add a key to start" />
            </>
          ) : (
            <>
              <HeroStat
                label="Decisions"
                value={state.decisions.length}
                unit={state.decisions.length === 1 ? "waiting" : "waiting"}
                hint={state.decisions.length > 0 ? "review below" : "nothing pending"}
                tone={state.decisions.length > 0 ? "accent" : "neutral"}
              />
              <HeroStat
                label="Live"
                value={counts.runningExperiments}
                unit={`exp · ${counts.gates} gates`}
                hint={`${counts.configs} configs`}
              />
              <HeroStat
                label="Records"
                value={counts.experiments + counts.gates + counts.configs}
                hint="across all surfaces"
              />
              <HeroStat
                label="Plan"
                value={state.planName}
                hint={state.projectName ?? "workspace"}
              />
            </>
          )}
        </div>
      </div>
    </header>
  );
}

function OnboardingChecklist({ projectId }: { projectId: string }) {
  const steps = [
    {
      key: "key",
      icon: KeyRound,
      title: "Create an SDK key",
      href: `/dashboard/${projectId}/keys`,
      done: false,
    },
    {
      key: "install",
      icon: Sparkles,
      title: "Install @shipeasy/sdk and call init()",
      href: `/dashboard/${projectId}/keys#create-key`,
      done: false,
    },
    {
      key: "event",
      icon: Activity,
      title: "Fire a test event",
      href: `/dashboard/${projectId}/metrics`,
      done: false,
    },
    {
      key: "gate",
      icon: Shield,
      title: "Wire your first gate",
      href: `/dashboard/${projectId}/gates`,
      done: false,
    },
  ];
  return (
    <section data-slot="home-onboarding" className="space-y-3">
      <div className="flex items-baseline justify-between">
        <h2 className="text-[15px] font-medium tracking-[-0.01em]">Get to first event</h2>
        <span className="font-mono text-[11px] text-[var(--se-fg-3)]">
          {steps.filter((s) => s.done).length} of {steps.length}
        </span>
      </div>
      <ol className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--se-line)] bg-[var(--se-bg-1)]">
        {steps.map((s) => (
          <li key={s.key} className="border-b border-[var(--se-line)] last:border-b-0">
            <Link
              href={s.href}
              className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-[var(--se-bg-2)]"
            >
              {s.done ? (
                <CheckCircle2 className="size-4 shrink-0 text-[var(--se-accent)]" />
              ) : (
                <Circle className="size-4 shrink-0 text-[var(--se-fg-4)]" />
              )}
              <s.icon className="size-3.5 shrink-0 text-[var(--se-fg-3)]" />
              <span className="flex-1 text-[13px] text-[var(--se-fg)]">{s.title}</span>
              <ArrowRight className="size-3.5 shrink-0 text-[var(--se-fg-4)]" />
            </Link>
          </li>
        ))}
      </ol>
    </section>
  );
}

function DecisionsRow({
  projectId,
  decisions,
}: {
  projectId: string;
  decisions: HomeState["decisions"];
}) {
  if (decisions.length === 0) {
    return (
      <section data-slot="home-decisions" data-empty="true" className="space-y-3">
        <div className="flex items-baseline justify-between">
          <h2 className="text-[15px] font-medium tracking-[-0.01em]">Decisions waiting on you</h2>
          <span className="font-mono text-[11px] text-[var(--se-fg-3)]">all clear</span>
        </div>
        <div className="rounded-[var(--radius-lg)] border border-dashed border-[var(--se-line-2)] bg-[var(--se-bg-1)] px-4 py-6 text-center text-[12.5px] text-[var(--se-fg-3)]">
          Nothing pending. Open an experiment when one reaches significance.
        </div>
      </section>
    );
  }
  return (
    <section data-slot="home-decisions" className="space-y-3">
      <div className="flex items-baseline justify-between">
        <h2 className="text-[15px] font-medium tracking-[-0.01em]">Decisions waiting on you</h2>
        <Link
          href={`/dashboard/${projectId}/experiments?status=running`}
          className="font-mono text-[11px] text-[var(--se-fg-3)] hover:text-[var(--se-fg)]"
        >
          View all experiments →
        </Link>
      </div>
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {decisions.map((d) => (
          <Link
            key={d.id}
            href={`/dashboard/${projectId}/experiments?open=${d.id}`}
            className="group flex flex-col gap-3 rounded-[var(--radius-lg)] border border-[var(--se-line)] bg-[var(--se-bg-1)] p-4 transition-colors hover:border-[var(--se-line-2)] hover:bg-[var(--se-bg-2)]"
          >
            <div className="flex items-center justify-between">
              <span className="font-mono text-[10.5px] uppercase tracking-[0.08em] text-[var(--se-fg-3)]">
                REVIEW · running
              </span>
              <ArrowRight className="size-3.5 text-[var(--se-fg-4)] transition-colors group-hover:text-[var(--se-accent)]" />
            </div>
            <h3 className="font-mono text-[14px] leading-tight">{d.name}</h3>
            <p className="text-[12.5px] leading-[1.5] text-[var(--se-fg-3)]">{d.description}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}

function LiveNow({
  projectId,
  liveExperiments,
}: {
  projectId: string;
  liveExperiments: HomeState["liveExperiments"];
}) {
  if (liveExperiments.length === 0) return null;
  return (
    <section data-slot="home-live" className="space-y-3">
      <div className="flex items-baseline justify-between">
        <h2 className="text-[15px] font-medium tracking-[-0.01em]">Live now</h2>
        <span className="font-mono text-[11px] text-[var(--se-fg-3)]">
          {liveExperiments.length} record{liveExperiments.length === 1 ? "" : "s"}
        </span>
      </div>
      <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
        {liveExperiments.map((exp) => (
          <Link
            key={exp.id}
            href={`/dashboard/${projectId}/experiments?open=${exp.id}`}
            className="flex items-center justify-between gap-2 rounded-[var(--radius-md)] border border-[var(--se-line)] bg-[var(--se-bg-1)] px-3 py-2.5 transition-colors hover:border-[var(--se-line-2)] hover:bg-[var(--se-bg-2)]"
          >
            <div className="flex min-w-0 items-center gap-2">
              <FlaskConical className="size-3.5 shrink-0 text-[var(--se-accent)]" />
              <span className="truncate font-mono text-[12.5px]">{exp.name}</span>
            </div>
            <StatusBadge tone="live">RUNNING</StatusBadge>
          </Link>
        ))}
      </div>
    </section>
  );
}

const LAUNCHPAD = [
  {
    kind: "gate",
    label: "New gate",
    icon: Shield,
    href: (id: string) => `/dashboard/${id}/gates?new=1`,
  },
  {
    kind: "config",
    label: "New config",
    icon: Sliders,
    href: (id: string) => `/dashboard/${id}/configs/values?new=1`,
  },
  {
    kind: "experiment",
    label: "New experiment",
    icon: FlaskConical,
    href: (id: string) => `/dashboard/${id}/experiments?new=1`,
  },
  {
    kind: "killswitch",
    label: "New killswitch",
    icon: Power,
    href: (id: string) => `/dashboard/${id}/killswitches?new=1`,
  },
  {
    kind: "metric",
    label: "Send first event",
    icon: Gauge,
    href: (id: string) => `/dashboard/${id}/metrics?setup=1`,
  },
];

function Launchpad({ projectId }: { projectId: string }) {
  return (
    <section data-slot="home-launchpad" className="space-y-3">
      <h2 className="text-[15px] font-medium tracking-[-0.01em]">Quick create</h2>
      <div className="grid gap-2 md:grid-cols-3 lg:grid-cols-5">
        {LAUNCHPAD.map((l) => (
          <Link
            key={l.kind}
            href={l.href(projectId)}
            className="group flex items-center gap-2.5 rounded-[var(--radius-md)] border border-[var(--se-line)] bg-[var(--se-bg-1)] px-3 py-2.5 transition-colors hover:border-[var(--se-line-2)] hover:bg-[var(--se-bg-2)]"
          >
            <l.icon className="size-3.5 text-[var(--se-fg-3)] transition-colors group-hover:text-[var(--se-accent)]" />
            <span className="text-[12.5px] font-medium">{l.label}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}

function resourceIcon(type: string) {
  if (type === "gate") return Shield;
  if (type === "config") return Sliders;
  if (type === "experiment") return FlaskConical;
  if (type === "killswitch") return Power;
  if (type === "key") return KeyRound;
  return Activity;
}

function relativeTime(iso: string): string {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return iso;
  const diff = Date.now() - t;
  const m = Math.floor(diff / 60_000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

function ActivityStream({
  projectId,
  activity,
}: {
  projectId: string;
  activity: HomeActivityEntry[];
}) {
  if (activity.length === 0) {
    return (
      <section data-slot="home-activity" data-empty="true" className="space-y-3">
        <h2 className="text-[15px] font-medium tracking-[-0.01em]">Recent activity</h2>
        <div className="rounded-[var(--radius-lg)] border border-dashed border-[var(--se-line-2)] bg-[var(--se-bg-1)] px-4 py-6 text-center text-[12.5px] text-[var(--se-fg-3)]">
          No activity in the last 24h. Changes you ship show up here.
        </div>
      </section>
    );
  }
  return (
    <section data-slot="home-activity" className="space-y-3">
      <div className="flex items-baseline justify-between">
        <h2 className="text-[15px] font-medium tracking-[-0.01em]">Recent activity</h2>
        <span className="font-mono text-[11px] text-[var(--se-fg-3)]">
          {activity.length} entr{activity.length === 1 ? "y" : "ies"}
        </span>
      </div>
      <ol className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--se-line)] bg-[var(--se-bg-1)]">
        {activity.map((entry) => {
          const Icon = resourceIcon(entry.resourceType);
          const href = entry.resourceId
            ? `/dashboard/${projectId}/${entry.resourceType}s?open=${entry.resourceId}`
            : `/dashboard/${projectId}`;
          return (
            <li key={entry.id} className="border-b border-[var(--se-line)] last:border-b-0">
              <Link
                href={href}
                className="flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-[var(--se-bg-2)]"
              >
                <Icon className="size-3.5 shrink-0 text-[var(--se-fg-3)]" />
                <span className="font-mono text-[11px] uppercase tracking-[0.06em] text-[var(--se-fg-4)] w-14 shrink-0">
                  {entry.action}
                </span>
                <span className="flex-1 truncate text-[12.5px] text-[var(--se-fg)]">
                  {entry.resourceType}
                  {entry.resourceId ? (
                    <span className="text-[var(--se-fg-3)]"> · {entry.resourceId}</span>
                  ) : null}
                </span>
                <span className="hidden truncate font-mono text-[11px] text-[var(--se-fg-4)] md:inline">
                  {entry.actorEmail}
                </span>
                <span className="font-mono text-[11px] text-[var(--se-fg-3)] w-16 shrink-0 text-right">
                  {relativeTime(entry.createdAt)}
                </span>
              </Link>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

function HealthRingsCard({ state }: { state: HomeState }) {
  const { counts } = state;
  const rings = [
    {
      label: "Gates",
      value: counts.gates,
      tone: "var(--se-info)",
    },
    {
      label: "Experiments",
      value: counts.runningExperiments,
      total: counts.experiments,
      tone: "var(--se-accent)",
    },
    {
      label: "Configs",
      value: counts.configs,
      tone: "var(--se-purple)",
    },
  ];
  return (
    <div
      data-slot="home-health"
      className="rounded-[var(--radius-lg)] border border-[var(--se-line)] bg-[var(--se-bg-1)] p-4 space-y-3"
    >
      <div className="flex items-center gap-2">
        <Heart className="size-3.5 text-[var(--se-accent)]" />
        <h3 className="font-mono text-[10.5px] uppercase tracking-[0.08em] text-[var(--se-fg-3)]">
          Workspace health
        </h3>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {rings.map((r) => {
          const total = "total" in r && r.total ? r.total : Math.max(1, r.value);
          const pct = total === 0 ? 0 : Math.min(100, Math.round((r.value / total) * 100));
          const dash = (pct / 100) * 100;
          return (
            <div key={r.label} className="flex flex-col items-center gap-1.5">
              <svg viewBox="0 0 36 36" className="size-12">
                <circle
                  cx="18"
                  cy="18"
                  r="15.9155"
                  fill="none"
                  stroke="var(--se-line)"
                  strokeWidth="3"
                />
                <circle
                  cx="18"
                  cy="18"
                  r="15.9155"
                  fill="none"
                  stroke={r.tone}
                  strokeWidth="3"
                  strokeDasharray={`${dash} 100`}
                  strokeLinecap="round"
                  transform="rotate(-90 18 18)"
                />
                <text
                  x="18"
                  y="20.5"
                  textAnchor="middle"
                  fontSize="9"
                  fill="var(--se-fg)"
                  fontFamily="var(--se-mono)"
                >
                  {r.value}
                </text>
              </svg>
              <span className="font-mono text-[9.5px] uppercase tracking-[0.06em] text-[var(--se-fg-4)]">
                {r.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function AlertsCard({ state }: { state: HomeState }) {
  // Placeholder rules — derives advisories from current counts until verdict
  // data lands. Each entry surfaces something the operator can act on.
  const alerts: { tone: "warn" | "info" | "danger"; title: string; sub: string }[] = [];
  if (state.kind === "first-run") {
    alerts.push({
      tone: "info",
      title: "No data yet",
      sub: "Wire the SDK to start collecting events.",
    });
  } else {
    if (state.counts.runningExperiments === 0 && state.counts.experiments > 0) {
      alerts.push({
        tone: "info",
        title: "No running experiments",
        sub: "Start a draft to ramp traffic.",
      });
    }
    if (state.counts.runningExperiments >= 5) {
      alerts.push({
        tone: "warn",
        title: "Many concurrent experiments",
        sub: `${state.counts.runningExperiments} live — watch for interaction effects.`,
      });
    }
  }
  if (alerts.length === 0) {
    return (
      <div
        data-slot="home-alerts"
        data-empty="true"
        className="rounded-[var(--radius-lg)] border border-dashed border-[var(--se-line-2)] bg-[var(--se-bg-1)] p-4"
      >
        <div className="flex items-center gap-2">
          <AlertTriangle className="size-3.5 text-[var(--se-fg-4)]" />
          <h3 className="font-mono text-[10.5px] uppercase tracking-[0.08em] text-[var(--se-fg-3)]">
            Alerts
          </h3>
        </div>
        <p className="mt-2 text-[12px] text-[var(--se-fg-3)]">No advisories right now.</p>
      </div>
    );
  }
  return (
    <div data-slot="home-alerts" className="space-y-2">
      <div className="flex items-center gap-2 px-1">
        <AlertTriangle className="size-3.5 text-[var(--se-warn)]" />
        <h3 className="font-mono text-[10.5px] uppercase tracking-[0.08em] text-[var(--se-fg-3)]">
          Alerts · {alerts.length}
        </h3>
      </div>
      {alerts.map((a, i) => {
        const toneClass =
          a.tone === "warn"
            ? "border-[color-mix(in_oklab,var(--se-warn)_35%,transparent)] bg-[var(--se-warn-soft)]"
            : a.tone === "danger"
              ? "border-[color-mix(in_oklab,var(--se-danger)_35%,transparent)] bg-[var(--se-danger-soft)]"
              : "border-[color-mix(in_oklab,var(--se-info)_25%,transparent)] bg-[var(--se-info-soft)]";
        return (
          <div key={i} className={`rounded-[var(--radius-md)] border px-3 py-2 ${toneClass}`}>
            <div className="text-[12.5px] font-medium">{a.title}</div>
            <div className="mt-0.5 text-[11.5px] text-[var(--se-fg-3)]">{a.sub}</div>
          </div>
        );
      })}
    </div>
  );
}

function PinnedCard({ projectId }: { projectId: string }) {
  return (
    <div
      data-slot="home-pinned"
      className="rounded-[var(--radius-lg)] border border-dashed border-[var(--se-line-2)] bg-[var(--se-bg-1)] p-4 space-y-2"
    >
      <div className="flex items-center gap-2">
        <Pin className="size-3.5 text-[var(--se-fg-4)]" />
        <h3 className="font-mono text-[10.5px] uppercase tracking-[0.08em] text-[var(--se-fg-3)]">
          Pinned
        </h3>
      </div>
      <p className="text-[12px] text-[var(--se-fg-3)]">
        Pin a record to anchor it here.{" "}
        <Link
          href={`/dashboard/${projectId}/experiments`}
          className="underline hover:text-[var(--se-fg)]"
        >
          Browse experiments
        </Link>
        .
      </p>
    </div>
  );
}

function ClaudeTile({ projectId }: { projectId: string }) {
  return (
    <Link
      href={`/dashboard/${projectId}/experiments?new=1`}
      data-slot="home-claude"
      className="block rounded-[var(--radius-lg)] border border-[color-mix(in_oklab,var(--se-purple)_30%,transparent)] bg-[color-mix(in_oklab,var(--se-purple)_8%,var(--se-bg-1))] p-4 transition-colors hover:bg-[color-mix(in_oklab,var(--se-purple)_14%,var(--se-bg-1))]"
    >
      <div className="flex items-center gap-2">
        <Zap className="size-3.5 text-[var(--se-purple)]" />
        <h3 className="font-mono text-[10.5px] uppercase tracking-[0.08em] text-[var(--se-purple)]">
          Ask Claude
        </h3>
      </div>
      <p className="mt-2 text-[12.5px] text-[var(--se-fg-2)]">
        Spin up a new experiment from a hypothesis.{" "}
        <span className="text-[var(--se-purple)]">→</span>
      </p>
    </Link>
  );
}

function RightRail({ projectId, state }: { projectId: string; state: HomeState }) {
  return (
    <div data-slot="home-rail" className="space-y-3">
      <HealthRingsCard state={state} />
      <AlertsCard state={state} />
      <PinnedCard projectId={projectId} />
      <ClaudeTile projectId={projectId} />
    </div>
  );
}

export function HomeCockpit({ projectId, state, firstName }: CockpitProps) {
  return (
    <div data-slot="home-cockpit" data-state={state.kind} className="space-y-6">
      <Hero state={state} firstName={firstName} />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="space-y-6">
          {state.kind === "first-run" ? (
            <>
              <Banner
                intent="info"
                title="Your workspace is ready"
                action={
                  <Link href={`/dashboard/${projectId}/keys`}>
                    <Button size="sm">
                      Create an SDK key <ArrowRight className="size-3" />
                    </Button>
                  </Link>
                }
              >
                Each step below activates a piece of the cockpit. They unlock automatically as you
                go.
              </Banner>
              <OnboardingChecklist projectId={projectId} />
              <Launchpad projectId={projectId} />
            </>
          ) : (
            <>
              <DecisionsRow projectId={projectId} decisions={state.decisions} />
              <LiveNow projectId={projectId} liveExperiments={state.liveExperiments} />
              <Launchpad projectId={projectId} />
              <ActivityStream projectId={projectId} activity={state.activity} />
            </>
          )}
        </div>
        <RightRail projectId={projectId} state={state} />
      </div>
    </div>
  );
}
