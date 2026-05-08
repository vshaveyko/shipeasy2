export type MetricsTile = {
  kind: "auto" | "custom";
  label: string;
  val: string;
  unit?: string;
  delta: number;
  spark: number[];
  good: boolean;
};

export type CustomEvent = {
  name: string;
  kind: "event" | "conversion" | "funnel" | "error";
  volume: string;
  perSession: string;
  vsPrev: number;
  props: string[];
  owner: string;
  firstSeen: string;
  spark: number[];
  pinned?: boolean;
};

export type AutoVital = {
  name: string;
  desc: string;
  val: number;
  unit: string;
  good: number;
  poor: number;
  status: "good" | "warn" | "bad";
};

export type LiveStreamEntry = {
  t: string;
  kind: "live" | "info" | "err" | "warn";
  name: string;
  payload: string;
};

export type FunnelStep = {
  step: string;
  count: number;
  pct: number;
};

export const metricsTiles: MetricsTile[] = [
  {
    kind: "auto",
    label: "Page load · p75",
    val: "1.42",
    unit: "s",
    delta: -12,
    spark: [1.7, 1.65, 1.6, 1.55, 1.5, 1.5, 1.48, 1.45, 1.42, 1.42, 1.4, 1.42],
    good: true,
  },
  {
    kind: "auto",
    label: "Error rate",
    val: "0.34",
    unit: "%",
    delta: 8,
    spark: [0.28, 0.3, 0.31, 0.3, 0.32, 0.31, 0.33, 0.33, 0.34, 0.36, 0.34, 0.34],
    good: false,
  },
  {
    kind: "auto",
    label: "Sessions · 24h",
    val: "48.2",
    unit: "k",
    delta: 4.1,
    spark: [42, 43, 42, 44, 45, 44, 46, 45, 47, 47, 48, 48],
    good: true,
  },
  {
    kind: "custom",
    label: "user_checkout",
    val: "2,184",
    delta: 22.6,
    spark: [1.4, 1.5, 1.5, 1.6, 1.7, 1.8, 1.9, 2.0, 2.0, 2.1, 2.15, 2.18],
    good: true,
  },
  {
    kind: "custom",
    label: "Revenue (sum)",
    val: "$184k",
    delta: 18.2,
    spark: [120, 125, 130, 140, 145, 150, 155, 160, 170, 178, 182, 184],
    good: true,
  },
  {
    kind: "auto",
    label: "API p95",
    val: "312",
    unit: "ms",
    delta: -3,
    spark: [330, 325, 322, 320, 318, 316, 315, 314, 312, 313, 312, 312],
    good: true,
  },
];

export const customEvents: CustomEvent[] = [
  {
    name: "user_startcheckout",
    kind: "funnel",
    volume: "12,840",
    perSession: "0.27",
    vsPrev: 8.2,
    props: ["userId", "cart_value", "source"],
    owner: "Maya",
    firstSeen: "Mar 14",
    spark: [12, 14, 13, 15, 16, 15, 18, 17, 19, 20, 22, 23, 21, 24],
  },
  {
    name: "user_checkout",
    kind: "conversion",
    volume: "2,184",
    perSession: "0.045",
    vsPrev: 22.6,
    props: ["userId", "amount", "currency", "plan"],
    owner: "Maya",
    firstSeen: "Mar 14",
    spark: [3, 4, 4, 5, 4, 5, 6, 7, 6, 8, 9, 10, 11, 12],
    pinned: true,
  },
  {
    name: "cart_abandoned",
    kind: "event",
    volume: "4,021",
    perSession: "0.083",
    vsPrev: -4.1,
    props: ["userId", "cart_value", "step"],
    owner: "Jordan",
    firstSeen: "Mar 22",
    spark: [8, 9, 7, 8, 9, 10, 9, 8, 7, 8, 7, 6, 7, 6],
  },
  {
    name: "plan_upgrade",
    kind: "conversion",
    volume: "412",
    perSession: "0.0085",
    vsPrev: 44,
    props: ["userId", "from_plan", "to_plan", "mrr_delta"],
    owner: "Priya",
    firstSeen: "Apr 02",
    spark: [2, 2, 1, 3, 3, 4, 3, 5, 5, 6, 7, 8, 9, 10],
  },
  {
    name: "video_played",
    kind: "event",
    volume: "8,910",
    perSession: "0.18",
    vsPrev: 1,
    props: ["video_id", "duration", "quality"],
    owner: "Devon",
    firstSeen: "Feb 11",
    spark: [10, 11, 11, 12, 12, 11, 12, 13, 12, 13, 12, 13, 14, 13],
  },
  {
    name: "search_executed",
    kind: "event",
    volume: "31,440",
    perSession: "0.65",
    vsPrev: 12,
    props: ["query", "results_count", "latency_ms"],
    owner: "Maya",
    firstSeen: "Feb 11",
    spark: [15, 16, 18, 17, 19, 20, 21, 22, 23, 22, 24, 25, 26, 27],
  },
  {
    name: "support_ticket_open",
    kind: "event",
    volume: "89",
    perSession: "0.0019",
    vsPrev: -18,
    props: ["userId", "category", "plan"],
    owner: "Jordan",
    firstSeen: "Apr 18",
    spark: [6, 5, 5, 4, 4, 3, 4, 3, 3, 2, 3, 2, 2, 1],
  },
];

export const autoVitals: AutoVital[] = [
  {
    name: "LCP",
    desc: "Largest Contentful Paint",
    val: 1.42,
    unit: "s",
    good: 2.5,
    poor: 4.0,
    status: "good",
  },
  {
    name: "INP",
    desc: "Interaction to next paint",
    val: 128,
    unit: "ms",
    good: 200,
    poor: 500,
    status: "good",
  },
  {
    name: "CLS",
    desc: "Cumulative layout shift",
    val: 0.04,
    unit: "",
    good: 0.1,
    poor: 0.25,
    status: "good",
  },
  {
    name: "TTFB",
    desc: "Time to first byte",
    val: 340,
    unit: "ms",
    good: 800,
    poor: 1800,
    status: "good",
  },
  {
    name: "JS Errors",
    desc: "Uncaught exceptions per session",
    val: 0.34,
    unit: "%",
    good: 0.5,
    poor: 2.0,
    status: "good",
  },
  {
    name: "API 5xx",
    desc: "Server-side request failures",
    val: 1.18,
    unit: "%",
    good: 1.0,
    poor: 3.0,
    status: "warn",
  },
];

export const liveStream: LiveStreamEntry[] = [
  {
    t: "12:04:21",
    kind: "live",
    name: "user_checkout",
    payload: "amount=$129  plan=pro  user=u_8f2a",
  },
  {
    t: "12:04:19",
    kind: "live",
    name: "user_startcheckout",
    payload: "cart_value=$129  source=pricing",
  },
  { t: "12:04:18", kind: "info", name: "page_view", payload: "/checkout  device=mobile" },
  {
    t: "12:04:14",
    kind: "live",
    name: "search_executed",
    payload: 'query="invoice"  results=12  latency=86ms',
  },
  {
    t: "12:04:11",
    kind: "err",
    name: "js_error",
    payload: "TypeError: cannot read .map of undefined  app.js:412",
  },
  {
    t: "12:04:08",
    kind: "live",
    name: "video_played",
    payload: "video_id=onboard_01  duration=24s",
  },
  {
    t: "12:04:05",
    kind: "live",
    name: "plan_upgrade",
    payload: "from=free  to=pro  mrr_delta=+$29",
  },
  { t: "12:04:01", kind: "warn", name: "api_slow", payload: "POST /v1/checkout  1240ms  (>p95)" },
  { t: "12:03:58", kind: "live", name: "cart_abandoned", payload: "cart_value=$48  step=shipping" },
  {
    t: "12:03:55",
    kind: "live",
    name: "user_startcheckout",
    payload: "cart_value=$219  source=cart",
  },
  {
    t: "12:03:52",
    kind: "live",
    name: "search_executed",
    payload: 'query="export csv"  results=4  latency=72ms',
  },
  { t: "12:03:48", kind: "info", name: "page_view", payload: "/dashboard  device=desktop" },
];

export const funnel: FunnelStep[] = [
  { step: "page_view · /pricing", count: 48200, pct: 100 },
  { step: "cta_clicked", count: 18420, pct: 38.2 },
  { step: "user_startcheckout", count: 12840, pct: 26.6 },
  { step: "payment_form_filled", count: 5840, pct: 12.1 },
  { step: "user_checkout", count: 2184, pct: 4.5 },
];
