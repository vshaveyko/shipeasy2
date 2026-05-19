// Reusable empty state for first-time app screens.
// Usage: <EmptyState kind="metrics|experiments|gates|killswitches|configs" onStart={...} onDemo={...} />

const EMPTY_CONFIG = {
  metrics: {
    eyebrow: "METRICS",
    eyebrowAside: "not collecting yet",
    title: "Track anything you ship.",
    titleAccent: "in 60 seconds",
    sub: "Auto-collect web vitals, errors, and page loads — then layer your own events with a one-line log() call. No schema migrations. No redeploys.",
    file: "~/your-app · setup.ts",
    code: [
      ["cmt", "// install"],
      ["cmd", "npm install ", ["str", "'@shipeasy/sdk'"]],
      ["blank"],
      ["cmt", "// initialize once"],
      [
        "line",
        ["kw", "import"],
        " { init, log } ",
        ["kw", "from"],
        " ",
        ["str", "'@shipeasy/sdk'"],
        ";",
      ],
      ["line", ["fn", "init"], "({ apiKey: process.env.SHIPEASY_KEY });"],
      ["blank"],
      ["cmt", "// track anything"],
      [
        "line",
        ["fn", "log"],
        "(",
        ["str", "'user_checkout'"],
        ", { amount: ",
        ["num", "129.00"],
        ", plan: ",
        ["str", "'pro'"],
        " });",
        ["cursor"],
      ],
    ],
    stats: [
      { v: "4", l: "auto-collected metrics", d: "web vitals · errors · views · api" },
      { v: "∞", l: "custom events", d: "call log('event_name') anywhere" },
      { v: "<5s", l: "time to first event", d: "paste, run, watch it land" },
    ],
    cta: "Start in 60 seconds",
    demo: "Explore with demo data",
  },

  experiments: {
    eyebrow: "EXPERIMENTS",
    eyebrowAside: "no experiments running",
    title: "Ship the version",
    titleAccent: "that actually wins.",
    sub: "A/B test anything with continuous significance. Wrap your variant in one call — Shipeasy splits traffic, computes lift, and tells you exactly when to ship or kill.",
    file: "~/your-app · checkout.tsx",
    code: [
      ["cmt", "// declare an experiment"],
      [
        "line",
        ["kw", "const"],
        " variant = ",
        ["fn", "experiment"],
        "(",
        ["str", "'checkout_v3'"],
        ", {",
      ],
      ["line", "  variants: [", ["str", "'control'"], ", ", ["str", "'three_step'"], "],"],
      ["line", "  traffic: ", ["num", "0.5"], ","],
      ["line", "  metric: ", ["str", "'revenue_per_visitor'"], ","],
      ["line", "});"],
      ["blank"],
      ["cmt", "// branch on the assignment"],
      ["line", ["kw", "if"], " (variant === ", ["str", "'three_step'"], ") {"],
      ["line", "  ", ["fn", "renderThreeStep"], "();", ["cursor"]],
    ],
    stats: [
      { v: "1", l: "line to start a test", d: "experiment(key, variants)" },
      { v: "24/7", l: "stat-sig calc", d: "continuous monitoring · auto-stop" },
      { v: "0", l: "redeploys to flip", d: "change traffic from the dashboard" },
    ],
    cta: "Create first experiment",
    demo: "See a sample experiment",
  },

  gates: {
    eyebrow: "GATES",
    eyebrowAside: "no gates defined",
    title: "Decide who sees what,",
    titleAccent: "in microseconds.",
    sub: "Flag-checks under 5ms, evaluated edge-side. Built-in gates work out of the box — is_employee, mobile_only, eu_user. Custom gates run your own predicates on request context.",
    file: "~/your-app · render.tsx",
    code: [
      ["cmt", "// check a gate"],
      [
        "line",
        ["kw", "if"],
        " (",
        ["fn", "gate"],
        "(",
        ["str", "'premium_features'"],
        ", user)) {",
      ],
      ["line", "  ", ["fn", "renderProDashboard"], "();"],
      ["line", "}"],
      ["blank"],
      ["cmt", "// or define a custom gate"],
      ["line", ["fn", "defineGate"], "(", ["str", "'high_value_customer'"], ", (ctx) => {"],
      [
        "line",
        "  ",
        ["kw", "return"],
        " ctx.user.ltv > ",
        ["num", "1000"],
        " || ctx.user.plan === ",
        ["str", "'team'"],
        ";",
      ],
      ["line", "});", ["cursor"]],
    ],
    stats: [
      { v: "5", l: "built-in gates", d: "employee · mobile · EU · admin · trial" },
      { v: "<5ms", l: "p50 evaluation", d: "edge-cached, 60+ regions" },
      { v: "0", l: "roundtrip to backend", d: "rules sync via long-poll, evaluated locally" },
    ],
    cta: "Define your first gate",
    demo: "Browse built-in gates",
  },

  killswitches: {
    eyebrow: "KILLSWITCHES",
    eyebrowAside: "nothing to kill — yet",
    title: "Hit the brakes",
    titleAccent: "in under a second.",
    sub: "Instant feature shutoffs with full audit history. Wrap risky code paths in killswitch() — flip the switch in the dashboard and the change propagates to every region in <1s.",
    file: "~/your-app · checkout.ts",
    code: [
      ["cmt", "// guard a risky path"],
      [
        "line",
        ["kw", "if"],
        " (",
        ["fn", "killswitch"],
        "(",
        ["str", "'new_checkout'"],
        ").enabled) {",
      ],
      ["line", "  ", ["kw", "await"], " ", ["fn", "runNewCheckout"], "();"],
      ["line", "} ", ["kw", "else"], " {"],
      ["line", "  ", ["kw", "await"], " ", ["fn", "fallbackCheckout"], "();"],
      ["line", "}"],
      ["blank"],
      ["cmt", "// flip from CLI in an emergency"],
      [
        "line",
        ["kw", "$"],
        " shipeasy kill new_checkout ",
        ["str", '--reason="p95 spike"'],
        ["cursor"],
      ],
    ],
    stats: [
      { v: "<1s", l: "global propagation", d: "edge-cache invalidated everywhere" },
      { v: "∞", l: "audit retention", d: "who flipped what, when, and why" },
      { v: "0", l: "redeploys to recover", d: "undo a bad ship without a rollback" },
    ],
    cta: "Wire your first killswitch",
    demo: "See an example incident",
  },

  configs: {
    eyebrow: "CONFIGS",
    eyebrowAside: "no remote config yet",
    title: "Tune your app",
    titleAccent: "without redeploying.",
    sub: "Versioned, environment-aware key/value configs with type safety. Change a timeout, swap a model, lift a rate-limit — all without touching code or shipping a new build.",
    file: "~/your-app · runtime.ts",
    code: [
      ["cmt", "// read typed configs at runtime"],
      ["line", ["kw", "const"], " { timeout, model, retries } = ", ["fn", "config"], "({"],
      ["line", "  timeout: ", ["num", "30000"], ","],
      ["line", "  model: ", ["str", "'claude-haiku-4-5'"], ","],
      ["line", "  retries: ", ["num", "3"], ","],
      ["line", "});"],
      ["blank"],
      ["cmt", "// values stream in — no restart needed"],
      [
        "line",
        ["fn", "fetch"],
        "(url, { signal: ",
        ["fn", "AbortSignal.timeout"],
        "(timeout) });",
        ["cursor"],
      ],
    ],
    stats: [
      { v: "∞", l: "env overrides", d: "dev · staging · prod · per-region" },
      { v: "0ms", l: "restart to apply", d: "changes stream in over web-socket" },
      { v: "TS", l: "type-checked schemas", d: "caught at build time, not 3am" },
    ],
    cta: "Define your first config",
    demo: "Explore example schema",
  },
};

function renderCodeLine(line, i) {
  const num = i + 1;
  if (line[0] === "blank") {
    return (
      <div key={i}>
        <span className="empty-term-line">{num}</span>
        <span>&nbsp;</span>
      </div>
    );
  }
  const renderTokens = (tokens) =>
    tokens
      .slice(line[0] === "cmt" || line[0] === "cmd" || line[0] === "line" ? 1 : 0)
      .map((t, j) => {
        if (Array.isArray(t)) {
          const [cls, val] = t;
          if (cls === "cursor") return <span key={j} className="cursor" />;
          return (
            <span key={j} className={cls}>
              {val}
            </span>
          );
        }
        return <span key={j}>{t}</span>;
      });
  if (line[0] === "cmt") {
    return (
      <div key={i}>
        <span className="empty-term-line">{num}</span>
        <span>
          <span className="cmt">{line[1]}</span>
        </span>
      </div>
    );
  }
  if (line[0] === "cmd") {
    return (
      <div key={i}>
        <span className="empty-term-line">{num}</span>
        <span>
          {line.slice(1).map((t, j) =>
            Array.isArray(t) ? (
              <span key={j} className={t[0]}>
                {t[1]}
              </span>
            ) : (
              <span key={j}>{t}</span>
            ),
          )}
        </span>
      </div>
    );
  }
  // 'line'
  return (
    <div key={i}>
      <span className="empty-term-line">{num}</span>
      <span>
        {line.slice(1).map((t, j) => {
          if (Array.isArray(t)) {
            const [cls, val] = t;
            if (cls === "cursor") return <span key={j} className="cursor" />;
            return (
              <span key={j} className={cls}>
                {val}
              </span>
            );
          }
          return <span key={j}>{t}</span>;
        })}
      </span>
    </div>
  );
}

function EmptyState({ kind = "metrics", onStart, onDemo }) {
  const c = EMPTY_CONFIG[kind] || EMPTY_CONFIG.metrics;

  return (
    <div className="empty-stage">
      {/* animated bg grid */}
      <div className="empty-grid">
        <svg width="100%" height="100%" preserveAspectRatio="none" viewBox="0 0 1200 600">
          <defs>
            <pattern id={`empGrid-${kind}`} width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M40 0 L0 0 0 40" fill="none" stroke="var(--line)" strokeWidth="0.5" />
            </pattern>
            <radialGradient id={`empGlow-${kind}`} cx="50%" cy="40%" r="50%">
              <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.18" />
              <stop offset="60%" stopColor="var(--accent)" stopOpacity="0.04" />
              <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
            </radialGradient>
          </defs>
          <rect width="100%" height="100%" fill={`url(#empGrid-${kind})`} />
          <rect width="100%" height="100%" fill={`url(#empGlow-${kind})`} />
        </svg>
        {/* sparkline scatter */}
        <svg
          className="empty-scatter"
          width="100%"
          height="100%"
          preserveAspectRatio="none"
          viewBox="0 0 1200 600"
        >
          <polyline
            points="60,420 140,400 220,380 300,360 380,330 460,340 540,320 620,290 700,300 780,260 860,240 940,220 1020,180 1100,160 1140,140"
            fill="none"
            stroke="var(--accent)"
            strokeWidth="1.5"
            strokeOpacity=".55"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <polyline
            points="60,500 140,490 220,470 300,475 380,455 460,460 540,440 620,430 700,420 780,400 860,395 940,380 1020,370 1100,355 1140,340"
            fill="none"
            stroke="var(--info)"
            strokeWidth="1.5"
            strokeOpacity=".4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      <div className="empty-content">
        <div className="empty-eyebrow">
          <span className="dot" />
          <span>{c.eyebrow}</span>
          <span className="dim-3">·</span>
          <span style={{ color: "var(--fg-3)" }}>{c.eyebrowAside}</span>
        </div>

        <h1 className="empty-title">
          <span>{c.title}</span>
          <span className="t-serif" style={{ color: "var(--accent)" }}>
            {c.titleAccent}
          </span>
        </h1>
        <p className="empty-sub">{c.sub}</p>

        {/* fake terminal preview */}
        <div className="empty-terminal">
          <div className="empty-term-head">
            <span className="dot r" />
            <span className="dot y" />
            <span className="dot g" />
            <span className="t-mono-xs dim-2" style={{ marginLeft: 8 }}>
              {c.file}
            </span>
          </div>
          <div className="empty-term-body">{c.code.map(renderCodeLine)}</div>
        </div>

        <div className="empty-cta">
          <button className="btn btn-primary btn-lg" onClick={onStart}>
            <IconZap size={13} /> {c.cta}
          </button>
          <button className="btn btn-ghost btn-lg" onClick={onDemo}>
            {c.demo} <IconArrowRight size={12} />
          </button>
        </div>

        <div className="empty-stats">
          {c.stats.map((s, i) => (
            <div key={i} className="empty-stat">
              <div className="v">{s.v}</div>
              <div className="l">{s.l}</div>
              <div className="d">{s.d}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { EmptyState });
