import Link from "next/link";
import {
  Activity,
  ArrowRight,
  CheckCircle2,
  Circle,
  FlaskConical,
  Gauge,
  KeyRound,
  Power,
  Shield,
  Sliders,
  Sparkles,
} from "lucide-react";

import { Banner } from "@/components/ui/banner";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import type { HomeState, HomeStateKind } from "./state";

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

function Hero({ state, firstName }: { state: HomeState; firstName?: string }) {
  const copy = heroCopy(state.kind, firstName ?? "there", state.counts);
  const { counts } = state;

  return (
    <header data-slot="home-hero" data-state={state.kind} className="space-y-5">
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

export function HomeCockpit({ projectId, state, firstName }: CockpitProps) {
  return (
    <div data-slot="home-cockpit" data-state={state.kind} className="space-y-6">
      <Hero state={state} firstName={firstName} />

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
            Each step below activates a piece of the cockpit. They unlock automatically as you go.
          </Banner>
          <OnboardingChecklist projectId={projectId} />
          <Launchpad projectId={projectId} />
        </>
      ) : (
        <>
          <DecisionsRow projectId={projectId} decisions={state.decisions} />
          <LiveNow projectId={projectId} liveExperiments={state.liveExperiments} />
          <Launchpad projectId={projectId} />
        </>
      )}
    </div>
  );
}
