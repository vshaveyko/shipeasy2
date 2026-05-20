"use client";

import { useState, type ReactNode } from "react";
import {
  Activity,
  AlertTriangle,
  BookOpen,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Code,
  ExternalLink,
  GitBranch,
  Hash,
  Layers,
  Lock,
  MessageSquare,
  MinusCircle,
  Shield,
  SlidersHorizontal,
  Users,
  XCircle,
} from "lucide-react";

import "./results.css";

export type Verdict = "ship" | "hold" | "wait" | "invalid" | "draft";
export type ExpStatus = "running" | "stopped" | "draft" | "archived";

export interface ResultsMetricRow {
  name: string;
  agg: string;
  delta: number | null;
  deltaPct: number | null;
  ci: [number, number] | null;
  p: number | null;
  sig: boolean;
  lowerBetter: boolean;
  pass?: boolean;
}

export interface ResultsTimeseriesPoint {
  ds: string;
  control: number | null;
  treatment: number | null;
}

export interface ResultsViewModel {
  id: string;
  name: string;
  status: ExpStatus;
  verdict: Verdict;
  title: string;
  why: string;
  days: number;
  daysGoal: number;
  isFinal: boolean;
  stoppedAgo?: number;
  usersPerGroup: number[];
  expectedPerGroup?: number[];
  rawNumbers?: { ctrl: number; test: number; delta: number; deltaPct: number; p: number };
  goal?: ResultsMetricRow;
  guards: ResultsMetricRow[];
  secs: ResultsMetricRow[];
  srm?: { chiSq: number; chiSqP: number };
  showResults: boolean;
  peekWarning: boolean;
  timeseries: ResultsTimeseriesPoint[];
  draftChecklist?: { label: string; done: boolean }[];
  meta: {
    hypothesis: string;
    success: string;
    universe: string;
    unit: string;
    holdoutPct: number;
    holdoutRange?: [number, number];
    allocation: number;
    groups: { name: string; weight: number }[];
    gate: string | null;
    hashVersion: string;
    cupedFrozenAt: string | null;
    alpha: number;
    minSample: number;
    minRuntime: number;
    sequential: boolean;
    owner: { initial: string; color: string; name: string };
    folder: string | null;
    paramsSchema: Record<string, string>;
    startedAt: string | null;
    stoppedAt: string | null;
    updatedAt: string;
    estTrafficPerDay: number;
    project: string;
    env: string;
    layer: string;
    tags: string[];
    activity: {
      who: string;
      av: string;
      color?: string;
      bot?: boolean;
      what: ReactNode;
      when: string;
    }[];
    subscribers: { initial: string; color: string; name: string; role: string; ago: string }[];
  };
  projectId: string;
}

const fmtPct = (x: number | null, f = 1) => {
  if (x === null || Number.isNaN(x)) return "—";
  return `${(x * 100).toFixed(f)}%`;
};
const fmtP = (p: number | null) => {
  if (p === null) return "—";
  return p < 0.001 ? "<0.001" : p.toFixed(3);
};
const renderMd = (s: string) =>
  s
    .split(/(\*\*[^*]+\*\*)/g)
    .map((part, i) =>
      part.startsWith("**") ? (
        <strong key={i}>{part.slice(2, -2)}</strong>
      ) : (
        <span key={i}>{part}</span>
      ),
    );

function BigCIBar({
  delta,
  ci,
  lowerBetter = false,
}: {
  delta: number;
  ci: [number, number];
  lowerBetter?: boolean;
}) {
  const range: [number, number] = [-0.1, 0.12];
  const pad = 4;
  const map = (v: number) => ((v - range[0]) / (range[1] - range[0])) * 100;
  const left = Math.max(0, Math.min(100, map(ci[0])));
  const right = Math.max(0, Math.min(100, map(ci[1])));
  const pt = Math.max(0, Math.min(100, map(delta)));
  let cls = "zero-cross";
  if (ci[0] > 0) cls = lowerBetter ? "neg" : "pos";
  else if (ci[1] < 0) cls = lowerBetter ? "pos" : "neg";
  const ticks = [-0.1, -0.05, 0, 0.05, 0.1];
  const px = (pct: number) => `calc(${pad}px + ${pct}% * (100% - ${pad * 2}px) / 100%)`;
  return (
    <div className="big-ci">
      <div className="scale" />
      {ticks.map((t) => (
        <span key={`t-${t}`}>
          <span className={`tick ${t === 0 ? "zero" : ""}`} style={{ left: px(map(t)) }} />
          <span className="tick-label" style={{ left: px(map(t)) }}>
            {t === 0 ? "0" : `${t > 0 ? "+" : ""}${(t * 100).toFixed(0)}%`}
          </span>
        </span>
      ))}
      <div
        className={`band ${cls}`}
        style={{
          left: px(left),
          width: `calc(${right - left}% * (100% - ${pad * 2}px) / 100%)`,
        }}
      />
      <div className="point" style={{ left: px(pt) }} />
      <span className="end-l" style={{ left: px(left) }}>
        {fmtPct(ci[0])}
      </span>
      <span className="end-r" style={{ left: px(right) }}>
        {fmtPct(ci[1])}
      </span>
    </div>
  );
}

function MiniCIBar({
  delta,
  ci,
  lowerBetter = false,
}: {
  delta: number;
  ci: [number, number];
  lowerBetter?: boolean;
}) {
  const range: [number, number] = [-0.2, 0.2];
  const map = (v: number) => ((v - range[0]) / (range[1] - range[0])) * 100;
  const left = Math.max(0, Math.min(100, map(ci[0])));
  const right = Math.max(0, Math.min(100, map(ci[1])));
  const zero = map(0);
  const pt = Math.max(0, Math.min(100, map(delta)));
  let cls = "zero-cross";
  if (ci[0] > 0) cls = lowerBetter ? "neg" : "pos";
  else if (ci[1] < 0) cls = lowerBetter ? "pos" : "neg";
  return (
    <div className="mini-ci">
      <div className="axis" />
      <div className="zero" style={{ left: `${zero}%` }} />
      <div className={`band ${cls}`} style={{ left: `${left}%`, width: `${right - left}%` }} />
      <div className="point" style={{ left: `${pt}%` }} />
    </div>
  );
}

function ScoreboardRow({ m, kind }: { m: ResultsMetricRow; kind: "guard" | "sec" }) {
  const ci = m.ci ?? [0, 0];
  const delta = m.delta ?? 0;
  const hasCi = m.ci != null && m.delta != null;
  const isPos = hasCi && ci[0] > 0;
  const isNeg = hasCi && ci[1] < 0;
  const goodChange = m.lowerBetter ? isNeg : isPos;
  const regressed = kind === "guard" && m.pass === false;
  let StatusIcon: ReactNode;
  if (regressed)
    StatusIcon = (
      <AlertTriangle size={13} style={{ color: "var(--se-danger)" }} aria-label="regressed" />
    );
  else if (m.sig && goodChange)
    StatusIcon = (
      <Check size={13} style={{ color: "var(--se-accent)" }} aria-label="significant gain" />
    );
  else if (m.sig && !goodChange)
    StatusIcon = (
      <AlertTriangle
        size={13}
        style={{ color: "var(--se-danger)" }}
        aria-label="significant loss"
      />
    );
  else
    StatusIcon = (
      <span
        style={{
          width: 5,
          height: 5,
          borderRadius: 50,
          background: "var(--se-fg-4)",
          display: "block",
        }}
      />
    );
  const deltaClass = goodChange ? "pos" : isPos || isNeg ? "neg" : "zero";
  return (
    <div className={`v2-row ${regressed ? "regressed" : ""}`}>
      <span className="status">{StatusIcon}</span>
      <span className="name">
        <span className="n">
          {m.name}
          {m.lowerBetter && <span className="lower">lower is better</span>}
        </span>
      </span>
      <span className={`delta ${deltaClass}`}>
        {hasCi ? `${delta > 0 ? "+" : ""}${fmtPct(delta)}` : "—"}
      </span>
      {hasCi ? <MiniCIBar delta={delta} ci={ci} lowerBetter={m.lowerBetter} /> : <span />}
      <span className="p">{m.p != null ? `p=${fmtP(m.p)}` : "—"}</span>
    </div>
  );
}

function TimeSeriesChart({
  data,
  metricLabel,
  peekUntilDay,
  stoppedDay,
}: {
  data: ResultsTimeseriesPoint[];
  metricLabel: string;
  peekUntilDay?: number | null;
  stoppedDay?: number | null;
}) {
  if (data.length < 2)
    return (
      <div className="ts-chart-v2" style={{ display: "grid", placeItems: "center" }}>
        <div style={{ color: "var(--se-fg-3)", fontSize: 12 }}>
          Not enough datapoints yet to plot {metricLabel}.
        </div>
      </div>
    );
  const W = 720;
  const H = 160;
  const days = data.length;
  const all = data
    .flatMap((d) => [d.control, d.treatment])
    .filter((v): v is number => v != null && Number.isFinite(v));
  const min = all.length ? Math.min(...all) : 0;
  const max = all.length ? Math.max(...all) : 1;
  const pad = (max - min) * 0.1 || 0.01;
  const lo = min - pad;
  const hi = max + pad;
  const xs = (i: number) => (i / Math.max(1, days - 1)) * W;
  const ys = (v: number) => H - ((v - lo) / (hi - lo)) * (H - 12) - 6;
  const ctrlPts = data.map((d) => d.control);
  const treatPts = data.map((d) => d.treatment);
  const mkPath = (pts: (number | null)[]) => {
    let path = "";
    let started = false;
    pts.forEach((v, i) => {
      if (v == null || !Number.isFinite(v)) {
        started = false;
        return;
      }
      path += `${started ? "L" : "M"}${xs(i).toFixed(1)},${ys(v).toFixed(1)} `;
      started = true;
    });
    return path.trim();
  };
  const lastCtrl = [...ctrlPts].reverse().find((v): v is number => v != null && Number.isFinite(v));
  const lastTreat = [...treatPts]
    .reverse()
    .find((v): v is number => v != null && Number.isFinite(v));
  const lastCtrlIdx = ctrlPts.findLastIndex((v) => v != null && Number.isFinite(v));
  const lastTreatIdx = treatPts.findLastIndex((v) => v != null && Number.isFinite(v));
  const tickLabels = Array.from({ length: Math.min(5, days) }, (_, i) =>
    data[Math.floor((i * (days - 1)) / Math.max(1, Math.min(4, days - 1)))].ds.slice(5),
  );
  return (
    <div className="ts-chart-v2">
      <div className="yax">
        {[hi, (hi + lo) / 2, lo].map((v, i) => (
          <div key={i}>{(v * 100).toFixed(1)}%</div>
        ))}
      </div>
      <div className="legend">
        <span>
          <span className="sw" style={{ background: "var(--se-fg-3)" }} />
          control
        </span>
        <span>
          <span className="sw" style={{ background: "var(--se-accent)" }} />
          treatment
        </span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
        {[0, 1, 2, 3].map((i) => (
          <line
            key={i}
            x1="0"
            x2={W}
            y1={(H * i) / 3}
            y2={(H * i) / 3}
            stroke="var(--se-line)"
            strokeDasharray="2 4"
          />
        ))}
        {peekUntilDay != null && peekUntilDay > 0 && (
          <rect
            x="0"
            y="0"
            width={xs(peekUntilDay)}
            height={H}
            fill="color-mix(in oklab, var(--se-warn) 10%, transparent)"
          />
        )}
        {peekUntilDay != null && peekUntilDay > 0 && (
          <text
            x={xs(peekUntilDay) / 2}
            y="14"
            textAnchor="middle"
            fontFamily="var(--se-mono)"
            fontSize="9"
            fill="var(--se-warn)"
            letterSpacing=".06em"
          >
            BEFORE MIN_RUNTIME · PEEK WARNING
          </text>
        )}
        {stoppedDay != null && (
          <g>
            <line
              x1={xs(stoppedDay)}
              x2={xs(stoppedDay)}
              y1={0}
              y2={H}
              stroke="var(--se-info)"
              strokeWidth="1.2"
            />
            <text
              x={xs(stoppedDay) - 4}
              y={12}
              textAnchor="end"
              fontFamily="var(--se-mono)"
              fontSize="9"
              fill="var(--se-info)"
            >
              stopped_at
            </text>
          </g>
        )}
        <path
          d={mkPath(ctrlPts)}
          fill="none"
          stroke="var(--se-fg-3)"
          strokeWidth="1.5"
          strokeDasharray="4 3"
        />
        <path d={mkPath(treatPts)} fill="none" stroke="var(--se-accent)" strokeWidth="1.8" />
        {lastCtrl != null && lastCtrlIdx >= 0 && (
          <circle
            cx={xs(lastCtrlIdx)}
            cy={ys(lastCtrl)}
            r="3"
            fill="var(--se-fg-3)"
            stroke="var(--se-bg-1)"
            strokeWidth="2"
          />
        )}
        {lastTreat != null && lastTreatIdx >= 0 && (
          <circle
            cx={xs(lastTreatIdx)}
            cy={ys(lastTreat)}
            r="3.5"
            fill="var(--se-accent)"
            stroke="var(--se-bg-1)"
            strokeWidth="2"
          />
        )}
      </svg>
      <div className="xax">
        {tickLabels.map((d, i) => (
          <span key={i}>{d}</span>
        ))}
      </div>
    </div>
  );
}

function MetaSection({
  icon,
  title,
  count,
  defaultOpen = true,
  children,
}: {
  icon: ReactNode;
  title: string;
  count?: ReactNode;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  return (
    <details className="v2-meta-section" {...(defaultOpen ? { open: true } : {})}>
      <summary>
        <span className="ico">{icon}</span>
        <span>{title}</span>
        {count != null && (
          <span
            style={{
              fontFamily: "var(--se-mono)",
              fontSize: 10,
              color: "var(--se-fg-4)",
              marginLeft: 4,
            }}
          >
            {count}
          </span>
        )}
        <ChevronRight size={11} className="chev" />
      </summary>
      <div className="meta-body">{children}</div>
    </details>
  );
}

function MetaSidebar({
  vm,
  collapsed,
  onToggle,
}: {
  vm: ResultsViewModel;
  collapsed: boolean;
  onToggle: () => void;
}) {
  const m = vm.meta;
  const dayProgress = vm.daysGoal ? Math.min(1, vm.days / vm.daysGoal) : 0;
  return (
    <aside className={`v2-meta ${collapsed ? "collapsed" : ""}`}>
      <div className="v2-meta-head">
        {collapsed ? (
          <span className="v2-rail-label">Details</span>
        ) : (
          <span className="t">Details</span>
        )}
        <button
          className="meta-fold"
          onClick={onToggle}
          aria-label={collapsed ? "Show details" : "Hide details"}
          type="button"
        >
          {collapsed ? <ChevronLeft size={12} /> : <ChevronRight size={12} />}
        </button>
      </div>

      {!collapsed && (
        <div className="v2-meta-body">
          <MetaSection
            icon={<Users size={12} />}
            title="Owner & subscribers"
            count={m.subscribers.length + 1}
          >
            <div className="meta-person">
              <div className="avatar-sm" style={{ background: m.owner.color }}>
                {m.owner.initial}
              </div>
              <div className="info">
                <div className="n">{m.owner.name}</div>
                <div className="r">Owner</div>
              </div>
              <span className="ago">—</span>
            </div>
            {m.subscribers.map((s, i) => (
              <div key={i} className="meta-person">
                <div className="avatar-sm" style={{ background: s.color }}>
                  {s.initial}
                </div>
                <div className="info">
                  <div className="n">{s.name}</div>
                  <div className="r">{s.role}</div>
                </div>
                <span className="ago">{s.ago}</span>
              </div>
            ))}
          </MetaSection>

          <MetaSection icon={<Clock size={12} />} title="Lifecycle">
            {vm.status === "running" && (
              <>
                <div
                  className="meta-kv"
                  style={{
                    paddingBottom: 12,
                    borderBottom: "1px solid var(--se-line)",
                    marginBottom: 6,
                  }}
                >
                  <span className="k">Progress</span>
                  <span className="v">
                    {vm.days}/{vm.daysGoal} days · {Math.round(dayProgress * 100)}%
                  </span>
                </div>
                <div className="prog thin" style={{ marginBottom: 10 }}>
                  <span style={{ width: `${dayProgress * 100}%` }} />
                </div>
              </>
            )}
            <div className="meta-timeline">
              <div className="meta-tl-item done">
                <span className="dot" />
                <div className="label">
                  <div className="l">Created</div>
                  <div className="s">{m.updatedAt.slice(0, 10)}</div>
                </div>
              </div>
              <div className={`meta-tl-item ${m.startedAt ? "done" : "future"}`}>
                <span className="dot" />
                <div className="label">
                  <div className="l">Started</div>
                  <div className="s">
                    {m.startedAt ? m.startedAt.slice(0, 16).replace("T", " ") : "—"}
                  </div>
                </div>
              </div>
              <div className="meta-tl-item now">
                <span className="dot" />
                <div className="label">
                  <div className="l">Last analyzed</div>
                  <div className="s">auto-refresh on poll</div>
                </div>
              </div>
              <div className={`meta-tl-item ${vm.status === "stopped" ? "done" : "future"}`}>
                <span className="dot" />
                <div className="label">
                  <div className="l">{vm.status === "stopped" ? "Stopped" : "Earliest stop"}</div>
                  <div className="s">
                    {vm.status === "stopped" && m.stoppedAt
                      ? m.stoppedAt.slice(0, 10)
                      : `${m.minRuntime}d min runtime`}
                  </div>
                </div>
              </div>
              <div className="meta-tl-item future">
                <span className="dot" />
                <div className="label">
                  <div className="l">Target end</div>
                  <div className="s">{vm.daysGoal}d cap</div>
                </div>
              </div>
            </div>
          </MetaSection>

          <MetaSection icon={<Hash size={12} />} title="Identity">
            <div className="meta-kv">
              <span className="k">ID</span>
              <span className="v">{vm.id}</span>
            </div>
            <div className="meta-kv">
              <span className="k">Layer</span>
              <span className="v">{m.layer}</span>
            </div>
            <div className="meta-kv">
              <span className="k">Project</span>
              <span className="v">{m.project}</span>
            </div>
            <div className="meta-kv">
              <span className="k">Environment</span>
              <span className="v">{m.env}</span>
            </div>
            {m.tags.length > 0 && (
              <div style={{ marginTop: 8 }}>
                <div className="t-caps dim-3" style={{ fontSize: 9.5, marginBottom: 4 }}>
                  Tags
                </div>
                <div className="meta-tags">
                  {m.tags.map((t) => (
                    <span key={t} className="mtag">
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </MetaSection>

          <MetaSection icon={<Shield size={12} />} title="Targeting">
            <div className="meta-kv">
              <span className="k">Universe</span>
              <span className="v">{m.universe}</span>
            </div>
            <div className="meta-kv">
              <span className="k">Unit</span>
              <span className="v">{m.unit}</span>
            </div>
            <div className="meta-kv">
              <span className="k">Holdout</span>
              <span className="v">
                {m.holdoutRange
                  ? `slots ${m.holdoutRange[0]}–${m.holdoutRange[1]} · ${m.holdoutPct}%`
                  : `${m.holdoutPct}%`}
              </span>
            </div>
            <div className="meta-kv">
              <span className="k">Allocation</span>
              <span className="v">{m.allocation}%</span>
            </div>
            <div className="meta-kv">
              <span className="k">Gate</span>
              <span className="v" style={{ color: m.gate ? "var(--se-accent)" : undefined }}>
                {m.gate ?? "—"}
              </span>
            </div>
            <div className="meta-kv">
              <span className="k">Est. traffic</span>
              <span className="v">
                {m.estTrafficPerDay > 0 ? `${m.estTrafficPerDay.toLocaleString()} users/day` : "—"}
              </span>
            </div>
          </MetaSection>

          <MetaSection icon={<Layers size={12} />} title="Variants" count={m.groups.length}>
            {m.groups.map((g, i) => (
              <div key={g.name} className={`meta-variant ${i === 0 ? "ctrl" : "test"}`}>
                <div className="top">
                  <span className="n">
                    {g.name}
                    {i === 0 && <span className="ctrl-tag">· baseline</span>}
                  </span>
                  <span className="pct">{(g.weight / 100).toFixed(0)}%</span>
                </div>
                <div className="bar">
                  <span style={{ width: `${g.weight / 100}%` }} />
                </div>
                {vm.usersPerGroup[i] != null && (
                  <div className="meta-kv" style={{ padding: 0, fontSize: 11 }}>
                    <span className="k" style={{ fontSize: 10.5 }}>
                      n
                    </span>
                    <span className="v" style={{ fontSize: 10.5 }}>
                      {(vm.usersPerGroup[i] ?? 0).toLocaleString()}
                    </span>
                  </div>
                )}
              </div>
            ))}
          </MetaSection>

          <MetaSection
            icon={<Activity size={12} />}
            title="Metrics"
            count={(vm.goal ? 1 : 0) + vm.guards.length + vm.secs.length}
            defaultOpen={false}
          >
            {vm.goal && (
              <>
                <div className="t-caps dim-3" style={{ fontSize: 9.5, marginBottom: 4 }}>
                  Goal
                </div>
                <div className="meta-metric">
                  <Check size={11} style={{ color: "var(--se-accent)" }} className="ico" />
                  <span className="n">{vm.goal.name}</span>
                  <span className="agg">{vm.goal.agg}</span>
                </div>
              </>
            )}
            {vm.guards.length > 0 && (
              <>
                <div
                  className="t-caps dim-3"
                  style={{ fontSize: 9.5, marginTop: 12, marginBottom: 4 }}
                >
                  Guardrails
                </div>
                {vm.guards.map((g, i) => (
                  <div key={i} className="meta-metric">
                    <Shield
                      size={11}
                      style={{
                        color: g.pass === false ? "var(--se-danger)" : "var(--se-fg-3)",
                      }}
                      className="ico"
                    />
                    <span className="n">{g.name}</span>
                    <span className="agg">{g.agg}</span>
                  </div>
                ))}
              </>
            )}
            {vm.secs.length > 0 && (
              <>
                <div
                  className="t-caps dim-3"
                  style={{ fontSize: 9.5, marginTop: 12, marginBottom: 4 }}
                >
                  Secondary
                </div>
                {vm.secs.map((g, i) => (
                  <div key={i} className="meta-metric">
                    <Activity size={11} style={{ color: "var(--se-fg-3)" }} className="ico" />
                    <span className="n">{g.name}</span>
                    <span className="agg">{g.agg}</span>
                  </div>
                ))}
              </>
            )}
          </MetaSection>

          <MetaSection
            icon={<SlidersHorizontal size={12} />}
            title="Statistical config"
            defaultOpen={false}
          >
            <div className="meta-kv">
              <span className="k">Significance α</span>
              <span className="v">{m.alpha}</span>
            </div>
            <div className="meta-kv">
              <span className="k">Min runtime</span>
              <span className="v">{m.minRuntime} days</span>
            </div>
            <div className="meta-kv">
              <span className="k">Min sample</span>
              <span className="v">{m.minSample.toLocaleString()}</span>
            </div>
            <div className="meta-kv">
              <span className="k">Analysis</span>
              <span className="v">{m.sequential ? "mSPRT" : "Welch · daily"}</span>
            </div>
            {m.cupedFrozenAt && (
              <div className="meta-kv">
                <span className="k">cuped_frozen_at</span>
                <span className="v">{m.cupedFrozenAt.slice(0, 16).replace("T", " ")}</span>
              </div>
            )}
            <div className="meta-kv">
              <span className="k">Hash</span>
              <span className="v">{m.hashVersion}</span>
            </div>
            {Object.keys(m.paramsSchema).length > 0 && (
              <div
                className="meta-kv"
                style={{ flexDirection: "column", alignItems: "flex-start", gap: 6 }}
              >
                <span className="k">Params schema</span>
                <span
                  className="v wrap"
                  style={{
                    fontFamily: "var(--se-mono)",
                    fontSize: 10.5,
                    color: "var(--se-fg-2)",
                  }}
                >
                  {Object.entries(m.paramsSchema)
                    .map(([k, v]) => `${k}: ${v}`)
                    .join(" · ")}
                </span>
              </div>
            )}
          </MetaSection>

          <MetaSection
            icon={<Clock size={12} />}
            title="Activity"
            count={m.activity.length}
            defaultOpen={false}
          >
            <div className="meta-activity">
              {m.activity.map((a, i) => (
                <div key={i} className={`meta-activity-item ${a.bot ? "bot" : ""}`}>
                  <div className="av" style={{ background: a.color || undefined }}>
                    {a.av}
                  </div>
                  <div>
                    <div className="what">
                      <b>{a.who}</b> {a.what}
                    </div>
                    <div className="when">{a.when}</div>
                  </div>
                </div>
              ))}
            </div>
          </MetaSection>

          <MetaSection icon={<GitBranch size={12} />} title="Linked" defaultOpen={false}>
            <div className="meta-link">
              <ExternalLink size={12} className="ico" />
              <div className="label">
                Link a pull request
                <span className="sub">github · not yet connected</span>
              </div>
              <span className="ext">↗</span>
            </div>
            <div className="meta-link">
              <MessageSquare size={12} className="ico" />
              <div className="label">
                Subscribe a channel
                <span className="sub">slack · not yet connected</span>
              </div>
              <span className="ext">↗</span>
            </div>
            <div className="meta-link">
              <BookOpen size={12} className="ico" />
              <div className="label">
                Attach a design doc
                <span className="sub">notion · not yet connected</span>
              </div>
              <span className="ext">↗</span>
            </div>
            <div className="meta-link">
              <Code size={12} className="ico" />
              <div className="label">
                SDK call sites
                <span className="sub">crawl-on-deploy · pending</span>
              </div>
              <span className="ext">↗</span>
            </div>
          </MetaSection>

          <div style={{ height: 24 }} />
        </div>
      )}
    </aside>
  );
}

const VERDICT_ICONS: Record<Verdict, ReactNode> = {
  ship: <CheckCircle2 size={12} />,
  hold: <AlertTriangle size={12} />,
  wait: <Clock size={12} />,
  invalid: <XCircle size={12} />,
  draft: <MinusCircle size={12} />,
};

export function ResultsClient({ vm, actions }: { vm: ResultsViewModel; actions: ReactNode }) {
  const [metaCollapsed, setMetaCollapsed] = useState(false);
  const guardsFailed = vm.guards.filter((g) => g.pass === false).length;
  const guardsPassed = vm.guards.filter((g) => g.pass === true).length;
  const secsSig = vm.secs.filter((g) => g.sig).length;
  const totalUsersHero = vm.usersPerGroup.reduce((a, b) => a + b, 0);

  return (
    <div className="v2-page">
      <div className={`v2-shell ${metaCollapsed ? "collapsed" : ""}`}>
        {/* Banner row spans full grid width; meta rail starts BELOW */}
        <div className="v2-banner">
          {/* compact header */}
          <div className="v2-head">
            <span
              className={`badge ${
                vm.status === "running"
                  ? "badge-live"
                  : vm.status === "stopped"
                    ? "badge-completed"
                    : vm.status === "draft"
                      ? "badge-draft"
                      : ""
              }`}
            >
              <span className="dot" />
              {vm.status === "running" ? `DAY ${vm.days}/${vm.daysGoal}` : vm.status.toUpperCase()}
            </span>
            <h1>{vm.name}</h1>
            <span className="owner">
              <div className="avatar-sm" style={{ background: vm.meta.owner.color }}>
                {vm.meta.owner.initial}
              </div>
              {vm.meta.owner.name}
            </span>
            <span className="more-actions">{actions}</span>
          </div>

          {/* Goal & success criteria */}
          <div className="v2-criteria">
            <div className="row goal">
              <span className="lbl">Goal</span>
              <span>{vm.meta.hypothesis}</span>
            </div>
            <div className="row success">
              <span className="lbl">Success</span>
              <span>{vm.meta.success}</span>
            </div>
          </div>

          {/* stopped banner */}
          {vm.status === "stopped" && (
            <div className="stopped-banner">
              <CheckCircle2 size={14} />
              <strong>
                Stopped{vm.stoppedAgo != null ? ` ${vm.stoppedAgo}d ago` : ""} — final, frozen.
              </strong>
              <span style={{ color: "var(--se-fg-3)" }}>No live updates.</span>
            </div>
          )}
        </div>

        <div className="v2-main-col">
          {/* DRAFT */}
          {vm.verdict === "draft" ? (
            <div className="v2-draft">
              <div className="t-caps dim-2">No results yet</div>
              <div
                style={{
                  margin: 0,
                  fontFamily: "var(--se-serif)",
                  fontStyle: "italic",
                  fontSize: 28,
                  lineHeight: 1.1,
                  whiteSpace: "normal",
                }}
              >
                Nothing to analyze — finish the checklist to start.
              </div>
              <p
                style={{
                  maxWidth: "54ch",
                  margin: 0,
                  fontSize: 13,
                  lineHeight: 1.5,
                  color: "var(--se-fg-3)",
                  whiteSpace: "normal",
                }}
              >
                Once running, you&apos;ll see a verdict, CI bars per metric, and a time-series chart
                here.
              </p>
              {vm.draftChecklist && (
                <div className="checklist-wide">
                  {vm.draftChecklist.map((c) => (
                    <div key={c.label}>
                      {c.done ? (
                        <CheckCircle2
                          size={14}
                          style={{ color: "var(--se-accent)", flexShrink: 0 }}
                        />
                      ) : (
                        <MinusCircle size={14} style={{ color: "var(--se-fg-4)", flexShrink: 0 }} />
                      )}
                      <span style={{ color: c.done ? "var(--se-fg)" : "var(--se-fg-3)" }}>
                        {c.label}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <>
              {/* SRM block */}
              {vm.srm && (
                <div className="srm-strip">
                  <div className="head">
                    <span className="t">Sample Ratio Mismatch detected.</span>
                    <span className="stat">
                      χ² = {vm.srm.chiSq.toFixed(2)} · p = {fmtP(vm.srm.chiSqP)}
                    </span>
                  </div>
                  <p className="why">
                    Group sizes don&apos;t match configured weights. Results are not trustworthy
                    until this is resolved — likely causes include assignment imbalance, a tracking
                    bug, or bot traffic hitting one group only.
                  </p>
                  <div className="srm-table head">
                    <span>Group</span>
                    <span style={{ textAlign: "right" }}>Expected</span>
                    <span style={{ textAlign: "right" }}>Actual</span>
                    <span style={{ textAlign: "right" }}>Δ</span>
                  </div>
                  {vm.meta.groups.map((g, i) => {
                    const exp = vm.expectedPerGroup?.[i] ?? 0;
                    const act = vm.usersPerGroup[i] ?? 0;
                    const d = act - exp;
                    return (
                      <div key={g.name} className="srm-table">
                        <span>
                          <b>{g.name}</b>{" "}
                          <span className="dim-3">({(g.weight / 100).toFixed(0)}%)</span>
                        </span>
                        <span className="n">{exp.toLocaleString()}</span>
                        <span className="n">{act.toLocaleString()}</span>
                        <span
                          className="n"
                          style={{
                            color: Math.abs(d) > 200 ? "var(--se-danger)" : "var(--se-fg-2)",
                          }}
                        >
                          {d > 0 ? "+" : ""}
                          {d.toLocaleString()} ({exp > 0 ? ((d / exp) * 100).toFixed(1) : "—"}%)
                        </span>
                      </div>
                    );
                  })}
                  <div className="checklist-foot">
                    <h5>Debug checklist</h5>
                    <ul>
                      <li>
                        Is assignment running on every request, or short-circuiting for some users?
                      </li>
                      <li>
                        Is <code>user_id</code> stable between assignment and the goal event?
                      </li>
                      <li>Is bot traffic hitting one group only (caching / robots.txt)?</li>
                      <li>
                        Does the client hash match <code>{vm.meta.hashVersion}</code>?
                      </li>
                    </ul>
                  </div>
                </div>
              )}

              {/* HERO */}
              <div className={`v2-hero ${vm.verdict}`}>
                <div className="left">
                  <div className="eyebrow">
                    <span className="ico">{VERDICT_ICONS[vm.verdict]}</span>
                    Verdict
                    {vm.isFinal && <> · Final</>}
                  </div>
                  <h2 className="title">{vm.title}</h2>
                  <p className="why">{renderMd(vm.why)}</p>
                  <div className="runtime">
                    <span>
                      {vm.status === "stopped"
                        ? `${vm.days} days run`
                        : `Day ${vm.days}/${vm.daysGoal}`}
                    </span>
                    <span className="dot" />
                    <span>α = {vm.meta.alpha}</span>
                    {totalUsersHero > 0 && (
                      <>
                        <span className="dot" />
                        <span>{totalUsersHero.toLocaleString()} users</span>
                      </>
                    )}
                  </div>
                </div>
                {vm.rawNumbers && vm.goal && vm.goal.ci && vm.goal.delta != null ? (
                  <div className="right">
                    <div className="metric-name">
                      <span className="tag">Goal</span>
                      <span>{vm.goal.name}</span>
                    </div>
                    <div className="v2-stats">
                      <div className="v2-stat-line">
                        <span className="k">
                          <span className="sw" style={{ background: "var(--se-fg-3)" }} />
                          control
                        </span>
                        <span className="v">{fmtPct(vm.rawNumbers.ctrl)}</span>
                        <span className="sub">
                          n = {(vm.usersPerGroup[0] ?? 0).toLocaleString()}
                        </span>
                      </div>
                      <div className="v2-stat-line">
                        <span className="k">
                          <span className="sw" style={{ background: "var(--se-accent)" }} />
                          {vm.meta.groups[1]?.name ?? "treatment"}
                        </span>
                        <span className="v">{fmtPct(vm.rawNumbers.test)}</span>
                        <span className="sub">
                          n = {(vm.usersPerGroup[1] ?? 0).toLocaleString()}
                        </span>
                      </div>
                      <div
                        className={`v2-stat-line delta ${vm.rawNumbers.delta > 0 ? "pos" : "neg"}`}
                      >
                        <span className="k">Δ</span>
                        <span className="v">
                          {vm.rawNumbers.delta > 0 ? "+" : ""}
                          {fmtPct(vm.rawNumbers.delta)}
                        </span>
                        <span className="sub">
                          {vm.rawNumbers.deltaPct > 0 ? "+" : ""}
                          {fmtPct(vm.rawNumbers.deltaPct)} rel
                        </span>
                      </div>
                      <div className="v2-stat-line p">
                        <span className="k">p-value</span>
                        <span className={`v ${vm.rawNumbers.p < vm.meta.alpha ? "sig" : ""}`}>
                          {fmtP(vm.rawNumbers.p)}
                        </span>
                        <span className="sub">95% CI shown ↓</span>
                      </div>
                    </div>
                    <div className="ci-zone">
                      <BigCIBar
                        delta={vm.goal.delta}
                        ci={vm.goal.ci}
                        lowerBetter={vm.goal.lowerBetter}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="right" style={{ justifyContent: "center", alignItems: "center" }}>
                    <Lock size={20} style={{ color: "var(--se-fg-4)" }} />
                    <div
                      style={{
                        color: "var(--se-fg-3)",
                        fontSize: 13,
                        textAlign: "center",
                        maxWidth: "28ch",
                        whiteSpace: "normal",
                      }}
                    >
                      {vm.verdict === "invalid"
                        ? "Results withheld until the issue is resolved."
                        : vm.goal
                          ? "Goal metric hasn't reported a CI yet — keep collecting."
                          : "Attach a goal metric to see evidence here."}
                    </div>
                  </div>
                )}
              </div>

              {/* SCOREBOARD */}
              {vm.showResults && (vm.guards.length > 0 || vm.secs.length > 0) && (
                <div className="v2-board">
                  {vm.guards.length > 0 && (
                    <div className="v2-board-section">
                      <div className="v2-board-header">
                        <Shield size={12} style={{ color: "var(--se-fg-3)" }} />
                        <span className="kind">Guardrails</span>
                        <span className={`summary ${guardsFailed > 0 ? "bad" : "ok"}`}>
                          {guardsFailed > 0 ? (
                            <>
                              <AlertTriangle size={11} /> {guardsFailed} regressed · {guardsPassed}{" "}
                              pass
                            </>
                          ) : (
                            <>
                              <Check size={11} /> all {guardsPassed} pass
                            </>
                          )}
                        </span>
                      </div>
                      {vm.guards.map((g, i) => (
                        <ScoreboardRow key={i} m={g} kind="guard" />
                      ))}
                    </div>
                  )}
                  {vm.secs.length > 0 && (
                    <div className="v2-board-section">
                      <div className="v2-board-header">
                        <Activity size={12} style={{ color: "var(--se-fg-3)" }} />
                        <span className="kind">Secondary</span>
                        <span className="summary">
                          {secsSig} of {vm.secs.length} significant
                        </span>
                      </div>
                      {vm.secs.map((g, i) => (
                        <ScoreboardRow key={i} m={g} kind="sec" />
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* DRAWERS */}
              {vm.showResults && (
                <>
                  <details className="v2-drawer" open>
                    <summary>
                      <ChevronRight size={12} className="chev" />
                      <span className="t">Time series</span>
                      {vm.goal && <span className="sub">{vm.goal.name}</span>}
                    </summary>
                    <div className="v2-drawer-body">
                      <TimeSeriesChart
                        data={vm.timeseries}
                        metricLabel={vm.goal?.name ?? "goal"}
                        peekUntilDay={vm.peekWarning ? vm.meta.minRuntime - 1 : null}
                        stoppedDay={
                          vm.status === "stopped" && vm.timeseries.length > 0
                            ? vm.timeseries.length - 1
                            : null
                        }
                      />
                    </div>
                  </details>

                  <details className="v2-drawer">
                    <summary>
                      <ChevronRight size={12} className="chev" />
                      <span className="t">Setup</span>
                      <span className="sub">
                        {vm.meta.universe} · {vm.meta.holdoutPct}% holdout · {vm.meta.allocation}%
                        alloc{vm.meta.gate ? ` · gate ${vm.meta.gate}` : ""}
                      </span>
                    </summary>
                    <div className="v2-drawer-body">
                      <SetupFlow vm={vm} />
                      <div className="config-grid">
                        <KV label="Hypothesis" value={vm.meta.hypothesis} mono={false} />
                        <KV label="Success criteria" value={vm.meta.success} mono={false} />
                        <KV label="Unit" value={vm.meta.unit} />
                        <KV label="Hash" value={vm.meta.hashVersion} />
                        {vm.meta.cupedFrozenAt && (
                          <KV
                            label="cuped_frozen_at"
                            value={vm.meta.cupedFrozenAt.slice(0, 16).replace("T", " ")}
                          />
                        )}
                        <KV label="Min runtime" value={`${vm.meta.minRuntime} days`} />
                        <KV label="Significance α" value={String(vm.meta.alpha)} />
                        <KV label="Min sample" value={vm.meta.minSample.toLocaleString()} />
                        {Object.keys(vm.meta.paramsSchema).length > 0 && (
                          <KV
                            label="Params"
                            value={Object.entries(vm.meta.paramsSchema)
                              .map(([k, v]) => `${k}:${v}`)
                              .join(", ")}
                          />
                        )}
                        {vm.meta.startedAt && (
                          <KV
                            label="Started at"
                            value={vm.meta.startedAt.slice(0, 16).replace("T", " ")}
                          />
                        )}
                      </div>
                    </div>
                  </details>
                </>
              )}
            </>
          )}
        </div>

        <MetaSidebar
          vm={vm}
          collapsed={metaCollapsed}
          onToggle={() => setMetaCollapsed((v) => !v)}
        />
      </div>
    </div>
  );
}

function SetupFlow({ vm }: { vm: ResultsViewModel }) {
  const total = vm.meta.estTrafficPerDay > 0 ? vm.meta.estTrafficPerDay : 0;
  const holdout = Math.round(total * (vm.meta.holdoutPct / 100));
  const inExp = Math.max(0, Math.round((total - holdout) * (vm.meta.allocation / 100)));
  const perGroup =
    vm.usersPerGroup.length > 0
      ? vm.usersPerGroup
      : vm.meta.groups.map(() => Math.round(inExp / Math.max(1, vm.meta.groups.length)));
  return (
    <div className="setup-flow">
      <div className="node">
        <span className="lbl">Universe</span>
        <span className="v">{total > 0 ? total.toLocaleString() : "—"}</span>
        <span className="sub">{vm.meta.universe} / day</span>
      </div>
      <div className="node">
        <span className="lbl">Holdout · {vm.meta.holdoutPct}%</span>
        <span className="v" style={{ color: "var(--se-fg-3)" }}>
          {total > 0 ? holdout.toLocaleString() : "—"}
        </span>
        <span className="sub">
          {vm.meta.holdoutRange
            ? `slots ${vm.meta.holdoutRange[0]}–${vm.meta.holdoutRange[1]}`
            : "—"}
        </span>
      </div>
      <div className="node">
        <span className="lbl">In experiment · {vm.meta.allocation}%</span>
        <span className="v">{total > 0 ? inExp.toLocaleString() : "—"}</span>
        <span className="sub">{vm.meta.gate ? `gate · ${vm.meta.gate}` : "no gate"}</span>
      </div>
      {vm.meta.groups.map((g, i) => (
        <div key={g.name} className={`node ${i === 0 ? "" : "test"}`}>
          <span className="lbl">
            {g.name} · {(g.weight / 100).toFixed(0)}%
          </span>
          <span className="v">{(perGroup[i] ?? 0).toLocaleString()}</span>
          <span className="sub">
            {total > 0 ? `${(((perGroup[i] ?? 0) / total) * 100).toFixed(1)}% of universe` : "—"}
          </span>
        </div>
      ))}
    </div>
  );
}

function KV({ label, value, mono = true }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="kv">
      <span className="k">{label}</span>
      <span
        className="v"
        style={
          mono
            ? undefined
            : {
                whiteSpace: "normal",
                fontFamily: "var(--se-sans)",
                fontSize: 11.5,
                color: "var(--se-fg-2)",
              }
        }
      >
        {value}
      </span>
    </div>
  );
}
