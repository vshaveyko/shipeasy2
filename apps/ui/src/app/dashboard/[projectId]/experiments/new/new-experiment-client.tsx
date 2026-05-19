"use client";

import { Fragment, useMemo, useState, useTransition, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Check,
  ChevronRight,
  Code2,
  Copy,
  Cpu,
  Info,
  Lock,
  Percent,
  Plus,
  Rocket,
  Search,
  Shield,
  Target,
  X,
} from "lucide-react";

import { projectIdFromPathname } from "@/lib/project-path";
import { Page, PageBody } from "@/components/dashboard/page";
import { Button } from "@/components/ui/button";
import { LinkButton } from "@/components/ui/link-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import {
  inlineCreateMetricAction,
  inlineCreateUniverseAction,
  publishExperimentAction,
} from "../actions";

// ── Public types (consumed by page.tsx) ─────────────────────────────────
export type UniverseInfo = {
  id: string;
  name: string;
  unit_type: string;
  holdout_range: [number, number] | null;
};
export type GateInfo = { id: string; name: string };
export type MetricInfo = {
  id: string;
  name: string;
  event_name: string;
  aggregation: "count_users" | "count_events" | "sum" | "avg" | "retention_Nd";
  value_path: string | null;
  winsorize_pct: number;
  min_detectable_effect: number | null;
};
export type EventInfo = { name: string; pending: boolean };
export type PlanInfo = {
  name: string;
  sequential_testing: boolean;
  custom_significance_threshold: boolean;
  holdout_groups: boolean;
};

interface Props {
  gates: GateInfo[];
  universes: UniverseInfo[];
  metrics: MetricInfo[];
  events: EventInfo[];
  plan: PlanInfo;
}

// ── Profiles, aggregation reference ─────────────────────────────────────
type ProfileKey = "conversion" | "revenue" | "retention" | "performance" | "onboarding";
const PROFILES: {
  k: ProfileKey;
  name: string;
  Icon: React.ComponentType<{ className?: string }>;
  desc: string;
  agg: MetricInfo["aggregation"];
  mde: number;
}[] = [
  {
    k: "conversion",
    name: "Conversion",
    Icon: Target,
    desc: "Pre-fills count_users + a conversion goal metric",
    agg: "count_users",
    mde: 0.02,
  },
  {
    k: "revenue",
    name: "Revenue",
    Icon: Percent,
    desc: "Pre-fills sum + revenue goal metric",
    agg: "sum",
    mde: 0.03,
  },
  {
    k: "retention",
    name: "Retention",
    Icon: Activity,
    desc: "Pre-fills retention_7d + activation guardrails",
    agg: "retention_Nd",
    mde: 0.015,
  },
  {
    k: "performance",
    name: "Performance",
    Icon: Cpu,
    desc: "Pre-fills avg latency, p95 guardrails (winsorized)",
    agg: "avg",
    mde: 0.05,
  },
  {
    k: "onboarding",
    name: "Onboarding",
    Icon: Rocket,
    desc: "Pre-fills count_users + activation goals",
    agg: "count_users",
    mde: 0.025,
  },
];

const AGG_REF: [string, string][] = [
  ["count_users", "Was the user ever exposed? 1 / 0 — for conversion"],
  ["count_events", "How many times the event fired — for volume"],
  ["sum", "Sum of a value path — for revenue, points"],
  ["avg", "Mean of value — for load time, durations"],
  ["retention_Nd", "Active on D+N from exposure? 1 / 0"],
];

const AGG_OPTIONS: { k: MetricInfo["aggregation"]; desc: string }[] = [
  { k: "count_users", desc: "1 if user fired event ≥ once (conversion)" },
  { k: "count_events", desc: "How many times event fired (volume)" },
  { k: "sum", desc: "Sum of a value path · revenue, points" },
  { k: "avg", desc: "Mean of a value · load time, durations" },
  { k: "retention_Nd", desc: "Active on D+N from exposure" },
];

const TAGS = [
  "revenue",
  "activation",
  "engagement",
  "marketing",
  "performance",
  "stability",
  "search",
] as const;

const SLUG_RE = /^[a-z0-9][a-z0-9_-]{0,63}$/;

// ── Helpers ─────────────────────────────────────────────────────────────
function slugify(s: string) {
  return (s || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 64);
}

function powerCalc(p1: number, mdeAbs: number, dailyUsers: number, allocBp: number) {
  const zA = 1.96;
  const zB = 0.84;
  const p2 = Math.max(0.001, Math.min(0.999, p1 + mdeAbs));
  const variance = p1 * (1 - p1) + p2 * (1 - p2);
  const n = Math.ceil(((zA + zB) ** 2 * variance) / Math.max(mdeAbs * mdeAbs, 1e-9));
  const usersPerGroupPerDay = Math.max(1, (dailyUsers * (allocBp / 10000)) / 2);
  const days = Math.max(1, Math.ceil(n / usersPerGroupPerDay));
  return { n, days, p2 };
}

const TYPED_GROUP_COLORS = [
  "var(--se-fg-3)",
  "var(--se-accent)",
  "var(--se-purple)",
  "var(--se-info)",
  "#ff8445",
];

// ── Main component ─────────────────────────────────────────────────────
export default function NewExperimentClient({
  gates: initialGates,
  universes: initialUniverses,
  metrics: initialMetrics,
  events,
  plan,
}: Props) {
  const pathname = usePathname();
  const projectId = projectIdFromPathname(pathname) ?? "";
  const cancelHref = `/dashboard/${projectId}/experiments`;

  // Server-loaded catalogs (mutable so inline creation can extend)
  const [universes, setUniverses] = useState(initialUniverses);
  const [gates] = useState(initialGates);
  const [metrics, setMetrics] = useState(initialMetrics);

  // Modal flags
  const [showUniverseModal, setShowUniverseModal] = useState(false);
  const [creatingMetricRole, setCreatingMetricRole] = useState<
    "goal" | "guardrail" | "secondary" | null
  >(null);

  // Form state
  const [profile, setProfile] = useState<ProfileKey>("conversion");
  const [name, setName] = useState("");
  const [tag, setTag] = useState<string>("");
  const [question, setQuestion] = useState("");
  const [success, setSuccess] = useState("");
  const [change, setChange] = useState("");
  const [universeName, setUniverseName] = useState<string>(initialUniverses[0]?.name ?? "default");
  const [gateName, setGateName] = useState<string>("");
  const [alloc, setAlloc] = useState(50); // %
  const [groups, setGroups] = useState([
    { name: "control", weight: 5000, params: "{}" },
    { name: "test", weight: 5000, params: "{}" },
  ]);
  const [goals, setGoals] = useState<{ metric_id: string }[]>([]);
  const [guards, setGuards] = useState<{ metric_id: string }[]>([]);
  const [secs, setSecs] = useState<{ metric_id: string }[]>([]);
  const [baseline, setBaseline] = useState(0.1); // 10%
  const [mde, setMde] = useState(0.02);
  const [alpha, setAlpha] = useState(0.05);
  const [minDays, setMinDays] = useState(7);
  const [minSample, setMinSample] = useState(100);
  const [seqTest, setSeqTest] = useState(false);
  const [codeLang, setCodeLang] = useState<CodeLang>("ts");
  const [copiedCode, setCopiedCode] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // Derived
  const slug = slugify(name);
  const slugValid = SLUG_RE.test(slug);
  const universe = useMemo(
    () => universes.find((u) => u.name === universeName) ?? universes[0] ?? null,
    [universes, universeName],
  );
  const gate = gates.find((g) => g.name === gateName) ?? null;
  const weightSum = groups.reduce((s, g) => s + g.weight, 0);
  const weightsOk = weightSum === 10000;

  const universeHoldoutPct = universe?.holdout_range
    ? ((universe.holdout_range[1] - universe.holdout_range[0] + 1) / 10000) * 100
    : 0;
  const dailyUsers = 24000; // placeholder until backend exposes per-universe volume

  const power = useMemo(
    () => powerCalc(baseline, mde, dailyUsers, Math.round(alloc * 100)),
    [baseline, mde, alloc],
  );

  // Live split bar segments
  const notInExp = 100 - alloc;
  const holdoutSlice = (universeHoldoutPct * alloc) / 100;
  const segs: { name: string; pct: number; color: string }[] = [];
  segs.push({ name: "not_in_experiment", pct: notInExp, color: "var(--se-bg-4)" });
  if (holdoutSlice > 0) segs.push({ name: "holdout", pct: holdoutSlice, color: "#888" });
  const remaining = alloc - holdoutSlice;
  groups.forEach((g, i) => {
    const share = remaining * (g.weight / 10000);
    segs.push({
      name: g.name,
      pct: share,
      color: TYPED_GROUP_COLORS[i % TYPED_GROUP_COLORS.length],
    });
  });

  // Metric lookup + chips
  const metricById = useMemo(() => new Map(metrics.map((m) => [m.id, m])), [metrics]);
  const eventByName = useMemo(() => new Map(events.map((e) => [e.name, e])), [events]);
  const goalMetrics = goals.map((g) => metricById.get(g.metric_id)).filter(Boolean) as MetricInfo[];
  const guardMetrics = guards
    .map((g) => metricById.get(g.metric_id))
    .filter(Boolean) as MetricInfo[];
  const secMetrics = secs.map((g) => metricById.get(g.metric_id)).filter(Boolean) as MetricInfo[];

  // Checklist
  const allMetrics = [...goalMetrics, ...guardMetrics, ...secMetrics];
  const pendingEventRefs = allMetrics.filter((m) => {
    const ev = eventByName.get(m.event_name);
    return !ev || ev.pending;
  });
  const checklist = [
    {
      ok: goals.length === 1,
      label:
        goals.length === 1
          ? "1 goal metric registered"
          : "Goal metric required (exactly one is best)",
    },
    {
      ok: weightsOk,
      label: weightsOk
        ? `Weights sum to ${weightSum} bp`
        : `Weights must sum to 10000 (currently ${weightSum})`,
    },
    {
      ok: !!universe,
      label: universe ? `Universe: ${universe.name}` : "Select or create a universe",
    },
    {
      ok: copiedCode,
      label: copiedCode
        ? "Code copied at least once"
        : "Copy a code snippet for at least one language",
    },
    {
      ok: pendingEventRefs.length === 0,
      warn: pendingEventRefs.length > 0,
      label:
        pendingEventRefs.length === 0
          ? "All metric events exist in catalog"
          : `${pendingEventRefs.length} metric(s) reference pending events`,
    },
    {
      ok: slugValid,
      label: slugValid ? "Slug valid" : "Slug must be kebab/underscore, 1–64 chars",
    },
  ];
  const allReady = checklist.every((c) => c.ok);

  // ─ Group helpers ─
  const setGroupWeight = (i: number, w: number) => {
    const next = groups.slice();
    next[i] = { ...next[i], weight: Math.max(0, Math.min(10000, w)) };
    setGroups(next);
  };
  const setGroupName = (i: number, v: string) => {
    const next = groups.slice();
    next[i] = { ...next[i], name: v };
    setGroups(next);
  };
  const setGroupParams = (i: number, v: string) => {
    const next = groups.slice();
    next[i] = { ...next[i], params: v };
    setGroups(next);
  };
  const addGroup = () =>
    setGroups([...groups, { name: `test_${groups.length}`, weight: 0, params: "{}" }]);
  const rmGroup = (i: number) => setGroups(groups.filter((_, j) => j !== i));
  const evenSplit = () => {
    const w = Math.floor(10000 / groups.length);
    const rem = 10000 - w * groups.length;
    setGroups(groups.map((g, i) => ({ ...g, weight: w + (i === 0 ? rem : 0) })));
  };

  // ─ Submit ─
  function submit(start: boolean) {
    setError(null);
    if (!slugValid) {
      setError("Slug is required (lowercase letters, digits, - or _, max 64 chars).");
      return;
    }
    if (!weightsOk) {
      setError("Group weights must sum to 100% (10000 bp).");
      return;
    }
    if (!universe) {
      setError("Select a universe.");
      return;
    }
    let parsedGroups: { name: string; weight: number; params: Record<string, unknown> }[];
    try {
      parsedGroups = groups.map((g) => ({
        name: g.name,
        weight: g.weight,
        params: g.params.trim() ? (JSON.parse(g.params) as Record<string, unknown>) : {},
      }));
    } catch (e) {
      setError(`Group params must be valid JSON: ${(e as Error).message}`);
      return;
    }

    const descParts: string[] = [];
    if (question.trim()) descParts.push(`Question\n${question.trim()}`);
    if (success.trim()) descParts.push(`Success definition\n${success.trim()}`);
    if (change.trim()) descParts.push(`Change\n${change.trim()}`);
    const description = descParts.join("\n\n") || null;

    const attached = [
      ...goals.map((g) => ({ metric_id: g.metric_id, role: "goal" as const })),
      ...guards.map((g) => ({ metric_id: g.metric_id, role: "guardrail" as const })),
      ...secs.map((g) => ({ metric_id: g.metric_id, role: "secondary" as const })),
    ];

    startTransition(async () => {
      const res = await publishExperimentAction({
        name: slug,
        description,
        tag: tag || null,
        universe: universe.name,
        targeting_gate: gate?.name ?? null,
        allocation_pct: Math.round(alloc * 100),
        groups: parsedGroups,
        params: {},
        significance_threshold: alpha,
        min_runtime_days: minDays,
        min_sample_size: minSample,
        sequential_testing: seqTest && plan.sequential_testing,
        metrics: attached,
        start,
      });
      if (res.ok) {
        window.location.assign(cancelHref);
      } else {
        setError(res.error);
      }
    });
  }

  // ─ Code snippet ─
  const groupNames = groups.map((g) => g.name);
  const eventList = allMetrics
    .map((m) => m.event_name)
    .filter((v, i, a) => a.indexOf(v) === i)
    .filter((e) => !(eventByName.get(e)?.pending ?? false));
  const codeSrc = CODE[codeLang]({
    slug: slug || "your_experiment",
    groupNames,
    events: eventList,
  });

  return (
    <Page className="px-6">
      <PageBody className="space-y-6">
        <div>
          <div className="t-caps dim-2 mb-1">Step 1 of 1 · configure</div>
          <h1 className="text-[32px] leading-none font-medium tracking-[-0.02em]">
            <span className="t-serif text-[var(--se-fg-3)]">A new </span>experiment
          </h1>
          <p className="mt-3 max-w-[60ch] text-[13.5px] text-[var(--se-fg-3)]">
            An experiment lives inside a{" "}
            <span
              className="underline decoration-dotted underline-offset-2"
              title="A universe owns the unit (user_id, device_id…), reserves a holdout, and pins the hashing version. The same users are excluded from every experiment in it."
            >
              universe
            </span>
            , splits allocated users into groups, and measures a goal metric (with optional
            guardrails and secondaries).
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          {/* MAIN COLUMN */}
          <div className="space-y-8 min-w-0">
            {/* §1 — Quick-setup profile picker */}
            <Section num={1} title="Quick-setup profile" sub="pre-fills aggregation + goal">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
                {PROFILES.map((p) => {
                  const Ic = p.Icon;
                  const active = profile === p.k;
                  return (
                    <button
                      type="button"
                      key={p.k}
                      onClick={() => {
                        setProfile(p.k);
                        setMde(p.mde);
                      }}
                      className={cn(
                        "flex flex-col items-start gap-2 rounded-[var(--radius-md)] border bg-[var(--se-bg-2)] p-3 text-left transition-colors",
                        active
                          ? "border-[var(--se-accent)] bg-[color-mix(in_oklab,var(--se-accent)_8%,var(--se-bg-2))]"
                          : "border-[var(--se-line)] hover:border-[var(--se-line-2)]",
                      )}
                    >
                      <Ic
                        className={cn(
                          "size-4",
                          active ? "text-[var(--se-accent)]" : "text-[var(--se-fg-3)]",
                        )}
                      />
                      <div className="text-[13px] font-medium">{p.name}</div>
                      <div className="text-[11.5px] leading-snug text-[var(--se-fg-3)]">
                        {p.desc}
                      </div>
                    </button>
                  );
                })}
              </div>
            </Section>

            {/* §2 — Basics */}
            <Section num={2} title="Basics">
              <div className="grid gap-4 sm:grid-cols-[1fr_180px]">
                <Field label="Name">
                  <Input
                    data-testid="new-experiment-name-input"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="three-step-checkout"
                  />
                  <Hint
                    left={
                      name.length === 0 ? (
                        <span className="text-[var(--se-fg-3)]">slug · derived from name</span>
                      ) : (
                        <span>
                          <span className="text-[var(--se-fg-3)]">slug · </span>
                          <span
                            className={
                              slugValid ? "text-[var(--se-accent)]" : "text-[var(--se-danger)]"
                            }
                          >
                            {slug || "invalid"}
                          </span>
                        </span>
                      )
                    }
                    right={
                      name.length === 0
                        ? "kebab/underscore · 1–64"
                        : slugValid
                          ? "kebab/underscore · 1–64"
                          : "use letters, digits, - or _"
                    }
                  />
                </Field>
                <Field label="Tag (optional)">
                  <select
                    value={tag}
                    onChange={(e) => setTag(e.target.value)}
                    className="h-9 rounded-[var(--radius-md)] border border-[var(--se-line-2)] bg-transparent px-2.5 text-[13px] outline-none focus:border-[var(--se-line-3)]"
                  >
                    <option value="">none</option>
                    {TAGS.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
              <Field label="Question" hint="what you want to learn">
                <Textarea value={question} onChange={(e) => setQuestion(e.target.value)} />
                <Hint
                  left="One sentence ending in a question mark."
                  right={`${question.length}/200`}
                />
              </Field>
              <Field label="Success definition" hint="what shipping means">
                <Textarea value={success} onChange={(e) => setSuccess(e.target.value)} />
                <Hint
                  left="Mention the goal metric and the guardrails that must hold."
                  right={`${success.length}/240`}
                />
              </Field>
              <Field label="Change description" hint="what is actually different in the test">
                <Textarea value={change} onChange={(e) => setChange(e.target.value)} />
                <Hint left="Future you will thank present you." right={`${change.length}/300`} />
              </Field>
            </Section>

            {/* §3 — Universe */}
            <Section num={3} title="Universe" sub="defines the eligible population">
              <Field>
                <select
                  data-testid="experiment-universe-select"
                  value={universeName}
                  onChange={(e) => setUniverseName(e.target.value)}
                  className="h-9 w-full rounded-[var(--radius-md)] border border-[var(--se-line-2)] bg-transparent px-2.5 text-[13px] outline-none focus:border-[var(--se-line-3)]"
                >
                  {universes.length === 0 ? <option value="">— no universes —</option> : null}
                  {universes.map((u) => (
                    <option key={u.id} value={u.name}>
                      {u.name} · {u.unit_type}
                      {u.holdout_range
                        ? ` · holdout ${((u.holdout_range[1] - u.holdout_range[0] + 1) / 100).toFixed(1)}%`
                        : " · no holdout"}
                    </option>
                  ))}
                </select>
                <div className="mt-1.5 flex items-center gap-2">
                  <span className="t-mono-xs dim-3">Can&rsquo;t find what you need?</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowUniverseModal(true)}
                  >
                    <Plus className="size-3" /> Create new universe
                  </Button>
                </div>
              </Field>
              {universe ? (
                <Banner tone="info">
                  <strong>
                    {universe.holdout_range
                      ? `${universeHoldoutPct.toFixed(1)}% holdout`
                      : "No holdout configured"}
                  </strong>{" "}
                  · users hashed by{" "}
                  <code className="t-mono-xs text-[var(--se-fg-2)]">{universe.unit_type}</code>
                  {universe.holdout_range ? (
                    <>
                      {" "}
                      into slots{" "}
                      <code className="t-mono-xs text-[var(--se-fg-2)]">
                        {universe.holdout_range[0]}–{universe.holdout_range[1]}
                      </code>{" "}
                      (of 10,000) are excluded.
                    </>
                  ) : null}
                  <p className="mt-1 text-[var(--se-fg-3)]">
                    Configured on the universe — same users excluded from every experiment in it.
                  </p>
                </Banner>
              ) : null}
            </Section>

            {/* §4 — Targeting gate */}
            <Section num={4} title="Targeting gate" sub="optional">
              <p className="mb-3 text-[12.5px] text-[var(--se-fg-3)]">
                Narrow the universe further with a gate (e.g. mobile only, US/EU new users). Users
                who don&rsquo;t pass the gate are not enrolled.
              </p>
              <Field>
                <select
                  value={gateName}
                  onChange={(e) => setGateName(e.target.value)}
                  className="h-9 w-full rounded-[var(--radius-md)] border border-[var(--se-line-2)] bg-transparent px-2.5 text-[13px] outline-none focus:border-[var(--se-line-3)]"
                >
                  <option value="">No gate — eligible = whole universe</option>
                  {gates.map((g) => (
                    <option key={g.id} value={g.name}>
                      {g.name}
                    </option>
                  ))}
                </select>
                <div className="mt-1.5 flex items-center gap-2">
                  <span className="t-mono-xs dim-3">Need a new rule set?</span>
                  <LinkButton variant="ghost" size="sm" href={`/dashboard/${projectId}/gates`}>
                    <Plus className="size-3" /> Manage gates
                  </LinkButton>
                </div>
              </Field>
            </Section>

            {/* §5 — Traffic split */}
            <Section num={5} title="Traffic split" sub="allocation · groups · params">
              <Field
                label="Allocation"
                hint={`% of ${universe?.name ?? "universe"} (after holdout) entering this experiment`}
              >
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min={1}
                    max={100}
                    value={alloc}
                    onChange={(e) => setAlloc(Number(e.target.value))}
                    className="flex-1 accent-[var(--se-accent)]"
                  />
                  <NumInput
                    value={String(alloc)}
                    onChange={(v) => setAlloc(Math.max(1, Math.min(100, Number(v) || 1)))}
                    suffix="%"
                    width={96}
                  />
                </div>
                <Hint
                  left={
                    <span>
                      <b className="t-mono text-[var(--se-fg-2)]">{alloc}%</b> of universe ≈{" "}
                      <b className="t-mono text-[var(--se-fg-2)]">
                        {Math.round((dailyUsers * alloc) / 100).toLocaleString()}
                      </b>{" "}
                      daily users
                    </span>
                  }
                />
              </Field>

              <Field label="Live split preview">
                <SplitBar segs={segs} showLabels />
                <Hint left="not_in_experiment + holdout never receive a treatment." />
              </Field>

              <div className="h-px bg-[var(--se-line)]" />

              <Field>
                <div className="mb-2 flex items-center gap-2">
                  <Label>Group weights</Label>
                  <span className="text-[11px] text-[var(--se-fg-3)]">· must sum to 100%</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="ml-auto"
                    onClick={evenSplit}
                  >
                    Even split
                  </Button>
                </div>
                <div className="space-y-2">
                  {groups.map((g, i) => (
                    <div
                      key={i}
                      className="grid grid-cols-[26px_minmax(0,1fr)_minmax(120px,1.5fr)_72px_64px_28px] items-center gap-2"
                    >
                      <span
                        className={cn(
                          "grid size-[26px] place-items-center rounded-full font-mono text-[12px]",
                          i === 0
                            ? "bg-[var(--se-bg-3)] text-[var(--se-fg-2)]"
                            : i === 1
                              ? "bg-[var(--se-accent)] text-[var(--se-accent-fg)]"
                              : "bg-[var(--se-purple)] text-white",
                        )}
                      >
                        {String.fromCharCode(65 + i)}
                      </span>
                      <Input
                        value={g.name}
                        onChange={(e) => setGroupName(i, e.target.value)}
                        className="font-mono"
                      />
                      <input
                        type="range"
                        min={0}
                        max={10000}
                        step={100}
                        value={g.weight}
                        onChange={(e) => setGroupWeight(i, Number(e.target.value))}
                        className="accent-[var(--se-accent)]"
                      />
                      <NumInput
                        value={(g.weight / 100).toFixed(0)}
                        onChange={(v) => setGroupWeight(i, Math.round((Number(v) || 0) * 100))}
                        suffix="%"
                      />
                      <span className="text-right font-mono text-[10.5px] tabular-nums text-[var(--se-fg-3)]">
                        {g.weight}
                        <span className="text-[var(--se-fg-4)]">bp</span>
                      </span>
                      {groups.length > 2 ? (
                        <button
                          type="button"
                          onClick={() => rmGroup(i)}
                          className="grid size-7 place-items-center rounded-[var(--radius-sm)] text-[var(--se-fg-4)] hover:bg-[var(--se-bg-3)] hover:text-[var(--se-fg-2)]"
                        >
                          <X className="size-3" />
                        </button>
                      ) : (
                        <span />
                      )}
                    </div>
                  ))}
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <Button type="button" variant="ghost" size="sm" onClick={addGroup}>
                    <Plus className="size-3" /> Add group
                  </Button>
                  <span
                    className={cn(
                      "ml-auto font-mono text-[11px]",
                      weightsOk ? "text-[var(--se-accent)]" : "text-[var(--se-danger)]",
                    )}
                  >
                    Σ = {(weightSum / 100).toFixed(0)}% ({weightSum} bp){" "}
                    {weightsOk ? "· ok" : "· must equal 100%"}
                  </span>
                </div>
              </Field>

              <details className="mt-3 border-t border-[var(--se-line)] pt-3">
                <summary className="flex cursor-default items-center gap-2 text-[12px] text-[var(--se-fg-2)] [&::-webkit-details-marker]:hidden">
                  <ChevronRight className="size-3 transition-transform group-open:rotate-90" />
                  Per-group <code className="t-mono-xs">params</code> (typed JSON)
                </summary>
                <div className="mt-2 space-y-2">
                  {groups.map((g, i) => (
                    <Field key={i} label={`${g.name}.params`}>
                      <Textarea
                        value={g.params}
                        onChange={(e) => setGroupParams(i, e.target.value)}
                        className="min-h-[54px] font-mono text-[12px]"
                      />
                    </Field>
                  ))}
                </div>
              </details>
            </Section>

            {/* §6 — Metrics */}
            <Section num={6} title="Metrics" sub="goal · guardrail · secondary">
              <RoleCard
                tone="goal"
                title="Goal"
                badge={goals.length > 1 ? "⚠ >1 goal" : null}
                badgeRight="required · 1 recommended"
                explain="Register exactly one if you can — intersection test means more goals = less statistical power. Verdict ship requires this metric to lift significantly."
              >
                <MetricChipRow
                  tone="goal"
                  items={goalMetrics}
                  onRemove={(i) => setGoals(goals.filter((_, j) => j !== i))}
                  onAdd={() => setCreatingMetricRole("goal")}
                  addLabel={goals.length === 0 ? "Pick a goal metric" : "Add another goal"}
                  metrics={metrics}
                  attached={goals.map((g) => g.metric_id)}
                  onAttach={(id) => setGoals([...goals, { metric_id: id }])}
                />
              </RoleCard>

              <RoleCard
                tone="guard"
                title="Guardrails"
                badgeRight="block ship on regression"
                explain="Any significant negative move on a guardrail flips the verdict to hold. Configure MDE per metric to set how big a regression you’ll tolerate."
              >
                <MetricChipRow
                  tone="guard"
                  items={guardMetrics}
                  onRemove={(i) => setGuards(guards.filter((_, j) => j !== i))}
                  onAdd={() => setCreatingMetricRole("guardrail")}
                  addLabel="Add guardrail"
                  metrics={metrics}
                  attached={guards.map((g) => g.metric_id)}
                  onAttach={(id) => setGuards([...guards, { metric_id: id }])}
                />
              </RoleCard>

              <RoleCard
                tone="secondary"
                title="Secondary"
                badgeRight="informational only"
                explain={
                  "Tracked & shown in results but do not affect the verdict. Good for “the test isn't bad, but is it actually moving anything else?”"
                }
              >
                <MetricChipRow
                  tone="secondary"
                  items={secMetrics}
                  onRemove={(i) => setSecs(secs.filter((_, j) => j !== i))}
                  onAdd={() => setCreatingMetricRole("secondary")}
                  addLabel="Add secondary"
                  metrics={metrics}
                  attached={secs.map((g) => g.metric_id)}
                  onAttach={(id) => setSecs([...secs, { metric_id: id }])}
                />
              </RoleCard>

              <div className="mt-3 grid grid-cols-2 gap-2 rounded-[var(--radius-md)] border border-[var(--se-line)] bg-[var(--se-bg-2)] p-3">
                <div className="col-span-2 flex items-start gap-2 text-[11.5px]">
                  <span className="min-w-[96px] font-mono text-[var(--se-accent)]">
                    aggregation
                  </span>
                  <span className="text-[var(--se-fg-4)] font-mono">one-line example each</span>
                </div>
                {AGG_REF.map(([k, v]) => (
                  <div key={k} className="flex items-start gap-2 text-[11.5px]">
                    <span className="min-w-[96px] font-mono text-[var(--se-accent)]">{k}</span>
                    <span className="text-[var(--se-fg-3)] leading-snug">{v}</span>
                  </div>
                ))}
              </div>
            </Section>

            {/* §7 — Statistical power */}
            <Section num={7} title="Statistical power" sub="live · live · live">
              <p className="mb-2 text-[12.5px] text-[var(--se-fg-3)]">
                Estimates required sample and runtime to detect your goal lift at α={alpha},
                power=0.80.
              </p>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Baseline conversion" hint="auto-filled from history if available">
                  <NumInput
                    value={(baseline * 100).toFixed(1)}
                    onChange={(v) =>
                      setBaseline(Math.max(0.001, Math.min(0.999, (Number(v) || 0) / 100)))
                    }
                    suffix="%"
                  />
                </Field>
                <Field label="MDE" hint="minimum detectable effect (absolute)">
                  <NumInput
                    value={(mde * 100).toFixed(1)}
                    onChange={(v) => setMde(Math.max(0.001, (Number(v) || 0) / 100))}
                    suffix="%"
                  />
                  <Hint
                    left={
                      <span>
                        e.g. lift baseline {(baseline * 100).toFixed(1)}% →{" "}
                        {((baseline + mde) * 100).toFixed(1)}%
                      </span>
                    }
                  />
                </Field>
                <Field label="Daily users" hint="in this universe">
                  <NumInput value={dailyUsers.toLocaleString()} readOnly suffix="/day" />
                </Field>
                <Field label="Allocation">
                  <NumInput value={String(alloc)} readOnly suffix="%" />
                </Field>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
                <PowerStat
                  label="n per group"
                  value={power.n.toLocaleString()}
                  note={`users · for ${(mde * 100).toFixed(1)}% MDE`}
                />
                <PowerStat
                  label="Days to run"
                  value={String(power.days)}
                  tone={power.days > 30 ? "warn" : "ok"}
                  note={`at ${alloc}% alloc`}
                />
                <PowerStat label="Power" value="80%" note="β = 0.20 · z_β ≈ 0.84" />
                <PowerStat label="α (two-sided)" value={String(alpha)} note="z_α/2 ≈ 1.96" />
              </div>

              {power.days > 30 ? (
                <Banner tone="warn" className="mt-3">
                  <strong>Runtime exceeds 30 days.</strong>
                  <p className="mt-1 text-[var(--se-fg-3)]">
                    Consider raising allocation, increasing MDE, or splitting fewer groups. Long
                    runs accumulate drift risk.
                  </p>
                </Banner>
              ) : null}

              <div className="mt-3 overflow-x-auto whitespace-nowrap rounded-[var(--radius-sm)] border border-[var(--se-line)] bg-[var(--se-bg-2)] px-3 py-2 font-mono text-[11.5px] leading-relaxed text-[var(--se-fg-3)]">
                <span className="text-[var(--se-purple)]">n</span> ={" "}
                <span className="text-[var(--se-purple)]">(z₍α/2₎ + z_β)²</span> × (p₁(1−p₁) +
                p₂(1−p₂)) / MDE² · <span className="text-[var(--se-purple)]">days</span> = ⌈n /
                (daily × alloc / 2)⌉
              </div>
            </Section>

            {/* §8 — Advanced */}
            <Section num={8} title="Advanced" sub="defaults are usually right">
              <div className="grid gap-4 sm:grid-cols-3">
                <Field label="Significance threshold (α)">
                  <NumInput
                    value={String(alpha)}
                    onChange={(v) => setAlpha(Math.max(0.0001, Math.min(0.5, Number(v) || 0.05)))}
                  />
                  <Hint
                    left={
                      plan.custom_significance_threshold
                        ? "default 0.05 (two-sided)"
                        : "default 0.05 · custom values require Pro+"
                    }
                  />
                </Field>
                <Field label="Min runtime">
                  <NumInput
                    value={String(minDays)}
                    onChange={(v) => setMinDays(Math.max(0, Math.min(365, Number(v) || 0)))}
                    suffix="days"
                  />
                  <Hint left="peek-warning until reached" />
                </Field>
                <Field label="Min sample / group">
                  <NumInput
                    value={String(minSample)}
                    onChange={(v) => setMinSample(Math.max(1, Number(v) || 1))}
                    suffix="users"
                  />
                  <Hint left="default 100" />
                </Field>
              </div>

              <div className="my-4 h-px bg-[var(--se-line)]" />

              <div className="flex items-start gap-3">
                <button
                  type="button"
                  onClick={() => setSeqTest((s) => !s)}
                  disabled={!plan.sequential_testing}
                  className={cn(
                    "mt-1 inline-flex h-4 w-7 shrink-0 items-center rounded-full transition-colors",
                    seqTest && plan.sequential_testing
                      ? "bg-[var(--se-accent)]"
                      : "bg-[var(--se-bg-3)]",
                    !plan.sequential_testing && "cursor-not-allowed opacity-60",
                  )}
                >
                  <span
                    className={cn(
                      "inline-block size-3 rounded-full bg-white transition-transform",
                      seqTest && plan.sequential_testing
                        ? "translate-x-[14px]"
                        : "translate-x-[2px]",
                    )}
                  />
                </button>
                <div className="flex-1">
                  <b className="block text-[13px] font-medium">
                    Sequential testing (mSPRT){" "}
                    {!plan.sequential_testing ? (
                      <span className="ml-1.5 inline-flex items-center gap-1 rounded-[var(--radius-sm)] border border-[var(--se-purple)] px-1.5 py-0.5 font-mono text-[9px] uppercase text-[var(--se-purple)]">
                        <Lock className="size-2.5" /> Premium
                      </span>
                    ) : null}
                  </b>
                  <span className="text-[11.5px] text-[var(--se-fg-3)]">
                    Always-valid mSPRT bounds — peek at any time without inflating false-positive
                    rate.
                  </span>
                </div>
              </div>
              {!plan.sequential_testing ? (
                <div className="mt-2 flex items-center gap-2 rounded-[var(--radius-sm)] border border-[color-mix(in_oklab,var(--se-purple)_28%,transparent)] bg-[color-mix(in_oklab,var(--se-purple)_8%,transparent)] px-3 py-2 text-[12px] text-[var(--se-purple)]">
                  <Lock className="size-3" /> Unlock sequential testing — included on Premium and
                  Enterprise plans.
                  <LinkButton
                    variant="ghost"
                    size="sm"
                    href={`/dashboard/billing`}
                    className="ml-auto"
                  >
                    View plans →
                  </LinkButton>
                </div>
              ) : null}
            </Section>

            {/* §9 — Generated instrumentation */}
            <Section num={9} title="Generated instrumentation" sub="copy into your code">
              <p className="mb-2 text-[12.5px] text-[var(--se-fg-3)]">
                Wire your assignment call and the <code className="t-mono-xs">track()</code> events
                for every registered metric.
              </p>
              <div className="flex overflow-hidden rounded-t-[var(--radius-md)] border border-[var(--se-line)] bg-[var(--se-bg-2)] -mb-px">
                {(["ts", "js", "py", "rb", "go"] as CodeLang[]).map((k) => (
                  <button
                    type="button"
                    key={k}
                    onClick={() => setCodeLang(k)}
                    className={cn(
                      "border-r border-[var(--se-line)] px-3.5 py-2 font-mono text-[11.5px] last:border-r-0",
                      codeLang === k
                        ? "bg-[var(--se-bg-1)] text-[var(--se-fg)]"
                        : "text-[var(--se-fg-3)] hover:text-[var(--se-fg-2)]",
                    )}
                  >
                    {CODE_LABELS[k]}
                  </button>
                ))}
              </div>
              <div className="relative rounded-b-[var(--radius-md)] border border-t-0 border-[var(--se-line)] bg-[var(--se-bg-1)] p-4 font-mono text-[12px] leading-relaxed text-[var(--se-fg-2)]">
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard?.writeText(codeSrc);
                    setCopiedCode(true);
                  }}
                  className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-[var(--radius-sm)] border border-[var(--se-line-2)] bg-[var(--se-bg-3)] px-2 py-1 font-mono text-[10.5px] text-[var(--se-fg-2)] hover:bg-[var(--se-bg-4)]"
                >
                  {copiedCode ? (
                    <>
                      <Check className="size-2.5" /> copied
                    </>
                  ) : (
                    <>
                      <Copy className="size-2.5" /> copy
                    </>
                  )}
                </button>
                <pre className="overflow-x-auto whitespace-pre">
                  <code>{highlight(codeSrc, codeLang)}</code>
                </pre>
              </div>
            </Section>

            {/* §10 — Launch checklist */}
            <Section num={10} title="Launch checklist" sub="all required to start">
              <div className="space-y-1.5">
                {checklist.map((c, i) => (
                  <div
                    key={i}
                    className={cn(
                      "flex items-center gap-2 text-[12.5px]",
                      c.ok
                        ? "text-[var(--se-fg-2)]"
                        : c.warn
                          ? "text-[var(--se-warn)]"
                          : "text-[var(--se-fg-3)]",
                    )}
                  >
                    <span
                      className={cn(
                        "grid size-4 place-items-center rounded-full border",
                        c.ok
                          ? "border-[var(--se-accent)] bg-[var(--se-accent)] text-[var(--se-accent-fg)]"
                          : c.warn
                            ? "border-[var(--se-warn)] text-[var(--se-warn)]"
                            : "border-[var(--se-line-2)] text-[var(--se-fg-4)]",
                      )}
                    >
                      {c.ok ? (
                        <Check className="size-2.5" strokeWidth={3} />
                      ) : c.warn ? (
                        <AlertTriangle className="size-2.5" />
                      ) : (
                        <X className="size-2.5" />
                      )}
                    </span>
                    {c.label}
                  </div>
                ))}
              </div>

              {error ? (
                <div
                  role="alert"
                  className="mt-4 rounded-[var(--radius-md)] border border-[color-mix(in_oklab,var(--se-danger)_30%,transparent)] bg-[var(--se-danger-soft)] px-4 py-2 text-[13px] text-[var(--se-danger)]"
                >
                  {error}
                </div>
              ) : null}

              <div className="mt-5 flex items-center gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => submit(false)}
                  disabled={pending || !slugValid || !weightsOk || !universe}
                >
                  Save as draft
                </Button>
                <span className="ml-auto t-mono-xs dim-2">
                  {checklist.filter((c) => c.ok).length}/{checklist.length} checks pass
                </span>
                <Button
                  type="button"
                  onClick={() => submit(true)}
                  disabled={pending || !allReady}
                  data-testid="publish-button"
                >
                  <Rocket className="size-3" />
                  {pending ? "Starting…" : "Start experiment"}
                </Button>
              </div>
            </Section>
          </div>

          {/* SIDEBAR — sticky live summary */}
          <aside className="self-start lg:sticky lg:top-4">
            <div className="rounded-[var(--radius-lg)] border border-[var(--se-line)] bg-[var(--se-bg-1)]">
              <div className="flex items-center gap-2 border-b border-[var(--se-line)] px-4 py-3">
                <div className="t-caps dim-2">Live summary</div>
                <span
                  className={cn(
                    "ml-auto inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 font-mono text-[10px]",
                    weightsOk
                      ? "border-[var(--se-accent)] text-[var(--se-accent)]"
                      : "border-[var(--se-warn)] text-[var(--se-warn)]",
                  )}
                >
                  <span
                    className="size-1.5 rounded-full"
                    style={{ background: weightsOk ? "var(--se-accent)" : "var(--se-warn)" }}
                  />
                  {weightsOk ? "valid" : "invalid"}
                </span>
              </div>
              <SumSection label="Identity">
                <KV k="name" v={slug || "—"} />
                <KV k="profile" v={profile} />
                {tag ? <KV k="tag" v={tag} /> : null}
              </SumSection>
              <SumSection label="Universe & holdout">
                <KV k="universe" v={universe?.name ?? "—"} />
                <KV k="unit" v={universe?.unit_type ?? "—"} />
                <KV
                  k="holdout"
                  v={universe?.holdout_range ? `${universeHoldoutPct.toFixed(1)}%` : "none"}
                />
                {gate ? <KV k="gate" v={gate.name} /> : null}
              </SumSection>
              <SumSection label="Traffic">
                <SplitBar segs={segs} />
                <div className="mt-2 flex flex-wrap gap-2 font-mono text-[10px] text-[var(--se-fg-3)]">
                  {segs
                    .filter((s) => s.pct > 0)
                    .map((s, i) => (
                      <span key={i} className="inline-flex items-center gap-1.5">
                        <span className="size-2 rounded-[2px]" style={{ background: s.color }} />
                        {s.name} {s.pct.toFixed(1)}%
                      </span>
                    ))}
                </div>
              </SumSection>
              <SumSection label="Metrics">
                <div className="space-y-1.5 text-[12px]">
                  {goalMetrics.map((g) => (
                    <SumMetric
                      key={g.id}
                      color="var(--se-accent)"
                      name={g.name}
                      agg={g.aggregation}
                      icon="dot"
                    />
                  ))}
                  {guardMetrics.map((g) => (
                    <SumMetric
                      key={g.id}
                      color="var(--se-warn)"
                      name={g.name}
                      agg={g.aggregation}
                      icon="shield"
                    />
                  ))}
                  {secMetrics.map((g) => (
                    <SumMetric
                      key={g.id}
                      color="var(--se-info)"
                      name={g.name}
                      agg={g.aggregation}
                      icon="chart"
                    />
                  ))}
                  {allMetrics.length === 0 ? (
                    <span className="text-[var(--se-fg-4)]">none attached</span>
                  ) : null}
                </div>
              </SumSection>
              <SumSection label="Estimated runtime">
                <KV k="sample / group" v={power.n.toLocaleString()} />
                <KV
                  k="days to run"
                  v={String(power.days)}
                  vClass={power.days > 30 ? "text-[var(--se-warn)]" : undefined}
                />
                <KV k="min runtime" v={`${minDays}d`} />
                <KV k="α / power" v={`${alpha} / 0.80`} />
              </SumSection>
              <SumSection label="Ready to launch" last>
                <div className="space-y-1">
                  {checklist.map((c, i) => (
                    <div
                      key={i}
                      className={cn(
                        "flex items-center gap-1.5 text-[11.5px]",
                        c.ok
                          ? "text-[var(--se-fg-2)]"
                          : c.warn
                            ? "text-[var(--se-warn)]"
                            : "text-[var(--se-fg-3)]",
                      )}
                    >
                      <span
                        className={cn(
                          "grid size-3.5 place-items-center rounded-full border",
                          c.ok
                            ? "border-[var(--se-accent)] bg-[var(--se-accent)] text-[var(--se-accent-fg)]"
                            : c.warn
                              ? "border-[var(--se-warn)] text-[var(--se-warn)]"
                              : "border-[var(--se-line-2)] text-[var(--se-fg-4)]",
                        )}
                      >
                        {c.ok ? (
                          <Check className="size-2" strokeWidth={3} />
                        ) : c.warn ? (
                          <AlertTriangle className="size-2" />
                        ) : (
                          <X className="size-2" />
                        )}
                      </span>
                      <span className="leading-tight">{c.label}</span>
                    </div>
                  ))}
                </div>
              </SumSection>
            </div>
          </aside>
        </div>

        <div className="sticky bottom-4 z-10 flex items-center justify-between gap-3 rounded-[var(--radius-md)] border border-[var(--se-line-2)] bg-[var(--se-bg-1)] px-5 py-3 shadow-[0_12px_32px_-8px_rgba(0,0,0,0.5)]">
          <div className="flex items-center gap-2 font-mono text-[11.5px] text-[var(--se-fg-3)]">
            <span>{slug || "draft"}</span>
            <span className="text-[var(--se-fg-4)]">·</span>
            <span>
              {groups.length} group{groups.length === 1 ? "" : "s"}
            </span>
            <span className="text-[var(--se-fg-4)]">·</span>
            <span>{universe?.name ?? "no universe"}</span>
          </div>
          <div className="flex items-center gap-2">
            <LinkButton variant="ghost" size="sm" href={cancelHref}>
              Cancel
            </LinkButton>
            <Button type="button" variant="secondary" size="sm" disabled>
              <Code2 className="size-3" /> View YAML
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => submit(true)}
              disabled={pending || !allReady}
            >
              <Rocket className="size-3" />
              {pending ? "Starting…" : "Start experiment"}
            </Button>
          </div>
        </div>
      </PageBody>

      {showUniverseModal ? (
        <CreateUniverseModal
          open={showUniverseModal}
          onOpenChange={setShowUniverseModal}
          plan={plan}
          onCreated={(u) => {
            setUniverses((cur) => [...cur, u]);
            setUniverseName(u.name);
            setShowUniverseModal(false);
          }}
        />
      ) : null}

      {creatingMetricRole ? (
        <CreateMetricModal
          role={creatingMetricRole}
          events={events}
          onOpenChange={(o) => !o && setCreatingMetricRole(null)}
          onCreated={(m) => {
            setMetrics((cur) => [...cur, m]);
            const ref = { metric_id: m.id };
            if (creatingMetricRole === "goal") setGoals([...goals, ref]);
            if (creatingMetricRole === "guardrail") setGuards([...guards, ref]);
            if (creatingMetricRole === "secondary") setSecs([...secs, ref]);
            setCreatingMetricRole(null);
          }}
        />
      ) : null}
    </Page>
  );
}

// ── Section primitives ─────────────────────────────────────────────────
function Section({
  num,
  title,
  sub,
  children,
}: {
  num: number;
  title: string;
  sub?: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-4 rounded-[var(--radius-lg)] border border-[var(--se-line)] bg-[var(--se-bg-1)] p-6">
      <div className="flex items-center gap-2.5">
        <span className="grid size-[26px] place-items-center rounded-full border border-[var(--se-line-2)] bg-[var(--se-bg-3)] font-mono text-[12px] text-[var(--se-fg-3)]">
          {num}
        </span>
        <h2 className="text-[16px] font-medium tracking-[-0.005em]">{title}</h2>
        {sub ? (
          <span className="font-mono text-[10.5px] uppercase tracking-[0.06em] text-[var(--se-fg-4)]">
            · {sub}
          </span>
        ) : null}
      </div>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

function Field({ label, hint, children }: { label?: string; hint?: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      {label ? (
        <div className="flex items-baseline gap-1.5">
          <Label className="text-[13px] font-medium">{label}</Label>
          {hint ? <span className="text-[11px] text-[var(--se-fg-3)]">· {hint}</span> : null}
        </div>
      ) : null}
      {children}
    </div>
  );
}

function Hint({ left, right }: { left?: ReactNode; right?: ReactNode }) {
  return (
    <div className="flex items-center justify-between text-[11px] text-[var(--se-fg-3)]">
      <span>{left}</span>
      {right ? <span className="font-mono">{right}</span> : null}
    </div>
  );
}

function NumInput({
  value,
  onChange,
  suffix,
  width,
  readOnly,
}: {
  value: string;
  onChange?: (v: string) => void;
  suffix?: string;
  width?: number;
  readOnly?: boolean;
}) {
  return (
    <div
      className="inline-flex h-9 items-center rounded-[var(--radius-md)] border border-[var(--se-line-2)] bg-transparent px-2.5 font-mono text-[12.5px]"
      style={width ? { width } : undefined}
    >
      <input
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        readOnly={readOnly}
        className={cn(
          "w-full bg-transparent outline-none placeholder:text-[var(--se-fg-4)]",
          readOnly && "text-[var(--se-fg-3)]",
        )}
      />
      {suffix ? <span className="pl-1 text-[var(--se-fg-3)]">{suffix}</span> : null}
    </div>
  );
}

function Banner({
  tone,
  className,
  children,
}: {
  tone: "info" | "warn" | "accent";
  className?: string;
  children: ReactNode;
}) {
  const color =
    tone === "info" ? "var(--se-info)" : tone === "warn" ? "var(--se-warn)" : "var(--se-accent)";
  const Icon = tone === "warn" ? AlertTriangle : Info;
  return (
    <div
      className={cn(
        "flex items-start gap-2.5 rounded-[var(--radius-md)] border px-3 py-2.5 text-[12.5px]",
        className,
      )}
      style={{
        borderColor: `color-mix(in oklab, ${color} 30%, transparent)`,
        background: `color-mix(in oklab, ${color} 6%, transparent)`,
      }}
    >
      <Icon className="size-3.5 shrink-0" style={{ color }} />
      <div className="text-[var(--se-fg-2)]">{children}</div>
    </div>
  );
}

function SplitBar({
  segs,
  showLabels,
}: {
  segs: { name: string; pct: number; color: string }[];
  showLabels?: boolean;
}) {
  return (
    <div className="flex h-7 overflow-hidden rounded-[var(--radius-sm)] border border-[var(--se-line)]">
      {segs
        .filter((s) => s.pct > 0.001)
        .map((s, i) => (
          <span
            key={i}
            className="grid place-items-center px-2 font-mono text-[10px] text-black/70 leading-none"
            style={{ flexBasis: `${s.pct}%`, background: s.color }}
          >
            {showLabels && s.pct > 7 ? (
              <span className="truncate">
                {s.name} · {s.pct.toFixed(1)}%
              </span>
            ) : null}
          </span>
        ))}
    </div>
  );
}

function PowerStat({
  label,
  value,
  note,
  tone,
}: {
  label: string;
  value: string;
  note?: string;
  tone?: "ok" | "warn";
}) {
  return (
    <div className="rounded-[var(--radius-md)] border border-[var(--se-line)] bg-[var(--se-bg-2)] p-3">
      <div className="font-mono text-[10px] uppercase tracking-[0.06em] text-[var(--se-fg-4)]">
        {label}
      </div>
      <div
        className={cn(
          "mt-1 text-[24px] font-medium leading-none tabular-nums tracking-[-0.015em]",
          tone === "warn"
            ? "text-[var(--se-warn)]"
            : tone === "ok"
              ? "text-[var(--se-accent)]"
              : undefined,
        )}
      >
        {value}
      </div>
      {note ? (
        <div className="mt-1 font-mono text-[10.5px] text-[var(--se-fg-4)]">{note}</div>
      ) : null}
    </div>
  );
}

function RoleCard({
  tone,
  title,
  badge,
  badgeRight,
  explain,
  children,
}: {
  tone: "goal" | "guard" | "secondary";
  title: string;
  badge?: string | null;
  badgeRight?: string;
  explain: string;
  children: ReactNode;
}) {
  const color =
    tone === "goal" ? "var(--se-accent)" : tone === "guard" ? "var(--se-warn)" : "var(--se-info)";
  const Icon = tone === "goal" ? Target : tone === "guard" ? Shield : BarChart3;
  return (
    <div
      className="rounded-[var(--radius-md)] border bg-[var(--se-bg-2)] p-3"
      style={{
        borderColor:
          tone === "secondary"
            ? "var(--se-line)"
            : `color-mix(in oklab, ${color} 25%, transparent)`,
        background:
          tone === "secondary"
            ? "var(--se-bg-2)"
            : `linear-gradient(180deg, color-mix(in oklab, ${color} 5%, transparent), var(--se-bg-2))`,
      }}
    >
      <div className="mb-2 flex items-center gap-2">
        <Icon className="size-3" style={{ color }} />
        <b className="text-[13px] font-medium">{title}</b>
        {badge ? <span className="text-[var(--se-warn)] text-[11px]">{badge}</span> : null}
        {badgeRight ? (
          <span className="ml-auto font-mono text-[10.5px] text-[var(--se-fg-3)]">
            {badgeRight}
          </span>
        ) : null}
      </div>
      <div className="mb-2 text-[11.5px] leading-relaxed text-[var(--se-fg-3)]">{explain}</div>
      {children}
    </div>
  );
}

function MetricChipRow({
  tone,
  items,
  metrics,
  attached,
  onAttach,
  onRemove,
  onAdd,
  addLabel,
}: {
  tone: "goal" | "guard" | "secondary";
  items: MetricInfo[];
  metrics: MetricInfo[];
  attached: string[];
  onAttach: (id: string) => void;
  onRemove: (i: number) => void;
  onAdd: () => void;
  addLabel: string;
}) {
  const color =
    tone === "goal" ? "var(--se-accent)" : tone === "guard" ? "var(--se-warn)" : "var(--se-info)";
  const ChipIcon = tone === "goal" ? Target : tone === "guard" ? Shield : BarChart3;
  const available = metrics.filter((m) => !attached.includes(m.id));
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-1.5 rounded-[var(--radius-md)] border border-[var(--se-line-2)] bg-[var(--se-bg-2)] p-1.5 min-h-[38px]">
        {items.map((g, i) => (
          <span
            key={g.id}
            className="inline-flex items-center gap-2 rounded-[var(--radius-sm)] border bg-[var(--se-bg-2)] px-2 py-1 text-[12px]"
            style={{
              borderColor:
                tone === "secondary"
                  ? "var(--se-line-2)"
                  : `color-mix(in oklab, ${color} 30%, transparent)`,
              background:
                tone === "secondary"
                  ? "var(--se-bg-2)"
                  : `color-mix(in oklab, ${color} 6%, transparent)`,
            }}
          >
            <ChipIcon className="size-2.5" style={{ color }} />
            <b className="font-medium">{g.name}</b>
            <span className="rounded-[3px] bg-[var(--se-bg-3)] px-1 font-mono text-[10px] text-[var(--se-fg-3)]">
              {g.aggregation}
            </span>
            <button
              type="button"
              onClick={() => onRemove(i)}
              className="text-[var(--se-fg-4)] hover:text-[var(--se-fg-2)]"
            >
              <X className="size-2.5" />
            </button>
          </span>
        ))}
        <Button type="button" variant="ghost" size="sm" onClick={onAdd} className="ml-auto">
          <Plus className="size-3" /> {addLabel}
        </Button>
      </div>
      {available.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          <span className="text-[10.5px] uppercase tracking-[0.06em] font-mono text-[var(--se-fg-4)]">
            attach existing →
          </span>
          {available.slice(0, 8).map((m) => (
            <button
              type="button"
              key={m.id}
              onClick={() => onAttach(m.id)}
              className="inline-flex items-center gap-1 rounded-[var(--radius-sm)] border border-[var(--se-line-2)] bg-[var(--se-bg-2)] px-2 py-0.5 font-mono text-[11px] text-[var(--se-fg-2)] hover:border-[var(--se-line-3)]"
            >
              {m.name}
              <span className="text-[var(--se-fg-4)]">·</span>
              <span className="text-[var(--se-fg-3)]">{m.aggregation}</span>
            </button>
          ))}
          {available.length > 8 ? (
            <span className="text-[10.5px] font-mono text-[var(--se-fg-4)]">
              +{available.length - 8} more
            </span>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

// ── Sidebar pieces ──────────────────────────────────────────────────────
function SumSection({
  label,
  last,
  children,
}: {
  label: string;
  last?: boolean;
  children: ReactNode;
}) {
  return (
    <div className={cn("space-y-2 px-4 py-3", !last && "border-b border-[var(--se-line)]")}>
      <div className="t-caps dim-3">{label}</div>
      <div>{children}</div>
    </div>
  );
}

function KV({ k, v, vClass }: { k: string; v: string; vClass?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-2 text-[12px]">
      <span className="font-mono text-[10.5px] text-[var(--se-fg-3)]">{k}</span>
      <span className={cn("font-mono tabular-nums text-[var(--se-fg-2)]", vClass)}>{v}</span>
    </div>
  );
}

function SumMetric({
  color,
  name,
  agg,
  icon,
}: {
  color: string;
  name: string;
  agg: string;
  icon: "dot" | "shield" | "chart";
}) {
  const Icon = icon === "shield" ? Shield : icon === "chart" ? BarChart3 : null;
  return (
    <div className="flex items-center gap-1.5">
      {Icon ? (
        <Icon className="size-2.5 shrink-0" style={{ color }} />
      ) : (
        <span className="size-2 rounded-full shrink-0" style={{ background: color }} />
      )}
      <span className="font-mono text-[11.5px] truncate">{name}</span>
      <span className="ml-auto font-mono text-[10px] text-[var(--se-fg-3)]">{agg}</span>
    </div>
  );
}

// ── Modals ──────────────────────────────────────────────────────────────
function CreateUniverseModal({
  open,
  onOpenChange,
  plan,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  plan: PlanInfo;
  onCreated: (u: UniverseInfo) => void;
}) {
  const [name, setName] = useState("logged-out-users");
  const [unit, setUnit] = useState("user_id");
  const [holdLo, setHoldLo] = useState(0);
  const [holdHi, setHoldHi] = useState(499);
  const [enableHoldout, setEnableHoldout] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const slug = slugify(name);
  const slugValid = SLUG_RE.test(slug);
  const holdValid = !enableHoldout || (holdLo >= 0 && holdHi <= 9999 && holdLo <= holdHi);
  const ok = slugValid && holdValid;
  const pct = enableHoldout ? ((holdHi - holdLo + 1) / 10000) * 100 : 0;

  function submit() {
    setError(null);
    startTransition(async () => {
      const res = await inlineCreateUniverseAction({
        name: slug,
        unit_type: unit,
        holdout_lo: enableHoldout ? holdLo : null,
        holdout_hi: enableHoldout ? holdHi : null,
      });
      if (res.ok) {
        onCreated({
          id: res.id,
          name: res.name,
          unit_type: unit,
          holdout_range: enableHoldout ? [holdLo, holdHi] : null,
        });
      } else {
        setError(res.error);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!max-w-[640px]">
        <DialogHeader>
          <DialogTitle>Create universe</DialogTitle>
          <DialogDescription>defines who · holdout · hash</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <Field label="Name">
            <Input
              data-testid="universe-name-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
            <Hint
              left={
                <span>
                  <span className="text-[var(--se-fg-3)]">slug · </span>
                  <span
                    className={slugValid ? "text-[var(--se-accent)]" : "text-[var(--se-danger)]"}
                  >
                    {slug || "invalid"}
                  </span>
                </span>
              }
              right={slugValid ? "kebab/underscore · 1–64" : "use letters, digits, - or _"}
            />
          </Field>
          <Field label="Unit type">
            <select
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              className="h-9 w-full rounded-[var(--radius-md)] border border-[var(--se-line-2)] bg-transparent px-2.5 text-[13px] outline-none focus:border-[var(--se-line-3)]"
            >
              <option value="user_id">user_id · default</option>
              <option value="device_id">device_id</option>
              <option value="customer_id">customer_id</option>
              <option value="session_id">session_id</option>
              <option value="account_id">account_id</option>
            </select>
            <Hint left="used to hash & assign each subject to a group" />
          </Field>
          <div className="flex items-start gap-3">
            <button
              type="button"
              data-testid="universe-holdout-toggle"
              onClick={() => setEnableHoldout((s) => !s)}
              disabled={!plan.holdout_groups}
              className={cn(
                "mt-1 inline-flex h-4 w-7 shrink-0 items-center rounded-full transition-colors",
                enableHoldout && plan.holdout_groups
                  ? "bg-[var(--se-accent)]"
                  : "bg-[var(--se-bg-3)]",
                !plan.holdout_groups && "cursor-not-allowed opacity-60",
              )}
            >
              <span
                className={cn(
                  "inline-block size-3 rounded-full bg-white transition-transform",
                  enableHoldout && plan.holdout_groups ? "translate-x-[14px]" : "translate-x-[2px]",
                )}
              />
            </button>
            <div className="flex-1">
              <b className="block text-[13px] font-medium">Holdout</b>
              <span className="text-[11.5px] text-[var(--se-fg-3)]">
                Permanently exclude a slot range from every experiment in this universe.
                {!plan.holdout_groups ? " Requires Pro plan or higher." : ""}
              </span>
            </div>
          </div>
          {enableHoldout ? (
            <div className="grid grid-cols-2 gap-3">
              <Field label={`Start slot (${(holdLo / 100).toFixed(1)}%)`}>
                <NumInput
                  value={String(holdLo)}
                  onChange={(v) =>
                    setHoldLo(Math.max(0, Math.min(holdHi, Math.round(Number(v) || 0))))
                  }
                />
              </Field>
              <Field label={`End slot (${(holdHi / 100).toFixed(1)}%)`}>
                <NumInput
                  value={String(holdHi)}
                  onChange={(v) =>
                    setHoldHi(Math.max(holdLo, Math.min(9999, Math.round(Number(v) || 0))))
                  }
                />
              </Field>
              <div className="col-span-2 font-mono text-[11px] text-[var(--se-fg-3)]">
                <b className="text-[var(--se-warn)]">{pct.toFixed(1)}%</b> held out · slots {holdLo}
                –{holdHi} of 10,000
              </div>
            </div>
          ) : null}
          <Banner tone="info">
            <strong>Holdout is frozen.</strong>
            <p className="mt-1">
              The hash range and unit type can only be changed if no experiment has shipped from
              this universe yet.
            </p>
          </Banner>
          {error ? (
            <div className="rounded-[var(--radius-md)] border border-[color-mix(in_oklab,var(--se-danger)_30%,transparent)] bg-[var(--se-danger-soft)] px-3 py-2 text-[12.5px] text-[var(--se-danger)]">
              {error}
            </div>
          ) : null}
        </div>
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            data-testid="universe-create-submit"
            onClick={submit}
            disabled={!ok || pending}
          >
            <Check className="size-3" /> {pending ? "Creating…" : "Create universe"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CreateMetricModal({
  role,
  events,
  onOpenChange,
  onCreated,
}: {
  role: "goal" | "guardrail" | "secondary";
  events: EventInfo[];
  onOpenChange: (o: boolean) => void;
  onCreated: (m: MetricInfo) => void;
}) {
  const roleMeta = {
    goal: {
      label: "Goal",
      color: "var(--se-accent)",
      Icon: Target,
      desc: "Must improve significantly for the experiment to ship.",
    },
    guardrail: {
      label: "Guardrail",
      color: "var(--se-warn)",
      Icon: Shield,
      desc: "Any significant regression blocks ship.",
    },
    secondary: {
      label: "Secondary",
      color: "var(--se-info)",
      Icon: BarChart3,
      desc: "Informational only — does not affect the verdict.",
    },
  }[role];

  const [eventName, setEventName] = useState(events[0]?.name ?? "");
  const [filter, setFilter] = useState("");
  const [agg, setAgg] = useState<MetricInfo["aggregation"]>("count_users");
  const [valuePath, setValuePath] = useState("amount");
  const [winsorOn, setWinsorOn] = useState(false);
  const [winsor, setWinsor] = useState(99);
  const [mde, setMde] = useState(0.02);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const needsPath = agg === "sum" || agg === "avg";
  const filtered = events.filter((e) => !filter || e.name.includes(filter));
  const eventInfo = events.find((e) => e.name === eventName) ?? null;
  const eventPending = !eventInfo || eventInfo.pending;
  const metricName = needsPath ? slugify(`${eventName}-${valuePath}`) : slugify(eventName);

  const ok = !!eventName && !!metricName && (!needsPath || valuePath.trim());

  function submit() {
    setError(null);
    startTransition(async () => {
      const res = await inlineCreateMetricAction({
        name: metricName,
        event_name: eventName,
        value_path: needsPath ? valuePath : null,
        aggregation: agg,
        winsorize_pct: winsorOn ? winsor : null,
        min_detectable_effect: role === "guardrail" ? mde : null,
      });
      if (res.ok) {
        onCreated({
          id: res.id,
          name: res.name,
          event_name: eventName,
          aggregation: agg,
          value_path: needsPath ? valuePath : null,
          winsorize_pct: winsorOn ? winsor : 99,
          min_detectable_effect: role === "guardrail" ? mde : null,
        });
      } else {
        setError(res.error);
      }
    });
  }

  const Icon = roleMeta.Icon;

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="!max-w-[780px]">
        <DialogHeader>
          <DialogTitle>
            Add <span style={{ color: roleMeta.color }}>{roleMeta.label.toLowerCase()}</span> metric
          </DialogTitle>
          <DialogDescription>role · {role}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div
            className="flex items-start gap-2.5 rounded-[var(--radius-md)] border px-3 py-2.5 text-[12.5px]"
            style={{
              borderColor: `color-mix(in oklab, ${roleMeta.color} 30%, transparent)`,
              background: `color-mix(in oklab, ${roleMeta.color} 6%, transparent)`,
            }}
          >
            <Icon className="size-3.5 shrink-0" style={{ color: roleMeta.color }} />
            <div>
              <strong style={{ color: roleMeta.color }}>{roleMeta.label}</strong> · {roleMeta.desc}
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Event source">
              <div className="flex h-9 items-center gap-2 rounded-[var(--radius-md)] border border-[var(--se-line-2)] bg-transparent px-2.5">
                <Search className="size-3 text-[var(--se-fg-3)]" />
                <input
                  placeholder="Search the event catalog…"
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  className="flex-1 bg-transparent text-[12.5px] outline-none placeholder:text-[var(--se-fg-4)]"
                />
              </div>
              <div className="mt-1.5 max-h-[200px] overflow-auto rounded-[var(--radius-sm)] border border-[var(--se-line)] bg-[var(--se-bg-2)]">
                {filtered.length === 0 && !filter ? (
                  <div className="px-2.5 py-2 text-[12px] text-[var(--se-fg-3)]">
                    No events in catalog yet
                  </div>
                ) : null}
                {filtered.map((e) => (
                  <button
                    type="button"
                    key={e.name}
                    onClick={() => setEventName(e.name)}
                    className="flex w-full items-center gap-2 border-b border-[var(--se-line)] px-2.5 py-1.5 text-left last:border-b-0"
                    style={{
                      background:
                        eventName === e.name
                          ? "color-mix(in oklab, var(--se-accent) 8%, transparent)"
                          : "transparent",
                    }}
                  >
                    <span
                      className="size-1.5 rounded-full"
                      style={{ background: e.pending ? "var(--se-warn)" : "var(--se-accent)" }}
                    />
                    <span className="font-mono text-[12px]">{e.name}</span>
                    {e.pending ? (
                      <span className="ml-auto font-mono text-[10px] text-[var(--se-warn)]">
                        pending
                      </span>
                    ) : null}
                    {eventName === e.name ? (
                      <Check className="ml-auto size-3 text-[var(--se-accent)]" />
                    ) : null}
                  </button>
                ))}
                {filter && !filtered.find((e) => e.name === filter) ? (
                  <button
                    type="button"
                    onClick={() => setEventName(filter)}
                    className="flex w-full items-center gap-2 px-2.5 py-1.5 text-left"
                    style={{
                      background:
                        eventName === filter
                          ? "color-mix(in oklab, var(--se-warn) 10%, transparent)"
                          : "transparent",
                    }}
                  >
                    <Plus className="size-3 text-[var(--se-warn)]" />
                    <span className="font-mono text-[12px] text-[var(--se-warn)]">{filter}</span>
                    <span className="ml-auto font-mono text-[10px] text-[var(--se-warn)]">
                      pending — register later
                    </span>
                  </button>
                ) : null}
              </div>
              <Hint
                left={
                  eventPending ? (
                    <span className="text-[var(--se-warn)]">
                      pending — will become valid once event fires
                    </span>
                  ) : (
                    <span className="text-[var(--se-accent)]">registered · live</span>
                  )
                }
              />
            </Field>

            <div className="space-y-4">
              <Field label="Aggregation">
                <select
                  data-testid="metric-agg-select"
                  value={agg}
                  onChange={(e) => setAgg(e.target.value as MetricInfo["aggregation"])}
                  className="h-9 w-full rounded-[var(--radius-md)] border border-[var(--se-line-2)] bg-transparent px-2.5 text-[13px] outline-none focus:border-[var(--se-line-3)]"
                >
                  {AGG_OPTIONS.map((a) => (
                    <option key={a.k} value={a.k}>
                      {a.k}
                    </option>
                  ))}
                </select>
                <Hint left={AGG_OPTIONS.find((a) => a.k === agg)?.desc} />
              </Field>

              {needsPath ? (
                <Field label="Value path">
                  <div className="flex h-9 items-center rounded-[var(--radius-md)] border border-[var(--se-line-2)] bg-transparent">
                    <span className="border-r border-[var(--se-line-2)] bg-[var(--se-bg-2)] px-2.5 py-1.5 font-mono text-[11.5px] text-[var(--se-fg-3)]">
                      event.props.
                    </span>
                    <input
                      value={valuePath}
                      onChange={(e) => setValuePath(e.target.value)}
                      className="flex-1 bg-transparent px-2.5 font-mono text-[12.5px] outline-none"
                    />
                  </div>
                </Field>
              ) : null}

              <Field>
                <div className="flex items-start gap-3">
                  <button
                    type="button"
                    onClick={() => setWinsorOn((s) => !s)}
                    className={cn(
                      "mt-1 inline-flex h-4 w-7 shrink-0 items-center rounded-full transition-colors",
                      winsorOn ? "bg-[var(--se-accent)]" : "bg-[var(--se-bg-3)]",
                    )}
                  >
                    <span
                      className={cn(
                        "inline-block size-3 rounded-full bg-white transition-transform",
                        winsorOn ? "translate-x-[14px]" : "translate-x-[2px]",
                      )}
                    />
                  </button>
                  <div className="flex-1">
                    <b className="block text-[13px] font-medium">Winsorize</b>
                    <span className="text-[11.5px] text-[var(--se-fg-3)]">
                      cap outliers at percentile
                    </span>
                    {winsorOn ? (
                      <div className="mt-2 flex items-center gap-2">
                        <input
                          type="range"
                          min={80}
                          max={99}
                          value={winsor}
                          onChange={(e) => setWinsor(Number(e.target.value))}
                          className="flex-1 accent-[var(--se-accent)]"
                        />
                        <NumInput
                          value={String(winsor)}
                          onChange={(v) => setWinsor(Math.max(1, Math.min(99, Number(v) || 99)))}
                          suffix="pct"
                          width={74}
                        />
                      </div>
                    ) : null}
                  </div>
                </div>
              </Field>

              {role === "guardrail" ? (
                <Field label="MDE for regression alert">
                  <NumInput
                    value={(mde * 100).toFixed(1)}
                    onChange={(v) => setMde(Math.max(0, (Number(v) || 0) / 100))}
                    suffix="%"
                  />
                  <Hint left="regressions smaller than this won't trip the verdict" />
                </Field>
              ) : null}
            </div>
          </div>

          <div className="flex items-center gap-2 rounded-[var(--radius-sm)] border border-[var(--se-line)] bg-[var(--se-bg-2)] px-3 py-2 font-mono text-[11.5px] text-[var(--se-fg-2)]">
            <Cpu className="size-3 text-[var(--se-info)]" />
            <span className="text-[var(--se-fg-3)]">stored as</span>
            <span>{metricName}</span>
            <span className="text-[var(--se-fg-3)]">·</span>
            <span className="text-[var(--se-accent)]">{agg}</span>
            {winsorOn ? (
              <Fragment>
                <span className="text-[var(--se-fg-3)]">·</span>
                <span className="text-[var(--se-warn)]">w{winsor}</span>
              </Fragment>
            ) : null}
            <span className="text-[var(--se-fg-3)]">·</span>
            <span>role = {role}</span>
            {eventPending ? (
              <Fragment>
                <span className="text-[var(--se-fg-3)]">·</span>
                <span className="text-[var(--se-warn)]">pending</span>
              </Fragment>
            ) : null}
          </div>

          {error ? (
            <div className="rounded-[var(--radius-md)] border border-[color-mix(in_oklab,var(--se-danger)_30%,transparent)] bg-[var(--se-danger-soft)] px-3 py-2 text-[12.5px] text-[var(--se-danger)]">
              {error}
            </div>
          ) : null}
        </div>

        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            data-testid="metric-attach-submit"
            onClick={submit}
            disabled={!ok || pending}
          >
            <Check className="size-3" /> {pending ? "Creating…" : "Attach metric"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Code generation + highlighting ──────────────────────────────────────
type CodeLang = "ts" | "js" | "py" | "rb" | "go";
const CODE_LABELS: Record<CodeLang, string> = {
  ts: "TypeScript",
  js: "JavaScript",
  py: "Python",
  rb: "Ruby",
  go: "Go",
};

type CodeArgs = { slug: string; groupNames: string[]; events: string[] };
const CODE: Record<CodeLang, (a: CodeArgs) => string> = {
  ts: ({ slug, groupNames, events }) =>
    `import { shipeasy } from "@shipeasy/sdk";

const exp = await shipeasy.experiments.get(
  "${slug}",
  { user_id: ctx.user.id, attributes: ctx.user.attributes }
);

if (exp.group === "${groupNames[1] || "test"}") {
  return renderVariantB(exp.params);
}
return renderControl(exp.params);

// Track the events you registered as metrics
${events.map((e) => `shipeasy.track("${e}", { user_id: ctx.user.id });`).join("\n")}`,
  js: ({ slug, groupNames, events }) =>
    `const shipeasy = require("@shipeasy/sdk").default;

const exp = await shipeasy.experiments.get("${slug}", {
  user_id: ctx.user.id,
  attributes: ctx.user.attributes
});

if (exp.group === "${groupNames[1] || "test"}") {
  renderVariantB(exp.params);
} else {
  renderControl(exp.params);
}

${events.map((e) => `shipeasy.track("${e}", { user_id: ctx.user.id });`).join("\n")}`,
  py: ({ slug, groupNames, events }) =>
    `from shipeasy import client

exp = client.experiments.get(
    "${slug}",
    user_id=ctx.user.id,
    attributes=ctx.user.attributes,
)

if exp.group == "${groupNames[1] || "test"}":
    render_variant_b(exp.params)
else:
    render_control(exp.params)

${events.map((e) => `client.track("${e}", user_id=ctx.user.id)`).join("\n")}`,
  rb: ({ slug, groupNames, events }) =>
    `require "shipeasy"

exp = Shipeasy.experiments.get(
  "${slug}",
  user_id: ctx.user.id,
  attributes: ctx.user.attributes
)

if exp.group == "${groupNames[1] || "test"}"
  render_variant_b(exp.params)
else
  render_control(exp.params)
end

${events.map((e) => `Shipeasy.track("${e}", user_id: ctx.user.id)`).join("\n")}`,
  go: ({ slug, groupNames, events }) =>
    `exp, _ := shipeasy.Experiments.Get(ctx, "${slug}", &shipeasy.GetOpts{
    UserID:     ctx.User.ID,
    Attributes: ctx.User.Attributes,
})

if exp.Group == "${groupNames[1] || "test"}" {
    renderVariantB(exp.Params)
} else {
    renderControl(exp.Params)
}

${events.map((e) => `shipeasy.Track(ctx, "${e}", ctx.User.ID)`).join("\n")}`,
};

function highlight(code: string, lang: CodeLang) {
  const kwList: Record<CodeLang, string> = {
    ts: "import|from|const|let|var|if|else|return|await|async|function",
    js: "const|let|var|if|else|return|await|async|function|require",
    py: "from|import|def|if|else|return|None|True|False",
    rb: "require|if|else|end|def|return|nil|true|false",
    go: "if|else|return|func|var|const|nil|true|false",
  };
  const commentRe = lang === "py" || lang === "rb" ? "#[^\\n]*" : "//[^\\n]*";
  const re = new RegExp(
    `(${commentRe})|("[^"]*")|(\\b\\d+(?:\\.\\d+)?\\b)|(\\b(?:${kwList[lang]})\\b)`,
    "g",
  );
  const out: ReactNode[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(code)) !== null) {
    if (m.index > last) out.push(code.slice(last, m.index));
    if (m[1])
      out.push(
        <span key={i++} style={{ color: "var(--se-fg-4)", fontStyle: "italic" }}>
          {m[1]}
        </span>,
      );
    else if (m[2])
      out.push(
        <span key={i++} style={{ color: "var(--se-accent)" }}>
          {m[2]}
        </span>,
      );
    else if (m[3])
      out.push(
        <span key={i++} style={{ color: "var(--se-warn)" }}>
          {m[3]}
        </span>,
      );
    else if (m[4])
      out.push(
        <span key={i++} style={{ color: "var(--se-purple)" }}>
          {m[4]}
        </span>,
      );
    last = m.index + m[0].length;
  }
  if (last < code.length) out.push(code.slice(last));
  return out;
}
