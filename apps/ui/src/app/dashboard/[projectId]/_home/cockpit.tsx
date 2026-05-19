import Link from "next/link";
import type { ReactNode } from "react";
import { HealthRing, Sparkline } from "./charts";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BookOpen,
  Check,
  CheckCircle2,
  Circle,
  Clock,
  Code as CodeIcon,
  FlaskConical,
  Hash,
  KeyRound,
  Plus,
  Power,
  Rocket,
  Shield,
  Sliders,
  Sparkles,
  Users,
  Zap,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import "./home.css";
import type {
  AlertItem,
  ExperimentSummary,
  HomeActivityEntry,
  HomeState,
  HomeStateKind,
} from "./state";
import { Pinned } from "./pinned";

interface CockpitProps {
  projectId: string;
  state: HomeState;
  firstName?: string;
}

const OWNER_COLORS = ["#7c5cff", "#00d08a", "#ff8445", "#3b82f6", "#22a06b", "#ec4899", "#06b6d4"];

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}
function ownerForEmail(email: string): { initial: string; color: string } {
  const local = (email.split("@")[0] ?? "?").replace(/[^a-zA-Z]/g, "");
  const initial = (local[0] ?? "?").toUpperCase();
  const color = OWNER_COLORS[hashStr(email) % OWNER_COLORS.length]!;
  return { initial, color };
}

function nowParts(): { day: string; hm: string; nowPct: number } {
  const now = new Date();
  const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  const day = `${weekdays[now.getDay()]} · ${months[now.getMonth()]} ${now.getDate()}`;
  const hh = now.getHours();
  const mm = now.getMinutes();
  const hm = `${hh}:${mm.toString().padStart(2, "0")}`;
  const nowPct = ((hh * 60 + mm) / (24 * 60)) * 100;
  return { day, hm, nowPct };
}

// ─── Hero ───────────────────────────────────────────────────────

interface HeroStat {
  k: string;
  v: string | number;
  unit?: string;
  d?: string;
  tone?: "accent" | "warn" | "danger";
}

function heroBuckets(kind: HomeStateKind, name: string, state: HomeState) {
  const { day, hm } = nowParts();
  const ratePerMin = Math.max(0, Math.round(state.pulse24h.reduce((a, b) => a + b, 0) / 24 / 60));
  if (kind === "first-run") {
    const eyebrow: ReactNode = (
      <>
        <span className="day">{day}</span>
        <span style={{ color: "var(--se-fg-4)" }}>·</span>
        <span>New workspace — let&apos;s wire it up</span>
      </>
    );
    const title: ReactNode = (
      <>
        Welcome to <em>{state.projectName ?? "your workspace"}</em>.{" "}
        <span className="accent">Three minutes</span> to live data.
      </>
    );
    const sub =
      "Install the SDK, fire a test event, and Shipeasy starts collecting vitals, errors, and your own logs immediately. Everything else — experiments, gates, killswitches — works as soon as init() runs.";
    const stats: HeroStat[] = [
      { k: "SETUP", v: "2", unit: "of 6", d: "33% · 4 steps left" },
      { k: "EVENTS", v: "0", d: "waiting…" },
      { k: "TEAM", v: "1", unit: "· you", d: "invite to enable reviews" },
      { k: "STATUS", v: "⏵", unit: "ready", d: "just needs a first event" },
    ];
    return { eyebrow, title, sub, stats };
  }
  if (kind === "quiet") {
    const eyebrow: ReactNode = (
      <>
        <span className="day">
          {day} · {hm}
        </span>
        <span style={{ color: "var(--se-fg-4)" }}>·</span>
        <span className="live">LIVE · {ratePerMin}k events/min</span>
      </>
    );
    const title: ReactNode = (
      <>
        Good morning, <em>{name}</em>. <span className="accent">Quiet day</span> — nothing on fire.
      </>
    );
    const sub = `${state.counts.runningExperiments} running experiment${state.counts.runningExperiments === 1 ? "" : "s"}, ${state.counts.gates} gate${state.counts.gates === 1 ? "" : "s"}, and ${state.counts.configs} config${state.counts.configs === 1 ? "" : "s"} live. Killswitches green, gates green, p99 within SLA.`;
    const stats: HeroStat[] = [
      {
        k: "DECISIONS",
        v: state.decisions.length,
        unit: "waiting",
        tone: state.decisions.length > 0 ? "accent" : undefined,
        d: state.decisions.length > 0 ? `${state.decisions[0]?.name} ready` : "all clear",
      },
      {
        k: "LIVE",
        v: state.counts.runningExperiments,
        unit: `exp · ${state.counts.gates} gates`,
        d: `${state.counts.configs} configs`,
      },
      {
        k: "EVENTS · 24H",
        v: state.pulse24h.reduce((a, b) => a + b, 0),
        d: "audit log",
      },
      { k: "PLAN", v: state.planName, d: state.projectName ?? "workspace" },
    ];
    return { eyebrow, title, sub, stats };
  }
  // busy
  const eyebrow: ReactNode = (
    <>
      <span className="day">
        {day} · {hm}
      </span>
      <span style={{ color: "var(--se-fg-4)" }}>·</span>
      <span className="live">LIVE · {ratePerMin}k events/min</span>
    </>
  );
  const title: ReactNode = (
    <>
      Morning, <em>{name}</em>.{" "}
      <span className="accent">
        {state.counts.runningExperiments} experiment
        {state.counts.runningExperiments === 1 ? "" : "s"}
      </span>{" "}
      running.
    </>
  );
  const sub =
    "Decisions waiting on you below. Open one to review variants, verdict, and lifecycle.";
  const stats: HeroStat[] = [
    {
      k: "DECISIONS",
      v: state.decisions.length,
      unit: "waiting",
      tone: state.decisions.length > 0 ? "accent" : undefined,
      d: `${state.counts.runningExperiments} live`,
    },
    {
      k: "LIVE",
      v: state.counts.runningExperiments,
      unit: `exp · ${state.counts.gates} gates`,
      d: `${state.counts.configs} configs`,
    },
    {
      k: "EVENTS · 24H",
      v: state.pulse24h.reduce((a, b) => a + b, 0),
      d: "audit log",
    },
    { k: "PLAN", v: state.planName, d: state.projectName ?? "workspace" },
  ];
  return { eyebrow, title, sub, stats };
}

function PulseStrip({ state }: { state: HomeState }) {
  const { hm, nowPct } = nowParts();
  // Bars = running experiments. Position = startedAt within the last 24h
  // window. Anything older than 24h starts at 0% with full bar to now.
  const windowMs = 24 * 3600_000;
  const windowStart = Date.now() - windowMs;
  const bars = state.liveExperiments
    .map((exp) => {
      const t = exp.startedAt ? Date.parse(exp.startedAt) : NaN;
      let leftPct = 0;
      if (!Number.isNaN(t)) {
        const startedInWindow = Math.max(windowStart, t);
        leftPct = ((startedInWindow - windowStart) / windowMs) * 100;
      }
      const width = nowPct - leftPct;
      if (width < 0.5) return null;
      return { id: exp.id, left: leftPct, width, label: exp.name };
    })
    .filter(Boolean) as Array<{ id: string; left: number; width: number; label: string }>;
  // Event pings come from real audit log within the same window.
  const events = state.activity
    .slice(0, 12)
    .map((a) => {
      const t = Date.parse(a.createdAt);
      if (Number.isNaN(t)) return null;
      const hoursAgo = (Date.now() - t) / 3_600_000;
      const left = Math.max(0, nowPct - (hoursAgo / 24) * 100);
      const kind =
        a.action === "delete" || a.resourceType === "killswitch"
          ? "alert"
          : a.action === "create" || a.action === "update"
            ? "deploy"
            : "exp";
      return { left, label: `${a.action} · ${a.resourceId ?? a.resourceType}`, kind };
    })
    .filter(Boolean) as Array<{ left: number; label: string; kind: string }>;

  const HOURS = [0, 4, 8, 12, 16, 20, 24];

  return (
    <div className="home-pulse">
      <div className="home-pulse-head">
        <span className="caps">Today · 24-hour pulse</span>
        <span className="legend">
          <span>
            <i style={{ background: "color-mix(in oklab, var(--se-accent) 35%, transparent)" }} />
            Experiments
          </span>
          <span>
            <i style={{ background: "var(--se-info)" }} />
            Deploys / edits
          </span>
          <span>
            <i style={{ background: "var(--se-danger)" }} />
            Alerts
          </span>
        </span>
      </div>
      <div className="home-pulse-body">
        {bars.map((b) => (
          <div
            key={b.id}
            className="home-pulse-bar"
            style={{ left: `${b.left}%`, width: `${Math.max(2, b.width)}%` }}
            title={b.label}
          />
        ))}
        {events.map((e, i) => (
          <div
            key={i}
            className={`home-pulse-event ${e.kind}`}
            style={{ left: `${e.left}%` }}
            title={e.label}
          >
            <span className="dot" />
            {e.label}
          </div>
        ))}
        <div className="home-pulse-now" style={{ left: `${nowPct}%` }}>
          <div className="home-pulse-now-lbl">now · {hm}</div>
        </div>
        {HOURS.map((h) => (
          <div key={h} className="home-pulse-hour" style={{ left: `${(h / 24) * 100}%` }}>
            {h.toString().padStart(2, "0")}:00
          </div>
        ))}
      </div>
    </div>
  );
}

function Hero({ state, firstName }: { state: HomeState; firstName?: string }) {
  const buckets = heroBuckets(state.kind, firstName ?? "there", state);
  return (
    <div className="home-hero">
      <div className="home-hero-grid">
        <div className="home-greeting">
          <div className="home-eyebrow">{buckets.eyebrow}</div>
          <h1 className="home-h1">{buckets.title}</h1>
          <p className="home-sub">{buckets.sub}</p>
        </div>
        <div className="home-hero-stats">
          {buckets.stats.map((s, i) => (
            <div key={i} className={`home-stat ${s.tone ?? ""}`}>
              <div className="k">{s.k}</div>
              <div className="v">
                <span className="num">{s.v}</span>
                {s.unit ? <span className="unit">{s.unit}</span> : null}
              </div>
              {s.d ? <div className="d">{s.d}</div> : null}
            </div>
          ))}
        </div>
      </div>
      {state.kind !== "first-run" ? <PulseStrip state={state} /> : null}
    </div>
  );
}

// ─── Sparkline ────────────────────────────────────────────────────

// ─── CI bar ───────────────────────────────────────────────────────

function CIbar({
  low,
  high,
  mean,
  neg = false,
}: {
  low: number;
  high: number;
  mean: number;
  neg?: boolean;
}) {
  const SCALE = 20;
  const toPct = (v: number) => Math.max(2, Math.min(98, 50 + (v / SCALE) * 50));
  return (
    <div className="ci-bar">
      <div className="ci-bar-track" />
      <div className="ci-bar-axis" aria-hidden>
        {Array.from({ length: 9 }).map((_, i) => (
          <span key={i} />
        ))}
      </div>
      <div className="ci-bar-zero" />
      <div
        className={`ci-bar-range ${neg ? "neg" : ""}`}
        style={{ left: `${toPct(low)}%`, right: `${100 - toPct(high)}%` }}
      />
      <div className={`ci-bar-mean ${neg ? "neg" : ""}`} style={{ left: `${toPct(mean)}%` }} />
      <div className="ci-bar-lbl lo" style={{ left: `${toPct(low)}%` }}>
        {low > 0 ? "+" : ""}
        {low.toFixed(1)}%
      </div>
      <div className="ci-bar-lbl hi" style={{ left: `${toPct(high)}%` }}>
        {high > 0 ? "+" : ""}
        {high.toFixed(1)}%
      </div>
    </div>
  );
}

// ─── Decisions row ────────────────────────────────────────────────

function decisionVerdict(s: ExperimentSummary): {
  tag: string;
  tone: "" | "warn" | "danger" | "info";
  primaryCta: ReactNode;
  meta: string;
} {
  if (s.srmDetected) {
    return {
      tag: "⚠ SRM DETECTED",
      tone: "danger",
      primaryCta: (
        <>
          <AlertTriangle className="size-[11px]" /> Investigate
        </>
      ),
      meta: "results untrustworthy",
    };
  }
  if (s.peekWarning) {
    return {
      tag: "◷ PEEK WARNING",
      tone: "warn",
      primaryCta: (
        <>
          <Check className="size-[11px]" /> Keep running
        </>
      ),
      meta: "needs sequential testing",
    };
  }
  if (s.isFinal) {
    return {
      tag: "⏹ COMPLETED",
      tone: "info",
      primaryCta: (
        <>
          <Rocket className="size-[11px]" /> Ship winner
        </>
      ),
      meta: `primary · ${s.primaryMetric ?? "—"}`,
    };
  }
  if (s.significancePct !== null && s.significancePct >= 95) {
    if ((s.liftPct ?? 0) >= 0) {
      return {
        tag: "⏵ READY TO SHIP",
        tone: "",
        primaryCta: (
          <>
            <Rocket className="size-[11px]" /> Ship winner
          </>
        ),
        meta: `primary · ${s.primaryMetric ?? "—"}`,
      };
    }
    return {
      tag: "⚠ NEEDS REVIEW",
      tone: "danger",
      primaryCta: (
        <>
          <AlertTriangle className="size-[11px]" /> Investigate
        </>
      ),
      meta: "negative lift at significance",
    };
  }
  return {
    tag: "◷ RUN LONGER",
    tone: "warn",
    primaryCta: (
      <>
        <Check className="size-[11px]" /> Keep running
      </>
    ),
    meta: `primary · ${s.primaryMetric ?? "—"}`,
  };
}

function formatSample(n: number | null): string {
  if (n == null) return "—";
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return n.toString();
}

function DecisionCard({ projectId, decision }: { projectId: string; decision: ExperimentSummary }) {
  const verdict = decisionVerdict(decision);
  const lift = decision.liftPct;
  const sig = decision.significancePct;
  return (
    <div className={`dec-card ${verdict.tone}`}>
      <div className="dec-head">
        <div style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 0, flex: 1 }}>
          <div className="dec-tag">
            {verdict.tag}
            <span style={{ marginLeft: 8, color: "var(--se-fg-4)" }}>· experiment</span>
          </div>
          <h3>
            <span className="mono">{decision.name}</span>
          </h3>
          <p className="desc">
            {decision.primaryMetric
              ? `Primary metric: ${decision.primaryMetric}.`
              : "No primary metric set."}{" "}
            {decision.startedAt
              ? `Running ${Math.max(0, Math.round((Date.now() - Date.parse(decision.startedAt)) / 86400_000))} day${Math.round((Date.now() - Date.parse(decision.startedAt)) / 86400_000) === 1 ? "" : "s"}.`
              : null}
          </p>
        </div>
      </div>

      <div className="dec-stats">
        <div className="dec-stat">
          <div className="k">PRIMARY LIFT</div>
          <div className={`v ${lift == null ? "" : lift >= 0 ? "acc" : "dng"}`}>
            {lift == null ? "—" : `${lift >= 0 ? "+" : ""}${lift.toFixed(1)}%`}
          </div>
          <div className="d">vs. control</div>
        </div>
        <div className="dec-stat">
          <div className="k">SIGNIFICANCE</div>
          <div className="v">{sig == null ? "—" : `${sig.toFixed(1)}%`}</div>
          <div className="d">
            {decision.pValue == null
              ? "gathering"
              : `p = ${decision.pValue < 0.001 ? "<0.001" : decision.pValue.toFixed(3)}`}
          </div>
        </div>
        <div className="dec-stat">
          <div className="k">SAMPLE</div>
          <div className="v">{formatSample(decision.sampleN)}</div>
          <div className="d">cumulative</div>
        </div>
      </div>

      {decision.ci95Low != null && decision.ci95High != null && lift != null ? (
        <CIbar
          low={Math.max(-20, decision.ci95Low)}
          high={Math.min(20, decision.ci95High)}
          mean={lift}
          neg={lift < 0}
        />
      ) : null}

      <div className="dec-foot">
        <div className="meta">
          {verdict.meta}
          {decision.ownerInitial ? (
            <span
              className="av"
              style={{ background: decision.ownerColor, marginLeft: 8 }}
              title={decision.ownerEmail ?? undefined}
            >
              {decision.ownerInitial}
            </span>
          ) : null}
        </div>
        <Link href={`/dashboard/${projectId}/experiments?open=${decision.id}`}>
          <Button variant="ghost" size="sm">
            View results
          </Button>
        </Link>
        <Link href={`/dashboard/${projectId}/experiments?open=${decision.id}`}>
          <Button size="sm">{verdict.primaryCta}</Button>
        </Link>
      </div>
    </div>
  );
}

function DecisionsRow({ projectId, state }: { projectId: string; state: HomeState }) {
  if (state.decisions.length === 0) {
    return (
      <section>
        <div className="h-sec">
          <h2>Decisions waiting on you</h2>
          <div className="h-sec-aside">all clear</div>
        </div>
        <div
          style={{
            border: "1px dashed var(--se-line-2)",
            borderRadius: "var(--radius-lg)",
            background: "var(--se-bg-1)",
            padding: "20px 16px",
            textAlign: "center",
            color: "var(--se-fg-3)",
            fontSize: 12.5,
          }}
        >
          Nothing pending. Open an experiment when one reaches significance.
        </div>
      </section>
    );
  }
  return (
    <section>
      <div className="h-sec">
        <h2>Decisions waiting on you</h2>
        <div className="h-sec-aside">
          <span>
            {state.decisions.length} of {state.counts.runningExperiments} live · ranked by impact
          </span>
          <span style={{ color: "var(--se-fg-4)" }}>·</span>
          <Link href={`/dashboard/${projectId}/experiments?status=running`}>
            View all experiments →
          </Link>
        </div>
      </div>
      <div className="dec-row">
        {state.decisions.slice(0, 2).map((d) => (
          <DecisionCard key={d.id} projectId={projectId} decision={d} />
        ))}
      </div>
    </section>
  );
}

// ─── Live tiles ───────────────────────────────────────────────────

function daysRunning(startedAt: string | null): number | null {
  if (!startedAt) return null;
  const t = Date.parse(startedAt);
  if (Number.isNaN(t)) return null;
  return Math.max(0, Math.round((Date.now() - t) / 86400_000));
}

function LiveTile({ projectId, exp }: { projectId: string; exp: ExperimentSummary }) {
  const lift = exp.liftPct;
  const neg = lift != null && lift < 0;
  const days = daysRunning(exp.startedAt);
  const dot =
    exp.srmDetected || exp.peekWarning
      ? "var(--se-warn)"
      : neg
        ? "var(--se-danger)"
        : "var(--se-accent)";
  return (
    <Link href={`/dashboard/${projectId}/experiments?open=${exp.id}`} className="tile">
      <div className="tile-head">
        <div className="ic">
          <FlaskConical size={12} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="tile-name">{exp.name}</div>
          <div className="tile-key">{exp.primaryMetric ?? "no primary metric"}</div>
        </div>
        <span
          className="tile-dot"
          style={{
            background: dot,
            boxShadow: `0 0 0 3px color-mix(in oklab, ${dot} 22%, transparent)`,
          }}
        />
      </div>
      <div className="tile-mid">
        <div className={`tile-num ${lift == null ? "neu" : lift >= 0 ? "acc" : "dng"}`}>
          {lift == null ? "—" : `${lift >= 0 ? "+" : ""}${lift.toFixed(1)}%`}
        </div>
        <div className="tile-spark">
          {exp.spark.length > 1 ? (
            <Sparkline data={exp.spark} neg={neg} id={exp.id} />
          ) : (
            <div
              style={{
                fontFamily: "var(--se-mono)",
                fontSize: 10,
                color: "var(--se-fg-4)",
              }}
            >
              no series yet
            </div>
          )}
        </div>
      </div>
      <div className="tile-foot">
        <span className="tile-meta">
          {days != null ? `${days}d running` : "running"}
          {exp.sampleN != null ? ` · ${formatSample(exp.sampleN)} samples` : ""}
        </span>
        {exp.ownerInitial ? (
          <span
            className="av"
            style={{ background: exp.ownerColor }}
            title={exp.ownerEmail ?? undefined}
          >
            {exp.ownerInitial}
          </span>
        ) : null}
      </div>
    </Link>
  );
}

function LiveNow({ projectId, state }: { projectId: string; state: HomeState }) {
  if (state.liveExperiments.length === 0) {
    return (
      <section>
        <div className="h-sec">
          <h2>Live now</h2>
          <div className="h-sec-aside">no running experiments</div>
        </div>
        <div
          style={{
            border: "1px dashed var(--se-line-2)",
            borderRadius: "var(--radius-lg)",
            background: "var(--se-bg-1)",
            padding: "24px 16px",
            textAlign: "center",
            color: "var(--se-fg-3)",
            fontSize: 12.5,
          }}
        >
          Start an experiment to see live verdicts and traffic here.{" "}
          <Link
            href={`/dashboard/${projectId}/experiments?new=1`}
            style={{ color: "var(--se-accent)", textDecoration: "underline" }}
          >
            New experiment →
          </Link>
        </div>
      </section>
    );
  }
  return (
    <section>
      <div className="h-sec">
        <h2>Live now</h2>
        <div className="h-sec-aside">
          <span>
            {state.liveExperiments.length} record{state.liveExperiments.length === 1 ? "" : "s"}
          </span>
          <span style={{ color: "var(--se-fg-4)" }}>·</span>
          <Link href={`/dashboard/${projectId}/experiments`}>Open unified list →</Link>
        </div>
      </div>
      <div className="tile-grid">
        {state.liveExperiments.slice(0, 6).map((e) => (
          <LiveTile key={e.id} projectId={projectId} exp={e} />
        ))}
      </div>
    </section>
  );
}

// ─── Activity stream ──────────────────────────────────────────────

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

function activityIcon(entry: HomeActivityEntry): { Icon: typeof Activity; kind: string } {
  if (entry.action === "create") return { Icon: Plus, kind: "acc" };
  if (entry.action === "delete") return { Icon: AlertTriangle, kind: "dng" };
  if (entry.resourceType === "killswitch") return { Icon: Power, kind: "wrn" };
  if (entry.resourceType === "gate") return { Icon: Shield, kind: "inf" };
  if (entry.resourceType === "experiment") return { Icon: FlaskConical, kind: "acc" };
  if (entry.resourceType === "config") return { Icon: Sliders, kind: "inf" };
  return { Icon: Check, kind: "inf" };
}

function ActivityStream({ projectId, state }: { projectId: string; state: HomeState }) {
  if (state.activity.length === 0) {
    return (
      <section>
        <div className="h-sec">
          <h2>Stream</h2>
          <div className="h-sec-aside">no activity yet</div>
        </div>
        <div
          style={{
            border: "1px dashed var(--se-line-2)",
            borderRadius: "var(--radius-lg)",
            background: "var(--se-bg-1)",
            padding: "20px 16px",
            textAlign: "center",
            color: "var(--se-fg-3)",
            fontSize: 12.5,
          }}
        >
          No activity in the last 24h. Changes you ship show up here.
        </div>
      </section>
    );
  }
  return (
    <section>
      <div className="h-sec">
        <h2>Stream</h2>
        <div className="h-sec-aside">
          <span>since you were away · 24h</span>
          <span style={{ color: "var(--se-fg-4)" }}>·</span>
          <Link href={`/dashboard/${projectId}/settings?tab=audit`}>View full audit log →</Link>
        </div>
      </div>
      <div className="stream">
        {state.activity.slice(0, 8).map((entry) => {
          const { Icon, kind } = activityIcon(entry);
          const owner = ownerForEmail(entry.actorEmail);
          const href = entry.resourceId
            ? `/dashboard/${projectId}/${entry.resourceType}s?open=${entry.resourceId}`
            : `/dashboard/${projectId}`;
          return (
            <Link key={entry.id} href={href} className="stream-row">
              <span className="when">{relativeTime(entry.createdAt)}</span>
              <span className={`ic ${kind}`}>
                <Icon className="size-3" />
              </span>
              <div className="body">
                <div className="ln">
                  <b>
                    {entry.action} {entry.resourceType}
                  </b>{" "}
                  {entry.resourceId ? <span className="mono">{entry.resourceId}</span> : null}
                </div>
                <div className="meta">
                  {entry.resourceType} · by {entry.actorEmail}
                </div>
              </div>
              <div className="by">
                <span className="av" style={{ background: owner.color }}>
                  {owner.initial}
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

// ─── Launchpad ────────────────────────────────────────────────────

const LAUNCH = [
  {
    icon: FlaskConical,
    title: "New experiment",
    desc: "A/B test with stat-sig calc",
    kbd: "E",
    href: (id: string) => `/dashboard/${id}/experiments?new=1`,
  },
  {
    icon: Shield,
    title: "New gate",
    desc: "Feature flag with targeting",
    kbd: "G",
    href: (id: string) => `/dashboard/${id}/gates?new=1`,
  },
  {
    icon: Power,
    title: "New killswitch",
    desc: "Emergency feature shutoff",
    kbd: "K",
    href: (id: string) => `/dashboard/${id}/killswitches?new=1`,
  },
  {
    icon: Sliders,
    title: "New config",
    desc: "Versioned typed value",
    kbd: "C",
    href: (id: string) => `/dashboard/${id}/configs/values?new=1`,
  },
  {
    icon: Activity,
    title: "New metric",
    desc: "Custom event or KPI",
    kbd: "M",
    href: (id: string) => `/dashboard/${id}/metrics`,
  },
  {
    icon: Users,
    title: "Invite teammate",
    desc: "Editor or viewer",
    kbd: "I",
    href: () => `/dashboard/team`,
  },
  {
    icon: KeyRound,
    title: "API key",
    desc: "For server or CI",
    kbd: "A",
    href: (id: string) => `/dashboard/${id}/keys`,
  },
  {
    icon: BookOpen,
    title: "Browse docs",
    desc: "Setup, recipes, SDK ref",
    kbd: "?",
    href: () => "https://docs.shipeasy.ai",
  },
];

function Launchpad({ projectId }: { projectId: string }) {
  return (
    <section>
      <div className="h-sec">
        <h2>Quick create</h2>
        <div className="h-sec-aside">
          <span>or press</span>{" "}
          <span
            style={{
              fontFamily: "var(--se-mono)",
              fontSize: 10,
              padding: "1px 6px",
              border: "1px solid var(--se-line)",
              borderBottomWidth: 2,
              borderRadius: 4,
              background: "var(--se-bg-2)",
              color: "var(--se-fg-3)",
            }}
          >
            ⌘ K
          </span>
        </div>
      </div>
      <div className="launch">
        {LAUNCH.map((l, i) => {
          const Icon = l.icon;
          return (
            <Link key={i} href={l.href(projectId)} className="launch-card">
              <div className="ic">
                <Icon className="size-3.5" />
              </div>
              <h4>{l.title}</h4>
              <p>{l.desc}</p>
              <span className="kbd-tag">{l.kbd}</span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

// ─── Right rail ───────────────────────────────────────────────────

function HealthRingsCard({ state }: { state: HomeState }) {
  const { counts } = state;
  const expPct =
    counts.experiments === 0
      ? 0
      : Math.round((counts.runningExperiments / counts.experiments) * 100);
  return (
    <div className="rail-card">
      <div className="rail-card-head">
        <Activity className="size-3" />
        <h3>System health</h3>
        <span className="aside">live · 5s</span>
      </div>
      <div className="rail-card-body">
        <div className="rings">
          <HealthRing k="UPTIME · 24h" label="99.96%" detail="no incidents" value={99.96} />
          <HealthRing
            k="EXPERIMENTS"
            label={`${counts.runningExperiments} live`}
            detail={`of ${counts.experiments} total`}
            value={expPct}
            tone="accent"
          />
          <HealthRing
            k="GATES"
            label={`${counts.gates} active`}
            detail="all healthy"
            value={counts.gates === 0 ? 0 : 100}
            tone="info"
          />
          <HealthRing
            k="CONFIGS"
            label={`${counts.configs} keys`}
            detail="last edit · recent"
            value={counts.configs === 0 ? 0 : 100}
            tone="purple"
          />
        </div>
      </div>
    </div>
  );
}

function AlertsCard({ projectId, state }: { projectId: string; state: HomeState }) {
  const alerts: AlertItem[] = state.alerts;
  return (
    <div className="rail-card">
      <div className="rail-card-head">
        <AlertTriangle
          className="size-3"
          style={{ color: alerts.length > 0 ? "var(--se-warn)" : "var(--se-fg-3)" }}
        />
        <h3>Alerts</h3>
        <span className="aside">{alerts.length > 0 ? `${alerts.length} active` : "all clear"}</span>
      </div>
      {alerts.length === 0 ? (
        <div style={{ padding: "24px 16px", textAlign: "center", color: "var(--se-fg-3)" }}>
          <CheckCircle2
            className="size-5"
            style={{ color: "var(--se-accent)", marginBottom: 8, display: "inline-block" }}
          />
          <div style={{ fontSize: 12.5 }}>All clear · no alerts</div>
        </div>
      ) : (
        alerts.map((a) => (
          <Link
            key={a.id}
            href={a.href.startsWith("./") ? `/dashboard/${projectId}/${a.href.slice(2)}` : a.href}
            className={`alert-row ${a.severity}`}
            style={{ textDecoration: "none", color: "inherit" }}
          >
            <span className="sev" />
            <div className="body">
              <div className="ln">{a.title}</div>
              <div className="meta">{a.detail}</div>
            </div>
            <div className="when">{a.when}</div>
          </Link>
        ))
      )}
    </div>
  );
}

function ClaudeTile({ projectId }: { projectId: string }) {
  const prompts = [
    { ic: Activity, t: "What's the top revenue driver this week?" },
    { ic: Shield, t: "Find every gate touching billing" },
    { ic: Rocket, t: "Draft a rollout plan for my latest experiment" },
  ];
  return (
    <div className="claude-tile">
      <h3>
        <Sparkles className="size-3.5" style={{ color: "var(--se-accent)" }} /> Ask Claude
      </h3>
      <p>
        Natural language across every record. Claude reads your gates, configs, and experiment
        results.
      </p>
      <div className="claude-prompts">
        {prompts.map((p, i) => {
          const Icon = p.ic;
          return (
            <Link
              key={i}
              href={`/dashboard/${projectId}/experiments?ask=${encodeURIComponent(p.t)}`}
              className="claude-prompt"
            >
              <Icon className="size-3 ic" />
              {p.t}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function RightRail({ projectId, state }: { projectId: string; state: HomeState }) {
  return (
    <div className="home-rail">
      <HealthRingsCard state={state} />
      <AlertsCard projectId={projectId} state={state} />
      <Pinned projectId={projectId} />
      <ClaudeTile projectId={projectId} />
    </div>
  );
}

// ─── Onboarding checklist (first-run) ─────────────────────────────

function OnboardingChecklist({ projectId }: { projectId: string }) {
  const steps = [
    {
      key: "install",
      title: "Install the SDK",
      desc: "One package, one init() call. We'll detect your framework and tailor the snippet.",
      done: true,
      cur: false,
      est: "2 min",
      action: "View install",
      icon: CodeIcon,
      href: `/dashboard/${projectId}/keys`,
    },
    {
      key: "init",
      title: "Initialize in your bootstrap",
      desc: "Drop init() in your app entry. Auto-collection turns on Web Vitals, errors, and page views.",
      done: true,
      cur: false,
      est: "1 min",
      action: "View snippet",
      icon: Zap,
      href: `/dashboard/${projectId}/keys`,
    },
    {
      key: "event",
      title: "Send your first event",
      desc: "Call log('event_name') anywhere. We'll show it land in the inspector — usually under 5 seconds.",
      done: false,
      cur: true,
      est: "30 sec",
      action: "Send now",
      icon: Activity,
      href: `/dashboard/${projectId}/metrics`,
    },
    {
      key: "experiment",
      title: "Create your first experiment",
      desc: "Pick a hypothesis, point at a metric. We split traffic, compute lift, and tell you when to ship.",
      done: false,
      cur: false,
      est: "3 min",
      action: "New experiment",
      icon: FlaskConical,
      href: `/dashboard/${projectId}/experiments?new=1`,
    },
    {
      key: "gate",
      title: "Wrap a feature in a gate",
      desc: "Five built-in gates work right away. Or write a custom predicate.",
      done: false,
      cur: false,
      est: "2 min",
      action: "Browse gates",
      icon: Shield,
      href: `/dashboard/${projectId}/gates`,
    },
    {
      key: "team",
      title: "Invite the team",
      desc: "Bring in editors and viewers. Shipeasy keeps an audit trail of every change.",
      done: false,
      cur: false,
      est: "1 min",
      action: "Send invites",
      icon: Users,
      href: `/dashboard/team`,
    },
  ];
  const done = steps.filter((s) => s.done).length;
  const total = steps.length;
  const pct = (done / total) * 100;
  return (
    <section>
      <div
        style={{
          background: "var(--se-bg-1)",
          border: "1px solid var(--se-line-2)",
          borderRadius: "var(--radius-lg)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr auto",
            gap: 24,
            padding: "20px 22px",
            alignItems: "center",
            background:
              "linear-gradient(180deg, color-mix(in oklab, var(--se-accent) 10%, var(--se-bg-1)), var(--se-bg-1))",
            borderBottom: "1px solid var(--se-line)",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <h2
              style={{
                margin: 0,
                fontSize: 19,
                letterSpacing: "-0.015em",
                fontWeight: 500,
              }}
            >
              Get your workspace live
            </h2>
            <p style={{ margin: 0, color: "var(--se-fg-2)", fontSize: 13, maxWidth: "60ch" }}>
              Three minutes left. The dashboard below activates as each step completes — try them in
              any order.
            </p>
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 6,
              minWidth: 240,
              textAlign: "right",
            }}
          >
            <div style={{ fontFamily: "var(--se-mono)", fontSize: 11, color: "var(--se-fg-3)" }}>
              <b style={{ color: "var(--se-accent)", fontWeight: 500 }}>{done}</b> of {total}{" "}
              complete · ~3 min remaining
            </div>
            <div
              style={{
                height: 6,
                borderRadius: 3,
                background: "var(--se-bg-3)",
                overflow: "hidden",
              }}
            >
              <span
                style={{
                  display: "block",
                  height: "100%",
                  width: `${pct}%`,
                  background: "var(--se-accent)",
                  borderRadius: 3,
                  transition: "width .3s",
                }}
              />
            </div>
          </div>
        </div>

        <ol
          style={{
            display: "flex",
            flexDirection: "column",
            margin: 0,
            padding: 0,
            listStyle: "none",
          }}
        >
          {steps.map((s, i) => {
            const Icon = s.icon;
            return (
              <li
                key={s.key}
                style={{
                  display: "grid",
                  gridTemplateColumns: "30px 1fr auto",
                  gap: 14,
                  padding: "16px 22px",
                  borderBottom: i === steps.length - 1 ? "none" : "1px solid var(--se-line)",
                  alignItems: "flex-start",
                  background: s.cur
                    ? "color-mix(in oklab, var(--se-accent) 6%, transparent)"
                    : undefined,
                }}
              >
                <div
                  style={{
                    width: 26,
                    height: 26,
                    borderRadius: "50%",
                    display: "grid",
                    placeItems: "center",
                    fontFamily: "var(--se-mono)",
                    fontSize: 11.5,
                    fontWeight: 500,
                    background: s.done
                      ? "var(--se-accent)"
                      : s.cur
                        ? "var(--se-bg-1)"
                        : "var(--se-bg-3)",
                    color: s.done
                      ? "var(--se-accent-fg)"
                      : s.cur
                        ? "var(--se-accent)"
                        : "var(--se-fg-2)",
                    border: s.cur
                      ? "1.5px solid var(--se-accent)"
                      : s.done
                        ? "none"
                        : "1px solid var(--se-line-2)",
                  }}
                >
                  {s.done ? <Check className="size-3" /> : i + 1}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 0 }}>
                  <h3
                    style={{
                      margin: 0,
                      fontSize: 14,
                      fontWeight: 500,
                      letterSpacing: "-0.005em",
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    <Icon className="size-3" /> {s.title}
                  </h3>
                  <p
                    style={{
                      margin: 0,
                      fontSize: 12.5,
                      color: "var(--se-fg-2)",
                      lineHeight: 1.5,
                      maxWidth: "54ch",
                    }}
                  >
                    {s.desc}
                  </p>
                  <span
                    style={{
                      fontFamily: "var(--se-mono)",
                      fontSize: 10.5,
                      color: "var(--se-fg-4)",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 4,
                    }}
                  >
                    <Clock className="size-2.5" /> {s.est}
                  </span>
                </div>
                <div style={{ alignSelf: "center" }}>
                  <Link href={s.href}>
                    {s.done ? (
                      <Button variant="ghost" size="sm" style={{ color: "var(--se-accent)" }}>
                        Done
                      </Button>
                    ) : s.cur ? (
                      <Button size="sm">
                        {s.action} <ArrowRight className="size-2.5" />
                      </Button>
                    ) : (
                      <Button variant="secondary" size="sm">
                        {s.action}
                      </Button>
                    )}
                  </Link>
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}

// ─── Entry ────────────────────────────────────────────────────────

export function HomeCockpit({ projectId, state, firstName }: CockpitProps) {
  const firstRun = state.kind === "first-run";
  return (
    <div className="home-page">
      <Hero state={state} firstName={firstName} />
      <div className="home-body">
        <div className="home-main">
          {firstRun ? (
            <OnboardingChecklist projectId={projectId} />
          ) : (
            <DecisionsRow projectId={projectId} state={state} />
          )}

          <div className={firstRun ? "lock-fade" : undefined}>
            <LiveNow projectId={projectId} state={state} />
          </div>

          <div className={firstRun ? "lock-fade" : undefined}>
            <ActivityStream projectId={projectId} state={state} />
          </div>

          <Launchpad projectId={projectId} />
        </div>

        <RightRail projectId={projectId} state={state} />
      </div>
    </div>
  );
}
