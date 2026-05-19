// New Hero — clear value prop, rotating verb, animated typing chat → materializing experiment card.

function Nav() {
  return (
    <nav className="nav">
      <div className="wrap nav-row">
        <a className="brand" href="#">
          <span className="brand-mark" />
          <span>Shipeasy</span>
          <span className="pill" style={{ marginLeft: 8 }}>
            <span className="dot" />
            beta
          </span>
        </a>
        <div className="nav-links">
          <a href="#features">Features</a>
          <a href="#how">How it works</a>
          <a href="#dash">Dashboard</a>
          <a href="#pricing">Pricing</a>
          <a href="#docs">Docs</a>
        </div>
        <div className="nav-cta">
          <a className="btn btn-ghost" href="#">
            Sign in
          </a>
          <a className="btn btn-primary" href="#">
            Install with Claude <IconArrowRight size={14} />
          </a>
        </div>
      </div>
    </nav>
  );
}

// Rotating verb in the headline
function RotatingVerb() {
  const verbs = ["test", "ship", "measure", "rollback", "ramp"];
  const [idx, setIdx] = React.useState(0);
  React.useEffect(() => {
    const t = setInterval(() => setIdx((i) => (i + 1) % verbs.length), 2400);
    return () => clearInterval(t);
  }, []);
  return (
    <span className="verb-slot">
      {verbs.map((v, i) => (
        <span
          key={v}
          className={`verb ${i === idx ? "active" : i === (idx - 1 + verbs.length) % verbs.length ? "out" : ""}`}
        >
          {v}
        </span>
      ))}
    </span>
  );
}

// ─── Scripted chat + materializing card loop ──────────────────────────
const SCRIPTS = [
  {
    prompt: "try a one-click checkout flow to see if it lifts registrations",
    tool: "create_experiment",
    exp: {
      name: "one_click_checkout",
      traffic: "5%",
      audience: "US · new",
      primary: "register ↑",
      variants: [
        { label: "A", name: "control · current checkout", split: "50%", win: false },
        { label: "B", name: "one-click checkout", split: "50%", win: true },
      ],
      metrics: [
        ["registration_complete", "+4.2%"],
        ["checkout_abandon", "−11.8%"],
        ["time_to_register", "−3.4s"],
      ],
    },
  },
  {
    prompt: "send the welcome email 5 min after signup, not 24h — 20% of new users",
    tool: "create_experiment",
    exp: {
      name: "welcome_email_timing",
      traffic: "20%",
      audience: "new users",
      primary: "activation_7d",
      variants: [
        { label: "A", name: "24h delay (control)", split: "50%", win: false },
        { label: "B", name: "5min delay", split: "50%", win: true },
      ],
      metrics: [
        ["activation_7d", "+6.8%"],
        ["unsubscribe_rate", "+0.2%"],
        ["spam_complaint", "0.0%"],
      ],
    },
  },
  {
    prompt: "kill the legacy uploader if error rate goes above 2%",
    tool: "set_killswitch",
    exp: {
      name: "legacy_uploader",
      traffic: "100%",
      audience: "all users",
      primary: "error_rate",
      variants: [
        { label: "⬤", name: "guardrail: error_rate > 2%", split: "armed", win: false },
        { label: "◼", name: "kill: disable globally", split: "< 200ms", win: true },
      ],
      metrics: [
        ["error_rate", "0.04%"],
        ["p95_latency", "180ms"],
        ["killswitch", "armed"],
      ],
    },
  },
];

function useTypewriter(text, speed = 24, startDelay = 0) {
  const [shown, setShown] = React.useState("");
  const [done, setDone] = React.useState(false);
  React.useEffect(() => {
    setShown("");
    setDone(false);
    let i = 0;
    const start = setTimeout(() => {
      const t = setInterval(() => {
        i++;
        setShown(text.slice(0, i));
        if (i >= text.length) {
          clearInterval(t);
          setDone(true);
        }
      }, speed);
      return () => clearInterval(t);
    }, startDelay);
    return () => clearTimeout(start);
  }, [text]);
  return [shown, done];
}

function HeroCenterpiece() {
  const [scriptIdx, setScriptIdx] = React.useState(0);
  const script = SCRIPTS[scriptIdx];
  const [typed, typingDone] = useTypewriter(script.prompt, 22, 200);
  const [phase, setPhase] = React.useState(0);
  // phase: 0 = typing, 1 = claude replies, 2 = tool call, 3 = card builds, 4 = card filled, 5 = reset

  React.useEffect(() => {
    setPhase(0);
    if (!typingDone) return;
    const timers = [
      setTimeout(() => setPhase(1), 300),
      setTimeout(() => setPhase(2), 900),
      setTimeout(() => setPhase(3), 1400),
      setTimeout(() => setPhase(4), 2400),
      setTimeout(() => {
        setScriptIdx((i) => (i + 1) % SCRIPTS.length);
      }, 6400),
    ];
    return () => timers.forEach(clearTimeout);
  }, [typingDone, scriptIdx]);

  return (
    <div className="cp reveal d2">
      <div className="cp-wire" />

      {/* LEFT: Chat */}
      <div className="cp-left">
        <div className="cp-tabs">
          <div className="cp-tab active">
            <span
              className="tab-dot"
              style={{
                width: 6,
                height: 6,
                borderRadius: 999,
                background: "var(--accent)",
              }}
            />
            claude · mcp session
          </div>
          <div className="cp-tab">thread-017</div>
          <div
            style={{
              marginLeft: "auto",
              alignSelf: "center",
              padding: "0 8px",
              fontFamily: "var(--mono)",
              fontSize: 10.5,
              color: "var(--fg-4)",
            }}
          >
            live ·
          </div>
        </div>

        <div style={{ padding: "20px 6px 0", display: "flex", flexDirection: "column", gap: 14 }}>
          <div className="typed-bubble user" key={`u-${scriptIdx}`}>
            <div className="avatar u">yo</div>
            <div className="typed-text">
              {typed}
              {!typingDone && <span className="typed-cursor" />}
            </div>
          </div>

          {phase >= 1 && (
            <div className="typed-bubble claude" key={`c-${scriptIdx}`}>
              <div className="avatar c">C</div>
              <div className="typed-text dim">
                {script.tool === "set_killswitch" ? (
                  <>
                    On it — arming a killswitch on{" "}
                    <b style={{ color: "var(--fg)" }}>{script.exp.name}</b> with guardrail on{" "}
                    <b style={{ color: "var(--fg)" }}>error_rate</b>.
                  </>
                ) : (
                  <>
                    On it. Spinning up <b style={{ color: "var(--fg)" }}>{script.exp.name}</b>,
                    scoped to <b style={{ color: "var(--fg)" }}>{script.exp.audience}</b> at{" "}
                    <b style={{ color: "var(--fg)" }}>{script.exp.traffic}</b>. Primary metric:{" "}
                    <b style={{ color: "var(--fg)" }}>{script.exp.primary}</b>.
                  </>
                )}
                {phase >= 2 && (
                  <div className="typed-tool">
                    <IconFlask size={13} />
                    <span className="tn">shipeasy.{script.tool}</span>
                    <span style={{ color: "var(--fg-4)" }}>→</span>
                    <span>{script.exp.name}</span>
                    {phase >= 4 && (
                      <span className="check">
                        <IconCheck size={11} /> live
                      </span>
                    )}
                    {phase === 2 || phase === 3 ? (
                      <span className="check">
                        <span
                          style={{
                            width: 5,
                            height: 5,
                            borderRadius: 999,
                            background: "var(--accent)",
                            display: "inline-block",
                            animation: "pulse 1.2s ease-in-out infinite",
                          }}
                        />
                        running
                      </span>
                    ) : null}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* RIGHT: Materializing card */}
      <div className="cp-right">
        <div className="cp-tabs">
          <div className="cp-tab active">
            <IconFlask size={11} /> shipeasy / {script.exp.name}
          </div>
          {phase >= 4 && (
            <div
              style={{
                marginLeft: "auto",
                alignSelf: "center",
                padding: "0 8px",
                fontFamily: "var(--mono)",
                fontSize: 10.5,
                color: "var(--accent)",
              }}
            >
              ● LIVE · DAY 0
            </div>
          )}
        </div>

        <div style={{ padding: "20px 6px 0" }}>
          <div
            className={`mat-card ${phase >= 3 && phase < 4 ? "building" : ""}`}
            key={`card-${scriptIdx}`}
          >
            <div className="exp-head" style={{ padding: "12px 14px" }}>
              <div className="exp-title" style={{ fontSize: 13 }}>
                <span className="icon-square">
                  <IconFlask size={12} />
                </span>
                {script.exp.name}
              </div>
              <span className="exp-status">
                <span className="dot" />
                {phase >= 4 ? "LIVE" : "BUILDING"}
              </span>
            </div>

            <div className="exp-body" style={{ padding: "14px", gap: 12 }}>
              <div
                className={`mat-row ${phase >= 3 ? "in" : ""}`}
                style={{ transitionDelay: "0ms" }}
              >
                <div className="exp-meta">
                  <div className="cell">
                    <div className="k">Traffic</div>
                    <div className="v">{script.exp.traffic}</div>
                  </div>
                  <div className="cell">
                    <div className="k">Audience</div>
                    <div className="v">{script.exp.audience}</div>
                  </div>
                  <div className="cell">
                    <div className="k">Primary</div>
                    <div className="v">{script.exp.primary}</div>
                  </div>
                </div>
              </div>

              <div
                className={`mat-row ${phase >= 3 ? "in" : ""}`}
                style={{ transitionDelay: "150ms" }}
              >
                <div className="variants">
                  {script.exp.variants.map((v) => (
                    <div key={v.label} className={`variant ${v.win ? "winner" : ""}`}>
                      <span className="v-label">{v.label}</span>
                      <span className="v-name">{v.name}</span>
                      <span className="v-split">{v.split}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div
                className={`mat-row ${phase >= 4 ? "in" : ""}`}
                style={{ transitionDelay: "300ms" }}
              >
                <div>
                  {script.exp.metrics.map(([name, delta]) => (
                    <div key={name} className="metric-row">
                      <span className="m-name">{name}</span>
                      <span className="m-val">
                        {name !== "killswitch" && name !== "p95_latency" && <Sparkline />}
                        <span
                          className={`delta ${delta.startsWith("−") && name !== "checkout_abandon" && name !== "time_to_register" ? "neg" : ""}`}
                        >
                          {delta}
                        </span>
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* dot progression */}
          <div style={{ display: "flex", gap: 6, justifyContent: "center", marginTop: 16 }}>
            {SCRIPTS.map((_, i) => (
              <button
                key={i}
                onClick={() => setScriptIdx(i)}
                style={{
                  width: i === scriptIdx ? 24 : 6,
                  height: 6,
                  borderRadius: 999,
                  border: 0,
                  cursor: "default",
                  background: i === scriptIdx ? "var(--accent)" : "var(--line-2)",
                  transition: "all .3s",
                }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function Sparkline({ invert }) {
  const pts = invert
    ? "0,4 10,6 20,8 30,10 40,9 50,14 60,18 70,20 80,22 90,24 100,26"
    : "0,22 10,18 20,20 30,15 40,16 50,12 60,10 70,11 80,7 90,5 100,3";
  return (
    <svg className="spark" viewBox="0 0 100 28" preserveAspectRatio="none">
      <polyline points={pts} fill="none" stroke="var(--accent)" strokeWidth="1.25" />
    </svg>
  );
}

function Hero() {
  return (
    <section className="hero-new">
      <div className="hero-aurora" />
      <div className="wrap">
        <div className="hero-head">
          <div className="hero-pill reveal d1 in">
            <span className="chip">NEW</span>
            <span>Shipeasy speaks MCP — installs in Claude in 12 seconds</span>
            <IconArrowRight size={12} style={{ color: "var(--fg-3)", marginRight: 8 }} />
          </div>
          <h1 className="hero-title reveal in">
            Tell Claude to <RotatingVerb />
            <br />
            it. Shipeasy <em className="accent">ships</em> it.
          </h1>
          <p className="hero-sub-new reveal d1 in">
            The experimentation platform that lives inside your conversation. Killswitches, configs,
            experiments and auto-collected metrics — all spun up from a single sentence.
          </p>
          <div className="hero-cta-new reveal d2 in">
            <a className="btn btn-primary" href="#">
              <IconSparkles size={13} /> Install with Claude
            </a>
            <a className="btn btn-ghost btn-mono" href="#">
              <IconTerminal size={13} /> npx shipeasy init
            </a>
          </div>
          <div className="hero-meta reveal d3 in">
            <span>
              <b>12s</b> install
            </span>
            <span>
              <b>4</b> MCP tools
            </span>
            <span>
              <b>0</b> config files
            </span>
            <span>
              <b>∞</b> experiments
            </span>
          </div>
        </div>

        <HeroCenterpiece />
      </div>
    </section>
  );
}

function Ticker() {
  const logos = [
    "Trusted by teams shipping fast at",
    "◆ ANVIL",
    "◇ NORTHWIND",
    "✦ PARALLEL",
    "◎ COLDSTART",
    "◉ ORBITAL",
    "◈ PRIMER",
    "▲ HELIX",
    "✧ KINDRED",
    "◌ MERIDIAN",
    "◉ VECTOR",
  ];
  return (
    <div className="ticker">
      <div className="ticker-track">
        {[...Array(3)].map((_, r) =>
          logos.map((l, i) => (
            <span key={`${r}-${i}`}>
              <b>{l}</b>
            </span>
          )),
        )}
      </div>
    </div>
  );
}

Object.assign(window, { Nav, Hero, Sparkline, Ticker });
