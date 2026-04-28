"use client";

import { useState } from "react";
import {
  AlertTriangle,
  ArrowDown,
  ArrowRight,
  ArrowUp,
  BookOpen,
  Code,
  Copy,
  Filter,
  MoreHorizontal,
  Pause,
  Pin,
  Plus,
  Search,
  Sparkles,
  Wand2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { MainChart, Sparkline, VitalGauge } from "./charts";
import {
  autoVitals,
  customEvents,
  funnel,
  liveStream,
  metricsTiles,
  type CustomEvent,
  type MetricsTile,
} from "./mock-data";

const RANGES = ["1h", "24h", "7d", "30d", "90d"] as const;

const SERIES_LEGEND = [
  { k: "user_checkout", v: "2,184", c: "var(--se-accent)" },
  { k: "user_startcheckout", v: "12,840", c: "var(--se-info)" },
  { k: "cart_abandoned", v: "4,021", c: "var(--se-warn)" },
] as const;

function Tile({ t }: { t: MetricsTile }) {
  const isUp = t.delta > 0;
  const isDown = t.delta < 0;
  const deltaClass = Math.abs(t.delta) < 1 ? "flat" : t.good ? "up" : "dn";
  const sparkColor = t.good ? "var(--se-accent)" : "var(--se-danger)";
  return (
    <div className={`met-tile ${t.kind}`}>
      <div className="kindtag">{t.kind === "auto" ? "AUTO" : "CUSTOM"}</div>
      <div className="top">
        <span className="label">{t.label}</span>
      </div>
      <div className="val">
        {t.val}
        {t.unit && <span className="unit">{t.unit}</span>}
      </div>
      <div className={`delta ${deltaClass}`}>
        {isUp ? (
          <ArrowUp className="size-2.5" />
        ) : isDown ? (
          <ArrowDown className="size-2.5" />
        ) : (
          "·"
        )}
        {Math.abs(t.delta).toFixed(1)}%<span style={{ color: "var(--se-fg-4)" }}>vs prev</span>
      </div>
      <div className="spark">
        <Sparkline data={t.spark} color={sparkColor} w={88} h={32} fill />
      </div>
    </div>
  );
}

function eventKindStyle(kind: CustomEvent["kind"]): React.CSSProperties {
  if (kind === "conversion") return {};
  if (kind === "funnel") {
    return {
      background: "var(--se-info)",
      boxShadow: "0 0 0 3px color-mix(in oklab, var(--se-info) 22%, transparent)",
    };
  }
  return {
    background: "var(--se-fg-3)",
    boxShadow: "0 0 0 3px color-mix(in oklab, var(--se-fg-3) 18%, transparent)",
  };
}

function eventBadgeStyle(kind: CustomEvent["kind"]): React.CSSProperties {
  if (kind === "conversion") {
    return {
      background: "var(--se-accent-soft)",
      color: "var(--se-accent)",
      borderColor: "color-mix(in oklab, var(--se-accent) 30%, transparent)",
    };
  }
  if (kind === "funnel") {
    return {
      background: "var(--se-info-soft)",
      color: "var(--se-info)",
      borderColor: "color-mix(in oklab, var(--se-info) 30%, transparent)",
    };
  }
  return {};
}

export function MetricsDashboard({
  onOpenSetup,
  onCreate,
  onEditEvent,
}: {
  onOpenSetup: () => void;
  onCreate: () => void;
  onEditEvent: (e: CustomEvent) => void;
}) {
  const [range, setRange] = useState<(typeof RANGES)[number]>("24h");
  const [active, setActive] = useState<Record<string, boolean>>({
    user_checkout: true,
    user_startcheckout: true,
    cart_abandoned: true,
  });
  const [filter, setFilter] = useState("");
  const toggle = (k: string) => setActive((a) => ({ ...a, [k]: !a[k] }));

  const filteredEvents = customEvents.filter((e) => !filter || e.name.includes(filter));

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0 flex-1">
          <div
            className="t-caps dim-2 mb-2"
            style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}
          >
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                color: "var(--se-accent)",
              }}
            >
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: "var(--se-accent)",
                  boxShadow: "0 0 0 3px color-mix(in oklab, var(--se-accent) 22%, transparent)",
                }}
              />
              <span>INGESTING · 4s ago</span>
            </span>
            <span className="dim-3">·</span>
            <span>7 custom events</span>
            <span className="dim-3">·</span>
            <span>12 auto metrics</span>
            <span className="dim-3">·</span>
            <span>48.2k sessions today</span>
          </div>
          <h1 className="text-[24px] font-medium tracking-tight">Metrics</h1>
          <p className="mt-1 max-w-[68ch] text-[13.5px] text-muted-foreground">
            Auto-collected web vitals plus the events you register with{" "}
            <span className="t-mono dim">log()</span>. New events show up live within seconds — no
            schema migrations, no redeploy.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="met-select" style={{ width: 150 }}>
            <select defaultValue="prod" aria-label="Environment">
              <option value="dev">env · dev</option>
              <option value="staging">env · staging</option>
              <option value="prod">env · production</option>
            </select>
          </div>
          <div className="met-pill-group" role="group" aria-label="Time range">
            {RANGES.map((r) => (
              <button
                type="button"
                key={r}
                className={`pill ${range === r ? "on" : ""}`}
                onClick={() => setRange(r)}
                aria-pressed={range === r}
              >
                {r}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* KPI tiles */}
      <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 lg:grid-cols-6">
        {metricsTiles.map((t) => (
          <Tile key={t.label} t={t} />
        ))}
      </div>

      {/* Main chart + funnel */}
      <div className="grid gap-4 lg:grid-cols-[1.55fr_1fr]">
        <div className="met-card">
          <div className="met-card-head">
            <div className="met-card-head-title">Events over time</div>
            <span className="t-mono-xs dim-2">stacked · counts per hour</span>
            <div className="ml-auto flex items-center gap-2">
              <div className="met-seg">
                <button type="button" className="opt on">
                  count
                </button>
                <button type="button" className="opt">
                  sum(amount)
                </button>
                <button type="button" className="opt">
                  unique users
                </button>
              </div>
              <Button variant="ghost" size="icon" aria-label="More">
                <MoreHorizontal className="size-3" />
              </Button>
            </div>
          </div>
          <div style={{ padding: "14px 18px 4px" }}>
            <div className="met-legend" style={{ marginBottom: 6 }}>
              {SERIES_LEGEND.map((s) => (
                <button
                  type="button"
                  key={s.k}
                  className={`item ${!active[s.k] ? "muted" : ""}`}
                  onClick={() => toggle(s.k)}
                  aria-pressed={!!active[s.k]}
                >
                  <span className="swatch" style={{ background: s.c }} />
                  <span>{s.k}</span>
                  <span className="v">{s.v}</span>
                </button>
              ))}
              <Button variant="ghost" size="sm" style={{ marginLeft: "auto" }}>
                <Plus className="size-3" /> add series
              </Button>
            </div>
          </div>
          <div style={{ padding: "0 12px 12px" }}>
            <MainChart active={active} />
          </div>
        </div>

        <div className="met-card">
          <div className="met-card-head">
            <div className="met-card-head-title">Checkout funnel</div>
            <span className="t-mono-xs dim-2">last 24h · all users</span>
            <div className="ml-auto">
              <Button variant="ghost" size="sm">
                <Wand2 className="size-3" /> Build from events
              </Button>
            </div>
          </div>
          <div style={{ padding: "4px 0" }}>
            {funnel.map((f, i) => (
              <div key={f.step} className="met-funnel-row">
                <div
                  style={{ fontFamily: "var(--se-mono)", fontSize: 10.5, color: "var(--se-fg-4)" }}
                >
                  {String(i + 1).padStart(2, "0")}
                </div>
                <div>
                  <div
                    style={{
                      fontFamily: "var(--se-mono)",
                      fontSize: 12,
                      color: "var(--se-fg-2)",
                      marginBottom: 5,
                    }}
                  >
                    {f.step}
                  </div>
                  <div className={`met-funnel-bar ${i === 0 ? "muted" : ""}`}>
                    <div className="fill" style={{ width: `${f.pct}%` }} />
                  </div>
                </div>
                <div
                  className="num t-mono"
                  style={{ fontSize: 12, color: "var(--se-fg-2)", textAlign: "right" }}
                >
                  {f.count.toLocaleString()}
                </div>
                <div
                  className="num t-mono"
                  style={{
                    fontSize: 11,
                    color:
                      i === 0
                        ? "var(--se-fg-3)"
                        : f.pct < 10
                          ? "var(--se-warn)"
                          : "var(--se-accent)",
                    textAlign: "right",
                  }}
                >
                  {f.pct.toFixed(1)}%
                </div>
              </div>
            ))}
          </div>
          <div
            style={{
              padding: "10px 16px",
              background: "var(--se-bg-2)",
              borderTop: "1px solid var(--se-line)",
              display: "flex",
              gap: 10,
              alignItems: "center",
            }}
          >
            <Sparkles className="size-3" style={{ color: "var(--se-accent)" }} />
            <div className="text-[12.5px]" style={{ color: "var(--se-fg-2)" }}>
              Biggest drop-off:{" "}
              <b style={{ color: "var(--se-fg)" }}>payment_form_filled → user_checkout</b>
            </div>
            <Button variant="ghost" size="sm" style={{ marginLeft: "auto" }}>
              Investigate <ArrowRight className="size-3" />
            </Button>
          </div>
        </div>
      </div>

      {/* Custom events table */}
      <div className="met-card">
        <div className="met-card-head">
          <div className="met-card-head-title">Custom events</div>
          <span className="t-mono-xs dim-2">{customEvents.length} registered</span>
          <div className="ml-auto flex items-center gap-2">
            <div className="met-seg">
              <button type="button" className="opt on">
                All
              </button>
              <button type="button" className="opt">
                Events
              </button>
              <button type="button" className="opt">
                Conversions
              </button>
              <button type="button" className="opt">
                Funnel
              </button>
            </div>
            <div className="met-input" style={{ width: 200 }}>
              <Search className="size-3" style={{ color: "var(--se-fg-3)" }} />
              <input
                placeholder="Filter events"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                aria-label="Filter events"
              />
            </div>
            <Button variant="secondary" size="sm" onClick={onCreate}>
              <Plus className="size-3" /> Register
            </Button>
          </div>
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "18px minmax(0,1.7fr) 110px 110px 100px 110px 90px 28px",
            gap: 14,
            padding: "8px 18px",
            borderBottom: "1px solid var(--se-line)",
            background: "var(--se-bg-2)",
            fontFamily: "var(--se-mono)",
            fontSize: 10,
            color: "var(--se-fg-4)",
            letterSpacing: "0.06em",
            textTransform: "uppercase",
          }}
        >
          <span />
          <span>Event · properties</span>
          <span>Type</span>
          <span>Volume · 24h</span>
          <span>vs prev</span>
          <span>Trend</span>
          <span>Per session</span>
          <span />
        </div>
        {filteredEvents.map((e) => (
          <div
            key={e.name}
            className="met-ev-row"
            onClick={() => onEditEvent(e)}
            role="button"
            tabIndex={0}
            onKeyDown={(ev) => {
              if (ev.key === "Enter" || ev.key === " ") {
                ev.preventDefault();
                onEditEvent(e);
              }
            }}
          >
            <span className="met-stream-dot" style={eventKindStyle(e.kind)} />
            <div style={{ minWidth: 0 }}>
              <div className="met-ev-name">
                {e.name}
                {e.pinned && (
                  <Pin
                    className="size-2.5 inline ml-2"
                    style={{ color: "var(--se-accent)", verticalAlign: "-1px" }}
                  />
                )}
              </div>
              <div
                style={{
                  marginTop: 4,
                  display: "flex",
                  gap: 0,
                  flexWrap: "wrap",
                  alignItems: "center",
                }}
              >
                {e.props.map((p) => (
                  <span key={p} className="met-ev-prop">
                    {p}
                  </span>
                ))}
                <span className="t-mono-xs dim-3" style={{ marginLeft: 6 }}>
                  since {e.firstSeen} · {e.owner}
                </span>
              </div>
            </div>
            <span className="met-badge" style={eventBadgeStyle(e.kind)}>
              {e.kind}
            </span>
            <span className="t-mono num" style={{ fontSize: 13, color: "var(--se-fg)" }}>
              {e.volume}
            </span>
            <span
              className="t-mono num"
              style={{
                fontSize: 12,
                color: e.vsPrev > 0 ? "var(--se-accent)" : "var(--se-danger)",
                display: "flex",
                alignItems: "center",
                gap: 4,
              }}
            >
              {e.vsPrev > 0 ? <ArrowUp className="size-2.5" /> : <ArrowDown className="size-2.5" />}
              {Math.abs(e.vsPrev).toFixed(1)}%
            </span>
            <Sparkline
              data={e.spark}
              color={e.vsPrev > 0 ? "var(--se-accent)" : "var(--se-danger)"}
              w={92}
              h={22}
            />
            <span className="t-mono num" style={{ fontSize: 11.5, color: "var(--se-fg-3)" }}>
              {e.perSession}
            </span>
            <Button
              variant="ghost"
              size="icon"
              onClick={(ev) => {
                ev.stopPropagation();
                onEditEvent(e);
              }}
              aria-label={`Edit ${e.name}`}
            >
              <MoreHorizontal className="size-3" />
            </Button>
          </div>
        ))}
        <div
          style={{
            padding: "12px 18px",
            background: "var(--se-bg-2)",
            borderTop: "1px solid var(--se-line)",
            display: "flex",
            gap: 14,
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <Code className="size-3" style={{ color: "var(--se-fg-3)" }} />
          <span className="text-[12.5px] dim">
            Send a new event from your code — we&apos;ll auto-detect it and surface it here within
            seconds.
          </span>
          <span
            className="t-mono-xs"
            style={{
              color: "var(--se-accent)",
              background: "var(--se-bg-3)",
              padding: "4px 8px",
              borderRadius: 4,
              border: "1px solid var(--se-line)",
            }}
          >
            log(&apos;event_name&apos;, {"{ ...props }"})
          </span>
          <Button variant="ghost" size="sm" style={{ marginLeft: "auto" }}>
            Copy SDK init <Copy className="size-3" />
          </Button>
        </div>
      </div>

      {/* Auto vitals + Live stream */}
      <div className="grid gap-4 lg:grid-cols-[1fr_1.05fr]">
        <div className="met-card">
          <div className="met-card-head">
            <div className="met-card-head-title">Auto-collected health</div>
            <span className="t-mono-xs dim-2">no setup required · web vitals + errors</span>
            <div className="ml-auto">
              <span
                className="met-badge"
                style={{
                  background: "var(--se-info-soft)",
                  color: "var(--se-info)",
                  borderColor: "color-mix(in oklab, var(--se-info) 30%, transparent)",
                }}
              >
                <span className="dot" />
                AUTO
              </span>
            </div>
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "60px minmax(0,1fr) 90px 70px",
              gap: 14,
              padding: "8px 18px",
              borderBottom: "1px solid var(--se-line)",
              background: "var(--se-bg-2)",
              fontFamily: "var(--se-mono)",
              fontSize: 10,
              color: "var(--se-fg-4)",
              letterSpacing: "0.06em",
              textTransform: "uppercase",
            }}
          >
            <span>Metric</span>
            <span>Range · good ↔ poor</span>
            <span>Value</span>
            <span>Status</span>
          </div>
          {autoVitals.map((v) => (
            <div key={v.name} className="met-vital-row">
              <div>
                <div
                  style={{
                    fontFamily: "var(--se-mono)",
                    fontSize: 12,
                    color: "var(--se-fg)",
                    fontWeight: 500,
                  }}
                >
                  {v.name}
                </div>
                <div className="t-mono-xs dim-3" style={{ marginTop: 2 }}>
                  {v.unit || "ratio"}
                </div>
              </div>
              <div>
                <div
                  className="text-[12.5px] dim"
                  style={{
                    marginBottom: 6,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {v.desc}
                </div>
                <VitalGauge val={v.val} good={v.good} poor={v.poor} status={v.status} />
              </div>
              <div
                className="t-mono num"
                style={{ fontSize: 13, color: "var(--se-fg)", textAlign: "right" }}
              >
                {v.val}
                {v.unit && (
                  <span style={{ color: "var(--se-fg-3)", fontSize: 11, marginLeft: 2 }}>
                    {v.unit}
                  </span>
                )}
              </div>
              <span
                className="met-badge"
                style={
                  v.status === "good"
                    ? {
                        background: "var(--se-accent-soft)",
                        color: "var(--se-accent)",
                        borderColor: "color-mix(in oklab, var(--se-accent) 30%, transparent)",
                      }
                    : v.status === "warn"
                      ? {
                          background: "var(--se-warn-soft)",
                          color: "var(--se-warn)",
                          borderColor: "color-mix(in oklab, var(--se-warn) 30%, transparent)",
                        }
                      : {
                          background: "var(--se-danger-soft)",
                          color: "var(--se-danger)",
                          borderColor: "color-mix(in oklab, var(--se-danger) 30%, transparent)",
                        }
                }
              >
                <span className="dot" />
                {v.status.toUpperCase()}
              </span>
            </div>
          ))}
          <div
            style={{
              padding: "12px 18px",
              background: "var(--se-bg-2)",
              borderTop: "1px solid var(--se-line)",
              display: "flex",
              gap: 10,
              alignItems: "flex-start",
            }}
          >
            <AlertTriangle
              className="size-3.5"
              style={{ color: "var(--se-warn)", marginTop: 2, flexShrink: 0 }}
            />
            <div>
              <div className="text-[12.5px]" style={{ color: "var(--se-fg)" }}>
                API 5xx is trending warm.{" "}
                <a style={{ color: "var(--se-accent)" }} href="#open-apm">
                  Open APM →
                </a>
              </div>
              <div className="t-mono-xs dim-2" style={{ marginTop: 2 }}>
                1.18% of requests failed (target ≤1.0%) · spike in{" "}
                <span style={{ color: "var(--se-fg-2)" }}>POST /v1/checkout</span>
              </div>
            </div>
          </div>
        </div>

        <div className="met-card">
          <div className="met-card-head">
            <div className="met-card-head-title">Live event stream</div>
            <span
              className="t-mono-xs"
              style={{
                color: "var(--se-accent)",
                display: "inline-flex",
                gap: 6,
                alignItems: "center",
              }}
            >
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: "var(--se-accent)",
                  boxShadow: "0 0 0 3px color-mix(in oklab, var(--se-accent) 22%, transparent)",
                }}
              />
              LIVE
            </span>
            <div className="ml-auto flex items-center gap-2">
              <div className="met-input" style={{ width: 160 }}>
                <Filter className="size-3" style={{ color: "var(--se-fg-3)" }} />
                <input placeholder="Filter stream" aria-label="Filter stream" />
              </div>
              <Button variant="ghost" size="icon" aria-label="Pause stream">
                <Pause className="size-3" />
              </Button>
            </div>
          </div>
          <div style={{ maxHeight: 380, overflow: "auto" }}>
            {liveStream.map((e, i) => (
              <div key={i} className="met-stream-row">
                <span className="met-stream-time">{e.t}</span>
                <span className={`met-stream-dot ${e.kind === "live" ? "" : e.kind}`} />
                <div style={{ minWidth: 0, display: "flex", flexDirection: "column", gap: 1 }}>
                  <span className="met-stream-name">{e.name}</span>
                  <span className="met-stream-payload">{e.payload}</span>
                </div>
                <span className="met-stream-tag">{e.kind === "live" ? "log()" : e.kind}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Setup reminder banner */}
      <div
        style={{
          padding: "14px 18px",
          background: "var(--se-bg-1)",
          border: "1px solid var(--se-line)",
          borderRadius: "var(--radius-lg)",
          display: "flex",
          gap: 14,
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        <span
          style={{
            width: 36,
            height: 36,
            borderRadius: 8,
            background: "var(--se-accent-soft)",
            border: "1px solid color-mix(in oklab, var(--se-accent) 30%, transparent)",
            display: "grid",
            placeItems: "center",
            color: "var(--se-accent)",
            flexShrink: 0,
          }}
        >
          <BookOpen className="size-4" />
        </span>
        <div style={{ flex: 1, minWidth: 240 }}>
          <div style={{ fontSize: 13.5, fontWeight: 500 }}>
            Setup guide · install the SDK, send your first event, pick starters
          </div>
          <div className="t-mono-xs dim-2" style={{ marginTop: 3 }}>
            Walk through it any time — works the same for Experiments, Gates, and Configs.
          </div>
        </div>
        <Button variant="secondary" size="sm" onClick={onOpenSetup}>
          Open setup <ArrowRight className="size-3" />
        </Button>
        <Button variant="ghost" size="sm" onClick={onCreate}>
          <Plus className="size-3" /> Register event
        </Button>
      </div>
    </div>
  );
}
