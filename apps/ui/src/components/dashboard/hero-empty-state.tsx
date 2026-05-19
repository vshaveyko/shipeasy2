"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { ArrowRight, Zap } from "lucide-react";

import { LinkButton } from "@/components/ui/link-button";

function scopeHref(href: string, projectId: string): string {
  if (!projectId) return href;
  if (!href.startsWith("/dashboard/")) return href;
  // Already scoped: /dashboard/<projectId>/...
  if (href === `/dashboard/${projectId}` || href.startsWith(`/dashboard/${projectId}/`)) {
    return href;
  }
  // Workspace-level routes that intentionally live outside the project scope.
  const workspaceRoots = ["projects", "team", "billing"];
  const segment = href.slice("/dashboard/".length).split(/[/?#]/)[0];
  if (workspaceRoots.includes(segment)) return href;
  return href.replace("/dashboard/", `/dashboard/${projectId}/`);
}

function projectIdFromPath(pathname: string | null): string {
  if (!pathname) return "";
  const m = pathname.match(/^\/dashboard\/([^/]+)/);
  if (!m) return "";
  const seg = m[1];
  // workspace-level routes — no project scope
  if (seg === "projects" || seg === "team" || seg === "billing") return "";
  return seg;
}

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
  metrics: {
    eyebrow: "METRICS",
    eyebrowAside: "not collecting yet",
    title: "Track anything you ship.",
    titleAccent: "in 60 seconds",
    sub: "Auto-collect web vitals, errors, and page loads — then layer your own events with a one-line log() call. No schema migrations. No redeploys.",
    file: "~/your-app · setup.ts",
    code: [
      { type: "cmt", text: "// install" },
      {
        type: "cmd",
        tokens: ["npm install ", { kind: "str", text: "'@shipeasy/sdk'" }],
      },
      { type: "blank" },
      { type: "cmt", text: "// initialize once" },
      {
        type: "line",
        tokens: [
          { kind: "kw", text: "import" },
          " { init, log } ",
          { kind: "kw", text: "from" },
          " ",
          { kind: "str", text: "'@shipeasy/sdk'" },
          ";",
        ],
      },
      {
        type: "line",
        tokens: [{ kind: "fn", text: "init" }, "({ apiKey: process.env.SHIPEASY_KEY });"],
      },
      { type: "blank" },
      { type: "cmt", text: "// track anything" },
      {
        type: "line",
        tokens: [
          { kind: "fn", text: "log" },
          "(",
          { kind: "str", text: "'user_checkout'" },
          ", { amount: ",
          { kind: "num", text: "129.00" },
          ", plan: ",
          { kind: "str", text: "'pro'" },
          " });",
          { kind: "cursor" },
        ],
      },
    ],
    stats: [
      { v: "4", l: "auto-collected metrics", d: "web vitals · errors · views · api" },
      { v: "∞", l: "custom events", d: "call log('event_name') anywhere" },
      { v: "<5s", l: "time to first event", d: "paste, run, watch it land" },
    ],
    cta: "Start in 60 seconds",
    ctaHref: "/dashboard/metrics?setup=1",
    demo: "Explore with demo data",
    demoHref: "/dashboard/metrics?demo=1",
  },
  gates: {
    eyebrow: "GATES",
    eyebrowAside: "no gates defined",
    title: "Decide who sees what,",
    titleAccent: "in microseconds.",
    sub: "Flag-checks under 5ms, evaluated edge-side. Built-in gates work out of the box — is_employee, mobile_only, eu_user. Custom gates run your own predicates on request context.",
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
          " || ctx.user.plan === ",
          { kind: "str", text: "'team'" },
          ";",
        ],
      },
      { type: "line", tokens: ["});", { kind: "cursor" }] },
    ],
    stats: [
      { v: "5", l: "built-in gates", d: "employee · mobile · EU · admin · trial" },
      { v: "<5ms", l: "p50 evaluation", d: "edge-cached, 60+ regions" },
      { v: "0", l: "roundtrip to backend", d: "rules sync via long-poll, evaluated locally" },
    ],
    cta: "Define your first gate",
    ctaHref: "/dashboard/gates/new",
    demo: "Browse built-in gates",
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
      {
        type: "line",
        tokens: ["  metric: ", { kind: "str", text: "'revenue_per_visitor'" }, ","],
      },
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
    demo: "See a sample experiment",
  },

  killswitches: {
    eyebrow: "KILLSWITCHES",
    eyebrowAside: "nothing to kill — yet",
    title: "Hit the brakes",
    titleAccent: "in under a second.",
    sub: "Instant feature shutoffs with full audit history. Wrap risky code paths in killswitch() — flip the switch in the dashboard and the change propagates to every region in <1s.",
    file: "~/your-app · checkout.ts",
    code: [
      { type: "cmt", text: "// guard a risky path" },
      {
        type: "line",
        tokens: [
          { kind: "kw", text: "if" },
          " (",
          { kind: "fn", text: "killswitch" },
          "(",
          { kind: "str", text: "'new_checkout'" },
          ").enabled) {",
        ],
      },
      {
        type: "line",
        tokens: [
          "  ",
          { kind: "kw", text: "await" },
          " ",
          { kind: "fn", text: "runNewCheckout" },
          "();",
        ],
      },
      { type: "line", tokens: ["} ", { kind: "kw", text: "else" }, " {"] },
      {
        type: "line",
        tokens: [
          "  ",
          { kind: "kw", text: "await" },
          " ",
          { kind: "fn", text: "fallbackCheckout" },
          "();",
        ],
      },
      { type: "line", tokens: ["}"] },
      { type: "blank" },
      { type: "cmt", text: "// flip from CLI in an emergency" },
      {
        type: "cmd",
        tokens: [
          { kind: "kw", text: "$" },
          " shipeasy kill new_checkout ",
          { kind: "str", text: '--reason="p95 spike"' },
          { kind: "cursor" },
        ],
      },
    ],
    stats: [
      { v: "<1s", l: "global propagation", d: "edge-cache invalidated everywhere" },
      { v: "∞", l: "audit retention", d: "who flipped what, when, and why" },
      { v: "0", l: "redeploys to recover", d: "undo a bad ship without a rollback" },
    ],
    cta: "Wire your first killswitch",
    ctaHref: "/dashboard/killswitches/new",
    demo: "See an example incident",
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
      { type: "line", tokens: ["});"] },
      { type: "blank" },
      { type: "cmt", text: "// values stream in — no restart needed" },
      {
        type: "line",
        tokens: [
          { kind: "fn", text: "fetch" },
          "(url, { signal: ",
          { kind: "fn", text: "AbortSignal.timeout" },
          "(timeout) });",
          { kind: "cursor" },
        ],
      },
    ],
    stats: [
      { v: "∞", l: "env overrides", d: "dev · staging · prod · per-region" },
      { v: "0ms", l: "restart to apply", d: "changes stream in over web-socket" },
      { v: "TS", l: "type-checked schemas", d: "caught at build time, not 3am" },
    ],
    cta: "Define your first config",
    ctaHref: "/dashboard/configs/new",
    demo: "Explore example schema",
  },

  team: {
    eyebrow: "TEAM",
    eyebrowAside: "just you so far",
    title: "Ship faster,",
    titleAccent: "together.",
    sub: "Invite teammates and assign roles. Admins manage billing and keys. Editors create experiments and gates. Viewers watch dashboards without touching production.",
    file: "~/your-app · team.ts",
    code: [
      { type: "cmt", text: "// invite a teammate via the dashboard" },
      { type: "blank" },
      {
        type: "line",
        tokens: [
          { kind: "kw", text: "const" },
          " invite = ",
          { kind: "fn", text: "inviteTeammate" },
          "({",
        ],
      },
      { type: "line", tokens: ["  email: ", { kind: "str", text: "'alice@acme.com'" }, ","] },
      {
        type: "line",
        tokens: ["  role: ", { kind: "str", text: "'editor'" }, ",", { kind: "cursor" }],
      },
      { type: "line", tokens: ["});"] },
    ],
    stats: [
      { v: "3", l: "role types", d: "admin · editor · viewer" },
      { v: "SSO", l: "sign-in", d: "GitHub OAuth or email magic link" },
      { v: "∞", l: "members", d: "no per-seat limits on paid plans" },
    ],
    cta: "Invite your first teammate",
    ctaHref: "#invite",
  },
  strings: {
    eyebrow: "STRING MANAGER",
    eyebrowAside: "no copy shipping yet",
    title: "Translate without redeploys,",
    titleAccent: "across every locale.",
    sub: "Declare keys in your code with t(), scan your repo, attach drafts per locale + env, and publish atomically. The SDK fetches a chunked manifest from the edge — no rebuild, no flash of untranslated content.",
    file: "~/your-app · header.tsx",
    code: [
      { type: "cmt", text: "// declare a key inline" },
      {
        type: "line",
        tokens: [
          "<h1>{",
          { kind: "fn", text: "t" },
          "(",
          { kind: "str", text: "'hero.cta_label'" },
          ", ",
          { kind: "str", text: "'Get started'" },
          ")}</h1>",
        ],
      },
      { type: "blank" },
      { type: "cmt", text: "// scan repo to push new keys" },
      {
        type: "cmd",
        tokens: [
          { kind: "kw", text: "$" },
          " shipeasy i18n scan ",
          { kind: "str", text: "--push" },
          { kind: "cursor" },
        ],
      },
    ],
    stats: [
      { v: "∞", l: "locales", d: "one profile per locale × env" },
      { v: "<50ms", l: "manifest delivery", d: "chunked + edge-cached" },
      { v: "0", l: "redeploys to retranslate", d: "publish drafts atomically" },
    ],
    cta: "Create your first profile",
    ctaHref: "#profile",
    demo: "Run a repo scan",
  },

  feedback: {
    eyebrow: "FEEDBACK",
    eyebrowAside: "no reports filed yet",
    title: "Bug reports + requests",
    titleAccent: "straight from the page.",
    sub: "Drop the devtools nub on any page running the SDK. Users capture screenshots and console logs in two clicks — bugs and feature requests land here, routed to Slack or GitHub via connectors.",
    file: "~/your-app · layout.tsx",
    code: [
      { type: "cmt", text: "// mount devtools nub once" },
      {
        type: "line",
        tokens: [
          { kind: "kw", text: "import" },
          " { mountDevtools } ",
          { kind: "kw", text: "from" },
          " ",
          { kind: "str", text: "'@shipeasy/devtools'" },
          ";",
        ],
      },
      {
        type: "line",
        tokens: [{ kind: "fn", text: "mountDevtools" }, "({ apiKey: process.env.SHIPEASY_KEY });"],
      },
      { type: "blank" },
      { type: "cmt", text: "// users hit ⌥⇧B to file a bug, ⌥⇧R for a request" },
      {
        type: "cmd",
        tokens: [{ kind: "kw", text: "$" }, " shipeasy feedback.bugs list", { kind: "cursor" }],
      },
    ],
    stats: [
      { v: "1", l: "line to install", d: "mountDevtools({ apiKey })" },
      { v: "auto", l: "context capture", d: "screenshot · console · breadcrumbs" },
      { v: "∞", l: "connectors", d: "Slack · GitHub · Linear · email" },
    ],
    cta: "Install the devtools nub",
    ctaHref: "#install",
    demo: "See an example report",
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
  const pathname = usePathname();
  const projectId = projectIdFromPath(pathname);
  const href = scopeHref(ctaHref ?? c.ctaHref, projectId);
  const scopedDemoHref = demoHref ? scopeHref(demoHref, projectId) : undefined;
  const label = ctaLabel ?? c.cta;

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden py-7">
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

          <h2 className="hero-empty-title">
            <span>{c.title}</span>
            <span className="accent">{c.titleAccent}</span>
          </h2>
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
            {scopedDemoHref ? (
              <LinkButton variant="ghost" href={scopedDemoHref} className="h-10 px-4 text-[14px]">
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
    </div>
  );
}
