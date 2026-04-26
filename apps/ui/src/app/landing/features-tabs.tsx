"use client";

import { useEffect, useState } from "react";
import {
  FlaskConical,
  LineChart,
  Power,
  SlidersHorizontal,
  Sparkles,
  type LucideIcon,
} from "lucide-react";

interface Feature {
  key: string;
  icon: LucideIcon;
  label: string;
  short: string;
  title: string;
  desc: string;
}

const FEATURES: Feature[] = [
  {
    key: "killswitch",
    icon: Power,
    label: "Killswitches",
    short: "Disable any feature in under 200ms.",
    title: "Kill a bad feature before it kills you.",
    desc: "Every flag is a killswitch. Pull it manually, or set a guardrail — error rate, p95 latency, spend — and Shipeasy yanks it for you. Globally, in under 200ms, fully logged.",
  },
  {
    key: "config",
    icon: SlidersHorizontal,
    label: "Configs",
    short: "Typed, targeted, live-editable.",
    title: "Tweak runtime behaviour without redeploying.",
    desc: "Typed runtime configs targeted by user, plan, geo, or anything you send. Edit from Claude, the dashboard, or a PR. Versioned, auditable, and — yes — reversible.",
  },
  {
    key: "experiment",
    icon: FlaskConical,
    label: "Experiments",
    short: "A/B/n with sequential stats.",
    title: "Run A/B/n tests that know when to stop.",
    desc: "Sequential stats mean you can peek whenever you want without inflating false positives. Auto-ramping, SRM detection, guardrails. Say “try this” — Claude writes the code.",
  },
  {
    key: "metrics",
    icon: LineChart,
    label: "Metrics",
    short: "Activation, retention, revenue — auto.",
    title: "The metrics you need, collected for you.",
    desc: "Activation, retention, revenue, and error rate are instrumented from day one. Add custom metrics with one line of code. Claude can query them in conversation.",
  },
];

function KillswitchDemo() {
  const [step, setStep] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setStep((s) => (s + 1) % 3), 2800);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="lp-ks-demo">
      <div className="lp-ks-item">
        <Power className="size-3.5" style={{ color: "var(--se-accent)" }} />
        <span className="lp-k-name">new_checkout</span>
        <span className="lp-ks-latency">
          errors <b>0.04%</b>
        </span>
        <div className="lp-ks-switch" />
      </div>

      <div className={`lp-ks-item ${step >= 1 ? "lp-killed" : ""}`}>
        <Power
          className="size-3.5"
          style={{ color: step >= 1 ? "var(--se-danger)" : "var(--se-accent)" }}
        />
        <span className="lp-k-name">ai_recommendations</span>
        <span className="lp-ks-latency">
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
        <div className={`lp-ks-switch ${step >= 1 ? "lp-off" : ""}`} />
      </div>

      <div className={`lp-ks-item ${step >= 2 ? "lp-killed" : ""}`}>
        <Power
          className="size-3.5"
          style={{ color: step >= 2 ? "var(--se-danger)" : "var(--se-accent)" }}
        />
        <span className="lp-k-name">legacy_uploader</span>
        <span className="lp-ks-latency">
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
        <div className={`lp-ks-switch ${step >= 2 ? "lp-off" : ""}`} />
      </div>

      <div className="lp-ks-foot">
        <Sparkles className="size-[11px]" style={{ color: "var(--se-accent)" }} />
        guardrail auto-triggered — global kill in <b>&lt; 200ms</b>
      </div>
    </div>
  );
}

type CfgVal = string | number | boolean;
const CFG_DEFAULT = { max_uploads: 25, model: "sonnet-4.5", enable_v2: true } as const;

function ConfigDemo() {
  const [v, setV] = useState<{ [k: string]: CfgVal }>({ ...CFG_DEFAULT });
  const [edited, setEdited] = useState<string | null>(null);
  const [cycle, setCycle] = useState(0);
  useEffect(() => {
    const steps: { delay: number; key?: string; val?: CfgVal; reset?: boolean }[] = [
      { delay: 1500, key: "max_uploads", val: 100 },
      { delay: 3000, key: "model", val: "opus-4.1" },
      { delay: 4500, key: "enable_v2", val: false },
      { delay: 6000, reset: true },
      { delay: 6800, reset: true }, // small gap before next cycle
    ];
    const timers = steps.map((s) =>
      setTimeout(() => {
        if (s.reset) {
          setV({ ...CFG_DEFAULT });
          setEdited(null);
        } else if (s.key !== undefined) {
          setV((x) => ({ ...x, [s.key!]: s.val as CfgVal }));
          setEdited(s.key);
        }
      }, s.delay),
    );
    const restart = setTimeout(() => setCycle((c) => c + 1), 7200);
    return () => {
      timers.forEach(clearTimeout);
      clearTimeout(restart);
    };
  }, [cycle]);

  const fmt = (k: string, val: CfgVal) => {
    const cls = edited === k ? "lp-edited" : "";
    if (typeof val === "string")
      return (
        <span className={cls}>
          <span className="lp-s">&quot;{val}&quot;</span>
        </span>
      );
    if (typeof val === "boolean")
      return (
        <span className={cls}>
          <span className="lp-n">{String(val)}</span>
        </span>
      );
    return (
      <span className={cls}>
        <span className="lp-n">{val}</span>
      </span>
    );
  };

  return (
    <div className="lp-cfg-demo">
      <div className="lp-cfg-col">
        <h6>you · claude</h6>
        <div className="lp-cfg-conv">
          <div>
            <span className="lp-prompt">&gt; </span>bump max_uploads to 100 for pro plan
          </div>
          <div className="lp-out">↳ ✓ updated · reverted in 5m if errors spike</div>
          <div className="h-1.5" />
          <div>
            <span className="lp-prompt">&gt; </span>try opus for the assistant
          </div>
          <div className="lp-out">↳ ✓ 10% rollout</div>
          <div className="h-1.5" />
          <div>
            <span className="lp-prompt">&gt; </span>disable v2 — latency regressed
          </div>
          <div className="lp-out">↳ ✓ disabled globally · 168ms</div>
        </div>
      </div>
      <div className="lp-cfg-col">
        <h6>runtime config · live</h6>
        <pre className="lp-cfg-json">
          {"{\n  "}
          <span className="lp-k">&quot;max_uploads&quot;</span>
          {": "}
          {fmt("max_uploads", v.max_uploads)}
          {",\n  "}
          <span className="lp-k">&quot;model&quot;</span>
          {": "}
          {fmt("model", v.model)}
          {",\n  "}
          <span className="lp-k">&quot;enable_v2&quot;</span>
          {": "}
          {fmt("enable_v2", v.enable_v2)}
          {"\n}"}
        </pre>
      </div>
    </div>
  );
}

function ExperimentDemo() {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick((x) => x + 1), 100);
    return () => clearInterval(t);
  }, []);
  const progress = Math.min(1, (tick % 60) / 50);
  const convA = 3.2 + Math.sin(tick / 8) * 0.05;
  const convB = 3.2 + progress * 1.5 + Math.sin(tick / 6) * 0.1;
  const delta = ((convB - convA) / convA) * 100;

  return (
    <div className="lp-xp-demo">
      <div className="lp-xp-header">
        <FlaskConical className="size-3.5" style={{ color: "var(--se-accent)" }} />
        <span className="lp-xp-name">checkout_v3</span>
        <span className="lp-xp-day">
          day {Math.floor(progress * 14)} · n={(tick * 23).toLocaleString()}
        </span>
      </div>

      <div className="lp-xp-bar">
        <div className="lp-xp-bar-top">
          <span className="lp-xp-label">A</span>
          <span className="lp-xp-conv">{convA.toFixed(2)}%</span>
          <span className="lp-xp-delta" style={{ color: "var(--se-fg-3)" }}>
            control
          </span>
        </div>
        <div className="lp-xp-bar-track">
          <div className="lp-xp-bar-fill" style={{ width: `${convA * 18}%` }} />
        </div>
      </div>

      <div className="lp-xp-bar lp-winner">
        <div className="lp-xp-bar-top">
          <span className="lp-xp-label">B</span>
          <span className="lp-xp-conv">{convB.toFixed(2)}%</span>
          <span className="lp-xp-delta">
            ▲ +{delta.toFixed(1)}% · sig {Math.min(99.8, 80 + progress * 20).toFixed(1)}%
          </span>
        </div>
        <div className="lp-xp-bar-track">
          <div className="lp-xp-bar-fill" style={{ width: `${convB * 18}%` }} />
        </div>
      </div>

      {progress > 0.8 && (
        <div className="lp-ks-foot">
          <Sparkles className="size-[11px]" style={{ color: "var(--se-accent)" }} />
          Clear winner. <b>Auto-ramping</b> variant B to 100% over 48h.
        </div>
      )}
    </div>
  );
}

function MetricsDemo() {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick((x) => x + 1), 140);
    return () => clearInterval(t);
  }, []);

  const mkPath = (seed: number, up: boolean) => {
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
    <div className="lp-met-demo">
      {stats.map((s) => (
        <div key={s.k} className="lp-met-card">
          <div className="flex items-center">
            <div>
              <div className="lp-met-k">{s.k}</div>
              <div className="lp-met-v">{s.v}</div>
            </div>
            <div className="lp-met-d">{s.d}</div>
          </div>
          <svg viewBox="0 0 100 60" preserveAspectRatio="none" className="lp-met-chart">
            <polyline
              points={mkPath(s.seed, s.up)}
              fill="none"
              stroke="var(--se-accent)"
              strokeWidth="1.2"
            />
          </svg>
        </div>
      ))}
    </div>
  );
}

const DEMOS = [KillswitchDemo, ConfigDemo, ExperimentDemo, MetricsDemo];

export function LandingFeaturesTabs() {
  const [active, setActive] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setActive((a) => (a + 1) % FEATURES.length), 7500);
    return () => clearInterval(t);
  }, [active]);
  const f = FEATURES[active];
  const Icon = f.icon;
  const Demo = DEMOS[active];

  return (
    <section className="lp-section" id="features">
      <div className="mx-auto max-w-[1240px] px-7">
        <div className="lp-sec-head">
          <div className="lp-reveal lp-in">
            <div className="lp-sec-eyebrow">
              <span className="lp-num">01</span> / primitives
            </div>
            <h2 className="lp-sec-title">
              Four primitives. <em>One</em> platform.
            </h2>
          </div>
          <p className="lp-sec-sub lp-reveal lp-d1 lp-in">
            Everything you need to ship behind a flag, measure what happens, and yank it if it
            misbehaves.
          </p>
        </div>

        <div className="lp-ftabs lp-reveal lp-d2 lp-in">
          <div className="lp-ftabs-nav" role="tablist">
            {FEATURES.map((feat, i) => {
              const I = feat.icon;
              return (
                <button
                  key={feat.key}
                  role="tab"
                  aria-selected={active === i}
                  className={`lp-ftab ${active === i ? "lp-active" : ""}`}
                  onClick={() => setActive(i)}
                >
                  <div className="lp-ftab-icon">
                    <I className="size-3.5" />
                  </div>
                  <div>
                    <div className="lp-ftab-label">{feat.label}</div>
                    <div className="lp-ftab-desc">{feat.short}</div>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="lp-ftabs-pane" key={active}>
            <div className="flex items-center gap-2.5">
              <div
                className="lp-ftab-icon"
                style={{
                  background: "var(--se-accent-soft)",
                  color: "var(--se-accent)",
                  borderColor: "color-mix(in oklab, var(--se-accent) 30%, transparent)",
                }}
              >
                <Icon className="size-3.5" />
              </div>
              <div
                className="font-mono text-[10.5px] uppercase tracking-[0.08em]"
                style={{ color: "var(--se-fg-4)" }}
              >
                0{active + 1} · {f.label}
              </div>
            </div>
            <h3 className="lp-ftabs-pane-title">{f.title}</h3>
            <p className="lp-ftabs-pane-sub">{f.desc}</p>
            <div className="lp-ftabs-stage">
              <Demo />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
