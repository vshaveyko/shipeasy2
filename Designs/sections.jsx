// Sections below the hero — with interactive feature tabs + scroll reveals.

// Reveal hook: toggles `.in` class when element enters viewport
function useReveal() {
  React.useEffect(() => {
    const els = document.querySelectorAll(".reveal:not(.in)");
    if (!("IntersectionObserver" in window)) {
      els.forEach((e) => e.classList.add("in"));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((en) => {
          if (en.isIntersecting) {
            en.target.classList.add("in");
            io.unobserve(en.target);
          }
        });
      },
      { rootMargin: "-8% 0px -8% 0px", threshold: 0.05 },
    );
    els.forEach((e) => io.observe(e));
    return () => io.disconnect();
  });
}

// ─── Interactive Feature Tabs ──────────────────────────────────────────
const FEATURES = [
  {
    key: "killswitch",
    icon: IconPower,
    label: "Killswitches",
    short: "Disable any feature in under 200ms.",
    title: "Kill a bad feature before it kills you.",
    desc: "Every flag is a killswitch. Pull it manually, or set a guardrail — error rate, p95 latency, spend — and Shipeasy yanks it for you. Globally, in under 200ms, fully logged.",
  },
  {
    key: "config",
    icon: IconSliders,
    label: "Configs",
    short: "Typed, targeted, live-editable.",
    title: "Tweak runtime behaviour without redeploying.",
    desc: "Typed runtime configs targeted by user, plan, geo, or anything you send. Edit from Claude, the dashboard, or a PR. Versioned, auditable, and — yes — reversible.",
  },
  {
    key: "experiment",
    icon: IconFlask,
    label: "Experiments",
    short: "A/B/n with sequential stats.",
    title: "Run A/B/n tests that know when to stop.",
    desc: 'Sequential stats mean you can peek whenever you want without inflating false positives. Auto-ramping, SRM detection, guardrails. Say "try this" — Claude writes the code.',
  },
  {
    key: "metrics",
    icon: IconChart,
    label: "Metrics",
    short: "Activation, retention, revenue — auto.",
    title: "The metrics you need, collected for you.",
    desc: "Activation, retention, revenue, and error rate are instrumented from day one. Add custom metrics with one line of code. Claude can query them in conversation.",
  },
];

function KillswitchDemo() {
  const [step, setStep] = React.useState(0);
  React.useEffect(() => {
    const t = setInterval(() => setStep((s) => (s + 1) % 3), 2800);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="ks-demo">
      <div className="ks-item">
        <IconPower size={14} style={{ color: "var(--accent)" }} />
        <span className="k-name">new_checkout</span>
        <span className="ks-latency">
          errors <b>0.04%</b>
        </span>
        <div className="ks-switch" />
      </div>
      <div className={`ks-item ${step >= 1 ? "killed" : ""}`}>
        <IconPower size={14} style={{ color: step >= 1 ? "var(--danger)" : "var(--accent)" }} />
        <span className="k-name">ai_recommendations</span>
        <span className="ks-latency">
          {step >= 1 ? (
            <>
              killed in <b>187ms</b>
            </>
          ) : (
            <>
              errors <b>0.12%</b>
            </>
          )}
        </span>
        <div className={`ks-switch ${step >= 1 ? "off" : ""}`} />
      </div>
      <div className={`ks-item ${step >= 2 ? "killed" : ""}`}>
        <IconPower size={14} style={{ color: step >= 2 ? "var(--danger)" : "var(--accent)" }} />
        <span className="k-name">legacy_uploader</span>
        <span className="ks-latency">
          {step >= 2 ? (
            <>
              killed in <b>142ms</b>
            </>
          ) : (
            <>
              errors <b>2.1%</b> ⚠
            </>
          )}
        </span>
        <div className={`ks-switch ${step >= 2 ? "off" : ""}`} />
      </div>
      <div
        style={{
          marginTop: "auto",
          padding: "10px 12px",
          background: "var(--bg-3)",
          borderRadius: 7,
          fontFamily: "var(--mono)",
          fontSize: 11.5,
          color: "var(--fg-2)",
        }}
      >
        <IconSparkles
          size={11}
          style={{ color: "var(--accent)", verticalAlign: -2, marginRight: 6 }}
        />
        guardrail auto-triggered — global kill in{" "}
        <b style={{ color: "var(--accent)" }}>&lt; 200ms</b>
      </div>
    </div>
  );
}

function ConfigDemo() {
  const [v, setV] = React.useState({ max_uploads: 25, model: "sonnet-4.5", enable_v2: true });
  const [edited, setEdited] = React.useState(null);
  React.useEffect(() => {
    const steps = [
      { delay: 1500, key: "max_uploads", val: 100 },
      { delay: 3000, key: "model", val: "opus-4.1" },
      { delay: 4500, key: "enable_v2", val: false },
      { delay: 6000, reset: true },
    ];
    const timers = steps.map((s) =>
      setTimeout(() => {
        if (s.reset) {
          setV({ max_uploads: 25, model: "sonnet-4.5", enable_v2: true });
          setEdited(null);
        } else {
          setV((x) => ({ ...x, [s.key]: s.val }));
          setEdited(s.key);
        }
      }, s.delay),
    );
    const loop = setInterval(() => {}, 7500);
    return () => {
      timers.forEach(clearTimeout);
      clearInterval(loop);
    };
  });
  const fmt = (k, val) => {
    const cls = edited === k ? "edited" : "";
    if (typeof val === "string")
      return (
        <span className={cls}>
          <span className="s">"{val}"</span>
        </span>
      );
    if (typeof val === "boolean")
      return (
        <span className={cls}>
          <span className="n">{String(val)}</span>
        </span>
      );
    return (
      <span className={cls}>
        <span className="n">{val}</span>
      </span>
    );
  };
  return (
    <div className="cfg-demo">
      <div className="cfg-col">
        <h6>you · claude</h6>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 10,
            flex: 1,
            fontFamily: "var(--mono)",
            fontSize: 12.5,
            color: "var(--fg-2)",
            lineHeight: 1.6,
          }}
        >
          <div>
            <span style={{ color: "var(--fg-4)" }}>&gt;</span> bump max_uploads to 100 for pro plan
          </div>
          <div style={{ color: "var(--accent)", fontSize: 11 }}>
            ↳ ✓ updated · reverted in 5m if errors spike
          </div>
          <div style={{ height: 6 }} />
          <div>
            <span style={{ color: "var(--fg-4)" }}>&gt;</span> try opus for the assistant
          </div>
          <div style={{ color: "var(--accent)", fontSize: 11 }}>↳ ✓ 10% rollout</div>
          <div style={{ height: 6 }} />
          <div>
            <span style={{ color: "var(--fg-4)" }}>&gt;</span> disable v2 — latency regressed
          </div>
          <div style={{ color: "var(--accent)", fontSize: 11 }}>↳ ✓ disabled globally · 168ms</div>
        </div>
      </div>
      <div className="cfg-col">
        <h6>runtime config · live</h6>
        <pre className="cfg-json">
          {"{\n  "}
          <span className="k">"max_uploads"</span>
          {": "}
          {fmt("max_uploads", v.max_uploads)}
          {",\n  "}
          <span className="k">"model"</span>
          {": "}
          {fmt("model", v.model)}
          {",\n  "}
          <span className="k">"enable_v2"</span>
          {": "}
          {fmt("enable_v2", v.enable_v2)}
          {"\n}"}
        </pre>
      </div>
    </div>
  );
}

function ExperimentDemo() {
  const [tick, setTick] = React.useState(0);
  React.useEffect(() => {
    const t = setInterval(() => setTick((x) => x + 1), 100);
    return () => clearInterval(t);
  }, []);
  const progress = Math.min(1, (tick % 60) / 50);
  const convA = 3.2 + Math.sin(tick / 8) * 0.05;
  const convB = 3.2 + progress * 1.5 + Math.sin(tick / 6) * 0.1;
  const delta = ((convB - convA) / convA) * 100;
  return (
    <div className="xp-demo">
      <div className="xp-header">
        <IconFlask size={14} style={{ color: "var(--accent)" }} />
        <span className="xp-name">checkout_v3</span>
        <span className="xp-day">
          day {Math.floor(progress * 14)} · n={(tick * 23).toLocaleString()}
        </span>
      </div>

      <div className="xp-bar">
        <div className="xp-bar-top">
          <span className="xp-label">A</span>
          <span className="xp-conv">{convA.toFixed(2)}%</span>
          <span className="xp-delta" style={{ color: "var(--fg-3)" }}>
            control
          </span>
        </div>
        <div className="xp-bar-track">
          <div className="xp-bar-fill" style={{ width: `${convA * 18}%` }} />
        </div>
      </div>

      <div className="xp-bar winner">
        <div className="xp-bar-top">
          <span className="xp-label">B</span>
          <span className="xp-conv">{convB.toFixed(2)}%</span>
          <span className="xp-delta">
            ▲ +{delta.toFixed(1)}% · sig {Math.min(99.8, 80 + progress * 20).toFixed(1)}%
          </span>
        </div>
        <div className="xp-bar-track">
          <div className="xp-bar-fill" style={{ width: `${convB * 18}%` }} />
        </div>
      </div>

      {progress > 0.8 && (
        <div
          style={{
            padding: "10px 12px",
            background: "var(--bg-3)",
            borderRadius: 7,
            fontFamily: "var(--mono)",
            fontSize: 11.5,
            color: "var(--fg-2)",
            animation: "stageIn .4s",
          }}
        >
          <IconSparkles
            size={11}
            style={{ color: "var(--accent)", verticalAlign: -2, marginRight: 6 }}
          />
          Clear winner. <b style={{ color: "var(--accent)" }}>Auto-ramping</b> variant B to 100%
          over 48h.
        </div>
      )}
    </div>
  );
}

function MetricsDemo() {
  const [tick, setTick] = React.useState(0);
  React.useEffect(() => {
    const t = setInterval(() => setTick((x) => x + 1), 140);
    return () => clearInterval(t);
  }, []);
  const mkPath = (seed, up) => {
    const pts = Array.from({ length: 24 }, (_, i) => {
      const x = (i / 23) * 100;
      const y = up
        ? 60 - (i / 23) * 45 - Math.sin((i + tick / 4) / 2 + seed) * 4
        : 30 + Math.sin((i + tick / 3) / 2 + seed) * 6;
      return `${x},${Math.max(5, Math.min(55, y))}`;
    });
    return pts.join(" ");
  };
  const stats = [
    {
      k: "Activation",
      v: (42.1 + Math.sin(tick / 10) * 0.2).toFixed(1) + "%",
      d: "+3.2%",
      seed: 0,
      up: true,
    },
    {
      k: "D7 retention",
      v: (68 + Math.sin(tick / 12) * 0.3).toFixed(1) + "%",
      d: "+1.1%",
      seed: 1,
      up: true,
    },
    {
      k: "Revenue / user",
      v: "$" + (47.2 + Math.sin(tick / 9) * 0.1).toFixed(2),
      d: "+$2.18",
      seed: 2,
      up: true,
    },
    {
      k: "Error rate",
      v: (0.04 + Math.abs(Math.sin(tick / 14)) * 0.02).toFixed(3) + "%",
      d: "−0.1%",
      seed: 3,
      up: false,
    },
  ];
  return (
    <div
      className="met-demo"
      style={{
        gridTemplateColumns: "1fr 1fr",
        gridTemplateRows: "1fr 1fr",
        display: "grid",
        gap: 10,
      }}
    >
      {stats.map((s) => (
        <div key={s.k} className="met-card">
          <div style={{ display: "flex", alignItems: "center" }}>
            <div>
              <div className="met-k">{s.k}</div>
              <div className="met-v">{s.v}</div>
            </div>
            <div className="met-d" style={{ marginLeft: "auto" }}>
              {s.d}
            </div>
          </div>
          <svg
            viewBox="0 0 100 60"
            preserveAspectRatio="none"
            className="met-chart"
            style={{ width: "100%", height: 50 }}
          >
            <polyline
              points={mkPath(s.seed, s.up)}
              fill="none"
              stroke="var(--accent)"
              strokeWidth="1.2"
            />
          </svg>
        </div>
      ))}
    </div>
  );
}

function FeaturesTabs() {
  const [active, setActive] = React.useState(0);
  // auto-advance
  React.useEffect(() => {
    const t = setInterval(() => setActive((a) => (a + 1) % FEATURES.length), 7500);
    return () => clearInterval(t);
  }, [active]);
  const f = FEATURES[active];
  const Icon = f.icon;
  return (
    <section className="section flow-line" id="features">
      <div className="wrap">
        <div className="sec-head">
          <div className="reveal">
            <div className="sec-eyebrow">
              <span className="num">01</span> / primitives
            </div>
            <h2 className="sec-title">
              Four primitives. <em>One</em> platform.
            </h2>
          </div>
          <p className="sec-sub reveal d1">
            Everything you need to ship behind a flag, measure what happens, and yank it if it
            misbehaves.
          </p>
        </div>

        <div className="ftabs reveal d2">
          <div className="ftabs-nav">
            {FEATURES.map((feat, i) => {
              const I = feat.icon;
              return (
                <div
                  key={feat.key}
                  className={`ftab ${active === i ? "active" : ""}`}
                  onClick={() => setActive(i)}
                >
                  <span className="rail" />
                  <div className="ftab-icon">
                    <I size={14} />
                  </div>
                  <div>
                    <div className="ftab-label">{feat.label}</div>
                    <div className="ftab-desc">{feat.short}</div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="ftabs-pane" key={active}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div
                className="ftab-icon"
                style={{
                  background: "var(--accent-soft)",
                  color: "var(--accent)",
                  borderColor: "color-mix(in oklab, var(--accent) 30%, transparent)",
                }}
              >
                <Icon size={14} />
              </div>
              <div
                style={{
                  fontFamily: "var(--mono)",
                  fontSize: 10.5,
                  letterSpacing: ".08em",
                  textTransform: "uppercase",
                  color: "var(--fg-4)",
                }}
              >
                0{active + 1} · {f.label}
              </div>
            </div>
            <h3 className="ftabs-pane-title">{f.title}</h3>
            <p className="ftabs-pane-sub">{f.desc}</p>

            <div className="ftabs-stage">
              {active === 0 && <KillswitchDemo />}
              {active === 1 && <ConfigDemo />}
              {active === 2 && <ExperimentDemo />}
              {active === 3 && <MetricsDemo />}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Remaining sections (reused, with reveal classes added) ────────────
function HowItWorks() {
  return (
    <section className="section" id="how">
      <div className="wrap">
        <div className="sec-head">
          <div className="reveal">
            <div className="sec-eyebrow">
              <span className="num">02</span> / install
            </div>
            <h2 className="sec-title">
              Installed with Claude in <em>seconds</em>.
            </h2>
          </div>
          <p className="sec-sub reveal d1">
            Shipeasy is MCP-native. One command adds four tools to Claude and wires your project —
            no servers, no SDK config, no YAML.
          </p>
        </div>

        <div className="steps reveal d2">
          <div className="step">
            <div className="step-num">STEP 01 · 12 seconds</div>
            <h4>Install the MCP server</h4>
            <p>
              Run one command. Claude picks up the server, discovers your codebase, and registers
              four tools.
            </p>
            <div className="step-viz">
              <div>
                <span className="prompt">$ </span>
                <span className="cmd">claude mcp add shipeasy</span>
              </div>
              <div style={{ color: "var(--accent)", marginTop: 6 }}>✓ connected · 4 tools</div>
            </div>
          </div>
          <div className="step">
            <div className="step-num">STEP 02 · ask</div>
            <h4>Describe the experiment</h4>
            <p>
              In plain English, tell Claude what you want to try. It writes the feature-flag
              wrapper, picks metrics, and ramps safely.
            </p>
            <div className="step-viz">
              <div className="prompt">you</div>
              <div className="cmd">"try a new paywall copy to see</div>
              <div className="cmd">&nbsp;if it lifts trial starts"</div>
            </div>
          </div>
          <div className="step">
            <div className="step-num">STEP 03 · ship</div>
            <h4>Watch it run</h4>
            <p>
              Live metrics stream to the dashboard. Claude pings you when there's a clear winner —
              or when something breaks.
            </p>
            <div className="step-viz">
              <div className="out">▲ +6.1% trial_start · sig 98%</div>
              <div style={{ color: "var(--fg-3)", marginTop: 4 }}>↳ auto-ramping to 50%...</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function CliSection() {
  return (
    <section className="section">
      <div className="wrap">
        <div className="sec-head">
          <div className="reveal">
            <div className="sec-eyebrow">
              <span className="num">03</span> / code
            </div>
            <h2 className="sec-title">
              Four lines in your app. <em>That's it.</em>
            </h2>
          </div>
          <p className="sec-sub reveal d1">
            Drop the SDK, wrap a feature, and you're instrumented. Works with any framework. Typed,
            tree-shakable, 4kb gzipped.
          </p>
        </div>

        <div
          style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}
          className="reveal d2"
        >
          <div className="cli">
            <div className="cli-head">
              <div className="cli-dot" />
              <div className="cli-dot" />
              <div className="cli-dot" />
              <div className="cli-title">zsh · install</div>
            </div>
            <div className="cli-body">
              <div>
                <span className="p">$</span>
                <span className="c"> npm i @shipeasy/sdk</span>
              </div>
              <div>
                <span className="p">$</span>
                <span className="c"> claude mcp add shipeasy</span>
              </div>
              <div className="ok"> ✓ MCP server connected</div>
              <div className="ok"> ✓ tools: create_experiment, set_killswitch,</div>
              <div className="ok"> update_config, query_metrics</div>
              <div style={{ height: 12 }} />
              <div>
                <span className="p">$</span>
                <span className="c"> claude "add a killswitch for the new dashboard"</span>
              </div>
              <div className="o"> → wrapping DashboardV2 with useFlag('dashboard_v2')</div>
              <div className="ok"> ✓ killswitch armed</div>
            </div>
          </div>

          <div className="cli">
            <div className="cli-head">
              <div className="cli-dot" />
              <div className="cli-dot" />
              <div className="cli-dot" />
              <div className="cli-title">app.tsx · typescript</div>
            </div>
            <div className="cli-body" style={{ fontSize: 12.5 }}>
              <div>
                <span style={{ color: "var(--fg-4)" }}>import</span> {"{"} useFlag, useConfig {"}"}{" "}
                <span style={{ color: "var(--fg-4)" }}>from</span>{" "}
                <span className="w">'@shipeasy/sdk'</span>
              </div>
              <div style={{ height: 10 }} />
              <div>
                <span style={{ color: "var(--fg-4)" }}>export function</span>{" "}
                <span style={{ color: "var(--fg)" }}>Dashboard</span>() {"{"}
              </div>
              <div>
                {" "}
                <span style={{ color: "var(--fg-4)" }}>const</span> variant ={" "}
                <span style={{ color: "var(--accent)" }}>useFlag</span>(
                <span className="w">'dashboard_v2'</span>)
              </div>
              <div>
                {" "}
                <span style={{ color: "var(--fg-4)" }}>const</span> {"{"} maxItems {"}"} ={" "}
                <span style={{ color: "var(--accent)" }}>useConfig</span>(
                <span className="w">'home'</span>)
              </div>
              <div style={{ height: 6 }} />
              <div>
                {" "}
                <span style={{ color: "var(--fg-4)" }}>return</span> variant ==={" "}
                <span className="w">'B'</span>
              </div>
              <div>
                {" "}
                ? &lt;<span style={{ color: "var(--fg)" }}>DashboardV2</span> limit={"{"}maxItems
                {"}"} /&gt;
              </div>
              <div>
                {" "}
                : &lt;<span style={{ color: "var(--fg)" }}>Dashboard</span> limit={"{"}maxItems{"}"}{" "}
                /&gt;
              </div>
              <div>{"}"}</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Dashboard() {
  return (
    <section className="section" id="dash">
      <div className="wrap">
        <div className="sec-head">
          <div className="reveal">
            <div className="sec-eyebrow">
              <span className="num">04</span> / dashboard
            </div>
            <h2 className="sec-title">
              Metrics that <em>collect</em> themselves.
            </h2>
          </div>
          <p className="sec-sub reveal d1">
            Activation, retention, revenue and error-rate — instrumented automatically the moment
            you install.
          </p>
        </div>

        <div className="dash reveal d2">
          <div className="dash-head">
            <div className="crumb">
              <span>acme-app</span>
              <span className="sep">/</span>
              <span>experiments</span>
              <span className="sep">/</span>
              <span className="cur">checkout_v3</span>
            </div>
            <div className="right">
              <span className="pill">
                <span className="dot" />
                live · day 6
              </span>
              <a className="btn btn-ghost btn-mono" href="#" style={{ padding: "6px 10px" }}>
                <IconCopy size={12} /> share
              </a>
            </div>
          </div>
          <div className="dash-body">
            <div className="stat">
              <div className="s-k">Conversion</div>
              <div className="s-v">4.82%</div>
              <div className="s-d">▲ +8.4% · sig 99.2%</div>
            </div>
            <div className="stat">
              <div className="s-k">$ / user</div>
              <div className="s-v">$47.20</div>
              <div className="s-d">▲ +$2.18</div>
            </div>
            <div className="stat">
              <div className="s-k">Sample size</div>
              <div className="s-v">14,203</div>
              <div className="s-d" style={{ color: "var(--fg-3)" }}>
                of 14,000 target
              </div>
            </div>
            <div className="stat">
              <div className="s-k">Error rate</div>
              <div className="s-v">0.04%</div>
              <div className="s-d neg">▼ −0.1%</div>
            </div>
          </div>
          <div className="dash-chart">
            <div className="chart-legend">
              <span>
                <span className="sw" />
                variant B · one-click
              </span>
              <span>
                <span className="sw b" />
                variant A · control
              </span>
              <span style={{ marginLeft: "auto", color: "var(--fg-4)" }}>last 7 days</span>
            </div>
            <BigChart />
          </div>
        </div>
      </div>
    </section>
  );
}

function BigChart() {
  const a = "0,65 8,60 16,56 24,52 32,48 40,42 48,38 56,34 64,28 72,24 80,20 88,16 96,12 100,10";
  const b = "0,68 8,66 16,64 24,62 32,62 40,60 48,58 56,58 64,56 72,54 80,52 88,50 96,50 100,48";
  return (
    <svg
      viewBox="0 0 100 80"
      preserveAspectRatio="none"
      style={{ width: "100%", height: 180, display: "block" }}
    >
      <defs>
        <linearGradient id="fA" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.22" />
          <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0, 20, 40, 60, 80].map((y) => (
        <line key={y} x1="0" x2="100" y1={y} y2={y} stroke="var(--line)" strokeWidth="0.2" />
      ))}
      <polyline points={`0,80 ${a} 100,80`} fill="url(#fA)" />
      <polyline points={a} fill="none" stroke="var(--accent)" strokeWidth="0.8" />
      <polyline
        points={b}
        fill="none"
        stroke="var(--fg-3)"
        strokeWidth="0.6"
        strokeDasharray="1.5 1.5"
      />
    </svg>
  );
}

function UseCases() {
  const cases = [
    {
      tag: "A/B test",
      title: "Try something new",
      desc: "Ship a variant to 10% of users, let sequential stats decide when to call it, and roll out when confident.",
      card: (
        <>
          <div style={{ color: "var(--fg)" }}>claude: try a new onboarding flow</div>
          <div style={{ color: "var(--fg-3)", marginTop: 6 }}>
            ↳ scope: 10% · primary: activation_7d
          </div>
          <div style={{ color: "var(--accent)", marginTop: 6 }}>✓ experiment live</div>
        </>
      ),
    },
    {
      tag: "Gradual rollout",
      title: "Ramp it safely",
      desc: "Go from 1% → 100% over days, gated on error rate and latency. Pause or revert with a single message.",
      card: (
        <>
          <div style={{ color: "var(--fg)" }}>1% → 5% → 25% → 100%</div>
          <div style={{ color: "var(--fg-3)", marginTop: 6 }}>guardrail: errors &lt; 0.5%</div>
          <div style={{ color: "var(--accent)", marginTop: 6 }}>▲ at 25% · ramping in 24h</div>
        </>
      ),
    },
    {
      tag: "Killswitch",
      title: "Kill it in one breath",
      desc: 'A bug slipped through? "turn off the new checkout" — globally, under 200ms, logged, reversible.',
      card: (
        <>
          <div style={{ color: "var(--fg)" }}>you: turn off new_checkout</div>
          <div style={{ color: "var(--fg-3)", marginTop: 6 }}>↳ disabled globally · 187ms</div>
          <div style={{ color: "var(--danger)", marginTop: 6 }}>◼ killswitch engaged</div>
        </>
      ),
    },
  ];

  return (
    <section className="section">
      <div className="wrap">
        <div className="sec-head">
          <div className="reveal">
            <div className="sec-eyebrow">
              <span className="num">05</span> / use cases
            </div>
            <h2 className="sec-title">
              From <em>hunch</em> to shipped, in a sentence.
            </h2>
          </div>
        </div>
        <div className="uses reveal d1">
          {cases.map((c) => (
            <div className="use" key={c.tag}>
              <div className="use-tag">{c.tag}</div>
              <h4>{c.title}</h4>
              <p>{c.desc}</p>
              <div className="use-card">{c.card}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Pricing() {
  const check = <IconCheck size={13} />;
  return (
    <section className="section" id="pricing">
      <div className="wrap">
        <div className="sec-head">
          <div className="reveal">
            <div className="sec-eyebrow">
              <span className="num">06</span> / pricing
            </div>
            <h2 className="sec-title">
              Free to start. <em>Fair</em> as you grow.
            </h2>
          </div>
        </div>
        <div className="pricing reveal d1">
          <div className="plan">
            <div className="plan-name">Hobby</div>
            <div className="plan-price">
              $0<span className="per">/ forever</span>
            </div>
            <div className="plan-desc">Everything you need for side projects and solo work.</div>
            <ul className="plan-features">
              <li>{check} 3 experiments</li>
              <li>{check} Unlimited killswitches</li>
              <li>{check} 100k events / month</li>
              <li>{check} MCP + Claude integration</li>
              <li>{check} Community support</li>
            </ul>
            <a className="btn btn-ghost plan-cta" href="#">
              Start free <IconArrowRight size={13} />
            </a>
          </div>

          <div className="plan featured">
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div className="plan-name">Team</div>
              <span className="pill" style={{ fontSize: 10 }}>
                popular
              </span>
            </div>
            <div className="plan-price">
              $49<span className="per">/ seat / mo</span>
            </div>
            <div className="plan-desc">For small teams shipping experiments weekly.</div>
            <ul className="plan-features">
              <li>{check} Unlimited experiments</li>
              <li>{check} 10M events / month</li>
              <li>{check} Sequential & Bayesian stats</li>
              <li>{check} Auto-ramping + guardrails</li>
              <li>{check} Slack + email digests</li>
              <li>{check} SSO</li>
            </ul>
            <a className="btn btn-primary plan-cta" href="#">
              Start 14-day trial <IconArrowRight size={13} />
            </a>
          </div>

          <div className="plan">
            <div className="plan-name">Enterprise</div>
            <div className="plan-price">Custom</div>
            <div className="plan-desc">Self-hosted, audit logs, custom SLAs.</div>
            <ul className="plan-features">
              <li>{check} Everything in Team</li>
              <li>{check} Self-hosted option</li>
              <li>{check} SOC 2 Type II</li>
              <li>{check} Custom data retention</li>
              <li>{check} Dedicated support</li>
            </ul>
            <a className="btn btn-ghost plan-cta" href="#">
              Talk to us <IconArrowRight size={13} />
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

function Faq() {
  const qs = [
    [
      "How does the MCP install actually work?",
      "One command — claude mcp add shipeasy — registers four tools with Claude. We use your project context to wire experiments into the right files. No YAML, no dashboard configuration.",
    ],
    [
      "Is Shipeasy a hosted service, or can I self-host?",
      "Both. Hosted is the default. Self-hosted is a one-binary deployment on our Enterprise plan, with full parity and an air-gapped mode.",
    ],
    [
      "Which stats engine do you use?",
      "Sequential testing by default — you can peek at results whenever, without inflating false-positive rates. Bayesian and frequentist are both available per-experiment.",
    ],
    [
      "What happens if Claude makes a mistake?",
      "Every action goes through a PR or is reversible. Killswitches and experiment changes are logged. Nothing touches production without your review on Team and above.",
    ],
    [
      "Do you work with our existing framework?",
      "If it runs JS/TS, Python, Go, Ruby, Rust, or Swift — yes. The SDK is a thin client; the heavy lifting happens server-side.",
    ],
  ];
  return (
    <section className="section" id="faq">
      <div className="wrap">
        <div className="sec-head">
          <div className="reveal">
            <div className="sec-eyebrow">
              <span className="num">07</span> / questions
            </div>
            <h2 className="sec-title">You probably want to know.</h2>
          </div>
        </div>
        <div className="faq reveal d1">
          {qs.map(([q, a]) => (
            <div className="qa" key={q}>
              <h5>{q}</h5>
              <p>{a}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function CtaFooter() {
  return (
    <>
      <section className="section" style={{ paddingBottom: 32 }}>
        <div className="wrap" style={{ textAlign: "center" }}>
          <h2 className="sec-title reveal" style={{ margin: "0 auto", maxWidth: "22ch" }}>
            Stop guessing. <em>Start</em> shipping.
          </h2>
          <p className="sec-sub reveal d1" style={{ margin: "18px auto 28px" }}>
            Install in 12 seconds. Your first experiment before your coffee is cold.
          </p>
          <div className="hero-cta reveal d2">
            <a className="btn btn-primary" href="#">
              Install with Claude <IconArrowRight size={14} />
            </a>
            <a className="btn btn-ghost" href="#">
              <IconBook size={13} /> Read the docs
            </a>
          </div>
        </div>
      </section>

      <footer>
        <div className="wrap">
          <div className="foot">
            <div className="foot-brand">
              <div className="brand">
                <span className="brand-mark" />
                <span>Shipeasy</span>
              </div>
              <p>
                AI-native experimentation. Killswitches, configs, experiments, and metrics — all
                from one sentence in Claude.
              </p>
            </div>
            <div>
              <h6>Product</h6>
              <ul>
                <li>
                  <a href="#">Killswitches</a>
                </li>
                <li>
                  <a href="#">Configs</a>
                </li>
                <li>
                  <a href="#">Experiments</a>
                </li>
                <li>
                  <a href="#">Metrics</a>
                </li>
                <li>
                  <a href="#">MCP server</a>
                </li>
              </ul>
            </div>
            <div>
              <h6>Developers</h6>
              <ul>
                <li>
                  <a href="#">Documentation</a>
                </li>
                <li>
                  <a href="#">SDK reference</a>
                </li>
                <li>
                  <a href="#">Examples</a>
                </li>
                <li>
                  <a href="#">Changelog</a>
                </li>
                <li>
                  <a href="#">Status</a>
                </li>
              </ul>
            </div>
            <div>
              <h6>Company</h6>
              <ul>
                <li>
                  <a href="#">About</a>
                </li>
                <li>
                  <a href="#">Blog</a>
                </li>
                <li>
                  <a href="#">Security</a>
                </li>
                <li>
                  <a href="#">Privacy</a>
                </li>
                <li>
                  <a href="#">Terms</a>
                </li>
              </ul>
            </div>
          </div>
          <div className="foot-bottom">
            <span>© 2026 Shipeasy, Inc. · Built with Claude.</span>
            <span style={{ display: "flex", gap: 18 }}>
              <a href="#">
                <IconGithub size={14} />
              </a>
              <a href="#">
                <IconDiscord size={14} />
              </a>
              <a href="#">v0.9.3 · us-east-1 · all systems normal</a>
            </span>
          </div>
        </div>
      </footer>
    </>
  );
}

Object.assign(window, {
  useReveal,
  FeaturesTabs,
  HowItWorks,
  CliSection,
  Dashboard,
  UseCases,
  Pricing,
  Faq,
  CtaFooter,
});
