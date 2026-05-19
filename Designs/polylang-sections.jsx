// Polylang sections — 4 feature tabs + how-it-works + dashboard + use cases + pricing + FAQ.

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

const FEATURES = [
  {
    key: "claude",
    icon: IconSparkles,
    label: "Translate with Claude",
    short: "Tell Claude what to translate. Done.",
    title: "Translate by asking — like you ship experiments.",
    desc: 'Polylang is MCP-native. Say "translate the new pricing page into French, German and Japanese" — Claude reads your strings, respects your glossary, and opens a PR with the diff. Same flow you use for everything else in Claude.',
  },
  {
    key: "inline",
    icon: IconCursor,
    label: "Inline edit",
    short: "Click any string in your app to fix it.",
    title: "Devtools for every string in your product.",
    desc: "Drop the SDK and a hidden devtools panel ships with it. Hover any visible string, click to edit — typed key, source language, all 40 translations, glossary hits. Saves push to your repo and re-fan-out automatically.",
  },
  {
    key: "byok",
    icon: IconKey,
    label: "Auto-translate · BYOK",
    short: "Your Anthropic key. Your model. Fast.",
    title: "Auto-translate everything new — with your key.",
    desc: "Polylang watches your source locale on every commit. Bring your own Anthropic key and the diff fans out to all your languages in parallel — sub-second per string, no usage caps from us. Glossary, tone, and brand voice carry over.",
  },
  {
    key: "served",
    icon: IconCloud,
    label: "Auto-translate · served",
    short: "No key, no setup. Just install.",
    title: "Or let us handle the bill — and the model.",
    desc: "Skip key management. Polylang-served auto-translation runs on our infra, billed per 1k strings. Same quality, same speed, same glossary engine — just nothing for you to provision. Switch between BYOK and served per project.",
  },
];

// ── Demo: Translate with Claude (chat-style) ─────────
function ClaudeTranslateDemo() {
  const [step, setStep] = React.useState(0);
  React.useEffect(() => {
    const t = setInterval(() => setStep((s) => (s + 1) % 4), 2200);
    return () => clearInterval(t);
  }, []);
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 12,
        width: "100%",
        fontFamily: "var(--mono)",
        fontSize: 12.5,
      }}
    >
      <div
        style={{
          padding: "10px 12px",
          background: "var(--bg-1)",
          border: "1px solid var(--line)",
          borderRadius: 7,
          display: "flex",
          gap: 10,
          alignItems: "flex-start",
        }}
      >
        <span style={{ color: "var(--fg-4)" }}>›</span>
        <span style={{ color: "var(--fg)" }}>
          translate the onboarding strings into 6 languages
        </span>
      </div>
      {step >= 1 && (
        <div
          style={{
            padding: "10px 12px",
            background: "color-mix(in oklab, var(--accent) 6%, transparent)",
            border: "1px solid color-mix(in oklab, var(--accent) 28%, transparent)",
            borderRadius: 7,
            display: "flex",
            gap: 10,
            alignItems: "flex-start",
            animation: "stageIn .35s",
          }}
        >
          <IconLanguages size={14} style={{ color: "var(--accent)", marginTop: 2 }} />
          <div style={{ flex: 1, color: "var(--fg-2)", lineHeight: 1.5 }}>
            polylang.<span style={{ color: "var(--accent)" }}>translate_strings</span>(
            <span style={{ color: "var(--fg)" }}>onboarding/*</span>)
            <div style={{ fontSize: 10.5, color: "var(--fg-4)", marginTop: 4 }}>
              ↳ FR · DE · JA · PT · ES · ZH · 23 strings
            </div>
          </div>
        </div>
      )}
      {step >= 2 && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(6,1fr)",
            gap: 6,
            animation: "stageIn .35s",
          }}
        >
          {["🇫🇷", "🇩🇪", "🇯🇵", "🇵🇹", "🇪🇸", "🇨🇳"].map((f, i) => (
            <div
              key={i}
              style={{
                padding: "8px 6px",
                textAlign: "center",
                background: "var(--bg-1)",
                border: "1px solid var(--line)",
                borderRadius: 6,
                fontSize: 11,
                color: "var(--fg-2)",
              }}
            >
              <div style={{ fontSize: 14, marginBottom: 3 }}>{f}</div>
              <div style={{ color: step >= 3 ? "var(--accent)" : "var(--fg-3)" }}>
                {step >= 3 ? "✓ 23" : "…"}
              </div>
            </div>
          ))}
        </div>
      )}
      {step >= 3 && (
        <div
          style={{
            marginTop: "auto",
            padding: "10px 12px",
            background: "var(--bg-3)",
            borderRadius: 7,
            fontSize: 11.5,
            color: "var(--fg-2)",
            animation: "stageIn .35s",
          }}
        >
          <IconSparkles
            size={11}
            style={{ color: "var(--accent)", verticalAlign: -2, marginRight: 6 }}
          />
          PR opened · <b style={{ color: "var(--accent)" }}>138 strings translated</b> · review and
          merge
        </div>
      )}
    </div>
  );
}

// ── Demo: Inline edit with devtools ──────────────────
function InlineEditDemo() {
  const [step, setStep] = React.useState(0);
  React.useEffect(() => {
    const t = setInterval(() => setStep((s) => (s + 1) % 4), 2400);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="ie-stage" style={{ height: "100%", minHeight: 240 }}>
      <div className="ie-mock">
        <div className="ie-eyebrow">PRICING · LIVE PREVIEW</div>
        <div className="ie-h">
          <span
            className={`ie-string ${step === 1 ? "hovered" : ""} ${step >= 2 ? "editing" : ""}`}
          >
            {step >= 3 ? "Start your free trial" : "Begin your free trial"}
          </span>
        </div>
        <div className="ie-p">
          <span className="ie-string">No credit card required.</span>{" "}
          <span className="ie-string">Cancel anytime.</span>
        </div>
        <div className="ie-btn">Get started</div>
      </div>
      {step >= 2 && (
        <div className="ie-popover" style={{ top: 74, left: 24 }}>
          <div className="ie-pop-meta">
            <span>edit string</span>
            <span className="key">marketing.pricing.cta_headline</span>
          </div>
          <input className="ie-pop-input" defaultValue="Start your free trial" />
          <div className="ie-pop-langs">
            <span className="ie-pop-lang">
              🇫🇷 <span className="cnt">re-fan</span>
            </span>
            <span className="ie-pop-lang">
              🇩🇪 <span className="cnt">re-fan</span>
            </span>
            <span className="ie-pop-lang">
              🇯🇵 <span className="cnt">re-fan</span>
            </span>
            <span className="ie-pop-lang">+ 11</span>
          </div>
          <div className="ie-pop-actions">
            <span className="btn-mini">save & propagate</span>
            <span className="btn-mini ghost">just english</span>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Demo: BYOK auto-translate matrix ─────────────────
function ByokDemo() {
  const [tick, setTick] = React.useState(0);
  React.useEffect(() => {
    const t = setInterval(() => setTick((x) => x + 1), 90);
    return () => clearInterval(t);
  }, []);
  const total = 47;
  const progress = Math.min(1, (tick % 70) / 55);
  const done = Math.floor(progress * total);

  const langs = [
    { code: "fr", flag: "🇫🇷", label: "french" },
    { code: "de", flag: "🇩🇪", label: "german" },
    { code: "ja", flag: "🇯🇵", label: "japanese" },
    { code: "es", flag: "🇪🇸", label: "spanish" },
    { code: "pt", flag: "🇵🇹", label: "portuguese" },
    { code: "zh", flag: "🇨🇳", label: "chinese (simpl.)" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10, width: "100%" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          fontFamily: "var(--mono)",
          fontSize: 11.5,
          color: "var(--fg-2)",
        }}
      >
        <IconKey size={12} style={{ color: "var(--accent)" }} />
        <span>
          using <b style={{ color: "var(--fg)" }}>your key</b> · sk-ant-…<b>x82a</b>
        </span>
        <span style={{ marginLeft: "auto", color: "var(--fg-3)" }}>
          release v2.4.0 · {total} new strings
        </span>
      </div>

      <div className="at-matrix">
        {langs.map((l, i) => {
          const pct = Math.max(0, Math.min(1, progress * 1.4 - i * 0.08));
          const isDone = pct >= 1;
          const cnt = Math.floor(pct * total);
          return (
            <div
              key={l.code}
              className={`at-row ${isDone ? "done" : pct > 0 ? "translating" : ""}`}
            >
              <div className="at-flag">
                {l.flag} <span>{l.code}</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div
                  style={{
                    flex: 1,
                    height: 4,
                    background: "var(--bg-3)",
                    borderRadius: 2,
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      height: "100%",
                      width: `${pct * 100}%`,
                      background: isDone
                        ? "var(--accent)"
                        : "color-mix(in oklab, var(--accent) 70%, var(--fg-3))",
                      transition: "width .25s ease-out",
                    }}
                  />
                </div>
                <span
                  style={{ fontSize: 10.5, color: "var(--fg-3)", minWidth: 60, textAlign: "right" }}
                >
                  {cnt}/{total}
                </span>
              </div>
              <div className={`at-status ${isDone ? "ok" : ""}`}>
                {isDone ? "✓ pushed" : pct > 0 ? `~${Math.floor((1 - pct) * 4) + 1}s` : "queued"}
              </div>
            </div>
          );
        })}
      </div>

      <div className="at-summary">
        <span>parallel · sub-second/string</span>
        <span>
          <b>{done * 6}</b> strings translated · cost on your key
        </span>
      </div>
    </div>
  );
}

// ── Demo: Served auto-translate (cards) ──────────────
function ServedDemo() {
  const [mode, setMode] = React.useState("served");
  React.useEffect(() => {
    const t = setInterval(() => setMode((m) => (m === "served" ? "byok" : "served")), 3500);
    return () => clearInterval(t);
  }, []);
  const isServed = mode === "served";
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14, width: "100%" }}>
      <div className="served-toggle">
        <button className={isServed ? "active" : ""}>polylang-served</button>
        <button className={!isServed ? "active" : ""}>byok</button>
      </div>

      <div className="served-card">
        <div className="sc-i">{isServed ? <IconCloud size={18} /> : <IconKey size={18} />}</div>
        <div>
          <div className="sc-h">{isServed ? "No key, no setup." : "Your Anthropic key."}</div>
          <div className="sc-p">
            {isServed
              ? "Polylang runs the model. We bill you per 1k strings. Cheapest path to go live."
              : "Polylang routes through your account. You set the model, you pay Anthropic. No mark-up."}
          </div>
        </div>
        <div className="sc-b">{isServed ? "$0.40 / 1k" : "BYOK"}</div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          gap: 8,
          fontFamily: "var(--mono)",
          fontSize: 10.5,
          color: "var(--fg-3)",
        }}
      >
        <div
          style={{
            padding: "10px 12px",
            background: "var(--bg-1)",
            border: "1px solid var(--line)",
            borderRadius: 7,
          }}
        >
          <div style={{ color: "var(--fg-4)" }}>MODEL</div>
          <div style={{ color: "var(--fg)", marginTop: 3, fontSize: 12 }}>
            {isServed ? "sonnet-4.5" : "your choice"}
          </div>
        </div>
        <div
          style={{
            padding: "10px 12px",
            background: "var(--bg-1)",
            border: "1px solid var(--line)",
            borderRadius: 7,
          }}
        >
          <div style={{ color: "var(--fg-4)" }}>P95 LATENCY</div>
          <div style={{ color: "var(--fg)", marginTop: 3, fontSize: 12 }}>
            {isServed ? "420ms" : "380ms"}
          </div>
        </div>
        <div
          style={{
            padding: "10px 12px",
            background: "var(--bg-1)",
            border: "1px solid var(--line)",
            borderRadius: 7,
          }}
        >
          <div style={{ color: "var(--fg-4)" }}>RATE LIMIT</div>
          <div style={{ color: "var(--fg)", marginTop: 3, fontSize: 12 }}>
            {isServed ? "unlimited" : "your tier"}
          </div>
        </div>
      </div>

      <div
        style={{
          padding: "10px 12px",
          background: "var(--bg-3)",
          borderRadius: 7,
          fontFamily: "var(--mono)",
          fontSize: 11.5,
          color: "var(--fg-2)",
          marginTop: "auto",
        }}
      >
        <IconSparkles
          size={11}
          style={{ color: "var(--accent)", verticalAlign: -2, marginRight: 6 }}
        />
        switch per-project · same glossary · same quality
      </div>
    </div>
  );
}

function FeaturesTabs() {
  const [active, setActive] = React.useState(0);
  React.useEffect(() => {
    const t = setInterval(() => setActive((a) => (a + 1) % FEATURES.length), 8000);
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
              <span className="num">01</span> / capabilities
            </div>
            <h2 className="sec-title">
              Four ways to translate. <em>One</em> store of strings.
            </h2>
          </div>
          <p className="sec-sub reveal d1">
            From a Claude prompt to inline devtools edits to fully automatic fan-out — pick the
            surface that fits the moment.
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
              {active === 0 && <ClaudeTranslateDemo />}
              {active === 1 && <InlineEditDemo />}
              {active === 2 && <ByokDemo />}
              {active === 3 && <ServedDemo />}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

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
              Wired into Claude in <em>seconds</em>.
            </h2>
          </div>
          <p className="sec-sub reveal d1">
            Polylang ships as an MCP server and a 5kb SDK. One command and Claude can translate,
            edit, and ship locales for you.
          </p>
        </div>

        <div className="steps reveal d2">
          <div className="step">
            <div className="step-num">STEP 01 · 10 seconds</div>
            <h4>Install the MCP server</h4>
            <p>
              Run one command. Claude picks up your locale files, source language, and any existing
              glossary.
            </p>
            <div className="step-viz">
              <div>
                <span className="prompt">$ </span>
                <span className="cmd">claude mcp add polylang</span>
              </div>
              <div style={{ color: "var(--accent)", marginTop: 6 }}>✓ connected · 4 tools</div>
            </div>
          </div>
          <div className="step">
            <div className="step-num">STEP 02 · ask</div>
            <h4>Describe the work</h4>
            <p>
              "Translate the new release into 6 languages." "Soften the German tone." Claude does it
              through Polylang tools.
            </p>
            <div className="step-viz">
              <div className="prompt">you</div>
              <div className="cmd">"translate the new strings</div>
              <div className="cmd">&nbsp;into 14 languages — BYOK"</div>
            </div>
          </div>
          <div className="step">
            <div className="step-num">STEP 03 · ship</div>
            <h4>Review and merge</h4>
            <p>
              A PR opens with the diff. Inline-edit any string in your dev preview, and changes fan
              out automatically.
            </p>
            <div className="step-viz">
              <div className="out">▲ +428 strings · 14 locales</div>
              <div style={{ color: "var(--fg-3)", marginTop: 4 }}>
                ↳ glossary respected · PR #284
              </div>
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
              One hook in your app. <em>That's it.</em>
            </h2>
          </div>
          <p className="sec-sub reveal d1">
            Drop the SDK, wrap your strings in{" "}
            <code style={{ fontFamily: "var(--mono)" }}>t()</code>, and inline-edit ships with it.
            Typed, tree-shakable, 5kb gzipped.
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
                <span className="c"> npm i @polylang/sdk</span>
              </div>
              <div>
                <span className="p">$</span>
                <span className="c"> claude mcp add polylang</span>
              </div>
              <div className="ok"> ✓ MCP server connected</div>
              <div className="ok"> ✓ tools: translate_strings, polish_locale,</div>
              <div className="ok"> auto_translate_diff, query_strings</div>
              <div style={{ height: 12 }} />
              <div>
                <span className="p">$</span>
                <span className="c"> claude "translate everything new — BYOK"</span>
              </div>
              <div className="o"> → fanning out 47 strings × 14 languages</div>
              <div className="ok"> ✓ PR #284 opened</div>
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
                <span style={{ color: "var(--fg-4)" }}>import</span> {"{"} t, useLocale {"}"}{" "}
                <span style={{ color: "var(--fg-4)" }}>from</span>{" "}
                <span className="w">'@polylang/sdk'</span>
              </div>
              <div style={{ height: 10 }} />
              <div>
                <span style={{ color: "var(--fg-4)" }}>export function</span>{" "}
                <span style={{ color: "var(--fg)" }}>Pricing</span>() {"{"}
              </div>
              <div>
                {" "}
                <span style={{ color: "var(--fg-4)" }}>const</span> locale ={" "}
                <span style={{ color: "var(--accent)" }}>useLocale</span>()
              </div>
              <div style={{ height: 6 }} />
              <div>
                {" "}
                <span style={{ color: "var(--fg-4)" }}>return</span> &lt;
                <span style={{ color: "var(--fg)" }}>section</span>&gt;
              </div>
              <div>
                {" "}
                &lt;h1&gt;{"{"} <span style={{ color: "var(--accent)" }}>t</span>(
                <span className="w">'pricing.headline'</span>) {"}"}&lt;/h1&gt;
              </div>
              <div>
                {" "}
                &lt;p&gt;{"{"} <span style={{ color: "var(--accent)" }}>t</span>(
                <span className="w">'pricing.sub'</span>, {"{"} plan {"}"}) {"}"}&lt;/p&gt;
              </div>
              <div>
                {" "}
                &lt;/<span style={{ color: "var(--fg)" }}>section</span>&gt;
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
              <span className="num">04</span> / coverage
            </div>
            <h2 className="sec-title">
              A living map of every <em>string</em>.
            </h2>
          </div>
          <p className="sec-sub reveal d1">
            Locale coverage, missing strings, glossary mismatches and recent edits — all in one
            dashboard, refreshed on every commit.
          </p>
        </div>

        <div className="dash reveal d2">
          <div className="dash-head">
            <div className="crumb">
              <span>acme-app</span>
              <span className="sep">/</span>
              <span>locales</span>
              <span className="sep">/</span>
              <span className="cur">overview</span>
            </div>
            <div className="right">
              <span className="pill">
                <span className="dot" />
                14 languages · 4,287 strings
              </span>
              <a className="btn btn-ghost btn-mono" href="#" style={{ padding: "6px 10px" }}>
                <IconCopy size={12} /> share
              </a>
            </div>
          </div>
          <div className="dash-body">
            <div className="stat">
              <div className="s-k">Coverage</div>
              <div className="s-v">98.4%</div>
              <div className="s-d">▲ +2.1pp this week</div>
            </div>
            <div className="stat">
              <div className="s-k">Missing</div>
              <div className="s-v">68</div>
              <div className="s-d" style={{ color: "var(--fg-3)" }}>
                across 3 locales
              </div>
            </div>
            <div className="stat">
              <div className="s-k">Strings</div>
              <div className="s-v">4,287</div>
              <div className="s-d">▲ +47 this release</div>
            </div>
            <div className="stat">
              <div className="s-k">Glossary hits</div>
              <div className="s-v">2,134</div>
              <div className="s-d">99.7% honored</div>
            </div>
          </div>
          <div className="dash-chart">
            <div className="chart-legend">
              <span>
                <span className="sw" />
                auto-translated
              </span>
              <span>
                <span className="sw b" />
                human-edited
              </span>
              <span style={{ marginLeft: "auto", color: "var(--fg-4)" }}>last 30 days</span>
            </div>
            <BigChart />
          </div>
        </div>
      </div>
    </section>
  );
}

function BigChart() {
  const a = "0,68 8,62 16,58 24,52 32,46 40,42 48,36 56,30 64,26 72,22 80,18 88,15 96,11 100,9";
  const b = "0,72 8,70 16,67 24,64 32,62 40,60 48,57 56,55 64,52 72,50 80,48 88,46 96,44 100,43";
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
      tag: "New release",
      title: "Ship multilingual on day one",
      desc: "Open a PR for v2.4. Polylang fans out the new strings across all your locales while CI runs.",
      card: (
        <>
          <div style={{ color: "var(--fg)" }}>release v2.4 · 47 new strings</div>
          <div style={{ color: "var(--fg-3)", marginTop: 6 }}>↳ 14 locales · BYOK · 8.2s</div>
          <div style={{ color: "var(--accent)", marginTop: 6 }}>✓ PR #284 opened</div>
        </>
      ),
    },
    {
      tag: "Inline fix",
      title: "Catch a typo, fix everywhere",
      desc: "Spot a wonky string in dev. Click. Edit. Polylang re-fans the change to every locale automatically.",
      card: (
        <>
          <div style={{ color: "var(--fg)" }}>edit · pricing.cta_headline</div>
          <div style={{ color: "var(--fg-3)", marginTop: 6 }}>↳ re-fanned to 13 locales</div>
          <div style={{ color: "var(--accent)", marginTop: 6 }}>▲ committed in 1.4s</div>
        </>
      ),
    },
    {
      tag: "Tone work",
      title: "Localize the feel, not just the words",
      desc: '"The German feels too stiff." Claude rewrites with your tone notes — formal → friendly, across the whole locale.',
      card: (
        <>
          <div style={{ color: "var(--fg)" }}>de-DE · Sie → Du</div>
          <div style={{ color: "var(--fg-3)", marginTop: 6 }}>↳ 23 strings touched</div>
          <div style={{ color: "var(--accent)", marginTop: 6 }}>✓ tone preview ready</div>
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
              From <em>typo</em> to a 14-language ship, in a sentence.
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
              Free for the first <em>1k</em> strings.
            </h2>
          </div>
        </div>
        <div className="pricing reveal d1">
          <div className="plan">
            <div className="plan-name">Solo</div>
            <div className="plan-price">
              $0<span className="per">/ forever</span>
            </div>
            <div className="plan-desc">Free tier covers most side projects.</div>
            <ul className="plan-features">
              <li>{check} 1,000 strings</li>
              <li>{check} 6 target languages</li>
              <li>{check} BYOK auto-translate</li>
              <li>{check} Inline devtools</li>
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
              $0.40<span className="per">/ 1k strings</span>
            </div>
            <div className="plan-desc">Pay only for what we serve. Free if you BYOK.</div>
            <ul className="plan-features">
              <li>{check} Unlimited strings</li>
              <li>{check} 40+ target languages</li>
              <li>{check} BYOK or polylang-served</li>
              <li>{check} Glossary + tone profiles</li>
              <li>{check} GitHub PR integration</li>
              <li>{check} SSO</li>
            </ul>
            <a className="btn btn-primary plan-cta" href="#">
              Start 14-day trial <IconArrowRight size={13} />
            </a>
          </div>

          <div className="plan">
            <div className="plan-name">Enterprise</div>
            <div className="plan-price">Custom</div>
            <div className="plan-desc">Self-hosted, audit logs, dedicated support.</div>
            <ul className="plan-features">
              <li>{check} Everything in Team</li>
              <li>{check} Self-hosted option</li>
              <li>{check} SOC 2 Type II</li>
              <li>{check} Custom data retention</li>
              <li>{check} Translation memory export</li>
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
      "One command — claude mcp add polylang — registers four tools with Claude. We index your locale files and glossary. No YAML, no dashboard configuration.",
    ],
    [
      "BYOK or served — which should I pick?",
      "Served is the simplest: no key, $0.40 per 1k strings. BYOK is free on our side — you pay Anthropic directly and can pick the model. Switch per-project, any time.",
    ],
    [
      "How do you handle our glossary and tone of voice?",
      "You can drop a glossary file or write tone notes in plain English. Polylang threads both into every translation request, and the dashboard shows where the model deviated.",
    ],
    [
      "What about ICU plurals, dates, RTL?",
      "Full ICU MessageFormat support. Plurals, gender, date/number formatting. Bidi text and RTL locales (ar, he, fa) ship with proper unicode markers.",
    ],
    [
      "Can I review changes before they go live?",
      'Every Polylang change opens a PR by default. Inline edits hit a "drafts" branch you can preview locally. Nothing touches production without your merge.',
    ],
    [
      "Which frameworks do you support?",
      "React, Vue, Svelte, Solid, Next, Remix, Astro, Expo, SwiftUI, Jetpack Compose. The SDK is a thin client; the heavy lifting happens server-side.",
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
            Ship in every language. <em>Without</em> the spreadsheet.
          </h2>
          <p className="sec-sub reveal d1" style={{ margin: "18px auto 28px" }}>
            Install in 12 seconds. Your first 14-language release before your coffee is cold.
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
                <span>Polylang</span>
              </div>
              <p>
                AI-native localization. Translate, polish, fan out, and ship — all from one sentence
                in Claude.
              </p>
            </div>
            <div>
              <h6>Product</h6>
              <ul>
                <li>
                  <a href="#">Translate with Claude</a>
                </li>
                <li>
                  <a href="#">Inline devtools</a>
                </li>
                <li>
                  <a href="#">Auto-translate (BYOK)</a>
                </li>
                <li>
                  <a href="#">Auto-translate (served)</a>
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
                  <a href="#">ICU MessageFormat</a>
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
            <span>© 2026 Polylang, Inc. · Built with Claude.</span>
            <span style={{ display: "flex", gap: 18 }}>
              <a href="#">
                <IconGithub size={14} />
              </a>
              <a href="#">
                <IconDiscord size={14} />
              </a>
              <a href="#">v0.7.2 · us-east-1 · all systems normal</a>
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
