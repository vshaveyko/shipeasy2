// Shipeasy — Home / Cockpit page components.
// Loaded by home.html after icons/shell/onboarding.

const { useState: useS, useEffect: useE, useMemo: useM } = React;

// ── Data ────────────────────────────────────────────────────────

const DECISIONS = [
  {
    id: "checkout_v3",
    kind: "experiment",
    verdict: "ship",
    title: "checkout_v3",
    tag: "revenue",
    desc: "Three-step checkout is winning. 99.2% significance · target window reached.",
    stats: [
      { k: "PRIMARY LIFT", v: "+8.4%", acc: true, d: "revenue / visitor" },
      { k: "SIGNIFICANCE", v: "99.2%", d: "p < 0.008" },
      { k: "SAMPLE", v: "14.2k", d: "min 12k · ✓" },
    ],
    ci: { low: 5.6, high: 11.2, mean: 8.4 },
    meta: "live 6 days · owned by Maya P. · primary: revenue_per_visitor",
  },
  {
    id: "welcome_email_5min",
    kind: "experiment",
    verdict: "extend",
    title: "welcome_email_5min",
    tag: "activation",
    desc: "Trending up but not yet conclusive. 4 more days at current traffic to clear 95%.",
    stats: [
      { k: "PRIMARY LIFT", v: "+6.8%", acc: true, d: "d1 activation" },
      { k: "SIGNIFICANCE", v: "86.0%", d: "need 95%" },
      { k: "SAMPLE", v: "4.8k", d: "+800/day" },
    ],
    ci: { low: -1.2, high: 9.4, mean: 6.8 },
    meta: "live 3 days · owned by Jiwoo H. · projected sig: Fri 4pm",
  },
];

const ALERT_ITEMS = [
  {
    sev: "danger",
    ln: (
      <>
        <b>p99 api_latency</b> exceeded 850ms SLA · acme-api · 22m ago
      </>
    ),
    meta: "rule: p99_api_latency > 800ms · breach #3 today",
    when: "22m",
  },
  {
    sev: "warn",
    ln: (
      <>
        Killswitch <b>new_checkout</b> auto-armed by error spike
      </>
    ),
    meta: "errors 0.04% → 0.31% · cooldown 15min",
    when: "1h",
  },
  {
    sev: "warn",
    ln: (
      <>
        Gate <b>premium_features</b> failed predicate on 142 evals
      </>
    ),
    meta: "TypeError in custom rule · auto-disabled",
    when: "2h",
  },
];

const LIVE_EXPERIMENTS = [
  {
    id: "recommendations_ranker",
    kind: "exp",
    icon: <IconFlask size={12} />,
    desc: "ML ranker v4 vs v3",
    lift: +11.2,
    status: "live",
    spark: [18, 22, 28, 34, 40, 48, 56, 62, 70, 78, 85, 94],
    meta: "30% traffic · 22.7k",
    owner: ["J", "#00d08a"],
  },
  {
    id: "pricing_page_headline",
    kind: "exp",
    icon: <IconFlask size={12} />,
    desc: "Benefit vs feature headline",
    lift: +2.1,
    status: "live",
    spark: [50, 51, 52, 51, 52, 53, 52, 54, 53, 55, 54, 56],
    meta: "100% · 38.1k",
    owner: ["K", "#ff8445"],
  },
  {
    id: "onboarding_wizard_v2",
    kind: "exp",
    icon: <IconFlask size={12} />,
    desc: "Personalized vs generic flow",
    lift: -1.2,
    status: "paused",
    spark: [40, 42, 39, 40, 38, 38, 37, 36, 35, 34, 33, 32],
    meta: "10% · 1.1k",
    owner: ["R", "#3b82f6"],
    neg: true,
  },
  {
    id: "premium_features",
    kind: "gate",
    icon: <IconShield size={12} />,
    desc: "Pro / team tier features",
    pass: "12.4%",
    status: "live",
    spark: [10, 11, 12, 12, 13, 12, 12, 13, 13, 12, 13, 12],
    meta: "8.2k evals/min · 4.8ms p50",
    owner: ["M", "#7c5cff"],
  },
  {
    id: "new_checkout",
    kind: "kill",
    icon: <IconPower size={12} />,
    desc: "Killswitch · checkout v3 path",
    state: "armed",
    status: "live",
    spark: [100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100],
    meta: "armed 22m ago · auto-trigger",
    owner: ["—", "#7a7a82"],
  },
  {
    id: "paywall_message",
    kind: "cfg",
    icon: <IconSliders size={12} />,
    desc: 'String · "Upgrade to Pro"',
    val: "v.18",
    status: "live",
    spark: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1.06],
    meta: "edited 4h ago · 100% prod",
    owner: ["K", "#ff8445"],
  },
];

const ACTIVITY = [
  {
    when: "just now",
    icon: <IconRocket size={11} />,
    kind: "acc",
    ln: (
      <>
        <b>recommendations_ranker</b> reached 99.8% significance ·{" "}
        <span className="t-mono">+11.2%</span> lift
      </>
    ),
    meta: "experiment · auto-flagged · ready to ship",
    by: ["M", "#7c5cff"],
  },
  {
    when: "14m ago",
    icon: <IconAlertTriangle size={11} />,
    kind: "dng",
    ln: (
      <>
        SLA breach · <b>p99_api_latency</b> 870ms (limit 800ms)
      </>
    ),
    meta: "metric · 3rd breach today",
    by: ["S", "#7a7a82"],
  },
  {
    when: "1h ago",
    icon: <IconShield size={11} />,
    kind: "inf",
    ln: (
      <>
        Gate <b>premium_features</b> rule edited — added{" "}
        <span className="t-mono">ctx.user.ltv &gt; 1000</span>
      </>
    ),
    meta: "gate · v6 → v7",
    by: ["M", "#7c5cff"],
  },
  {
    when: "2h ago",
    icon: <IconPower size={11} />,
    kind: "wrn",
    ln: (
      <>
        Killswitch <b>new_checkout</b> armed automatically (error rate &gt; 0.25%)
      </>
    ),
    meta: "killswitch · cooldown 15min",
    by: ["—", "#7a7a82"],
  },
  {
    when: "3h ago",
    icon: <IconPlus size={11} />,
    kind: "acc",
    ln: (
      <>
        Created experiment <b>dashboard_v2</b> · 2 variants · 10% traffic
      </>
    ),
    meta: "experiment · draft",
    by: ["R", "#3b82f6"],
  },
  {
    when: "5h ago",
    icon: <IconCheck size={11} />,
    kind: "inf",
    ln: (
      <>
        Shipped winner of <b>search_typo_tolerance</b> · <span className="t-mono">+4.7%</span>{" "}
        permanent
      </>
    ),
    meta: "experiment · completed · rollout 100%",
    by: ["K", "#ff8445"],
  },
  {
    when: "yesterday",
    icon: <IconUsers size={11} />,
    kind: "inf",
    ln: (
      <>
        <b>Priya Shah</b> joined the workspace as <span className="t-mono">editor</span>
      </>
    ),
    meta: "team · invited by Maya",
    by: ["P", "#22a06b"],
  },
];

const PINNED = [
  {
    id: "employee_only",
    kind: <IconShield size={11} />,
    lbl: "employee_only",
    meta: "gate · built-in",
    val: "14.3k evals/h",
  },
  {
    id: "p99_api_latency",
    kind: <IconChart size={11} />,
    lbl: "p99_api_latency",
    meta: "metric · SLA: 800ms",
    val: "872ms",
  },
  {
    id: "rate_limits",
    kind: <IconSliders size={11} />,
    lbl: "rate_limits.checkout",
    meta: "config · int · v.42",
    val: "120 req/s",
  },
  {
    id: "mobile_only",
    kind: <IconShield size={11} />,
    lbl: "mobile_only",
    meta: "gate · built-in",
    val: "9.1k evals/h",
  },
];

// ── Onboarding checklist (first-run) ──────────────────────────
const ONB_STEPS = [
  {
    k: "install",
    title: "Install the SDK",
    desc: "One package, one init() call. We'll detect your framework and tailor the snippet.",
    done: true,
    est: "2 min",
    action: "View install",
    icon: <IconCode size={12} />,
  },
  {
    k: "init",
    title: "Initialize in your bootstrap",
    desc: "Drop init() in your app entry. Auto-collection turns on Web Vitals, errors, and page views.",
    done: true,
    est: "1 min",
    action: "View snippet",
    icon: <IconZap size={12} />,
  },
  {
    k: "event",
    title: "Send your first event",
    desc: "Call log('event_name') anywhere. We'll show it land in the inspector — usually under 5 seconds.",
    done: false,
    cur: true,
    est: "30 sec",
    action: "Send now",
    icon: <IconActivity size={12} />,
  },
  {
    k: "experiment",
    title: "Create your first experiment",
    desc: "Pick a hypothesis, point at a metric. We split traffic, compute lift, and tell you when to ship.",
    done: false,
    est: "3 min",
    action: "New experiment",
    icon: <IconFlask size={12} />,
  },
  {
    k: "gate",
    title: "Wrap a feature in a gate",
    desc: "Five built-in gates (employee · mobile · EU · admin · trial) work right away. Or write a custom predicate.",
    done: false,
    est: "2 min",
    action: "Browse gates",
    icon: <IconShield size={12} />,
  },
  {
    k: "team",
    title: "Invite the team",
    desc: "Bring in editors and viewers. Shipeasy keeps an audit trail of every change.",
    done: false,
    est: "1 min",
    action: "Send invites",
    icon: <IconUsers size={12} />,
  },
];

// ── Small components ──────────────────────────────────────────

function Sparkline({ data, neg = false, color, h = 22 }) {
  const w = 100;
  const min = Math.min(...data),
    max = Math.max(...data);
  const range = max - min || 1;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - ((v - min) / range) * (h - 2) - 1;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const stroke = color || (neg ? "var(--danger)" : "var(--accent)");
  const fill = color
    ? `color-mix(in oklab, ${color} 22%, transparent)`
    : neg
      ? "color-mix(in oklab, var(--danger) 18%, transparent)"
      : "color-mix(in oklab, var(--accent) 18%, transparent)";
  return (
    <svg className="spk" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
      <polyline points={`0,${h} ${pts.join(" ")} ${w},${h}`} fill={fill} stroke="none" />
      <polyline
        points={pts.join(" ")}
        fill="none"
        stroke={stroke}
        strokeWidth="1.4"
        strokeLinejoin="round"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

function HealthRing({ value, max = 100, label, k, d, color = "var(--accent)", danger = false }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  const c = 2 * Math.PI * 18;
  const dash = (pct / 100) * c;
  const stroke = danger ? "var(--danger)" : color;
  return (
    <div className="ring-card">
      <div className="ring">
        <svg width="46" height="46" viewBox="0 0 46 46">
          <circle cx="23" cy="23" r="18" fill="none" stroke="var(--bg-3)" strokeWidth="4" />
          <circle
            cx="23"
            cy="23"
            r="18"
            fill="none"
            stroke={stroke}
            strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray={`${dash} ${c - dash}`}
          />
        </svg>
        <div className="v" style={{ color: stroke }}>
          {Math.round(pct)}
          <span style={{ fontSize: 8, opacity: 0.6 }}>%</span>
        </div>
      </div>
      <div className="meta">
        <div className="k">{k}</div>
        <div className="l">{label}</div>
        <div className="d">{d}</div>
      </div>
    </div>
  );
}

function CIbar({ low, high, mean, neg = false }) {
  // Scale: assume ±20%
  const SCALE = 20;
  const toPct = (v) => 50 + (v / SCALE) * 50;
  return (
    <div className="ci-bar">
      <div className="ci-bar-track" />
      <div className="ci-bar-zero" />
      <div
        className={`ci-bar-range ${neg ? "neg" : ""}`}
        style={{ left: `${toPct(low)}%`, right: `${100 - toPct(high)}%` }}
      />
      <div className={`ci-bar-mean ${neg ? "neg" : ""}`} style={{ left: `${toPct(mean)}%` }} />
      <div className="ci-bar-lbl" style={{ left: `${toPct(low)}%` }}>
        {low > 0 ? "+" : ""}
        {low.toFixed(1)}%
      </div>
      <div className="ci-bar-lbl" style={{ left: `${toPct(high)}%` }}>
        {high > 0 ? "+" : ""}
        {high.toFixed(1)}%
      </div>
      <div className="ci-bar-lbl" style={{ left: "50%", color: "var(--fg-4)" }}>
        0
      </div>
    </div>
  );
}

// ── Hero ──────────────────────────────────────────────────────

function Hero({ mode, name = "Maya" }) {
  // hero copy varies by mode
  let eyebrow, title, sub, stats;
  if (mode === "first-run") {
    eyebrow = (
      <>
        <span className="day">Tuesday · May 14</span>
        <span style={{ color: "var(--fg-4)" }}>·</span>
        <span>New workspace — let's wire it up</span>
      </>
    );
    title = (
      <>
        Welcome to <em>acme-web</em>. <span className="accent">Three minutes</span> to live data.
      </>
    );
    sub =
      "Install the SDK, fire a test event, and Shipeasy starts collecting vitals, errors, and your own logs immediately. Everything else — experiments, gates, killswitches — works as soon as init() runs.";
    stats = [
      { k: "SETUP", v: "2", unit: "of 6", d: "33% · 4 steps left" },
      { k: "EVENTS", v: "0", d: "waiting…", accent: false },
      { k: "TEAM", v: "1", unit: "· you", d: "invite to enable reviews" },
      { k: "STATUS", v: "⏵", unit: "ready", d: "just needs a first event" },
    ];
  } else if (mode === "day-1") {
    eyebrow = (
      <>
        <span className="day">Tuesday · May 14 · 9:42</span>
        <span style={{ color: "var(--fg-4)" }}>·</span>
        <span className="live">LIVE · 4.2k events/min</span>
      </>
    );
    title = (
      <>
        Good morning, <em>{name}</em>. <span className="accent">Quiet day</span> — nothing on fire.
      </>
    );
    sub =
      "Two experiments are still gathering samples; one passed significance overnight and is waiting on your call. Killswitches green, gates green, p99 within SLA.";
    stats = [
      { k: "DECISIONS", v: "1", unit: "waiting", accent: true, d: "checkout_v3 ready" },
      { k: "LIVE", v: "6", unit: "exp · 12 gates", d: "+2 since yesterday" },
      { k: "EVENTS · 24H", v: "14.3", unit: "M", d: "+8.4% wow" },
      { k: "P99 · API", v: "612", unit: "ms", d: "SLA 800ms · ok" },
    ];
  } else {
    eyebrow = (
      <>
        <span className="day">Tuesday · May 14 · 9:42</span>
        <span style={{ color: "var(--fg-4)" }}>·</span>
        <span className="live">LIVE · 5.8k events/min</span>
        <span style={{ color: "var(--fg-4)" }}>·</span>
        <span style={{ color: "var(--warn)" }}>⚠ 3 alerts</span>
      </>
    );
    title = (
      <>
        Morning, <em>{name}</em>. <span className="accent">Two decisions</span> + one SLA breach.
      </>
    );
    sub =
      "checkout_v3 hit significance overnight. welcome_email_5min trending up, projected to clear by Friday. p99 api_latency has breached SLA three times since 8am — auto-armed killswitch is holding for now.";
    stats = [
      { k: "DECISIONS", v: "2", unit: "waiting", accent: true, d: "1 ship · 1 extend" },
      { k: "ALERTS", v: "3", warn: true, d: "1 critical · 2 warn" },
      { k: "EVENTS · 24H", v: "18.7", unit: "M", d: "+14% wow" },
      { k: "P99 · API", v: "872", unit: "ms", danger: true, d: "⚠ SLA 800ms · breached" },
    ];
  }

  return (
    <div className="home-hero">
      <div className="home-hero-grid">
        <div className="home-greeting">
          <div className="home-eyebrow">{eyebrow}</div>
          <h1 className="home-h1">{title}</h1>
          <p className="home-sub">{sub}</p>
        </div>
        <div className="home-hero-stats">
          {stats.map((s, i) => (
            <div
              key={i}
              className={`home-stat ${s.accent ? "accent" : ""}${s.warn ? " warn" : ""}${s.danger ? " danger" : ""}`}
            >
              <div className="k">{s.k}</div>
              <div className="v">
                <span className="num">{s.v}</span>
                {s.unit && <span className="unit">{s.unit}</span>}
              </div>
              <div className="d">{s.d}</div>
            </div>
          ))}
        </div>
      </div>

      {mode !== "first-run" && <PulseStrip busy={mode === "busy"} />}
    </div>
  );
}

// Timeline showing today's events along a 24-hour axis
function PulseStrip({ busy }) {
  // Each event has left% and width%
  const events = [
    // exp bars (long-running)
    { type: "bar", cls: "exp", left: 5, width: 40, lbl: "checkout_v3" },
    { type: "bar", cls: "exp", left: 18, width: 25, lbl: "welcome_email_5min" },
    { type: "bar", cls: "exp", left: 30, width: 18, lbl: "recommendations_ranker" },
    // pings
    { type: "evt", cls: "deploy", left: 8, lbl: "deploy · acme-web @ v0.9.4" },
    { type: "evt", cls: "exp", left: 28, lbl: "checkout_v3 → sig 99.2%" },
    { type: "evt", cls: "deploy", left: 32, lbl: "config edit · rate_limits" },
    ...(busy
      ? [
          { type: "evt", cls: "alert", left: 33, lbl: "p99 breach · 870ms" },
          { type: "evt", cls: "alert", left: 38, lbl: "p99 breach · 851ms" },
          { type: "evt", cls: "alert", left: 40.5, lbl: "killswitch armed" },
        ]
      : []),
  ];

  const HOURS = [0, 4, 8, 12, 16, 20, 24];
  const NOW_PCT = 41; // 9:42 of 24h ≈ 40.5%

  return (
    <div className="home-pulse">
      <div className="home-pulse-head">
        <span className="t-caps">Today · 24-hour pulse</span>
        <span className="legend">
          <span>
            <i style={{ background: "color-mix(in oklab, var(--accent) 35%, transparent)" }} />
            Experiments
          </span>
          <span>
            <i style={{ background: "var(--info)" }} />
            Deploys / edits
          </span>
          <span>
            <i style={{ background: "var(--danger)" }} />
            Alerts
          </span>
        </span>
      </div>
      <div className="home-pulse-body">
        {events.map((e, i) => {
          if (e.type === "bar") {
            return (
              <div
                key={i}
                className={`home-pulse-bar ${e.cls}`}
                style={{ left: `${e.left}%`, width: `${e.width}%` }}
                title={e.lbl}
              />
            );
          }
          return (
            <div key={i} className={`home-pulse-event ${e.cls}`} style={{ left: `${e.left}%` }}>
              <span className="dot" />
              {e.lbl}
            </div>
          );
        })}
        <div className="home-pulse-now" style={{ left: `${NOW_PCT}%` }}>
          <div className="home-pulse-now-lbl">now · 9:42</div>
        </div>
        {HOURS.map((h, i) => (
          <div key={h} className="home-pulse-hour" style={{ left: `${(h / 24) * 100}%` }}>
            {h.toString().padStart(2, "0")}:00
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Decision card ─────────────────────────────────────────────

function DecisionCard({ d }) {
  const cls = d.verdict === "ship" ? "" : d.verdict === "extend" ? "info" : "warn";
  return (
    <div className={`dec-card ${cls}`}>
      <div className="dec-head">
        <div style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 0, flex: 1 }}>
          <div className="dec-tag">
            {d.verdict === "ship"
              ? "⏵ READY TO SHIP"
              : d.verdict === "extend"
                ? "◷ RUN LONGER"
                : "⚠ NEEDS REVIEW"}
            <span style={{ marginLeft: 8, color: "var(--fg-4)" }}>· experiment</span>
          </div>
          <h3>
            <span className="t-mono" style={{ fontSize: 14, letterSpacing: 0 }}>
              {d.title}
            </span>
            <span className="tag" style={{ fontSize: 10.5, padding: "1px 6px" }}>
              {d.tag}
            </span>
          </h3>
          <p className="desc">{d.desc}</p>
        </div>
      </div>

      <div className="dec-stats">
        {d.stats.map((s, i) => (
          <div key={i} className="dec-stat">
            <div className="k">{s.k}</div>
            <div className={`v ${s.acc ? "acc" : ""}${s.dng ? "dng" : ""} num`}>{s.v}</div>
            <div className="d">{s.d}</div>
          </div>
        ))}
      </div>

      <CIbar low={d.ci.low} high={d.ci.high} mean={d.ci.mean} />

      <div className="dec-foot">
        <div className="meta">{d.meta}</div>
        {d.verdict === "ship" ? (
          <>
            <button className="btn btn-ghost btn-sm">View results</button>
            <button className="btn btn-secondary btn-sm">Extend</button>
            <button className="btn btn-primary btn-sm">
              <IconRocket size={11} /> Ship winner
            </button>
          </>
        ) : d.verdict === "extend" ? (
          <>
            <button className="btn btn-ghost btn-sm">Investigate</button>
            <button className="btn btn-primary btn-sm">
              <IconCheck size={11} /> Keep running
            </button>
          </>
        ) : (
          <>
            <button className="btn btn-danger btn-sm">
              <IconStop size={11} /> Kill
            </button>
            <button className="btn btn-primary btn-sm">Investigate</button>
          </>
        )}
      </div>
    </div>
  );
}

// ── Live tiles ────────────────────────────────────────────────

function KindIcon({ kind }) {
  if (kind === "exp") return <IconFlask size={12} />;
  if (kind === "gate") return <IconShield size={12} />;
  if (kind === "kill") return <IconPower size={12} />;
  if (kind === "cfg") return <IconSliders size={12} />;
  if (kind === "met") return <IconChart size={12} />;
  return null;
}

function LiveTile({ r }) {
  const stCol =
    r.status === "live" ? "var(--accent)" : r.status === "paused" ? "var(--warn)" : "var(--fg-3)";
  return (
    <div className="tile">
      <div className="tile-head">
        <div className="ic">
          <KindIcon kind={r.kind} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="tile-name t-mono">{r.id}</div>
          <div className="tile-key">{r.desc}</div>
        </div>
        <span
          style={{
            width: 6,
            height: 6,
            borderRadius: "50%",
            background: stCol,
            marginTop: 6,
            flexShrink: 0,
            boxShadow:
              r.status === "live"
                ? `0 0 0 3px color-mix(in oklab, ${stCol} 22%, transparent)`
                : "none",
          }}
        />
      </div>
      <div className="tile-mid">
        <div
          className={`tile-num ${
            r.lift != null
              ? r.lift > 0
                ? "acc"
                : "dng"
              : r.pass
                ? "acc"
                : r.state === "armed"
                  ? "neu"
                  : "neu"
          }`}
        >
          {r.lift != null
            ? (r.lift > 0 ? "+" : "") + r.lift.toFixed(1) + "%"
            : r.pass
              ? r.pass
              : r.val
                ? r.val
                : r.state === "armed"
                  ? "ARMED"
                  : "—"}
        </div>
        <div className="tile-spark">
          <Sparkline data={r.spark} neg={r.neg} />
        </div>
      </div>
      <div className="tile-foot">
        <span
          style={{
            flex: 1,
            minWidth: 0,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {r.meta}
        </span>
        <span
          className="av"
          style={{ background: r.owner[1], color: r.owner[1] === "#00d08a" ? "#07120d" : "#fff" }}
        >
          {r.owner[0]}
        </span>
      </div>
    </div>
  );
}

// ── Onboarding checklist ──────────────────────────────────────

function OnboardingChecklist() {
  const done = ONB_STEPS.filter((s) => s.done).length;
  const total = ONB_STEPS.length;
  const pct = (done / total) * 100;
  return (
    <div className="onb">
      <div className="onb-head">
        <div className="l">
          <h2>
            <span
              style={{
                width: 24,
                height: 24,
                borderRadius: 6,
                background:
                  "conic-gradient(from 140deg, var(--accent), var(--bg) 40%, var(--accent) 80%)",
                boxShadow: "0 0 0 1px var(--line-2)",
              }}
            />
            Get your workspace live
          </h2>
          <p>
            Two minutes left. The dashboard below activates as each step completes — try them in any
            order.
          </p>
        </div>
        <div className="onb-prog">
          <div className="lbl">
            <b>{done}</b> of {total} complete · ~3 min remaining
          </div>
          <div className="bar">
            <span style={{ width: `${pct}%` }} />
          </div>
        </div>
      </div>

      <div className="onb-body">
        <div className="onb-steps">
          {ONB_STEPS.map((s, i) => (
            <div key={s.k} className={`onb-step ${s.done ? "done" : ""} ${s.cur ? "cur" : ""}`}>
              <div className="nm">{s.done ? <IconCheck size={12} /> : i + 1}</div>
              <div className="body">
                <h3>
                  {s.icon} {s.title}
                </h3>
                <p>{s.desc}</p>
                <span className="est">
                  <IconClock size={9} /> {s.est}
                </span>
              </div>
              <div className="act">
                {s.done ? (
                  <button className="btn btn-ghost btn-sm" style={{ color: "var(--accent)" }}>
                    Done
                  </button>
                ) : s.cur ? (
                  <button className="btn btn-primary btn-sm">
                    {s.action} <IconArrowRight size={10} />
                  </button>
                ) : (
                  <button className="btn btn-secondary btn-sm">{s.action}</button>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="onb-preview">
          <div className="pt">Current step · 03 of 06</div>
          <h3>Send your first event</h3>
          <p style={{ margin: 0, fontSize: 13, color: "var(--fg-2)", lineHeight: 1.55 }}>
            Drop this anywhere in your code — a button handler, a route, a script. We'll detect it
            land in the inspector, usually under 5 seconds.
          </p>
          <div className="code">
            <span className="cmt">{"// any file, any time"}</span>
            {"\n"}
            <span className="kw">import</span>
            {" { log } "}
            <span className="kw">from</span> <span className="str">'@shipeasy/sdk'</span>
            {";"}
            {"\n\n"}
            <span className="fn">log</span>(<span className="str">'hello_shipeasy'</span>,{" "}
            {"{ source: "}
            <span className="str">'home'</span> {"}"});
          </div>
          <div
            style={{
              display: "flex",
              gap: 8,
              alignItems: "center",
              padding: "10px 12px",
              background: "var(--bg-2)",
              border: "1px dashed var(--line-2)",
              borderRadius: "var(--r-md)",
            }}
          >
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: "var(--warn)",
                animation: "blink 1s infinite",
              }}
            />
            <span style={{ fontSize: 12.5, color: "var(--fg)" }}>
              Listening for your first event…
            </span>
            <button className="btn btn-ghost btn-sm" style={{ marginLeft: "auto" }}>
              <IconCpu size={10} /> Simulate
            </button>
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
            <a className="t-mono-xs" style={{ color: "var(--accent)", cursor: "default" }}>
              View install guide →
            </a>
            <span className="t-mono-xs" style={{ color: "var(--fg-4)" }}>
              ·
            </span>
            <a className="t-mono-xs" style={{ color: "var(--fg-3)", cursor: "default" }}>
              <IconSparkles size={10} style={{ verticalAlign: -1 }} /> Ask Claude to do this for me
            </a>
          </div>
        </div>
      </div>

      <div className="onb-foot">
        <div className="l">
          <IconInfo size={12} style={{ color: "var(--info)" }} />
          New here? <a>Watch the 2-minute tour</a> · <a>Browse demo workspace</a>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          <button className="btn btn-ghost btn-sm">Hide checklist</button>
          <button className="btn btn-secondary btn-sm">
            <IconSparkles size={11} /> Ask Claude to set this up
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Rail components ───────────────────────────────────────────

function HealthRingsCard({ mode }) {
  const busy = mode === "busy";
  return (
    <div className="rail-card">
      <div className="rail-card-head">
        <IconActivity size={12} />
        <h3>System health</h3>
        <span className="aside">live · 5s</span>
      </div>
      <div className="rail-card-body">
        <div className="rings">
          <HealthRing
            value={busy ? 98 : 99.6}
            max={100}
            k="UPTIME · 24h"
            label={busy ? "98.0%" : "99.96%"}
            d={busy ? "2 dips" : "no incidents"}
          />
          <HealthRing
            value={busy ? 42 : 88}
            max={100}
            k="P99 BUDGET"
            label={busy ? "42% left" : "88% left"}
            d={busy ? "872ms / 800ms" : "612ms / 800ms"}
            danger={busy}
          />
          <HealthRing
            value={busy ? 72 : 96}
            max={100}
            k="ERROR · 7d"
            label={busy ? "0.31%" : "0.04%"}
            d={busy ? "auto-armed" : "within budget"}
            danger={busy}
            color="var(--info)"
          />
          <HealthRing
            value={94}
            max={100}
            k="LCP · WEB"
            label={"2.1s"}
            d="74% pass · good"
            color="var(--info)"
          />
        </div>
      </div>
    </div>
  );
}

function AlertsCard({ mode }) {
  const list = mode === "busy" ? ALERT_ITEMS : ALERT_ITEMS.slice(2);
  return (
    <div className="rail-card">
      <div className="rail-card-head">
        <IconAlertTriangle
          size={12}
          style={{ color: mode === "busy" ? "var(--danger)" : "var(--fg-3)" }}
        />
        <h3>Alerts</h3>
        <span className="aside">{mode === "busy" ? "3 active" : "1 active"}</span>
      </div>
      {list.length === 0 ? (
        <div style={{ padding: "24px 16px", textAlign: "center", color: "var(--fg-3)" }}>
          <IconCheckCircle size={20} style={{ color: "var(--accent)", marginBottom: 8 }} />
          <div style={{ fontSize: 12.5 }}>All clear · no alerts</div>
        </div>
      ) : (
        list.map((a, i) => (
          <div key={i} className={`alert-row ${a.sev}`}>
            <span className="sev" />
            <div className="body">
              <div className="ln">{a.ln}</div>
              <div className="meta">{a.meta}</div>
            </div>
            <div className="when">{a.when}</div>
          </div>
        ))
      )}
    </div>
  );
}

function PinnedCard() {
  return (
    <div className="rail-card">
      <div className="rail-card-head">
        <IconHash size={12} />
        <h3>Pinned by team</h3>
        <span className="aside">{PINNED.length}</span>
      </div>
      {PINNED.map((p) => (
        <div key={p.id} className="pin-row">
          <div className="ic">{p.kind}</div>
          <div className="body">
            <div className="ln t-mono" style={{ fontSize: 12.5 }}>
              {p.lbl}
            </div>
            <div className="meta">{p.meta}</div>
          </div>
          <div className="val">{p.val}</div>
        </div>
      ))}
    </div>
  );
}

function ClaudeTile() {
  return (
    <div className="claude-tile">
      <h3>
        <IconSparkles size={14} style={{ color: "var(--accent)" }} /> Ask Claude
      </h3>
      <p>
        Natural language across every record. Claude reads your gates, configs, and experiment
        results.
      </p>
      <div className="claude-prompts">
        <div className="claude-prompt">
          <IconChart size={11} className="ic" />
          What's the top revenue driver this week?
        </div>
        <div className="claude-prompt">
          <IconShield size={11} className="ic" />
          Find every gate touching billing
        </div>
        <div className="claude-prompt">
          <IconRocket size={11} className="ic" />
          Draft a rollout plan for recommendations_ranker
        </div>
      </div>
    </div>
  );
}

// ── Quick create launchpad ────────────────────────────────────

const LAUNCH = [
  { ic: <IconFlask size={14} />, t: "New experiment", d: "A/B test with stat-sig calc", kbd: "E" },
  { ic: <IconShield size={14} />, t: "New gate", d: "Feature flag with targeting", kbd: "G" },
  { ic: <IconPower size={14} />, t: "New killswitch", d: "Emergency feature shutoff", kbd: "K" },
  { ic: <IconSliders size={14} />, t: "New config", d: "Versioned typed value", kbd: "C" },
  { ic: <IconChart size={14} />, t: "New metric", d: "Custom event or KPI", kbd: "M" },
  { ic: <IconUsers size={14} />, t: "Invite teammate", d: "Editor or viewer", kbd: "I" },
  { ic: <IconKey size={14} />, t: "API key", d: "For server or CI", kbd: "A" },
  { ic: <IconBook size={14} />, t: "Browse docs", d: "Setup, recipes, SDK ref", kbd: "?" },
];

function Launchpad() {
  return (
    <div className="launch">
      {LAUNCH.map((l, i) => (
        <div key={i} className="launch-card">
          <div className="ic">{l.ic}</div>
          <h4>{l.t}</h4>
          <p>{l.d}</p>
          <span className="kbd-tag kbd-tag-pos kbd-tag">{l.kbd}</span>
        </div>
      ))}
    </div>
  );
}

// ── Stream ────────────────────────────────────────────────────

function ActivityStream() {
  return (
    <div className="stream">
      {ACTIVITY.map((a, i) => (
        <div key={i} className="stream-row">
          <span className="when">{a.when}</span>
          <span className={`ic ${a.kind}`}>{a.icon}</span>
          <div className="body">
            <div className="ln">{a.ln}</div>
            <div className="meta">{a.meta}</div>
          </div>
          <div className="by">
            <span
              className="av"
              style={{ background: a.by[1], color: a.by[1] === "#00d08a" ? "#07120d" : "#fff" }}
            >
              {a.by[0]}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Exports ───────────────────────────────────────────────────
Object.assign(window, {
  DECISIONS,
  ALERT_ITEMS,
  LIVE_EXPERIMENTS,
  ACTIVITY,
  PINNED,
  ONB_STEPS,
  LAUNCH,
  Sparkline,
  HealthRing,
  CIbar,
  Hero,
  PulseStrip,
  DecisionCard,
  KindIcon,
  LiveTile,
  OnboardingChecklist,
  HealthRingsCard,
  AlertsCard,
  PinnedCard,
  ClaudeTile,
  Launchpad,
  ActivityStream,
});
