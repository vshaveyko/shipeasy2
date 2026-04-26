import type { ReactNode } from "react";
import { ArrowRight, Zap } from "lucide-react";

import { LinkButton } from "@/components/ui/link-button";

type CodeToken = string | { kind: "kw" | "fn" | "str" | "num" | "cmt" | "cursor"; text?: string };

type CodeLine =
  | { type: "blank" }
  | { type: "cmt"; text: string }
  | { type: "cmd"; tokens: CodeToken[] }
  | { type: "line"; tokens: CodeToken[] };

type EmptyConfig = {
  eyebrow: string;
  eyebrowAside: string;
  title: string;
  titleAccent: string;
  sub: string;
  file: string;
  code: CodeLine[];
  stats: { v: string; l: string; d: string }[];
  cta: string;
  ctaHref: string;
  demo?: string;
  demoHref?: string;
};

const CONFIGS: Record<string, EmptyConfig> = {
  gates: {
    eyebrow: "GATES",
    eyebrowAside: "no gates defined",
    title: "Decide who sees what,",
    titleAccent: "in microseconds.",
    sub: "Flag-checks under 5ms, evaluated edge-side. Built-in gates work out of the box. Custom gates run your own predicates on request context.",
    file: "~/your-app · render.tsx",
    code: [
      { type: "cmt", text: "// check a gate" },
      {
        type: "line",
        tokens: [
          { kind: "kw", text: "if" },
          " (",
          { kind: "fn", text: "gate" },
          "(",
          { kind: "str", text: "'premium_features'" },
          ", user)) {",
        ],
      },
      {
        type: "line",
        tokens: ["  ", { kind: "fn", text: "renderProDashboard" }, "();"],
      },
      { type: "line", tokens: ["}"] },
      { type: "blank" },
      { type: "cmt", text: "// or define a custom gate" },
      {
        type: "line",
        tokens: [
          { kind: "fn", text: "defineGate" },
          "(",
          { kind: "str", text: "'high_value_customer'" },
          ", (ctx) => {",
        ],
      },
      {
        type: "line",
        tokens: [
          "  ",
          { kind: "kw", text: "return" },
          " ctx.user.ltv > ",
          { kind: "num", text: "1000" },
          ";",
        ],
      },
      { type: "line", tokens: ["});", { kind: "cursor" }] },
    ],
    stats: [
      { v: "5", l: "built-in gates", d: "employee · mobile · EU · admin · trial" },
      { v: "<5ms", l: "p50 evaluation", d: "edge-cached, 60+ regions" },
      { v: "0", l: "roundtrips to backend", d: "rules sync via long-poll" },
    ],
    cta: "Define your first gate",
    ctaHref: "/dashboard/gates/new",
  },

  experiments: {
    eyebrow: "EXPERIMENTS",
    eyebrowAside: "no experiments running",
    title: "Ship the version",
    titleAccent: "that actually wins.",
    sub: "A/B test anything with continuous significance. Wrap your variant in one call — Shipeasy splits traffic, computes lift, and tells you exactly when to ship or kill.",
    file: "~/your-app · checkout.tsx",
    code: [
      { type: "cmt", text: "// declare an experiment" },
      {
        type: "line",
        tokens: [
          { kind: "kw", text: "const" },
          " variant = ",
          { kind: "fn", text: "experiment" },
          "(",
          { kind: "str", text: "'checkout_v3'" },
          ", {",
        ],
      },
      {
        type: "line",
        tokens: [
          "  variants: [",
          { kind: "str", text: "'control'" },
          ", ",
          { kind: "str", text: "'three_step'" },
          "],",
        ],
      },
      { type: "line", tokens: ["  traffic: ", { kind: "num", text: "0.5" }, ","] },
      { type: "line", tokens: ["});"] },
      { type: "blank" },
      { type: "cmt", text: "// branch on the assignment" },
      {
        type: "line",
        tokens: [
          { kind: "kw", text: "if" },
          " (variant === ",
          { kind: "str", text: "'three_step'" },
          ") {",
        ],
      },
      {
        type: "line",
        tokens: ["  ", { kind: "fn", text: "renderThreeStep" }, "();", { kind: "cursor" }],
      },
    ],
    stats: [
      { v: "1", l: "line to start a test", d: "experiment(key, variants)" },
      { v: "24/7", l: "stat-sig calc", d: "continuous monitoring · auto-stop" },
      { v: "0", l: "redeploys to flip", d: "change traffic from the dashboard" },
    ],
    cta: "Create first experiment",
    ctaHref: "/dashboard/experiments/new",
  },

  configs: {
    eyebrow: "CONFIGS",
    eyebrowAside: "no remote config yet",
    title: "Tune your app",
    titleAccent: "without redeploying.",
    sub: "Versioned, environment-aware key/value configs with type safety. Change a timeout, swap a model, lift a rate-limit — all without touching code or shipping a new build.",
    file: "~/your-app · runtime.ts",
    code: [
      { type: "cmt", text: "// read typed configs at runtime" },
      {
        type: "line",
        tokens: [
          { kind: "kw", text: "const" },
          " { timeout, model, retries } = ",
          { kind: "fn", text: "config" },
          "({",
        ],
      },
      { type: "line", tokens: ["  timeout: ", { kind: "num", text: "30000" }, ","] },
      {
        type: "line",
        tokens: ["  model: ", { kind: "str", text: "'claude-haiku-4-5'" }, ","],
      },
      { type: "line", tokens: ["  retries: ", { kind: "num", text: "3" }, ","] },
      { type: "line", tokens: ["});", { kind: "cursor" }] },
    ],
    stats: [
      { v: "∞", l: "env overrides", d: "dev · staging · prod · per-region" },
      { v: "0ms", l: "restart to apply", d: "changes stream in over web-socket" },
      { v: "TS", l: "type-checked schemas", d: "caught at build time, not 3am" },
    ],
    cta: "Define your first config",
    ctaHref: "/dashboard/configs/new",
  },

  keys: {
    eyebrow: "API KEYS",
    eyebrowAside: "no keys issued",
    title: "One key per surface,",
    titleAccent: "rotate without fear.",
    sub: "Server, client, and admin keys are scoped separately. Generate one per environment, ship it via env vars, and rotate the moment something looks off — no redeploys needed.",
    file: "~/your-app · .env.production",
    code: [
      { type: "cmt", text: "// server-side, full read of flags + experiments" },
      { type: "cmd", tokens: ["SHIPEASY_SERVER_KEY=", { kind: "str", text: "se_srv_…" }] },
      { type: "blank" },
      { type: "cmt", text: "// browser-safe, evaluate-only" },
      { type: "cmd", tokens: ["SHIPEASY_CLIENT_KEY=", { kind: "str", text: "se_clt_…" }] },
      { type: "blank" },
      { type: "cmt", text: "// admin REST (CLI / scripts) — shown once, rotate often" },
      {
        type: "cmd",
        tokens: ["SHIPEASY_ADMIN_KEY=", { kind: "str", text: "se_adm_…" }, { kind: "cursor" }],
      },
    ],
    stats: [
      { v: "3", l: "scoped key types", d: "server · client · admin" },
      { v: "1-click", l: "rotation", d: "revoke and re-issue without downtime" },
      { v: "0", l: "secrets in git", d: "shown once at create-time" },
    ],
    cta: "Create your first key",
    ctaHref: "#create-key",
  },
};

function renderToken(t: CodeToken, key: number): ReactNode {
  if (typeof t === "string") return <span key={key}>{t}</span>;
  if (t.kind === "cursor") return <span key={key} className="hero-empty-cursor" />;
  return (
    <span key={key} className={`hero-empty-${t.kind}`}>
      {t.text}
    </span>
  );
}

function CodeLineRow({ line, n }: { line: CodeLine; n: number }) {
  if (line.type === "blank") {
    return (
      <div>
        <span className="hero-empty-ln">{n}</span>
        <span>&nbsp;</span>
      </div>
    );
  }
  if (line.type === "cmt") {
    return (
      <div>
        <span className="hero-empty-ln">{n}</span>
        <span>
          <span className="hero-empty-cmt">{line.text}</span>
        </span>
      </div>
    );
  }
  return (
    <div>
      <span className="hero-empty-ln">{n}</span>
      <span>{line.tokens.map((t, i) => renderToken(t, i))}</span>
    </div>
  );
}

export function HeroEmptyState({
  kind,
  ctaHref,
  ctaLabel,
  demoHref,
  demoLabel,
  extraAction,
}: {
  kind: keyof typeof CONFIGS;
  ctaHref?: string;
  ctaLabel?: string;
  demoHref?: string;
  demoLabel?: string;
  extraAction?: ReactNode;
}) {
  const c = CONFIGS[kind];
  const href = ctaHref ?? c.ctaHref;
  const label = ctaLabel ?? c.cta;

  return (
    <div className="hero-empty-stage">
      <div className="hero-empty-grid" aria-hidden>
        <svg width="100%" height="100%" preserveAspectRatio="none" viewBox="0 0 1200 600">
          <defs>
            <pattern
              id={`hero-empty-grid-${kind}`}
              width="40"
              height="40"
              patternUnits="userSpaceOnUse"
            >
              <path d="M40 0 L0 0 0 40" fill="none" stroke="var(--se-line)" strokeWidth="0.5" />
            </pattern>
            <radialGradient id={`hero-empty-glow-${kind}`} cx="50%" cy="40%" r="50%">
              <stop offset="0%" stopColor="var(--se-accent)" stopOpacity="0.18" />
              <stop offset="60%" stopColor="var(--se-accent)" stopOpacity="0.04" />
              <stop offset="100%" stopColor="var(--se-accent)" stopOpacity="0" />
            </radialGradient>
          </defs>
          <rect width="100%" height="100%" fill={`url(#hero-empty-grid-${kind})`} />
          <rect width="100%" height="100%" fill={`url(#hero-empty-glow-${kind})`} />
        </svg>
        <svg
          className="hero-empty-scatter"
          width="100%"
          height="100%"
          preserveAspectRatio="none"
          viewBox="0 0 1200 600"
        >
          <polyline
            points="60,420 220,380 380,330 540,320 700,300 860,240 1020,180 1140,140"
            fill="none"
            stroke="var(--se-accent)"
            strokeWidth="1.5"
            strokeOpacity=".55"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <polyline
            points="60,500 220,470 380,455 540,440 700,420 860,395 1020,370 1140,340"
            fill="none"
            stroke="var(--se-info)"
            strokeWidth="1.5"
            strokeOpacity=".4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      <div className="hero-empty-content">
        <div className="hero-empty-eyebrow">
          <span className="dot" />
          <span>{c.eyebrow}</span>
          <span className="dim-3">·</span>
          <span style={{ color: "var(--se-fg-3)" }}>{c.eyebrowAside}</span>
        </div>

        <h1 className="hero-empty-title">
          <span>{c.title}</span>{" "}
          <span
            style={{
              color: "var(--se-accent)",
              fontFamily: "var(--se-serif)",
              fontStyle: "italic",
              fontWeight: 400,
            }}
          >
            {c.titleAccent}
          </span>
        </h1>
        <p className="hero-empty-sub">{c.sub}</p>

        <div className="hero-empty-terminal">
          <div className="hero-empty-term-head">
            <span className="dot r" />
            <span className="dot y" />
            <span className="dot g" />
            <span
              className="t-mono-xs dim-2"
              style={{ marginLeft: 8, fontFamily: "var(--se-mono)", fontSize: 11 }}
            >
              {c.file}
            </span>
          </div>
          <div className="hero-empty-term-body">
            {c.code.map((line, i) => (
              <CodeLineRow key={i} line={line} n={i + 1} />
            ))}
          </div>
        </div>

        <div className="hero-empty-cta">
          {extraAction ? (
            extraAction
          ) : (
            <LinkButton href={href} className="h-10 px-4 text-[14px]">
              <Zap className="size-3.5" /> {label}
            </LinkButton>
          )}
          {demoHref ? (
            <LinkButton variant="ghost" href={demoHref} className="h-10 px-4 text-[14px]">
              {demoLabel ?? "Explore demo"} <ArrowRight className="size-3" />
            </LinkButton>
          ) : null}
        </div>

        <div className="hero-empty-stats">
          {c.stats.map((s, i) => (
            <div key={i} className="hero-empty-stat">
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
