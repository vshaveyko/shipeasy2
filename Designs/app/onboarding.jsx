// Reusable onboarding wizard for Shipeasy apps.
// Usage: <OnboardingWizard kind="metrics" onClose={...} onComplete={...} />
// Supports: metrics, experiments, gates, configs.

const { useState: useStateOB, useEffect: useEffectOB } = React;

// ─── Per-app config ───────────────────────────────────
const KINDS = {
  metrics: {
    title: "Set up Metrics",
    subtitle: "Auto-collect web vitals + your own log() events",
    color: "var(--accent)",
    icon: <IconChart size={16} />,
    steps: ["Install", "Initialize", "Send first event", "Pick starter events", "Done"],
    starters: [
      {
        id: "user_signup",
        label: "user_signup",
        desc: "Account creation",
        icon: <IconUserPlus size={13} />,
      },
      {
        id: "user_checkout",
        label: "user_checkout",
        desc: "Purchase completed",
        icon: <IconCart size={13} />,
      },
      {
        id: "plan_upgrade",
        label: "plan_upgrade",
        desc: "Subscription change",
        icon: <IconTrendUp size={13} />,
      },
      {
        id: "feature_used",
        label: "feature_used",
        desc: "Generic feature flag",
        icon: <IconZap size={13} />,
      },
      {
        id: "search_executed",
        label: "search_executed",
        desc: "Search interactions",
        icon: <IconSearch size={13} />,
      },
      {
        id: "js_error",
        label: "js_error",
        desc: "Captured automatically",
        icon: <IconAlertTriangle size={13} />,
        auto: true,
      },
    ],
    autoCollected: [
      { name: "Web Vitals", desc: "LCP, INP, CLS, TTFB" },
      { name: "JS errors", desc: "Uncaught exceptions, unhandled rejections" },
      { name: "Page views", desc: "SPA & full navigation" },
      { name: "API timing", desc: "fetch + XHR with status codes" },
    ],
    completeMsg: "You're all set. Events flow in within seconds.",
  },
  experiments: {
    title: "Set up Experiments",
    subtitle: "A/B tests with statistical rigor and one-line activation",
    color: "var(--accent)",
    icon: <IconFlask size={16} />,
    steps: ["Install", "Initialize", "Identify users", "Pick first test", "Done"],
    starters: [],
    autoCollected: [],
    completeMsg: "Experiments are armed. Create your first test.",
  },
  gates: {
    title: "Set up Gates",
    subtitle: "Feature flags with targeting, rollouts, and kill-switches",
    color: "var(--info)",
    icon: <IconShield size={16} />,
    steps: ["Install", "Initialize", "Define a gate", "Done"],
    starters: [],
    autoCollected: [],
    completeMsg: "Gates ready. Wrap any feature in a check.",
  },
};

const FRAMEWORKS = [
  { id: "react", label: "React", sub: "Next.js · CRA · Vite" },
  { id: "node", label: "Node", sub: "Express · Fastify · Hono" },
  { id: "rn", label: "React Native", sub: "iOS + Android" },
  { id: "python", label: "Python", sub: "Django · FastAPI · Flask" },
  { id: "go", label: "Go", sub: "net/http · chi · echo" },
  { id: "curl", label: "cURL · HTTP", sub: "Anything else" },
];

// ─── Code snippet generators ─────────────────────────
function installCode(fw) {
  switch (fw) {
    case "react":
    case "rn":
      return "npm install @shipeasy/sdk";
    case "node":
      return "npm install @shipeasy/sdk";
    case "python":
      return "pip install shipeasy";
    case "go":
      return "go get github.com/shipeasy/sdk-go";
    case "curl":
      return "# no install — just HTTP";
    default:
      return "";
  }
}

// Each item: [text, className?] — className defaults to ''
function initCode(fw) {
  switch (fw) {
    case "react":
      return [
        [["import", "kw"], [" { init } "], ["from", "kw"], [" '@shipeasy/sdk';"]],
        [],
        [
          ["init", "fn"],
          ["({\n  apiKey: process.env."],
          ["SHIPEASY_KEY", "str"],
          [",\n  env: "],
          ["'production'", "str"],
          [",\n  autoCollect: { webVitals: "],
          ["true", "num"],
          [", errors: "],
          ["true", "num"],
          [" },\n});"],
        ],
      ];
    case "node":
      return [
        [["const", "kw"], [" { init } = require("], ["'@shipeasy/sdk'", "str"], [");"]],
        [],
        [
          ["init", "fn"],
          ["({ apiKey: process.env."],
          ["SHIPEASY_KEY", "str"],
          [", env: "],
          ["'production'", "str"],
          [" });"],
        ],
      ];
    case "rn":
      return [
        [["import", "kw"], [" { init } "], ["from", "kw"], [" '@shipeasy/sdk';"]],
        [],
        [
          ["init", "fn"],
          ["({ apiKey: "],
          ["'sk_…'", "str"],
          [", platform: "],
          ["'mobile'", "str"],
          [" });"],
        ],
      ];
    case "python":
      return [
        [["from", "kw"], [" shipeasy "], ["import", "kw"], [" init, log"]],
        [],
        [
          ["init", "fn"],
          ["(api_key=os.environ["],
          ["'SHIPEASY_KEY'", "str"],
          ["], env="],
          ["'production'", "str"],
          [")"],
        ],
      ];
    case "go":
      return [
        [["import", "kw"], [' "github.com/shipeasy/sdk-go"']],
        [],
        [
          ["shipeasy", "fn"],
          [".Init(shipeasy.Config{ APIKey: os.Getenv("],
          ['"SHIPEASY_KEY"', "str"],
          [") })"],
        ],
      ];
    case "curl":
      return [
        [["# no init — just POST events", "cmt"]],
        [],
        [["curl", "fn"], [" -X POST https://ingest.shipeasy.com/v1/events \\"]],
        [["  -H ", "str"], ['"Authorization: Bearer $SHIPEASY_KEY"', "str"], [" \\"]],
        [
          ["  -d ", "str"],
          ['\'{"event":"user_checkout","amount":129}\'', "str"],
        ],
      ];
    default:
      return [];
  }
}

// ─── Animated "waiting for first event" pinger ────────
function PingDetector({ status }) {
  // status: 'waiting' | 'received'
  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        height: 160,
        background: "var(--bg-2)",
        border: "1px solid var(--line)",
        borderRadius: "var(--r-md)",
        overflow: "hidden",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 24,
      }}
    >
      {/* radar grid */}
      <svg
        width="100%"
        height="100%"
        viewBox="0 0 600 160"
        preserveAspectRatio="none"
        style={{ position: "absolute", inset: 0, opacity: 0.5 }}
      >
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <line
            key={i}
            x1="0"
            x2="600"
            y1={20 + i * 24}
            y2={20 + i * 24}
            stroke="var(--line)"
            strokeDasharray="2 6"
          />
        ))}
        {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => (
          <line
            key={"v" + i}
            x1={i * 60}
            x2={i * 60}
            y1="0"
            y2="160"
            stroke="var(--line)"
            strokeDasharray="2 6"
          />
        ))}
      </svg>
      {/* SDK side */}
      <div
        style={{ position: "relative", zIndex: 1, display: "flex", alignItems: "center", gap: 14 }}
      >
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: 14,
            background: "var(--bg-1)",
            border: "1px solid var(--line-2)",
            display: "grid",
            placeItems: "center",
            color: "var(--fg-2)",
          }}
        >
          <IconCode size={26} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 80 }}>
          <div className="t-mono-xs dim-2">YOUR APP</div>
          <div style={{ fontSize: 13, fontWeight: 500 }}>SDK · v0.9</div>
        </div>
      </div>
      {/* pulse line */}
      <div
        style={{
          position: "relative",
          flex: 1,
          height: 2,
          background: "var(--bg-3)",
          borderRadius: 1,
          overflow: "hidden",
          maxWidth: 200,
          zIndex: 1,
        }}
      >
        <div className={`pulse-bar ${status}`} />
      </div>
      {/* shipeasy side */}
      <div
        style={{ position: "relative", zIndex: 1, display: "flex", alignItems: "center", gap: 14 }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 2,
            minWidth: 90,
            alignItems: "flex-end",
          }}
        >
          <div className="t-mono-xs dim-2">SHIPEASY</div>
          <div
            style={{
              fontSize: 13,
              fontWeight: 500,
              color: status === "received" ? "var(--accent)" : "var(--fg)",
            }}
          >
            {status === "received" ? "event received" : "listening…"}
          </div>
        </div>
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: 14,
            background: status === "received" ? "var(--accent-soft)" : "var(--bg-1)",
            border: `1px solid ${status === "received" ? "color-mix(in oklab, var(--accent) 40%, transparent)" : "var(--line-2)"}`,
            display: "grid",
            placeItems: "center",
            color: status === "received" ? "var(--accent)" : "var(--fg-2)",
            transition: "all .3s",
          }}
        >
          {status === "received" ? <IconCheck size={26} /> : <IconActivity size={26} />}
        </div>
      </div>
    </div>
  );
}

// ─── Main wizard ─────────────────────────────────────
function OnboardingWizard({ kind = "metrics", onClose, onComplete }) {
  const cfg = KINDS[kind] || KINDS.metrics;
  const [step, setStep] = useStateOB(0);
  const [fw, setFw] = useStateOB("react");
  const [picked, setPicked] = useStateOB(["user_checkout", "feature_used"]);
  const [pingStatus, setPingStatus] = useStateOB("waiting");

  // Auto-flip ping to received after a beat when on the verify step
  useEffectOB(() => {
    if (step === 2 && pingStatus === "waiting") {
      const t = setTimeout(() => setPingStatus("received"), 2400);
      return () => clearTimeout(t);
    }
  }, [step, pingStatus]);

  const togglePick = (id) =>
    setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  const next = () => setStep((s) => Math.min(s + 1, cfg.steps.length - 1));
  const back = () => setStep((s) => Math.max(s - 1, 0));

  return (
    <div className="ob-bg" onClick={onClose}>
      <div className="ob" onClick={(e) => e.stopPropagation()}>
        {/* ─── Left rail: stepper ─── */}
        <div className="ob-rail">
          <div className="ob-brand">
            <div
              className="ob-mark"
              style={{
                background: `conic-gradient(from 140deg, ${cfg.color}, var(--bg) 40%, ${cfg.color} 80%)`,
              }}
            />
            <div>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{cfg.title}</div>
              <div className="t-mono-xs dim-2" style={{ marginTop: 2 }}>
                {cfg.subtitle}
              </div>
            </div>
          </div>

          <div className="ob-steps">
            {cfg.steps.map((s, i) => (
              <div
                key={i}
                className={`ob-step ${i === step ? "on" : ""} ${i < step ? "done" : ""}`}
                onClick={() => i <= step && setStep(i)}
              >
                <div className="dot">
                  {i < step ? (
                    <IconCheck size={10} />
                  ) : i === step ? (
                    <span className="pulse" />
                  ) : (
                    <span>{i + 1}</span>
                  )}
                </div>
                <span>{s}</span>
              </div>
            ))}
          </div>

          <div style={{ flex: 1 }} />

          <div className="ob-help">
            <div className="t-caps dim-2" style={{ marginBottom: 6 }}>
              Need help
            </div>
            <a className="ob-help-row">
              <IconBook size={12} /> Read the docs
            </a>
            <a className="ob-help-row">
              <IconCode size={12} /> Browse examples
            </a>
            <a className="ob-help-row">
              <IconSparkles size={12} /> Ask Claude
            </a>
          </div>
          <button
            className="btn btn-ghost btn-sm"
            style={{ marginTop: 8, justifyContent: "center" }}
            onClick={onComplete}
          >
            Skip · explore with demo data
          </button>
        </div>

        {/* ─── Main panel ─── */}
        <div className="ob-main">
          <button className="ob-x" onClick={onClose}>
            <IconX size={14} />
          </button>

          {step === 0 && <StepInstall fw={fw} setFw={setFw} />}
          {step === 1 && <StepInit fw={fw} />}
          {step === 2 && (
            <StepVerify
              status={pingStatus}
              onSimulate={() => setPingStatus("received")}
              onReset={() => setPingStatus("waiting")}
            />
          )}
          {step === 3 && <StepStarters cfg={cfg} picked={picked} togglePick={togglePick} />}
          {step === 4 && <StepDone cfg={cfg} picked={picked} onComplete={onComplete} />}

          <div className="ob-foot">
            <div className="t-mono-xs dim-2">
              Step {step + 1} of {cfg.steps.length}
            </div>
            <div className="ob-foot-bar">
              {Array.from({ length: cfg.steps.length }).map((_, i) => (
                <div key={i} className={`seg ${i <= step ? "on" : ""}`} />
              ))}
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              {step > 0 && (
                <button className="btn btn-ghost" onClick={back}>
                  Back
                </button>
              )}
              {step < cfg.steps.length - 1 ? (
                <button
                  className="btn btn-primary"
                  onClick={next}
                  disabled={step === 2 && pingStatus !== "received"}
                >
                  {step === 2 && pingStatus !== "received" ? "Waiting…" : "Continue"}{" "}
                  <IconArrowRight size={11} />
                </button>
              ) : (
                <button className="btn btn-primary" onClick={onComplete}>
                  <IconCheck size={12} /> Open dashboard
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Steps ────────────────────────────────────────────

function StepInstall({ fw, setFw }) {
  return (
    <div className="ob-body">
      <div className="ob-heading">
        <div className="t-caps" style={{ color: "var(--accent)" }}>
          STEP 1
        </div>
        <h2>What are you shipping from?</h2>
        <p>We'll tailor the install steps. Multi-platform setups can pick more than one later.</p>
      </div>

      <div className="grid" style={{ gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
        {FRAMEWORKS.map((f) => (
          <div
            key={f.id}
            className={`ob-card ${fw === f.id ? "on" : ""}`}
            onClick={() => setFw(f.id)}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
              <span
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: 5,
                  background: "var(--bg-3)",
                  display: "grid",
                  placeItems: "center",
                  fontSize: 11,
                  fontFamily: "var(--mono)",
                  color: fw === f.id ? "var(--accent)" : "var(--fg-2)",
                }}
              >
                {f.label[0]}
              </span>
              <div style={{ fontSize: 13.5, fontWeight: 500 }}>{f.label}</div>
              {fw === f.id && (
                <IconCheck size={12} style={{ color: "var(--accent)", marginLeft: "auto" }} />
              )}
            </div>
            <div className="t-mono-xs dim-2">{f.sub}</div>
          </div>
        ))}
      </div>

      <div>
        <div className="t-caps dim-2" style={{ marginBottom: 8 }}>
          Install
        </div>
        <div className="code-block">{installCode(fw)}</div>
      </div>

      <div
        style={{
          display: "flex",
          gap: 10,
          padding: 14,
          background: "var(--bg-2)",
          border: "1px solid var(--line)",
          borderRadius: "var(--r-md)",
        }}
      >
        <IconKey size={14} style={{ color: "var(--info)", flexShrink: 0, marginTop: 2 }} />
        <div>
          <div className="t-sm" style={{ fontWeight: 500, marginBottom: 2 }}>
            You'll need an API key
          </div>
          <div className="t-sm dim">
            We've created <span className="t-mono">sk_live_acme_…7f2a</span> for this project.
            <a style={{ color: "var(--accent)", marginLeft: 6 }}>Manage keys →</a>
          </div>
        </div>
      </div>
    </div>
  );
}

function StepInit({ fw }) {
  const lines = initCode(fw);
  return (
    <div className="ob-body">
      <div className="ob-heading">
        <div className="t-caps" style={{ color: "var(--accent)" }}>
          STEP 2
        </div>
        <h2>Initialize once, anywhere in your bootstrap</h2>
        <p>
          Auto-collection turns on whatever you flip on. Everything else is opt-in via{" "}
          <span className="t-mono dim">log()</span>.
        </p>
      </div>

      <div className="code-block" style={{ minHeight: 160 }}>
        {lines.map((line, i) => (
          <div key={i} style={{ minHeight: "1.7em" }}>
            {line.map(([txt, cls], j) => (
              <span key={j} className={cls || ""}>
                {txt}
              </span>
            ))}
          </div>
        ))}
      </div>

      <div>
        <div className="t-caps dim-2" style={{ marginBottom: 8 }}>
          Auto-collected · zero extra code
        </div>
        <div className="grid" style={{ gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          {KINDS.metrics.autoCollected.map((a) => (
            <div
              key={a.name}
              style={{
                padding: "10px 12px",
                background: "var(--bg-2)",
                border: "1px solid var(--line)",
                borderRadius: "var(--r-md)",
                display: "flex",
                gap: 10,
                alignItems: "center",
              }}
            >
              <div
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: "var(--accent)",
                  boxShadow: "0 0 0 3px color-mix(in oklab, var(--accent) 22%, transparent)",
                }}
              />
              <div>
                <div style={{ fontSize: 12.5, fontWeight: 500 }}>{a.name}</div>
                <div className="t-mono-xs dim-2" style={{ marginTop: 2 }}>
                  {a.desc}
                </div>
              </div>
              <div className="toggle on" style={{ marginLeft: "auto" }} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function StepVerify({ status, onSimulate, onReset }) {
  return (
    <div className="ob-body">
      <div className="ob-heading">
        <div className="t-caps" style={{ color: "var(--accent)" }}>
          STEP 3
        </div>
        <h2>Send your first event</h2>
        <p>
          Drop this anywhere in your code — a button handler, a route, a script. We'll detect it
          live.
        </p>
      </div>

      <div className="code-block">
        <span className="fn">log</span>(<span className="str">'hello_shipeasy'</span>);
      </div>

      <PingDetector status={status} />

      {status === "waiting" ? (
        <div
          style={{
            display: "flex",
            gap: 10,
            padding: "12px 14px",
            background: "var(--bg-2)",
            border: "1px dashed var(--line-2)",
            borderRadius: "var(--r-md)",
            alignItems: "center",
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
          <span className="t-sm" style={{ color: "var(--fg)" }}>
            Listening for your first event…
          </span>
          <span className="t-mono-xs dim-2" style={{ marginLeft: "auto" }}>
            can't run code right now?
          </span>
          <button className="btn btn-ghost btn-sm" onClick={onSimulate}>
            <IconWand size={11} /> Simulate it
          </button>
        </div>
      ) : (
        <div
          style={{
            display: "flex",
            gap: 10,
            padding: "12px 14px",
            background: "var(--accent-soft)",
            border: "1px solid color-mix(in oklab, var(--accent) 35%, transparent)",
            borderRadius: "var(--r-md)",
            alignItems: "center",
          }}
        >
          <IconCheck size={14} style={{ color: "var(--accent)" }} />
          <div>
            <div className="t-sm" style={{ fontWeight: 500 }}>
              <span className="t-mono">hello_shipeasy</span> received from{" "}
              <span className="t-mono dim">192.168.1.42</span>
            </div>
            <div className="t-mono-xs dim-2" style={{ marginTop: 2 }}>
              roundtrip 64ms · React 18.3 · Chrome 132
            </div>
          </div>
          <button className="btn btn-ghost btn-sm" style={{ marginLeft: "auto" }} onClick={onReset}>
            Reset
          </button>
        </div>
      )}
    </div>
  );
}

function StepStarters({ cfg, picked, togglePick }) {
  return (
    <div className="ob-body">
      <div className="ob-heading">
        <div className="t-caps" style={{ color: "var(--accent)" }}>
          STEP 4
        </div>
        <h2>Pick events you want to track</h2>
        <p>
          Common ones to get you started — all editable later. Skip if you'd rather declare from
          scratch.
        </p>
      </div>

      <div className="grid" style={{ gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        {cfg.starters.map((s) => {
          const on = picked.includes(s.id);
          return (
            <div
              key={s.id}
              className={`ob-card ${on ? "on" : ""}`}
              onClick={() => !s.auto && togglePick(s.id)}
              style={s.auto ? { opacity: 0.7, cursor: "default" } : {}}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ color: on ? "var(--accent)" : "var(--fg-2)" }}>{s.icon}</span>
                <span style={{ fontFamily: "var(--mono)", fontSize: 12.5, fontWeight: 500 }}>
                  {s.label}
                </span>
                {s.auto && (
                  <span
                    className="badge"
                    style={{
                      marginLeft: "auto",
                      background: "var(--info-soft)",
                      color: "var(--info)",
                      fontSize: 9,
                      borderColor: "color-mix(in oklab, var(--info) 30%, transparent)",
                    }}
                  >
                    AUTO
                  </span>
                )}
                {!s.auto && (
                  <div
                    style={{
                      marginLeft: "auto",
                      width: 16,
                      height: 16,
                      borderRadius: 4,
                      border: `1.5px solid ${on ? "var(--accent)" : "var(--line-3)"}`,
                      background: on ? "var(--accent)" : "var(--bg-2)",
                      display: "grid",
                      placeItems: "center",
                    }}
                  >
                    {on && <IconCheck size={10} style={{ color: "#07120d" }} />}
                  </div>
                )}
              </div>
              <div className="t-mono-xs dim-2" style={{ marginTop: 6 }}>
                {s.desc}
              </div>
            </div>
          );
        })}
      </div>

      <div className="code-block">
        <span className="cmt">// Once registered, calls just work — autocomplete in your IDE</span>
        {"\n"}
        {picked.slice(0, 3).map((p, i) => (
          <div key={p}>
            <span className="fn">log</span>(<span className="str">{`'${p}'`}</span>
            {p === "user_checkout" && (
              <>
                , {`{`} <span style={{ color: "var(--fg)" }}>amount</span>:{" "}
                <span className="num">129.00</span>,{" "}
                <span style={{ color: "var(--fg)" }}>plan</span>: <span className="str">'pro'</span>{" "}
                {`}`}
              </>
            )}
            {p === "plan_upgrade" && (
              <>
                , {`{`} <span style={{ color: "var(--fg)" }}>from</span>:{" "}
                <span className="str">'free'</span>, <span style={{ color: "var(--fg)" }}>to</span>:{" "}
                <span className="str">'pro'</span> {`}`}
              </>
            )}
            {p === "search_executed" && (
              <>
                , {`{`} <span style={{ color: "var(--fg)" }}>query</span>:{" "}
                <span className="str">'invoice'</span> {`}`}
              </>
            )}
            );
          </div>
        ))}
      </div>
    </div>
  );
}

function StepDone({ cfg, picked, onComplete }) {
  return (
    <div className="ob-body" style={{ alignItems: "center", textAlign: "center", gap: 18 }}>
      <div
        style={{
          width: 92,
          height: 92,
          borderRadius: 24,
          background: "var(--accent-soft)",
          border: "1px solid color-mix(in oklab, var(--accent) 35%, transparent)",
          display: "grid",
          placeItems: "center",
          color: "var(--accent)",
          boxShadow: "0 20px 60px -20px color-mix(in oklab, var(--accent) 50%, transparent)",
        }}
      >
        <IconCheck size={42} />
      </div>
      <div>
        <h2 style={{ margin: 0, fontSize: 24, letterSpacing: "-0.02em", fontWeight: 500 }}>
          You're all set
        </h2>
        <p style={{ margin: "6px 0 0", color: "var(--fg-2)", maxWidth: "42ch" }}>
          {cfg.completeMsg}
        </p>
      </div>
      <div
        className="grid"
        style={{ gridTemplateColumns: "repeat(3, 1fr)", gap: 10, width: "100%", marginTop: 8 }}
      >
        <div
          style={{
            padding: 14,
            background: "var(--bg-2)",
            border: "1px solid var(--line)",
            borderRadius: "var(--r-md)",
            display: "flex",
            flexDirection: "column",
            gap: 4,
            textAlign: "left",
          }}
        >
          <div className="t-caps dim-2">Auto metrics</div>
          <div style={{ fontSize: 20, fontWeight: 500, letterSpacing: "-0.02em" }}>4</div>
          <div className="t-mono-xs dim-2">vitals · errors · pageviews · api</div>
        </div>
        <div
          style={{
            padding: 14,
            background: "var(--bg-2)",
            border: "1px solid var(--line)",
            borderRadius: "var(--r-md)",
            display: "flex",
            flexDirection: "column",
            gap: 4,
            textAlign: "left",
          }}
        >
          <div className="t-caps dim-2">Custom events</div>
          <div
            style={{
              fontSize: 20,
              fontWeight: 500,
              letterSpacing: "-0.02em",
              color: "var(--accent)",
            }}
          >
            {picked.length}
          </div>
          <div className="t-mono-xs dim-2">
            {picked.slice(0, 2).join(", ")}
            {picked.length > 2 ? "…" : ""}
          </div>
        </div>
        <div
          style={{
            padding: 14,
            background: "var(--bg-2)",
            border: "1px solid var(--line)",
            borderRadius: "var(--r-md)",
            display: "flex",
            flexDirection: "column",
            gap: 4,
            textAlign: "left",
          }}
        >
          <div className="t-caps dim-2">Status</div>
          <div
            style={{
              fontSize: 14,
              fontWeight: 500,
              color: "var(--accent)",
              display: "flex",
              alignItems: "center",
              gap: 6,
              marginTop: 2,
            }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: "var(--accent)",
                boxShadow: "0 0 0 3px color-mix(in oklab, var(--accent) 22%, transparent)",
              }}
            />
            Live
          </div>
          <div className="t-mono-xs dim-2">first event 64ms ago</div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { OnboardingWizard });
