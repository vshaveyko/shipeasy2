"use client";

import { useMemo, useState, useTransition } from "react";
import { usePathname } from "next/navigation";
import {
  ArrowRight,
  Beaker,
  Check,
  ChevronLeft,
  Code,
  FlaskConical,
  Layers,
  Plus,
  Rocket,
  Sparkles,
  Target,
  Users,
  X,
} from "lucide-react";

import { projectIdFromPathname } from "@/lib/project-path";
import { Page, PageBody } from "@/components/dashboard/page";
import { Button } from "@/components/ui/button";
import { LinkButton } from "@/components/ui/link-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { IntegrationSnippetDialog } from "@/components/integration";
import { cn } from "@/lib/utils";
import { createExperimentAction } from "../actions";

const STEPS = [
  { k: "basics", label: "Basics", tag: "1 · name & hypothesis" },
  { k: "variants", label: "Variants", tag: "2 · traffic split" },
  { k: "audience", label: "Audience & sizing", tag: "3 · who & how long" },
  { k: "review", label: "Review", tag: "4 · ship" },
] as const;

const TAG_OPTIONS = [
  "revenue",
  "activation",
  "engagement",
  "marketing",
  "stability",
  "performance",
  "search",
] as const;

interface Group {
  name: string;
  weight: number; // 0..10000 basis points
}

const DEFAULT_GROUPS: Group[] = [
  { name: "control", weight: 5000 },
  { name: "test", weight: 5000 },
];

interface Props {
  gates: { id: string; name: string }[];
}

function distributeEvenly(count: number): number[] {
  const base = Math.floor(10000 / count);
  const remainder = 10000 - base * count;
  return Array.from({ length: count }, (_, i) => base + (i < remainder ? 1 : 0));
}

function estimateDays(dailyUsers: number, groups: number, allocationPct: number, mdePct: number) {
  if (dailyUsers <= 0 || mdePct <= 0) return null;
  const mde = mdePct / 100;
  const requiredN = Math.ceil((2 * 7.85 * 0.25) / (mde * mde));
  const usersPerDay = (dailyUsers * allocationPct) / 100;
  const usersPerGroup = usersPerDay / Math.max(groups, 1);
  if (usersPerGroup <= 0) return null;
  return { requiredN, days: Math.max(1, Math.ceil(requiredN / usersPerGroup)) };
}

export default function NewExperimentClient({ gates }: Props) {
  const pathname = usePathname();
  const projectId = projectIdFromPathname(pathname) ?? "";
  const cancelHref = `/dashboard/${projectId}/experiments`;

  const [stepIdx, setStepIdx] = useState(0);

  // Step 1
  const [name, setName] = useState("");
  const [tag, setTag] = useState<string>("");
  const [hypothesis, setHypothesis] = useState("");

  // Step 2
  const [groups, setGroups] = useState<Group[]>(DEFAULT_GROUPS);
  const [allocation, setAllocation] = useState(100);

  // Step 3
  const [universe, setUniverse] = useState("default");
  const [targetingGate, setTargetingGate] = useState("");
  const [mde, setMde] = useState("5");
  const [sigThreshold, setSigThreshold] = useState("0.05");
  const [minDays, setMinDays] = useState("0");
  const [minSample, setMinSample] = useState("100");
  const [dailyUsers, setDailyUsers] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [sdkOpen, setSdkOpen] = useState(false);

  const next = () => setStepIdx((i) => Math.min(i + 1, STEPS.length - 1));
  const prev = () => setStepIdx((i) => Math.max(i - 1, 0));

  // Validation guards
  const basicsValid = /^[a-z0-9][a-z0-9_-]{0,63}$/.test(name);
  const weightSum = groups.reduce((s, g) => s + g.weight, 0);
  const variantsValid = groups.length >= 2 && weightSum === 10000;

  const estimate = useMemo(() => {
    const u = Number(dailyUsers);
    const m = Number(mde);
    if (!u || !m) return null;
    return estimateDays(u, groups.length, allocation, m);
  }, [dailyUsers, mde, groups.length, allocation]);

  function addGroup() {
    const next = groups.length + 1;
    const weights = distributeEvenly(next);
    setGroups([
      ...groups.map((g, i) => ({ ...g, weight: weights[i] })),
      { name: `variant_${groups.length}`, weight: weights[next - 1] },
    ]);
  }

  function removeGroup(idx: number) {
    if (groups.length <= 2) return;
    const next = groups.filter((_, i) => i !== idx);
    const weights = distributeEvenly(next.length);
    setGroups(next.map((g, i) => ({ ...g, weight: weights[i] })));
  }

  function updateGroupName(idx: number, value: string) {
    setGroups(groups.map((g, i) => (i === idx ? { ...g, name: value } : g)));
  }

  function publish() {
    setError(null);
    if (!basicsValid) {
      setError("Name is required (lowercase letters, digits, - or _).");
      setStepIdx(0);
      return;
    }
    if (!variantsValid) {
      setError("At least 2 variants and weights must sum to 100%.");
      setStepIdx(1);
      return;
    }
    const fd = new FormData();
    fd.set("name", name);
    if (hypothesis.trim()) fd.set("description", hypothesis.trim());
    if (tag) fd.set("tag", tag);
    fd.set("universe", universe);
    if (targetingGate) fd.set("targeting_gate", targetingGate);
    fd.set("allocation", String(allocation));
    fd.set("group_count", String(groups.length));
    groups.forEach((g, i) => {
      fd.set(`group_name_${i}`, g.name);
      fd.set(`group_weight_${i}`, String(g.weight));
    });
    fd.set("param_count", "0");
    fd.set("significance_threshold", sigThreshold);
    fd.set("min_runtime_days", minDays);
    fd.set("min_sample_size", minSample);

    startTransition(async () => {
      try {
        await createExperimentAction(fd);
      } catch (err) {
        setError((err as Error).message);
      }
    });
  }

  return (
    <Page className="px-6">
      <PageBody className="space-y-5">
        <h1 className="sr-only">New experiment</h1>

        <div className="flex items-center justify-between gap-3 px-1">
          <div>
            <div className="t-caps dim-2 mb-1">
              Step {stepIdx + 1} of {STEPS.length} · configure
            </div>
            <h2 className="text-[24px] font-medium tracking-[-0.02em]">
              <span className="t-serif text-[var(--se-fg-3)]">New </span>experiment
            </h2>
          </div>
          <Button size="sm" variant="secondary" disabled title="Coming in Phase 3">
            <Sparkles className="size-3" />
            Ask Claude to draft this
          </Button>
        </div>

        <Stepper stepIdx={stepIdx} onJump={setStepIdx} />

        {stepIdx === 0 ? (
          <StepBasics
            name={name}
            setName={setName}
            tag={tag}
            setTag={setTag}
            hypothesis={hypothesis}
            setHypothesis={setHypothesis}
          />
        ) : null}

        {stepIdx === 1 ? (
          <StepVariants
            groups={groups}
            allocation={allocation}
            setAllocation={setAllocation}
            updateGroupName={updateGroupName}
            addGroup={addGroup}
            removeGroup={removeGroup}
          />
        ) : null}

        {stepIdx === 2 ? (
          <StepAudience
            universe={universe}
            setUniverse={setUniverse}
            targetingGate={targetingGate}
            setTargetingGate={setTargetingGate}
            gates={gates}
            allocation={allocation}
            mde={mde}
            setMde={setMde}
            sigThreshold={sigThreshold}
            setSigThreshold={setSigThreshold}
            minDays={minDays}
            setMinDays={setMinDays}
            minSample={minSample}
            setMinSample={setMinSample}
            dailyUsers={dailyUsers}
            setDailyUsers={setDailyUsers}
            estimate={estimate}
            groupCount={groups.length}
          />
        ) : null}

        {stepIdx === 3 ? (
          <StepReview
            name={name}
            tag={tag}
            hypothesis={hypothesis}
            groups={groups}
            allocation={allocation}
            universe={universe}
            targetingGate={targetingGate}
            mde={mde}
            sigThreshold={sigThreshold}
            minDays={minDays}
            minSample={minSample}
            estimate={estimate}
            openSdk={() => setSdkOpen(true)}
          />
        ) : null}

        {error ? (
          <div
            role="alert"
            className="rounded-[var(--radius-md)] border border-[color-mix(in_oklab,var(--se-danger)_30%,transparent)] bg-[var(--se-danger-soft)] px-4 py-2 text-[13px] text-[var(--se-danger)]"
          >
            {error}
          </div>
        ) : null}

        <div className="sticky bottom-4 z-10 flex items-center justify-between gap-3 rounded-[var(--radius-md)] border border-[var(--se-line-2)] bg-[var(--se-bg-1)] px-5 py-3 shadow-[0_12px_32px_-8px_rgba(0,0,0,0.5)]">
          <div className="flex items-center gap-2 font-mono text-[11.5px] text-[var(--se-fg-3)]">
            <span>{STEPS[stepIdx].label}</span>
            <span className="text-[var(--se-fg-4)]">·</span>
            <span>
              {groups.length} variant{groups.length === 1 ? "" : "s"}
            </span>
            <span className="text-[var(--se-fg-4)]">·</span>
            <span>{name || "draft"}</span>
          </div>
          <div className="flex items-center gap-2">
            <LinkButton variant="ghost" size="sm" href={cancelHref}>
              Cancel
            </LinkButton>
            <Button type="button" variant="ghost" size="sm" onClick={prev} disabled={stepIdx === 0}>
              <ChevronLeft className="size-3" />
              Back
            </Button>
            {stepIdx < STEPS.length - 1 ? (
              <Button
                type="button"
                size="sm"
                onClick={next}
                disabled={(stepIdx === 0 && !basicsValid) || (stepIdx === 1 && !variantsValid)}
              >
                Continue
                <ArrowRight className="size-3" />
              </Button>
            ) : (
              <Button
                type="button"
                size="sm"
                onClick={publish}
                disabled={pending}
                data-testid="publish-button"
              >
                <Rocket className="size-3" />
                {pending ? "Creating…" : "Create experiment"}
              </Button>
            )}
          </div>
        </div>
      </PageBody>

      <IntegrationSnippetDialog
        open={sdkOpen}
        onOpenChange={setSdkOpen}
        kind="experiment"
        name={name || "new_experiment"}
      />
    </Page>
  );
}

// ───────── Stepper ─────────────────────────────────────────────────────

function Stepper({ stepIdx, onJump }: { stepIdx: number; onJump: (i: number) => void }) {
  return (
    <div
      role="tablist"
      aria-label="Wizard steps"
      className="flex items-center gap-0 rounded-[var(--radius-md)] border border-[var(--se-line-2)] bg-[var(--se-bg-1)] px-5 py-3.5"
    >
      {STEPS.flatMap((s, i) => {
        const state = i < stepIdx ? "done" : i === stepIdx ? "current" : "idle";
        const items: React.ReactNode[] = [
          <button
            key={s.k}
            type="button"
            role="tab"
            aria-selected={state === "current"}
            onClick={() => onJump(i)}
            className={cn(
              "flex shrink-0 items-center gap-2.5 rounded-[8px] p-2 transition-colors",
              state === "current" && "text-foreground",
              state === "done" && "text-[var(--se-fg-2)]",
              state === "idle" && "text-[var(--se-fg-3)] hover:text-[var(--se-fg-2)]",
            )}
          >
            <span
              className={cn(
                "grid size-[26px] shrink-0 place-items-center rounded-full border font-mono text-[12px] font-medium transition-all",
                state === "done" &&
                  "border-[var(--se-accent)] bg-[var(--se-accent)] text-[var(--se-accent-fg)]",
                state === "current" &&
                  "border-[var(--se-accent)] bg-[var(--se-bg-1)] text-foreground shadow-[0_0_0_3px_color-mix(in_oklab,var(--se-accent)_22%,transparent)]",
                state === "idle" &&
                  "border-[var(--se-line-2)] bg-[var(--se-bg-3)] text-[var(--se-fg-3)]",
              )}
            >
              {state === "done" ? <Check className="size-3" /> : i + 1}
            </span>
            <span className="flex flex-col items-start leading-[1.2]">
              <span className="text-[13.5px] font-medium tracking-[-0.005em]">{s.label}</span>
              <span
                className={cn(
                  "mt-0.5 font-mono text-[10px] tracking-[0.06em] uppercase",
                  state === "current" ? "text-[var(--se-accent)]" : "text-[var(--se-fg-4)]",
                )}
              >
                {s.tag}
              </span>
            </span>
          </button>,
        ];
        if (i < STEPS.length - 1) {
          items.push(
            <span
              key={`${s.k}-c`}
              className={cn(
                "mx-1.5 h-px min-w-[18px] flex-1",
                i < stepIdx ? "bg-[var(--se-accent)]" : "bg-[var(--se-line-2)]",
              )}
            />,
          );
        }
        return items;
      })}
    </div>
  );
}

// ───────── Step head ────────────────────────────────────────────────────

function StepHead({
  stem,
  title,
  description,
  icon,
}: {
  stem: string;
  title: string;
  description: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="flex items-end justify-between gap-6 px-1">
      <div>
        <div className="font-mono text-[11px] uppercase tracking-[0.06em] text-[var(--se-accent)]">
          {stem}
        </div>
        <h3 className="mt-1 flex items-center gap-2 text-[20px] font-medium tracking-[-0.01em]">
          {icon}
          {title}
        </h3>
        <p className="mt-1 max-w-[72ch] text-[13.5px] text-[var(--se-fg-3)]">{description}</p>
      </div>
    </div>
  );
}

function FormCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-4 rounded-[var(--radius-lg)] border border-[var(--se-line)] bg-[var(--se-bg-1)] p-6">
      {children}
    </div>
  );
}

// ───────── Step 1: Basics ───────────────────────────────────────────────

function StepBasics({
  name,
  setName,
  tag,
  setTag,
  hypothesis,
  setHypothesis,
}: {
  name: string;
  setName: (v: string) => void;
  tag: string;
  setTag: (v: string) => void;
  hypothesis: string;
  setHypothesis: (v: string) => void;
}) {
  return (
    <>
      <StepHead
        stem="Step 1 · basics"
        title="Name & hypothesis"
        description="Identify the experiment and frame what you expect to happen."
        icon={<FlaskConical className="size-4 text-[var(--se-accent)]" />}
      />
      <FormCard>
        <div className="grid gap-4 sm:grid-cols-[1fr_180px]">
          <div className="grid gap-1.5">
            <Label htmlFor="exp-name">
              Name <span className="text-[var(--se-fg-3)]">(slug)</span>
            </Label>
            <div className="flex rounded-[var(--radius-md)] border border-[var(--se-line-2)] focus-within:border-[var(--se-line-3)]">
              <span className="flex items-center rounded-l-[var(--radius-md)] bg-[var(--se-bg-2)] px-3 text-[12.5px] text-[var(--se-fg-3)] border-r border-[var(--se-line-2)]">
                exp
              </span>
              <Input
                id="exp-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="checkout-redesign-q2"
                className="rounded-l-none border-0 bg-transparent font-mono shadow-none focus-visible:ring-0"
                pattern="[a-z0-9][a-z0-9_\-]{0,59}"
              />
            </div>
            <span className="t-mono-xs dim-2">lowercase · digits · - or _ · max 64 chars</span>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="exp-tag">Tag</Label>
            <select
              id="exp-tag"
              value={tag}
              onChange={(e) => setTag(e.target.value)}
              className="h-9 rounded-[var(--radius-md)] border border-[var(--se-line-2)] bg-transparent px-2.5 text-[13px] outline-none focus:border-[var(--se-line-3)]"
            >
              <option value="">none</option>
              {TAG_OPTIONS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            <span className="t-mono-xs dim-2">groups experiments in the list view</span>
          </div>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="exp-hypothesis">
            Hypothesis <span className="text-[var(--se-fg-3)]">(optional but recommended)</span>
          </Label>
          <Textarea
            id="exp-hypothesis"
            value={hypothesis}
            onChange={(e) => setHypothesis(e.target.value)}
            placeholder="Breaking checkout into 3 focused steps reduces cognitive load and improves completion, especially on mobile."
            rows={4}
            maxLength={2000}
          />
          <span className="t-mono-xs dim-2">
            shown on the detail page so reviewers know what you expected
          </span>
        </div>
      </FormCard>
    </>
  );
}

// ───────── Step 2: Variants ─────────────────────────────────────────────

function StepVariants({
  groups,
  allocation,
  setAllocation,
  updateGroupName,
  addGroup,
  removeGroup,
}: {
  groups: Group[];
  allocation: number;
  setAllocation: (n: number) => void;
  updateGroupName: (i: number, v: string) => void;
  addGroup: () => void;
  removeGroup: (i: number) => void;
}) {
  const weightSum = groups.reduce((s, g) => s + g.weight, 0);
  const distinct = new Set(groups.map((g) => g.name)).size === groups.length;

  return (
    <>
      <StepHead
        stem="Step 2 · variants"
        title="Traffic split"
        description="Choose how many groups, what they're called, and how much of the universe enters the experiment."
        icon={<Layers className="size-4 text-[var(--se-accent)]" />}
      />
      <FormCard>
        <div className="grid gap-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="alloc">Allocation of universe</Label>
            <span
              className="text-[20px] font-medium tracking-tight"
              style={{ fontVariantNumeric: "tabular-nums" }}
            >
              {allocation}%
            </span>
          </div>
          <input
            id="alloc"
            type="range"
            min={1}
            max={100}
            value={allocation}
            onChange={(e) => setAllocation(Number(e.target.value))}
            className="w-full accent-[var(--se-accent)]"
          />
        </div>

        <div className="space-y-2">
          <div className="grid grid-cols-[40px_1fr_80px_28px] items-center gap-3 px-1">
            <span />
            <span className="t-caps dim-3">Variant</span>
            <span className="t-caps dim-3 text-right">Weight</span>
            <span />
          </div>
          {groups.map((g, idx) => {
            const isControl = idx === 0;
            const pct = Math.round(g.weight / 100);
            return (
              <div
                key={idx}
                className="grid grid-cols-[40px_1fr_80px_28px] items-center gap-3 rounded-[var(--radius-md)] border border-[var(--se-line)] bg-[var(--se-bg-2)] px-3 py-2"
              >
                <div
                  className="grid size-8 place-items-center rounded-md font-mono text-[12px] font-semibold"
                  style={{
                    background: isControl ? "var(--se-bg-3)" : "var(--se-accent)",
                    color: isControl ? "var(--se-fg-2)" : "var(--se-accent-fg)",
                    border: isControl ? "1px solid var(--se-line-2)" : "none",
                  }}
                >
                  {String.fromCharCode(65 + idx)}
                </div>
                <Input
                  value={g.name}
                  onChange={(e) => updateGroupName(idx, e.target.value)}
                  className="border-0 bg-transparent font-mono shadow-none focus-visible:ring-0"
                />
                <span
                  className="text-right font-mono text-[13px]"
                  style={{ fontVariantNumeric: "tabular-nums" }}
                >
                  {pct}%
                </span>
                <button
                  type="button"
                  onClick={() => removeGroup(idx)}
                  disabled={groups.length <= 2}
                  aria-label={`Remove ${g.name}`}
                  className="grid size-6 place-items-center rounded text-[var(--se-fg-3)] hover:text-foreground disabled:opacity-20"
                >
                  <X className="size-3.5" />
                </button>
              </div>
            );
          })}
          <button
            type="button"
            onClick={addGroup}
            className="flex w-full items-center justify-center gap-1.5 rounded-[var(--radius-md)] border border-dashed border-[var(--se-line-2)] px-3 py-2 text-[13px] text-[var(--se-fg-3)] transition-colors hover:border-[var(--se-line-3)] hover:text-foreground"
          >
            <Plus className="size-3" />
            Add variant
          </button>
        </div>

        {/* Visual split bar */}
        <div className="space-y-2">
          <div className="flex h-2 overflow-hidden rounded-full">
            {groups.map((g, idx) => (
              <div
                key={idx}
                className="transition-all"
                style={{
                  width: `${(g.weight / 100) * (allocation / 100)}%`,
                  background: idx === 0 ? "var(--se-fg-3)" : "var(--se-accent)",
                  opacity: idx === 0 ? 1 : Math.max(0.45, 1 - idx * 0.18),
                }}
              />
            ))}
            {allocation < 100 ? (
              <div
                className="bg-[var(--se-bg-3)]"
                style={{ width: `${100 - allocation}%` }}
                aria-hidden
              />
            ) : null}
          </div>
          <p className="t-mono-xs dim-2">
            {groups.map((g) => `${Math.round(g.weight / 100)}% ${g.name}`).join(" · ")}
            {allocation < 100 ? ` · ${100 - allocation}% not in experiment` : ""}
          </p>
        </div>

        {weightSum !== 10000 ? (
          <div className="rounded-[var(--radius-md)] border border-[color-mix(in_oklab,var(--se-warn)_30%,transparent)] bg-[color-mix(in_oklab,var(--se-warn)_8%,transparent)] px-3 py-2 text-[12.5px] text-[var(--se-warn)]">
            Weights must sum to exactly 100% (currently {(weightSum / 100).toFixed(2)}%).
          </div>
        ) : null}
        {!distinct ? (
          <div className="rounded-[var(--radius-md)] border border-[color-mix(in_oklab,var(--se-warn)_30%,transparent)] bg-[color-mix(in_oklab,var(--se-warn)_8%,transparent)] px-3 py-2 text-[12.5px] text-[var(--se-warn)]">
            Variant names must be unique.
          </div>
        ) : null}
      </FormCard>
    </>
  );
}

// ───────── Step 3: Audience & sizing ────────────────────────────────────

function StepAudience({
  universe,
  setUniverse,
  targetingGate,
  setTargetingGate,
  gates,
  allocation,
  mde,
  setMde,
  sigThreshold,
  setSigThreshold,
  minDays,
  setMinDays,
  minSample,
  setMinSample,
  dailyUsers,
  setDailyUsers,
  estimate,
  groupCount,
}: {
  universe: string;
  setUniverse: (v: string) => void;
  targetingGate: string;
  setTargetingGate: (v: string) => void;
  gates: { id: string; name: string }[];
  allocation: number;
  mde: string;
  setMde: (v: string) => void;
  sigThreshold: string;
  setSigThreshold: (v: string) => void;
  minDays: string;
  setMinDays: (v: string) => void;
  minSample: string;
  setMinSample: (v: string) => void;
  dailyUsers: string;
  setDailyUsers: (v: string) => void;
  estimate: { requiredN: number; days: number } | null;
  groupCount: number;
}) {
  return (
    <>
      <StepHead
        stem="Step 3 · audience & sizing"
        title="Who's in & how long"
        description="Pick the universe, an optional targeting gate, and the statistical bar before shipping."
        icon={<Users className="size-4 text-[var(--se-accent)]" />}
      />
      <FormCard>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-1.5">
            <Label htmlFor="exp-universe">Universe</Label>
            <select
              id="exp-universe"
              value={universe}
              onChange={(e) => setUniverse(e.target.value)}
              className="h-9 rounded-[var(--radius-md)] border border-[var(--se-line-2)] bg-transparent px-2.5 text-[13px] outline-none focus:border-[var(--se-line-3)]"
            >
              <option value="default">Default (no holdout)</option>
            </select>
            <span className="t-mono-xs dim-2">
              holdouts are configured on the universe, not the experiment
            </span>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="exp-gate">Targeting gate</Label>
            <select
              id="exp-gate"
              value={targetingGate}
              onChange={(e) => setTargetingGate(e.target.value)}
              className="h-9 rounded-[var(--radius-md)] border border-[var(--se-line-2)] bg-transparent px-2.5 text-[13px] outline-none focus:border-[var(--se-line-3)]"
            >
              <option value="">None (all users in the allocation)</option>
              {gates.map((g) => (
                <option key={g.id} value={g.name}>
                  {g.name}
                </option>
              ))}
            </select>
            <span className="t-mono-xs dim-2">only users who pass this gate are enrolled</span>
          </div>
        </div>
      </FormCard>

      <FormCard>
        <div className="flex items-center gap-2">
          <Target className="size-4 text-[var(--se-accent)]" />
          <h4 className="text-[14px] font-medium">Statistical bar</h4>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="grid gap-1.5">
            <Label htmlFor="mde">MDE %</Label>
            <Input
              id="mde"
              type="number"
              min={0.1}
              step={0.1}
              max={50}
              value={mde}
              onChange={(e) => setMde(e.target.value)}
              className="font-mono"
            />
            <span className="t-mono-xs dim-2">smallest effect worth detecting</span>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="sig">Significance</Label>
            <Input
              id="sig"
              type="number"
              min={0.001}
              step={0.001}
              max={0.5}
              value={sigThreshold}
              onChange={(e) => setSigThreshold(e.target.value)}
              className="font-mono"
            />
            <span className="t-mono-xs dim-2">α threshold (default 0.05)</span>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="min-sample">Min sample / group</Label>
            <Input
              id="min-sample"
              type="number"
              min={1}
              value={minSample}
              onChange={(e) => setMinSample(e.target.value)}
              className="font-mono"
            />
            <span className="t-mono-xs dim-2">won't conclude before this many users</span>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-1.5">
            <Label htmlFor="min-days">Min runtime (days)</Label>
            <Input
              id="min-days"
              type="number"
              min={0}
              max={365}
              value={minDays}
              onChange={(e) => setMinDays(e.target.value)}
              className="font-mono"
            />
            <span className="t-mono-xs dim-2">smooth out weekday seasonality</span>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="daily-users">Daily users (estimate)</Label>
            <Input
              id="daily-users"
              type="number"
              min={1}
              placeholder="1000"
              value={dailyUsers}
              onChange={(e) => setDailyUsers(e.target.value)}
              className="font-mono"
            />
            <span className="t-mono-xs dim-2">
              used to estimate runtime — not sent to the server
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-[var(--radius-md)] border border-[var(--se-line)] bg-[var(--se-bg-2)] px-4 py-3">
          <Beaker className="size-4 shrink-0 text-[var(--se-accent)]" />
          <div className="flex-1 text-[13px] leading-[1.55]">
            {estimate ? (
              <>
                Estimated minimum sample{" "}
                <b className="font-mono" style={{ fontVariantNumeric: "tabular-nums" }}>
                  {estimate.requiredN.toLocaleString()}
                </b>{" "}
                per group ·{" "}
                <b className="font-mono" style={{ fontVariantNumeric: "tabular-nums" }}>
                  ~{estimate.days} day{estimate.days === 1 ? "" : "s"}
                </b>{" "}
                with current allocation ({allocation}% × {groupCount} groups, MDE {mde}%).
              </>
            ) : (
              <>
                Add a daily-users estimate above and we'll compute the required sample size and
                expected runtime.
              </>
            )}
          </div>
        </div>
      </FormCard>
    </>
  );
}

// ───────── Step 4: Review ───────────────────────────────────────────────

function StepReview({
  name,
  tag,
  hypothesis,
  groups,
  allocation,
  universe,
  targetingGate,
  mde,
  sigThreshold,
  minDays,
  minSample,
  estimate,
  openSdk,
}: {
  name: string;
  tag: string;
  hypothesis: string;
  groups: Group[];
  allocation: number;
  universe: string;
  targetingGate: string;
  mde: string;
  sigThreshold: string;
  minDays: string;
  minSample: string;
  estimate: { requiredN: number; days: number } | null;
  openSdk: () => void;
}) {
  return (
    <>
      <StepHead
        stem="Step 4 · review"
        title="Review & ship"
        description="Confirm the configuration, copy the SDK snippet, and create the draft. You can always edit before starting."
        icon={<Rocket className="size-4 text-[var(--se-accent)]" />}
      />
      <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
        <div className="space-y-5">
          <FormCard>
            <h4 className="text-[14px] font-medium">Summary</h4>
            <div className="grid gap-2.5 text-[13px]">
              <SummaryRow k="Name" v={name || "—"} mono />
              {tag ? <SummaryRow k="Tag" v={tag} mono /> : null}
              {hypothesis ? <SummaryRow k="Hypothesis" v={hypothesis} multiline /> : null}
              <SummaryRow
                k="Variants"
                v={groups.map((g) => `${g.name} ${Math.round(g.weight / 100)}%`).join(" · ")}
                mono
              />
              <SummaryRow k="Allocation" v={`${allocation}% of universe`} />
              <SummaryRow k="Universe" v={universe} mono />
              <SummaryRow
                k="Targeting gate"
                v={targetingGate || "none (all users in allocation)"}
                mono={!!targetingGate}
              />
              <SummaryRow k="MDE" v={`${mde}%`} mono />
              <SummaryRow k="Significance" v={sigThreshold} mono />
              <SummaryRow k="Min runtime" v={`${minDays} days`} mono />
              <SummaryRow k="Min sample / group" v={minSample} mono />
              {estimate ? (
                <SummaryRow
                  k="Estimated runtime"
                  v={`${estimate.requiredN.toLocaleString()} per group · ~${estimate.days} day${estimate.days === 1 ? "" : "s"}`}
                />
              ) : null}
            </div>
          </FormCard>

          <FormCard>
            <div className="flex items-center gap-2">
              <Code className="size-4 text-[var(--se-accent)]" />
              <h4 className="text-[14px] font-medium">SDK snippet</h4>
              <span className="ml-auto t-mono-xs dim-2">how your app reads this experiment</span>
            </div>
            <pre className="overflow-x-auto rounded-[var(--radius-md)] border border-[var(--se-line)] bg-[var(--se-bg-2)] p-4 font-mono text-[12px] leading-[1.65] text-[var(--se-fg-2)]">
              <span className="text-[var(--se-fg-4)]">// shipeasy SDK</span>
              {"\n"}
              <span style={{ color: "var(--se-purple)" }}>const</span>
              {" variant = shipeasy."}
              <span style={{ color: "var(--se-purple)" }}>use</span>
              {"("}
              <span style={{ color: "var(--se-accent)" }}>{`"${name || "exp_name"}"`}</span>
              {");\n"}
              <span style={{ color: "var(--se-purple)" }}>if</span>
              {" (variant === "}
              <span style={{ color: "var(--se-accent)" }}>
                {`"${groups.find((_, i) => i === 1)?.name ?? "test"}"`}
              </span>
              {") {\n  "}
              <span style={{ color: "var(--se-purple)" }}>return</span>
              {" <"}
              <span style={{ color: "var(--se-purple)" }}>VariantB</span>
              {" />;\n}\n"}
              <span style={{ color: "var(--se-purple)" }}>return</span>
              {" <"}
              <span style={{ color: "var(--se-purple)" }}>Control</span>
              {" />;"}
            </pre>
            <Button type="button" size="sm" variant="ghost" onClick={openSdk}>
              <Code className="size-3" />
              Open full integration guide
            </Button>
          </FormCard>
        </div>

        <FormCard>
          <h4 className="text-[14px] font-medium">After you create</h4>
          <ol className="list-decimal space-y-2 pl-4 text-[13px] leading-[1.55] text-[var(--se-fg-2)]">
            <li>Attach goal, secondary, and guardrail metrics on the detail page.</li>
            <li>Drop the SDK snippet into your app and deploy.</li>
            <li>
              Press <b>Start experiment</b> when you're ready to enroll users.
            </li>
            <li>Daily analysis runs automatically; results land on the detail page.</li>
          </ol>
          <div className="rounded-[var(--radius-md)] border border-[var(--se-line)] bg-[var(--se-bg-2)] p-3">
            <div className="flex items-center gap-2">
              <Sparkles className="size-3.5 text-[var(--se-accent)]" />
              <span className="t-mono-xs dim-2">Reminder</span>
            </div>
            <p className="mt-1.5 text-[12.5px] text-[var(--se-fg-3)]">
              Until you press <b>Start</b>, the experiment is a draft — the SDK returns the control
              variant and no users are enrolled.
            </p>
          </div>
        </FormCard>
      </div>
    </>
  );
}

function SummaryRow({
  k,
  v,
  mono,
  multiline,
}: {
  k: string;
  v: string;
  mono?: boolean;
  multiline?: boolean;
}) {
  return (
    <div
      className={cn(
        "grid gap-2 border-b border-[var(--se-line)] pb-2.5 last:border-none",
        multiline ? "grid-cols-1" : "grid-cols-[180px_1fr]",
      )}
    >
      <span className="text-[var(--se-fg-3)]">{k}</span>
      <span
        className={cn(
          mono && "font-mono text-[12px]",
          multiline && "text-[12.5px] leading-[1.55] text-[var(--se-fg-2)]",
        )}
        style={{ fontVariantNumeric: mono ? "tabular-nums" : undefined }}
      >
        {v}
      </span>
    </div>
  );
}
