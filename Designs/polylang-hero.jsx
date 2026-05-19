// Polylang Hero — rotating verb + chat→live-translation card materializing across languages.

function Nav() {
  return (
    <nav className="nav">
      <div className="wrap nav-row">
        <a className="brand" href="#">
          <span className="brand-mark" />
          <span>Polylang</span>
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

function RotatingVerb() {
  const verbs = ["translate", "localize", "polish", "ship", "sync"];
  const [idx, setIdx] = React.useState(0);
  React.useEffect(() => {
    const t = setInterval(() => setIdx((i) => (i + 1) % verbs.length), 2400);
    return () => clearInterval(t);
  }, []);
  return (
    <span className="verb-slot" style={{ minWidth: "7ch" }}>
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

// ─── Scripts: prompt → tool call → multilingual card materializes ────
const SCRIPTS = [
  {
    prompt: "translate the new pricing page into french, german and japanese",
    tool: "translate_strings",
    job: {
      name: "pricing.page.tsx",
      scope: "12 strings",
      glossary: "Plan, Seat, Trial → preserved",
      source: { lang: "EN", text: "Start your 14-day trial — no card required." },
      targets: [
        { code: "FR", flag: "🇫🇷", text: "Commencez votre essai de 14 jours — sans carte." },
        { code: "DE", flag: "🇩🇪", text: "Starten Sie Ihre 14-tägige Testversion — ohne Karte." },
        { code: "JA", flag: "🇯🇵", text: "14日間の無料トライアルを開始 — カード不要。" },
        { code: "ES", flag: "🇪🇸", text: "Comienza tu prueba de 14 días — sin tarjeta." },
      ],
    },
  },
  {
    prompt: "auto-translate everything new since last release into all 14 languages",
    tool: "auto_translate_diff",
    job: {
      name: "release v2.4.0",
      scope: "47 new strings",
      glossary: "BYOK · Anthropic · sonnet-4.5",
      source: { lang: "EN", text: "Drag a file here or paste a URL to start." },
      targets: [
        { code: "PT", flag: "🇵🇹", text: "Arraste um ficheiro ou cole um URL para começar." },
        { code: "ZH", flag: "🇨🇳", text: "拖入文件或粘贴 URL 即可开始。" },
        { code: "KO", flag: "🇰🇷", text: "파일을 끌어오거나 URL을 붙여넣어 시작하세요." },
        { code: "AR", flag: "🇸🇦", text: "اسحب ملفًا هنا أو الصق رابطًا للبدء." },
      ],
    },
  },
  {
    prompt: "the german CTA feels too formal — make it warmer across the site",
    tool: "polish_locale",
    job: {
      name: "tone · de-DE",
      scope: "23 strings touched",
      glossary: "Sie → Du · register: friendly",
      source: { lang: "EN", text: "Get started in seconds." },
      targets: [
        {
          code: "DE",
          flag: "🇩🇪",
          text: "Leg in Sekunden los.",
          before: "Beginnen Sie in Sekunden.",
        },
        { code: "DE", flag: "🇩🇪", text: "Bist du dabei?", before: "Sind Sie interessiert?" },
        {
          code: "DE",
          flag: "🇩🇪",
          text: "Schau dir die Demo an.",
          before: "Sehen Sie sich die Demo an.",
        },
        {
          code: "DE",
          flag: "🇩🇪",
          text: "Lass uns reden.",
          before: "Setzen Sie sich mit uns in Verbindung.",
        },
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

// streaming text — reveals one char at a time per language
function StreamingLine({ text, active, delay = 0 }) {
  const [shown, setShown] = React.useState("");
  const [done, setDone] = React.useState(false);
  React.useEffect(() => {
    if (!active) {
      setShown("");
      setDone(false);
      return;
    }
    let i = 0;
    const start = setTimeout(() => {
      const t = setInterval(() => {
        i += 2;
        setShown(text.slice(0, i));
        if (i >= text.length) {
          clearInterval(t);
          setDone(true);
          setShown(text);
        }
      }, 18);
      return () => clearInterval(t);
    }, delay);
    return () => clearTimeout(start);
  }, [text, active, delay]);
  return (
    <span className={`lg-text ${done ? "" : active ? "streaming" : "pending"}`}>
      {active ? shown : "…"}
      {active && !done && <span className="cur" />}
    </span>
  );
}

function HeroCenterpiece() {
  const [scriptIdx, setScriptIdx] = React.useState(0);
  const script = SCRIPTS[scriptIdx];
  const [typed, typingDone] = useTypewriter(script.prompt, 22, 200);
  const [phase, setPhase] = React.useState(0);
  // 0=typing, 1=claude reply, 2=tool call running, 3=streaming targets, 4=done

  React.useEffect(() => {
    setPhase(0);
    if (!typingDone) return;
    const timers = [
      setTimeout(() => setPhase(1), 300),
      setTimeout(() => setPhase(2), 900),
      setTimeout(() => setPhase(3), 1500),
      setTimeout(() => setPhase(4), 4400),
      setTimeout(() => {
        setScriptIdx((i) => (i + 1) % SCRIPTS.length);
      }, 7400),
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
          <div className="cp-tab">thread-042</div>
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
                {script.tool === "polish_locale" ? (
                  <>
                    On it — softening tone across <b style={{ color: "var(--fg)" }}>de-DE</b>.
                    Switching <b style={{ color: "var(--fg)" }}>Sie → Du</b>, keeping product nouns.{" "}
                    {script.job.scope}.
                  </>
                ) : script.tool === "auto_translate_diff" ? (
                  <>
                    Pulling the diff — <b style={{ color: "var(--fg)" }}>{script.job.scope}</b> in{" "}
                    <b style={{ color: "var(--fg)" }}>{script.job.name}</b>. Fanning out to all 14
                    locales using your key.
                  </>
                ) : (
                  <>
                    Translating <b style={{ color: "var(--fg)" }}>{script.job.name}</b> —{" "}
                    <b style={{ color: "var(--fg)" }}>{script.job.scope}</b>. Glossary:{" "}
                    <b style={{ color: "var(--fg)" }}>{script.job.glossary}</b>.
                  </>
                )}
                {phase >= 2 && (
                  <div className="typed-tool">
                    <IconLanguages size={13} />
                    <span className="tn">polylang.{script.tool}</span>
                    <span style={{ color: "var(--fg-4)" }}>→</span>
                    <span>{script.job.name}</span>
                    {phase >= 4 && (
                      <span className="check">
                        <IconCheck size={11} /> done
                      </span>
                    )}
                    {(phase === 2 || phase === 3) && (
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
                        streaming
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* RIGHT: Live multilingual card */}
      <div className="cp-right">
        <div className="cp-tabs">
          <div className="cp-tab active">
            <IconLanguages size={11} /> polylang / {script.job.name}
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
              ● MERGED · PR #284
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
                  <IconLanguages size={12} />
                </span>
                {script.job.name}
              </div>
              <span className="exp-status">
                <span className="dot" />
                {phase >= 4 ? "TRANSLATED" : "WORKING"}
              </span>
            </div>

            <div className="exp-body" style={{ padding: "14px", gap: 12 }}>
              <div
                className={`mat-row ${phase >= 3 ? "in" : ""}`}
                style={{ transitionDelay: "0ms" }}
              >
                <div
                  style={{
                    padding: "10px 12px",
                    background: "var(--bg-1)",
                    border: "1px solid var(--line)",
                    borderRadius: 8,
                    display: "flex",
                    flexDirection: "column",
                    gap: 4,
                  }}
                >
                  <div
                    style={{
                      fontFamily: "var(--mono)",
                      fontSize: 10,
                      letterSpacing: ".08em",
                      textTransform: "uppercase",
                      color: "var(--fg-4)",
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    <span>SOURCE · {script.job.source.lang}</span>
                    <span style={{ flex: 1, height: 1, background: "var(--line)" }} />
                  </div>
                  <div style={{ fontSize: 13, color: "var(--fg)", lineHeight: 1.45 }}>
                    {script.job.source.text}
                  </div>
                </div>
              </div>

              <div
                className={`mat-row ${phase >= 3 ? "in" : ""}`}
                style={{ transitionDelay: "120ms" }}
              >
                <div className="lg-target">
                  {script.job.targets.map((t, i) => (
                    <div
                      key={i}
                      className={`lg-cell ${phase >= 4 ? "done" : phase >= 3 ? "streaming" : ""}`}
                    >
                      <div className="lg-flag">
                        <span>{t.flag}</span>
                        <span>{t.code}</span>
                        {phase >= 4 && <span className="ok">✓</span>}
                      </div>
                      <StreamingLine text={t.text} active={phase >= 3} delay={i * 180} />
                    </div>
                  ))}
                </div>
              </div>

              <div
                className={`mat-row ${phase >= 4 ? "in" : ""}`}
                style={{ transitionDelay: "200ms" }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "10px 12px",
                    background: "var(--bg-1)",
                    border: "1px solid var(--line)",
                    borderRadius: 8,
                    fontFamily: "var(--mono)",
                    fontSize: 11,
                    color: "var(--fg-2)",
                  }}
                >
                  <IconSparkles size={11} style={{ color: "var(--accent)" }} />
                  <span>Glossary respected · review before merge</span>
                  <span style={{ marginLeft: "auto", color: "var(--accent)" }}>
                    +{script.job.targets.length} files
                  </span>
                </div>
              </div>
            </div>
          </div>

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

function Hero() {
  return (
    <section className="hero-new">
      <div className="hero-aurora" />
      <div className="wrap">
        <div className="hero-head">
          <div className="hero-pill reveal d1 in">
            <span className="chip">NEW</span>
            <span>Polylang speaks MCP — translates from inside Claude</span>
            <IconArrowRight size={12} style={{ color: "var(--fg-3)", marginRight: 8 }} />
          </div>
          <h1 className="hero-title reveal in">
            Tell Claude to <RotatingVerb />
            <br />
            it. Polylang <em className="accent">ships</em> it.
          </h1>
          <p className="hero-sub-new reveal d1 in">
            The localization platform that lives inside your conversation. Translate with Claude,
            edit any string in your app with devtools, and auto-fan-out to 40+ languages — your key
            or ours.
          </p>
          <div className="hero-cta-new reveal d2 in">
            <a className="btn btn-primary" href="#">
              <IconSparkles size={13} /> Install with Claude
            </a>
            <a className="btn btn-ghost btn-mono" href="#">
              <IconTerminal size={13} /> npx polylang init
            </a>
          </div>
          <div className="hero-meta reveal d3 in">
            <span>
              <b>40+</b> languages
            </span>
            <span>
              <b>4</b> MCP tools
            </span>
            <span>
              <b>BYOK</b> or hosted
            </span>
            <span>
              <b>0</b> config files
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
    "Localized at scale by",
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

Object.assign(window, { Nav, Hero, Ticker });
