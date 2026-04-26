"use client";

import { useEffect, useRef, useState } from "react";
import { CheckIcon } from "./icons";

/**
 * Sticky scrollytelling: left column pins a demo card, right column scrolls
 * through narrative blocks. As each block centers, the pinned panel morphs
 * to the matching demo. A sticky feature strip under the nav mirrors active
 * state and shows per-step progress.
 */

const N = 4;

export function StickyFeatures() {
  const sectionRef = useRef<HTMLElement>(null);
  const stripRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const [progress, setProgress] = useState(0); // 0..1 within the active step
  const [stripVisible, setStripVisible] = useState(false);

  useEffect(() => {
    const update = () => {
      const el = sectionRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const vh = window.innerHeight;
      const inView = r.bottom > 0 && r.top < vh;
      setStripVisible(inView && r.top < vh * 0.4);
      if (!inView) return;
      const total = r.height - vh;
      const scrolled = Math.max(0, Math.min(total, -r.top + vh * 0.3));
      const t = total > 0 ? scrolled / total : 0;
      const seg = 1 / N;
      const idx = Math.min(N - 1, Math.floor(t / seg + 0.0001));
      const local = (t - idx * seg) / seg;
      setActive(idx);
      setProgress(Math.max(0, Math.min(1, local)));
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  const goTo = (i: number) => {
    const block = sectionRef.current?.querySelector<HTMLElement>(`[data-block="${i}"]`);
    block?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  return (
    <>
      {/* Sticky feature strip */}
      <div
        ref={stripRef}
        className={`lp-feat-strip ${stripVisible ? "lp-show" : ""}`}
        aria-hidden={!stripVisible}
      >
        <div className="lp-feat-strip-inner">
          {STEPS.map((s, i) => {
            const done = i < active;
            const isActive = i === active;
            const fill = done ? 100 : isActive ? progress * 100 : 0;
            return (
              <button
                key={s.label}
                className={`lp-fs-step ${done ? "lp-done" : ""} ${isActive ? "lp-active" : ""}`}
                onClick={() => goTo(i)}
                aria-current={isActive ? "step" : undefined}
              >
                <span className="lp-fs-num">0{i + 1}</span>
                <span className="lp-fs-text">
                  <span className="lp-fs-label">{s.label}</span>
                  <span className="lp-fs-track">
                    <i style={{ width: `${fill}%` }} />
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <section className="lp-section lp-sticky-section" id="features" ref={sectionRef}>
        <div className="mx-auto max-w-[1200px] px-7">
          <div className="lp-sec-head lp-reveal lp-in">
            <div className="lp-sec-eyebrow">Primitives</div>
            <h2 className="lp-sec-title">
              Four primitives. <em>One platform.</em>
            </h2>
            <p className="lp-sec-sub">Scroll. The panel pins, the demo morphs.</p>
          </div>

          <div className="lp-sticky-grid">
            {/* LEFT — pinned */}
            <div className="lp-sticky-pin">
              <div className="lp-sticky-pin-card">
                <div className="lp-pin-stack">
                  <KillswitchesPanel active={active === 0} />
                  <ConfigsPanel active={active === 1} />
                  <ExperimentsPanel active={active === 2} />
                  <MetricsPanel active={active === 3} />
                </div>
              </div>
            </div>

            {/* RIGHT — narrative */}
            <div className="lp-sticky-narrative">
              {STEPS.map((s, i) => (
                <div className="lp-sticky-block" data-block={i} key={s.label}>
                  <span className="lp-badge lp-accent">
                    0{i + 1} · {s.label.toUpperCase()}
                  </span>
                  <h3 dangerouslySetInnerHTML={{ __html: s.title }} />
                  <p>{s.desc}</p>
                  <ul>
                    {s.bullets.map((b) => (
                      <li key={b}>
                        <CheckIcon size={16} />
                        {b}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

const STEPS = [
  {
    label: "Killswitches",
    title: "Kill a bad feature <em>before it kills you.</em>",
    desc: "Every flag is a killswitch. Pull it manually, or set a guardrail — error rate, p95 latency, spend — and Shipeasy yanks it for you.",
    bullets: [
      "Globally disabled in under 200ms",
      "Logged, audited, reversible",
      "Auto-armed by guardrail thresholds",
    ],
  },
  {
    label: "Configs",
    title: "Tweak runtime behaviour <em>without redeploying.</em>",
    desc: "Typed runtime configs targeted by user, plan, geo, or anything you send. Edit from Claude, the dashboard, or a PR.",
    bullets: [
      "Versioned and auditable",
      "Per-environment drafts + publish",
      "Auto-revert on regression",
    ],
  },
  {
    label: "Experiments",
    title: "A/B/n tests that <em>know when to stop.</em>",
    desc: "Sequential stats mean you can peek whenever you want without inflating false positives. Auto-ramping, SRM detection, guardrails — Claude writes the wrapper.",
    bullets: [
      "Sequential + Bayesian engines",
      "Auto-ramp from 1% to 100% on a guardrail",
      "SRM and outlier detection",
    ],
  },
  {
    label: "Metrics",
    title: "The metrics you need, <em>collected for you.</em>",
    desc: "Activation, retention, revenue, and error rate are instrumented from day one. Add custom metrics with one line of code.",
    bullets: [
      "No SQL required for the basics",
      "Custom events with one line",
      "Streamed live to the dashboard",
    ],
  },
];

/* ──────────────────────────────────────────── Pinned panels */

function PanelShell({
  active,
  tag,
  children,
}: {
  active: boolean;
  tag: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`lp-pin-panel ${active ? "lp-active" : ""}`}>
      <div className="lp-pin-tag">{tag}</div>
      {children}
    </div>
  );
}

function KillswitchesPanel({ active }: { active: boolean }) {
  return (
    <PanelShell active={active} tag="killswitches · live">
      <div className="lp-ks-list">
        <div className="lp-ks-row">
          <span className="lp-name">new_checkout</span>
          <span className="lp-lat">
            errors <b>0.04%</b>
          </span>
          <div className="lp-switch" />
        </div>
        <div className="lp-ks-row lp-killed">
          <span className="lp-name">ai_recommendations</span>
          <span className="lp-lat">
            killed in <b>187ms</b>
          </span>
          <div className="lp-switch lp-off" />
        </div>
        <div className="lp-ks-row">
          <span className="lp-name">legacy_uploader</span>
          <span className="lp-lat">
            errors <b>0.12%</b>
          </span>
          <div className="lp-switch" />
        </div>
      </div>
      <div className="lp-ks-foot" style={{ marginTop: "auto" }}>
        <span style={{ color: "var(--se-accent)" }}>●</span> guardrail auto-triggered — global kill
        in <b>&lt; 200ms</b>
      </div>
    </PanelShell>
  );
}

function ConfigsPanel({ active }: { active: boolean }) {
  return (
    <PanelShell active={active} tag="runtime config · live">
      <div className="lp-cfg-conv">
        <div>
          <span className="lp-you">&gt;</span> bump max_uploads to 100 for pro plan
        </div>
        <div className="lp-ok">↳ ✓ updated · auto-revert on regression</div>
      </div>
      <pre className="lp-cfg-json">
        {"{\n  "}
        <span className="lp-k">&quot;max_uploads&quot;</span>
        {": "}
        <span className="lp-edited">
          <span className="lp-n">100</span>
        </span>
        {",\n  "}
        <span className="lp-k">&quot;model&quot;</span>
        {": "}
        <span className="lp-s">&quot;opus-4.1&quot;</span>
        {",\n  "}
        <span className="lp-k">&quot;enable_v2&quot;</span>
        {": "}
        <span className="lp-n">true</span>
        {",\n  "}
        <span className="lp-k">&quot;region&quot;</span>
        {": "}
        <span className="lp-s">&quot;us-east-1&quot;</span>
        {"\n}"}
      </pre>
    </PanelShell>
  );
}

function ExperimentsPanel({ active }: { active: boolean }) {
  return (
    <PanelShell active={active} tag="experiment · checkout_v3">
      <div className="lp-exp-card">
        <div className="lp-exp-head">
          <div className="lp-exp-title">
            <span className="lp-icon-square">
              <FlaskIcon size={12} />
            </span>
            checkout_v3
          </div>
          <span className="lp-exp-status">
            <span className="lp-dot" /> LIVE · DAY 6
          </span>
        </div>
        <div className="lp-exp-body">
          <div className="lp-xp-bar">
            <div className="lp-xp-top">
              <span className="lp-v-label">A</span>
              <span className="lp-xp-conv">3.21%</span>
              <span className="lp-xp-delta" style={{ color: "var(--se-fg-3)" }}>
                control
              </span>
            </div>
            <div className="lp-xp-track">
              <div className="lp-xp-fill" style={{ width: "58%" }} />
            </div>
          </div>
          <div className="lp-xp-bar lp-win">
            <div className="lp-xp-top">
              <span className="lp-v-label">B</span>
              <span className="lp-xp-conv">4.82%</span>
              <span className="lp-xp-delta">▲ +49.8% · sig 99.2%</span>
            </div>
            <div className="lp-xp-track">
              <div className="lp-xp-fill" style={{ width: "88%" }} />
            </div>
          </div>
        </div>
      </div>
    </PanelShell>
  );
}

function MetricsPanel({ active }: { active: boolean }) {
  const cards = [
    {
      k: "Activation",
      v: "42.1%",
      d: "+3.2%",
      path: "0,42 14,38 28,40 42,32 56,30 70,24 84,18 100,12",
    },
    {
      k: "D7 retention",
      v: "68.4%",
      d: "+1.1%",
      path: "0,30 14,28 28,32 42,26 56,24 70,22 84,20 100,16",
    },
    {
      k: "$ / user",
      v: "$47.20",
      d: "+$2.18",
      path: "0,38 14,34 28,30 42,32 56,26 70,22 84,18 100,10",
    },
    {
      k: "Error rate",
      v: "0.04%",
      d: "−0.1%",
      path: "0,18 14,20 28,22 42,18 56,16 70,18 84,14 100,12",
      neg: true,
    },
  ];
  return (
    <PanelShell active={active} tag="auto-collected · last 7d">
      <div className="lp-met-grid">
        {cards.map((c) => (
          <div key={c.k} className="lp-met-card">
            <div className="flex items-center">
              <div>
                <div className="lp-met-k">{c.k}</div>
                <div className="lp-met-v">{c.v}</div>
              </div>
              <div className="lp-met-d" style={c.neg ? { color: "var(--se-danger)" } : undefined}>
                {c.d}
              </div>
            </div>
            <svg
              viewBox="0 0 100 50"
              preserveAspectRatio="none"
              className="lp-met-chart"
              aria-hidden
            >
              <polyline points={c.path} fill="none" stroke="var(--se-accent)" strokeWidth="1.4" />
            </svg>
          </div>
        ))}
      </div>
    </PanelShell>
  );
}

function FlaskIcon({ size = 12 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M10 2v7.31" />
      <path d="M14 9.3V2" />
      <path d="M8.5 2h7" />
      <path d="M14 9.3a6.5 6.5 0 0 1 3.92 10.5H6.08A6.5 6.5 0 0 1 10 9.3" />
    </svg>
  );
}
