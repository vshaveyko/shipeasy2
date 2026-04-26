"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, Check, FlaskConical, Sparkles, Terminal } from "lucide-react";

const VERBS = ["test", "ship", "measure", "rollback", "ramp"] as const;

function RotatingVerb() {
  const [i, setI] = useState(0);
  useEffect(() => {
    const h = setInterval(() => setI((v) => (v + 1) % VERBS.length), 2400);
    return () => clearInterval(h);
  }, []);
  return (
    <span className="lp-verb-slot">
      {VERBS.map((verb, idx) => {
        const prev = (i - 1 + VERBS.length) % VERBS.length;
        const cls = idx === i ? "lp-active" : idx === prev ? "lp-out" : "";
        return (
          <span key={verb} className={`lp-verb ${cls}`}>
            {verb}
          </span>
        );
      })}
      {/* width reservation */}
      <span className="invisible">rollback</span>
    </span>
  );
}

interface ScriptStep {
  prompt: string;
  tool: string;
  exp: {
    name: string;
    traffic: string;
    audience: string;
    primary: string;
    variants: { label: string; name: string; split: string; win: boolean }[];
    metrics: [string, string][];
  };
}

const SCRIPTS: ScriptStep[] = [
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

function useTypewriter(text: string, speed = 24, startDelay = 0) {
  const [shown, setShown] = useState("");
  const [done, setDone] = useState(false);
  useEffect(() => {
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
    }, startDelay);
    return () => clearTimeout(start);
  }, [text, speed, startDelay]);
  return [shown, done] as const;
}

function Sparkline() {
  return (
    <svg className="lp-spark" viewBox="0 0 100 28" preserveAspectRatio="none" aria-hidden>
      <polyline
        points="0,22 10,18 20,20 30,15 40,16 50,12 60,10 70,11 80,7 90,5 100,3"
        fill="none"
        stroke="var(--se-accent)"
        strokeWidth="1.25"
      />
    </svg>
  );
}

function HeroCenterpiece() {
  const [scriptIdx, setScriptIdx] = useState(0);
  const script = SCRIPTS[scriptIdx];
  const [typed, typingDone] = useTypewriter(script.prompt, 22, 200);
  const [phase, setPhase] = useState(0);
  // 0 typing, 1 claude, 2 tool, 3 building card, 4 filled

  useEffect(() => {
    setPhase(0);
    if (!typingDone) return;
    const timers = [
      setTimeout(() => setPhase(1), 300),
      setTimeout(() => setPhase(2), 900),
      setTimeout(() => setPhase(3), 1400),
      setTimeout(() => setPhase(4), 2400),
      setTimeout(() => setScriptIdx((i) => (i + 1) % SCRIPTS.length), 6400),
    ];
    return () => timers.forEach(clearTimeout);
  }, [typingDone, scriptIdx]);

  const claudeReply =
    script.tool === "set_killswitch" ? (
      <>
        On it — arming a killswitch on <b className="text-[var(--se-fg)]">{script.exp.name}</b> with
        guardrail on <b className="text-[var(--se-fg)]">error_rate</b>.
      </>
    ) : (
      <>
        On it. Spinning up <b className="text-[var(--se-fg)]">{script.exp.name}</b>, scoped to{" "}
        <b className="text-[var(--se-fg)]">{script.exp.audience}</b> at{" "}
        <b className="text-[var(--se-fg)]">{script.exp.traffic}</b>. Primary metric:{" "}
        <b className="text-[var(--se-fg)]">{script.exp.primary}</b>.
      </>
    );

  return (
    <div className="lp-cp lp-reveal lp-d2">
      <div className="lp-cp-wire" />

      {/* LEFT — chat */}
      <div className="lp-cp-side">
        <div className="lp-cp-tabs">
          <div className="lp-cp-tab lp-active">
            <span className="size-1.5 rounded-full" style={{ background: "var(--se-accent)" }} />
            claude · mcp session
          </div>
          <div className="lp-cp-tab">thread-017</div>
          <div
            className="ml-auto self-center px-2 font-mono text-[10.5px]"
            style={{ color: "var(--se-fg-4)" }}
          >
            live ·
          </div>
        </div>

        <div className="flex flex-col gap-3.5 px-1.5 pt-5">
          <div className="lp-typed-bubble lp-user" key={`u-${scriptIdx}`}>
            <div className="lp-avatar lp-u">yo</div>
            <div className="lp-typed-text">
              {typed}
              {!typingDone && <span className="lp-typed-cursor" />}
            </div>
          </div>

          {phase >= 1 && (
            <div className="lp-typed-bubble lp-claude" key={`c-${scriptIdx}`}>
              <div className="lp-avatar lp-c">C</div>
              <div className="lp-typed-text lp-dim">
                {claudeReply}
                {phase >= 2 && (
                  <div className="lp-typed-tool">
                    <FlaskConical className="size-[13px]" />
                    <span className="lp-tn">shipeasy.{script.tool}</span>
                    <span style={{ color: "var(--se-fg-4)" }}>→</span>
                    <span>{script.exp.name}</span>
                    {phase >= 4 ? (
                      <span className="lp-status">
                        <Check className="size-[11px]" /> live
                      </span>
                    ) : (
                      <span className="lp-status">
                        <span className="lp-pulse-dot" />
                        running
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* RIGHT — materializing card */}
      <div className="lp-cp-side">
        <div className="lp-cp-tabs">
          <div className="lp-cp-tab lp-active">
            <FlaskConical className="size-[11px]" /> shipeasy / {script.exp.name}
          </div>
          {phase >= 4 && (
            <div
              className="ml-auto self-center px-2 font-mono text-[10.5px]"
              style={{ color: "var(--se-accent)" }}
            >
              ● LIVE · DAY 0
            </div>
          )}
        </div>

        <div className="px-1.5 pt-5">
          <div
            className={`lp-mat-card ${phase >= 3 && phase < 4 ? "lp-building" : ""}`}
            key={`card-${scriptIdx}`}
          >
            <div className="lp-exp-head">
              <div className="lp-exp-title">
                <span className="lp-icon-square">
                  <FlaskConical className="size-3" />
                </span>
                {script.exp.name}
              </div>
              <span className="lp-exp-status">
                <span className="lp-dot" />
                {phase >= 4 ? "LIVE" : "BUILDING"}
              </span>
            </div>

            <div className="lp-exp-body">
              <div
                className={`lp-mat-row ${phase >= 3 ? "lp-in" : ""}`}
                style={{ transitionDelay: "0ms" }}
              >
                <div className="lp-exp-meta">
                  <div className="lp-cell">
                    <div className="lp-k">Traffic</div>
                    <div className="lp-v">{script.exp.traffic}</div>
                  </div>
                  <div className="lp-cell">
                    <div className="lp-k">Audience</div>
                    <div className="lp-v">{script.exp.audience}</div>
                  </div>
                  <div className="lp-cell">
                    <div className="lp-k">Primary</div>
                    <div className="lp-v">{script.exp.primary}</div>
                  </div>
                </div>
              </div>

              <div
                className={`lp-mat-row ${phase >= 3 ? "lp-in" : ""}`}
                style={{ transitionDelay: "150ms" }}
              >
                <div className="lp-variants">
                  {script.exp.variants.map((v) => (
                    <div key={v.label} className={`lp-variant ${v.win ? "lp-winner" : ""}`}>
                      <span className="lp-v-label">{v.label}</span>
                      <span className="lp-v-name">{v.name}</span>
                      <span className="lp-v-split">{v.split}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div
                className={`lp-mat-row ${phase >= 4 ? "lp-in" : ""}`}
                style={{ transitionDelay: "300ms" }}
              >
                <div>
                  {script.exp.metrics.map(([name, delta]) => {
                    const isNeg =
                      delta.startsWith("−") &&
                      name !== "checkout_abandon" &&
                      name !== "time_to_register";
                    const showSpark = name !== "killswitch" && name !== "p95_latency";
                    return (
                      <div key={name} className="lp-metric-row">
                        <span className="lp-m-name">{name}</span>
                        <span className="lp-m-val">
                          {showSpark && <Sparkline />}
                          <span className={`lp-delta ${isNeg ? "lp-neg" : ""}`}>{delta}</span>
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* dot pagination */}
          <div className="mt-4 flex justify-center gap-1.5">
            {SCRIPTS.map((_, i) => (
              <button
                key={i}
                aria-label={`Show example ${i + 1}`}
                onClick={() => setScriptIdx(i)}
                className="rounded-full border-0 transition-all"
                style={{
                  width: i === scriptIdx ? 24 : 6,
                  height: 6,
                  background: i === scriptIdx ? "var(--se-accent)" : "var(--se-line-2)",
                  cursor: "pointer",
                }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function LandingHero() {
  return (
    <section className="lp-hero">
      <div className="lp-hero-aurora" />
      <div className="mx-auto max-w-[1240px] px-7">
        <div className="relative z-[2] flex flex-col items-center gap-5 text-center">
          <div className="lp-hero-pill lp-reveal lp-d1 lp-in">
            <span className="lp-chip">NEW</span>
            <span>Shipeasy speaks MCP — installs in Claude in 12 seconds</span>
            <ArrowRight className="size-3 mr-2" style={{ color: "var(--se-fg-3)" }} />
          </div>

          <h1 className="lp-hero-title lp-reveal lp-in">
            Tell Claude to <RotatingVerb />
            <br />
            it. Shipeasy <em className="lp-accent">ships</em> it.
          </h1>

          <p
            className="lp-reveal lp-d1 lp-in mx-auto max-w-[58ch] text-[17px] leading-[1.5]"
            style={{ color: "var(--se-fg-2)" }}
          >
            The experimentation platform that lives inside your conversation. Killswitches, configs,
            experiments and auto-collected metrics — all spun up from a single sentence.
          </p>

          <div className="lp-reveal lp-d2 lp-in mt-1 flex justify-center gap-2.5">
            <Link className="lp-btn lp-btn-primary" href="/auth/signin">
              <Sparkles className="size-3.5" /> Install with Claude
            </Link>
            <a
              className="lp-btn lp-btn-ghost lp-btn-mono"
              href="https://docs.shipeasy.ai"
              target="_blank"
              rel="noreferrer"
            >
              <Terminal className="size-3.5" /> npx shipeasy init
            </a>
          </div>

          <div
            className="lp-reveal lp-d3 lp-in mt-4 flex flex-wrap justify-center gap-6 font-mono text-[11.5px]"
            style={{ color: "var(--se-fg-3)" }}
          >
            <span>
              <b style={{ color: "var(--se-fg-2)", fontWeight: 500 }}>12s</b> install
            </span>
            <span>
              <b style={{ color: "var(--se-fg-2)", fontWeight: 500 }}>4</b> MCP tools
            </span>
            <span>
              <b style={{ color: "var(--se-fg-2)", fontWeight: 500 }}>0</b> config files
            </span>
            <span>
              <b style={{ color: "var(--se-fg-2)", fontWeight: 500 }}>∞</b> experiments
            </span>
          </div>
        </div>

        <HeroCenterpiece />
      </div>
    </section>
  );
}
