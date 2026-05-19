import type { AlertItem, ExperimentSummary, HomeActivityEntry, HomeState } from "./state";

/**
 * Synthetic populated home state — used when the dashboard is hit with
 * `?demo=1` or rendered via /preview/cockpit. Bypasses D1 entirely so the
 * cockpit can be previewed without a wrangler bootstrap or real data.
 */

const OWNER = (email: string, color: string, initial: string) => ({
  ownerEmail: email,
  ownerInitial: initial,
  ownerColor: color,
});

const SPARK_UP = [30, 33, 31, 37, 41, 44, 49, 52, 58, 62, 69, 72];
const SPARK_MILD = [20, 22, 21, 25, 28, 30, 34, 36, 40, 42, 46, 49];
const SPARK_FLAT = [50, 51, 52, 51, 52, 53, 52, 54, 53, 55, 54, 56];
const SPARK_DOWN = [40, 42, 39, 40, 38, 38, 37, 36, 35, 34, 33, 32];
const SPARK_FAST = [18, 22, 28, 34, 40, 48, 56, 62, 70, 78, 85, 94];

function exp(id: string, partial: Partial<ExperimentSummary>): ExperimentSummary {
  return {
    id,
    name: id,
    status: "running",
    startedAt: null,
    primaryMetric: "revenue_per_visitor",
    liftPct: null,
    ci95Low: null,
    ci95High: null,
    significancePct: null,
    pValue: null,
    sampleN: null,
    spark: [],
    srmDetected: false,
    peekWarning: false,
    isFinal: false,
    ownerEmail: null,
    ownerInitial: null,
    ownerColor: "#7a7a82",
    ...partial,
  };
}

export function demoHomeState(projectName: string | null = "acme-web"): HomeState {
  const now = Date.now();
  const minAgo = (m: number) => new Date(now - m * 60_000).toISOString();
  const hAgo = (h: number) => new Date(now - h * 3600_000).toISOString();
  const dAgo = (d: number) => new Date(now - d * 86400_000).toISOString();

  const liveExperiments: ExperimentSummary[] = [
    exp("checkout_v3", {
      startedAt: dAgo(6),
      liftPct: 8.4,
      ci95Low: 5.6,
      ci95High: 11.2,
      significancePct: 99.2,
      pValue: 0.008,
      sampleN: 14200,
      spark: SPARK_UP,
      isFinal: false,
      ...OWNER("maya@acme.co", "#7c5cff", "M"),
    }),
    exp("welcome_email_5min", {
      startedAt: dAgo(3),
      liftPct: 6.8,
      ci95Low: -1.2,
      ci95High: 9.4,
      significancePct: 86,
      pValue: 0.14,
      sampleN: 4800,
      spark: SPARK_MILD,
      ...OWNER("jiwoo@acme.co", "#00d08a", "J"),
    }),
    exp("recommendations_ranker", {
      startedAt: dAgo(8),
      liftPct: 11.2,
      ci95Low: 8.1,
      ci95High: 14.3,
      significancePct: 99.8,
      pValue: 0.002,
      sampleN: 22700,
      spark: SPARK_FAST,
      ...OWNER("maya@acme.co", "#7c5cff", "M"),
    }),
    exp("pricing_page_headline", {
      startedAt: dAgo(11),
      liftPct: 2.1,
      ci95Low: -0.4,
      ci95High: 4.6,
      significancePct: 78,
      pValue: 0.22,
      sampleN: 38100,
      spark: SPARK_FLAT,
      ...OWNER("kai@acme.co", "#ff8445", "K"),
    }),
    exp("onboarding_wizard_v2", {
      startedAt: dAgo(4),
      liftPct: -1.2,
      ci95Low: -4.8,
      ci95High: 2.4,
      significancePct: 62,
      pValue: 0.38,
      sampleN: 1100,
      spark: SPARK_DOWN,
      peekWarning: true,
      ...OWNER("ravi@acme.co", "#3b82f6", "R"),
    }),
    exp("search_typo_tolerance", {
      startedAt: dAgo(21),
      liftPct: 4.7,
      ci95Low: 3.1,
      ci95High: 6.3,
      significancePct: 97.5,
      pValue: 0.025,
      sampleN: 201300,
      spark: SPARK_UP,
      ...OWNER("kai@acme.co", "#ff8445", "K"),
    }),
  ];

  const decisions = liveExperiments.filter(
    (e) =>
      e.peekWarning || e.srmDetected || (e.significancePct !== null && e.significancePct >= 95),
  );

  const alerts: AlertItem[] = [
    {
      id: "ks:new_checkout",
      severity: "danger",
      title: "Killswitch new_checkout armed",
      detail: "flipped 22m ago — error rate cross 0.25%",
      when: "22m",
      href: "./killswitches?open=new_checkout",
    },
    {
      id: "peek:onboarding_wizard_v2",
      severity: "warn",
      title: "onboarding_wizard_v2 · peek warning",
      detail: "Sequential testing required — result not stable.",
      when: "now",
      href: "./experiments?open=onboarding_wizard_v2",
    },
  ];

  const activity: HomeActivityEntry[] = [
    {
      id: "a1",
      action: "update",
      resourceType: "experiment",
      resourceId: "recommendations_ranker",
      actorEmail: "maya@acme.co",
      actorType: "user",
      createdAt: minAgo(2),
    },
    {
      id: "a2",
      action: "update",
      resourceType: "killswitch",
      resourceId: "new_checkout",
      actorEmail: "system@shipeasy",
      actorType: "system",
      createdAt: minAgo(14),
    },
    {
      id: "a3",
      action: "update",
      resourceType: "gate",
      resourceId: "premium_features",
      actorEmail: "maya@acme.co",
      actorType: "user",
      createdAt: hAgo(1),
    },
    {
      id: "a5",
      action: "create",
      resourceType: "experiment",
      resourceId: "dashboard_v2",
      actorEmail: "ravi@acme.co",
      actorType: "user",
      createdAt: hAgo(3),
    },
    {
      id: "a6",
      action: "update",
      resourceType: "experiment",
      resourceId: "search_typo_tolerance",
      actorEmail: "kai@acme.co",
      actorType: "user",
      createdAt: hAgo(5),
    },
    {
      id: "a7",
      action: "create",
      resourceType: "member",
      resourceId: "priya@acme.co",
      actorEmail: "maya@acme.co",
      actorType: "user",
      createdAt: hAgo(14),
    },
    {
      id: "a8",
      action: "update",
      resourceType: "config",
      resourceId: "rate_limits.checkout",
      actorEmail: "jiwoo@acme.co",
      actorType: "user",
      createdAt: hAgo(18),
    },
  ];

  const pulse24h = [
    1, 2, 3, 2, 1, 4, 6, 9, 14, 22, 31, 38, 42, 39, 35, 30, 26, 20, 16, 12, 9, 6, 4, 3,
  ];

  return {
    kind: "busy",
    counts: {
      gates: 12,
      configs: 41,
      experiments: 24,
      runningExperiments: liveExperiments.length,
      killswitches: 8,
      armedKillswitches: 1,
      profiles: 3,
    },
    decisions,
    liveExperiments,
    alerts,
    pulse24h,
    activity,
    projectName,
    planName: "Team",
  };
}

export function demoQuietState(projectName: string | null = "acme-web"): HomeState {
  const base = demoHomeState(projectName);
  return {
    ...base,
    kind: "quiet",
    decisions: [],
    liveExperiments: base.liveExperiments.slice(0, 3),
    alerts: [],
    activity: base.activity.slice(2),
    pulse24h: base.pulse24h.map((v) => Math.round(v * 0.4)),
  };
}
