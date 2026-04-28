"use client";

import { useEffect, useState } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BookOpen,
  Check,
  Code,
  Key,
  Search,
  ShoppingCart,
  Sparkles,
  TrendingUp,
  UserPlus,
  Wand2,
  X,
  Zap,
} from "lucide-react";

import { Button } from "@/components/ui/button";

type CodeToken = readonly [text: string, cls?: "kw" | "fn" | "str" | "num" | "cmt"];

const FRAMEWORKS = [
  { id: "react", label: "React", sub: "Next.js · CRA · Vite" },
  { id: "node", label: "Node", sub: "Express · Fastify · Hono" },
  { id: "rn", label: "React Native", sub: "iOS + Android" },
  { id: "python", label: "Python", sub: "Django · FastAPI · Flask" },
  { id: "go", label: "Go", sub: "net/http · chi · echo" },
  { id: "curl", label: "cURL · HTTP", sub: "Anything else" },
] as const;

type FrameworkId = (typeof FRAMEWORKS)[number]["id"];

const STEPS = ["Install", "Initialize", "Send first event", "Pick starter events", "Done"] as const;

const STARTERS = [
  { id: "user_signup", label: "user_signup", desc: "Account creation", icon: UserPlus },
  { id: "user_checkout", label: "user_checkout", desc: "Purchase completed", icon: ShoppingCart },
  { id: "plan_upgrade", label: "plan_upgrade", desc: "Subscription change", icon: TrendingUp },
  { id: "feature_used", label: "feature_used", desc: "Generic feature flag", icon: Zap },
  { id: "search_executed", label: "search_executed", desc: "Search interactions", icon: Search },
  {
    id: "js_error",
    label: "js_error",
    desc: "Captured automatically",
    icon: AlertTriangle,
    auto: true,
  },
] as const;

const AUTO_COLLECTED = [
  { name: "Web Vitals", desc: "LCP, INP, CLS, TTFB" },
  { name: "JS errors", desc: "Uncaught exceptions, unhandled rejections" },
  { name: "Page views", desc: "SPA & full navigation" },
  { name: "API timing", desc: "fetch + XHR with status codes" },
];

function installCode(fw: FrameworkId): string {
  switch (fw) {
    case "react":
    case "rn":
    case "node":
      return "npm install @shipeasy/sdk";
    case "python":
      return "pip install shipeasy";
    case "go":
      return "go get github.com/shipeasy/sdk-go";
    case "curl":
      return "# no install — just HTTP";
  }
}

function initCode(fw: FrameworkId): CodeToken[][] {
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
  }
}

function PingDetector({ status }: { status: "waiting" | "received" }) {
  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        height: 160,
        background: "var(--se-bg-2)",
        border: "1px solid var(--se-line)",
        borderRadius: "var(--radius-md)",
        overflow: "hidden",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 24,
      }}
    >
      <svg
        width="100%"
        height="100%"
        viewBox="0 0 600 160"
        preserveAspectRatio="none"
        style={{ position: "absolute", inset: 0, opacity: 0.5 }}
        aria-hidden
      >
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <line
            key={i}
            x1="0"
            x2="600"
            y1={20 + i * 24}
            y2={20 + i * 24}
            stroke="var(--se-line)"
            strokeDasharray="2 6"
          />
        ))}
        {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => (
          <line
            key={`v${i}`}
            x1={i * 60}
            x2={i * 60}
            y1="0"
            y2="160"
            stroke="var(--se-line)"
            strokeDasharray="2 6"
          />
        ))}
      </svg>
      <div
        style={{ position: "relative", zIndex: 1, display: "flex", alignItems: "center", gap: 14 }}
      >
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: 14,
            background: "var(--se-bg-1)",
            border: "1px solid var(--se-line-2)",
            display: "grid",
            placeItems: "center",
            color: "var(--se-fg-2)",
          }}
        >
          <Code className="size-6" />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 80 }}>
          <div className="t-mono-xs dim-2">YOUR APP</div>
          <div style={{ fontSize: 13, fontWeight: 500 }}>SDK · v0.9</div>
        </div>
      </div>
      <div
        style={{
          position: "relative",
          flex: 1,
          height: 2,
          background: "var(--se-bg-3)",
          borderRadius: 1,
          overflow: "hidden",
          maxWidth: 200,
          zIndex: 1,
        }}
      >
        <div className={`met-pulse-bar ${status}`} />
      </div>
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
              color: status === "received" ? "var(--se-accent)" : "var(--se-fg)",
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
            background: status === "received" ? "var(--se-accent-soft)" : "var(--se-bg-1)",
            border: `1px solid ${status === "received" ? "color-mix(in oklab, var(--se-accent) 40%, transparent)" : "var(--se-line-2)"}`,
            display: "grid",
            placeItems: "center",
            color: status === "received" ? "var(--se-accent)" : "var(--se-fg-2)",
            transition: "all 0.3s",
          }}
        >
          {status === "received" ? <Check className="size-6" /> : <Activity className="size-6" />}
        </div>
      </div>
    </div>
  );
}

function StepInstall({ fw, setFw }: { fw: FrameworkId; setFw: (f: FrameworkId) => void }) {
  return (
    <div className="met-ob-body">
      <div className="met-ob-heading">
        <div className="t-caps" style={{ color: "var(--se-accent)" }}>
          STEP 1
        </div>
        <h2>What are you shipping from?</h2>
        <p>
          We&apos;ll tailor the install steps. Multi-platform setups can pick more than one later.
        </p>
      </div>
      <div className="grid gap-2.5" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
        {FRAMEWORKS.map((f) => (
          <button
            key={f.id}
            type="button"
            className={`met-ob-card ${fw === f.id ? "on" : ""}`}
            onClick={() => setFw(f.id)}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
              <span
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: 5,
                  background: "var(--se-bg-3)",
                  display: "grid",
                  placeItems: "center",
                  fontSize: 11,
                  fontFamily: "var(--se-mono)",
                  color: fw === f.id ? "var(--se-accent)" : "var(--se-fg-2)",
                }}
              >
                {f.label[0]}
              </span>
              <div style={{ fontSize: 13.5, fontWeight: 500 }}>{f.label}</div>
              {fw === f.id && (
                <Check className="size-3 ml-auto" style={{ color: "var(--se-accent)" }} />
              )}
            </div>
            <div className="t-mono-xs dim-2">{f.sub}</div>
          </button>
        ))}
      </div>
      <div>
        <div className="t-caps dim-2" style={{ marginBottom: 8 }}>
          Install
        </div>
        <div className="met-code-block">{installCode(fw)}</div>
      </div>
      <div
        style={{
          display: "flex",
          gap: 10,
          padding: 14,
          background: "var(--se-bg-2)",
          border: "1px solid var(--se-line)",
          borderRadius: "var(--radius-md)",
        }}
      >
        <Key
          className="size-3.5"
          style={{ color: "var(--se-info)", flexShrink: 0, marginTop: 2 }}
        />
        <div>
          <div className="text-[12.5px]" style={{ fontWeight: 500, marginBottom: 2 }}>
            You&apos;ll need an API key
          </div>
          <div className="text-[12.5px] dim">
            We&apos;ve created <span className="t-mono">sk_live_acme_…7f2a</span> for this project.
            <a href="/dashboard/keys" style={{ color: "var(--se-accent)", marginLeft: 6 }}>
              Manage keys →
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

function StepInit({ fw }: { fw: FrameworkId }) {
  const lines = initCode(fw);
  return (
    <div className="met-ob-body">
      <div className="met-ob-heading">
        <div className="t-caps" style={{ color: "var(--se-accent)" }}>
          STEP 2
        </div>
        <h2>Initialize once, anywhere in your bootstrap</h2>
        <p>
          Auto-collection turns on whatever you flip on. Everything else is opt-in via{" "}
          <span className="t-mono dim">log()</span>.
        </p>
      </div>
      <div className="met-code-block" style={{ minHeight: 160 }}>
        {lines.map((line, i) => (
          <div key={i} style={{ minHeight: "1.7em" }}>
            {line.map(([txt, cls], j) => (
              <span key={j} className={cls ?? ""}>
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
        <div className="grid gap-2" style={{ gridTemplateColumns: "1fr 1fr" }}>
          {AUTO_COLLECTED.map((a) => (
            <div
              key={a.name}
              style={{
                padding: "10px 12px",
                background: "var(--se-bg-2)",
                border: "1px solid var(--se-line)",
                borderRadius: "var(--radius-md)",
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
                  background: "var(--se-accent)",
                  boxShadow: "0 0 0 3px color-mix(in oklab, var(--se-accent) 22%, transparent)",
                }}
              />
              <div>
                <div style={{ fontSize: 12.5, fontWeight: 500 }}>{a.name}</div>
                <div className="t-mono-xs dim-2" style={{ marginTop: 2 }}>
                  {a.desc}
                </div>
              </div>
              <span className="met-toggle on" style={{ marginLeft: "auto" }} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function StepVerify({
  status,
  onSimulate,
  onReset,
}: {
  status: "waiting" | "received";
  onSimulate: () => void;
  onReset: () => void;
}) {
  return (
    <div className="met-ob-body">
      <div className="met-ob-heading">
        <div className="t-caps" style={{ color: "var(--se-accent)" }}>
          STEP 3
        </div>
        <h2>Send your first event</h2>
        <p>
          Drop this anywhere in your code — a button handler, a route, a script. We&apos;ll detect
          it live.
        </p>
      </div>
      <div className="met-code-block">
        <span className="fn">log</span>(<span className="str">{"'hello_shipeasy'"}</span>);
      </div>
      <PingDetector status={status} />
      {status === "waiting" ? (
        <div
          style={{
            display: "flex",
            gap: 10,
            padding: "12px 14px",
            background: "var(--se-bg-2)",
            border: "1px dashed var(--se-line-2)",
            borderRadius: "var(--radius-md)",
            alignItems: "center",
          }}
        >
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: "var(--se-warn)",
              animation: "met-blink 1s infinite",
            }}
          />
          <span className="text-[12.5px]" style={{ color: "var(--se-fg)" }}>
            Listening for your first event…
          </span>
          <span className="t-mono-xs dim-2" style={{ marginLeft: "auto" }}>
            can&apos;t run code right now?
          </span>
          <Button variant="ghost" size="sm" onClick={onSimulate}>
            <Wand2 className="size-3" /> Simulate it
          </Button>
        </div>
      ) : (
        <div
          style={{
            display: "flex",
            gap: 10,
            padding: "12px 14px",
            background: "var(--se-accent-soft)",
            border: "1px solid color-mix(in oklab, var(--se-accent) 35%, transparent)",
            borderRadius: "var(--radius-md)",
            alignItems: "center",
          }}
        >
          <Check className="size-3.5" style={{ color: "var(--se-accent)" }} />
          <div>
            <div className="text-[12.5px]" style={{ fontWeight: 500 }}>
              <span className="t-mono">hello_shipeasy</span> received from{" "}
              <span className="t-mono dim">192.168.1.42</span>
            </div>
            <div className="t-mono-xs dim-2" style={{ marginTop: 2 }}>
              roundtrip 64ms · React 18.3 · Chrome 132
            </div>
          </div>
          <Button variant="ghost" size="sm" style={{ marginLeft: "auto" }} onClick={onReset}>
            Reset
          </Button>
        </div>
      )}
    </div>
  );
}

function StepStarters({
  picked,
  togglePick,
}: {
  picked: string[];
  togglePick: (id: string) => void;
}) {
  return (
    <div className="met-ob-body">
      <div className="met-ob-heading">
        <div className="t-caps" style={{ color: "var(--se-accent)" }}>
          STEP 4
        </div>
        <h2>Pick events you want to track</h2>
        <p>
          Common ones to get you started — all editable later. Skip if you&apos;d rather declare
          from scratch.
        </p>
      </div>
      <div className="grid gap-2" style={{ gridTemplateColumns: "1fr 1fr" }}>
        {STARTERS.map((s) => {
          const on = picked.includes(s.id);
          const auto = "auto" in s && s.auto;
          const Icon = s.icon;
          return (
            <button
              key={s.id}
              type="button"
              className={`met-ob-card ${on ? "on" : ""}`}
              onClick={() => !auto && togglePick(s.id)}
              disabled={auto}
              style={auto ? { opacity: 0.7, cursor: "default" } : {}}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Icon
                  className="size-3.5"
                  style={{ color: on ? "var(--se-accent)" : "var(--se-fg-2)" }}
                />
                <span style={{ fontFamily: "var(--se-mono)", fontSize: 12.5, fontWeight: 500 }}>
                  {s.label}
                </span>
                {auto ? (
                  <span
                    className="met-badge"
                    style={{
                      marginLeft: "auto",
                      background: "var(--se-info-soft)",
                      color: "var(--se-info)",
                      borderColor: "color-mix(in oklab, var(--se-info) 30%, transparent)",
                      fontSize: 9,
                    }}
                  >
                    AUTO
                  </span>
                ) : (
                  <span
                    style={{
                      marginLeft: "auto",
                      width: 16,
                      height: 16,
                      borderRadius: 4,
                      border: `1.5px solid ${on ? "var(--se-accent)" : "var(--se-line-3)"}`,
                      background: on ? "var(--se-accent)" : "var(--se-bg-2)",
                      display: "grid",
                      placeItems: "center",
                    }}
                  >
                    {on && <Check className="size-2.5" style={{ color: "#07120d" }} />}
                  </span>
                )}
              </div>
              <div className="t-mono-xs dim-2" style={{ marginTop: 6 }}>
                {s.desc}
              </div>
            </button>
          );
        })}
      </div>
      <div className="met-code-block">
        <span className="cmt">
          {"// Once registered, calls just work — autocomplete in your IDE"}
        </span>
        {"\n"}
        {picked.slice(0, 3).map((p) => (
          <div key={p}>
            <span className="fn">log</span>(<span className="str">{`'${p}'`}</span>
            {p === "user_checkout" && (
              <>
                , {"{"} <span style={{ color: "var(--se-fg)" }}>amount</span>:{" "}
                <span className="num">129.00</span>,{" "}
                <span style={{ color: "var(--se-fg)" }}>plan</span>:{" "}
                <span className="str">{"'pro'"}</span> {"}"}
              </>
            )}
            {p === "plan_upgrade" && (
              <>
                , {"{"} <span style={{ color: "var(--se-fg)" }}>from</span>:{" "}
                <span className="str">{"'free'"}</span>,{" "}
                <span style={{ color: "var(--se-fg)" }}>to</span>:{" "}
                <span className="str">{"'pro'"}</span> {"}"}
              </>
            )}
            {p === "search_executed" && (
              <>
                , {"{"} <span style={{ color: "var(--se-fg)" }}>query</span>:{" "}
                <span className="str">{"'invoice'"}</span> {"}"}
              </>
            )}
            );
          </div>
        ))}
      </div>
    </div>
  );
}

function StepDone({ picked }: { picked: string[] }) {
  return (
    <div className="met-ob-body" style={{ alignItems: "center", textAlign: "center", gap: 18 }}>
      <div
        style={{
          width: 92,
          height: 92,
          borderRadius: 24,
          background: "var(--se-accent-soft)",
          border: "1px solid color-mix(in oklab, var(--se-accent) 35%, transparent)",
          display: "grid",
          placeItems: "center",
          color: "var(--se-accent)",
          boxShadow: "0 20px 60px -20px color-mix(in oklab, var(--se-accent) 50%, transparent)",
        }}
      >
        <Check className="size-10" />
      </div>
      <div>
        <h2 style={{ margin: 0, fontSize: 24, letterSpacing: "-0.02em", fontWeight: 500 }}>
          You&apos;re all set
        </h2>
        <p style={{ margin: "6px 0 0", color: "var(--se-fg-2)", maxWidth: "42ch" }}>
          You&apos;re all set. Events flow in within seconds.
        </p>
      </div>
      <div
        className="grid gap-2.5 w-full"
        style={{ gridTemplateColumns: "repeat(3, 1fr)", marginTop: 8 }}
      >
        <div
          style={{
            padding: 14,
            background: "var(--se-bg-2)",
            border: "1px solid var(--se-line)",
            borderRadius: "var(--radius-md)",
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
            background: "var(--se-bg-2)",
            border: "1px solid var(--se-line)",
            borderRadius: "var(--radius-md)",
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
              color: "var(--se-accent)",
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
            background: "var(--se-bg-2)",
            border: "1px solid var(--se-line)",
            borderRadius: "var(--radius-md)",
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
              color: "var(--se-accent)",
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
                background: "var(--se-accent)",
                boxShadow: "0 0 0 3px color-mix(in oklab, var(--se-accent) 22%, transparent)",
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

export function OnboardingWizard({
  onClose,
  onComplete,
}: {
  onClose: () => void;
  onComplete: () => void;
}) {
  const [step, setStep] = useState(0);
  const [fw, setFw] = useState<FrameworkId>("react");
  const [picked, setPicked] = useState<string[]>(["user_checkout", "feature_used"]);
  const [pingStatus, setPingStatus] = useState<"waiting" | "received">("waiting");

  useEffect(() => {
    if (step === 2 && pingStatus === "waiting") {
      const t = setTimeout(() => setPingStatus("received"), 2400);
      return () => clearTimeout(t);
    }
  }, [step, pingStatus]);

  const togglePick = (id: string) =>
    setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  const next = () => setStep((s) => Math.min(s + 1, STEPS.length - 1));
  const back = () => setStep((s) => Math.max(s - 1, 0));

  return (
    <div
      className="met-ob-bg"
      onClick={onClose}
      role="dialog"
      aria-label="Metrics onboarding"
      aria-modal="true"
    >
      <div className="met-ob" onClick={(e) => e.stopPropagation()}>
        <div className="met-ob-rail">
          <div className="met-ob-brand">
            <div
              className="met-ob-mark"
              style={{
                background:
                  "conic-gradient(from 140deg, var(--se-accent), var(--se-bg) 40%, var(--se-accent) 80%)",
              }}
            />
            <div>
              <div style={{ fontSize: 13, fontWeight: 600 }}>Set up Metrics</div>
              <div className="t-mono-xs dim-2" style={{ marginTop: 2 }}>
                Auto-collect web vitals + your own log() events
              </div>
            </div>
          </div>
          <div className="met-ob-steps">
            {STEPS.map((s, i) => (
              <button
                key={i}
                type="button"
                className={`met-ob-step ${i === step ? "on" : ""} ${i < step ? "done" : ""}`}
                onClick={() => i <= step && setStep(i)}
                disabled={i > step}
              >
                <div className="dot">
                  {i < step ? (
                    <Check className="size-2.5" />
                  ) : i === step ? (
                    <span className="pulse" />
                  ) : (
                    <span>{i + 1}</span>
                  )}
                </div>
                <span>{s}</span>
              </button>
            ))}
          </div>
          <div style={{ flex: 1 }} />
          <div className="met-ob-help">
            <div className="t-caps dim-2" style={{ marginBottom: 6 }}>
              Need help
            </div>
            <a
              className="met-ob-help-row"
              href="https://docs.shipeasy.ai"
              target="_blank"
              rel="noreferrer"
            >
              <BookOpen className="size-3" /> Read the docs
            </a>
            <a
              className="met-ob-help-row"
              href="https://docs.shipeasy.ai/examples"
              target="_blank"
              rel="noreferrer"
            >
              <Code className="size-3" /> Browse examples
            </a>
            <span className="met-ob-help-row">
              <Sparkles className="size-3" /> Ask Claude
            </span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            style={{ marginTop: 8, justifyContent: "center" }}
            onClick={onComplete}
          >
            Skip · explore with demo data
          </Button>
        </div>

        <div className="met-ob-main">
          <button type="button" className="met-ob-x" onClick={onClose} aria-label="Close wizard">
            <X className="size-3.5" />
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
          {step === 3 && <StepStarters picked={picked} togglePick={togglePick} />}
          {step === 4 && <StepDone picked={picked} />}

          <div className="met-ob-foot">
            <div className="t-mono-xs dim-2">
              Step {step + 1} of {STEPS.length}
            </div>
            <div className="met-ob-foot-bar">
              {STEPS.map((_, i) => (
                <div key={i} className={`seg ${i <= step ? "on" : ""}`} />
              ))}
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              {step > 0 && (
                <Button variant="ghost" onClick={back}>
                  Back
                </Button>
              )}
              {step < STEPS.length - 1 ? (
                <Button onClick={next} disabled={step === 2 && pingStatus !== "received"}>
                  {step === 2 && pingStatus !== "received" ? "Waiting…" : "Continue"}{" "}
                  <ArrowRight className="size-3" />
                </Button>
              ) : (
                <Button onClick={onComplete}>
                  <Check className="size-3" /> Open dashboard
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
