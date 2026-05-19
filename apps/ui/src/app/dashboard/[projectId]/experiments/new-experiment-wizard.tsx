"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { Plus, Sparkles } from "lucide-react";
import { toast } from "sonner";
import useSWR from "swr";

import { BigModalWizard, type WizardStep } from "@/components/shell/big-modal-wizard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Combobox, type ComboboxOption } from "@/components/ui/combobox";
import { CodeBlock } from "@/components/ui/code-block";
import { FieldArray, FieldArrayRow, FieldArrayAdd } from "@/components/ui/field-array";
import { FolderNameInput, deriveFolderName } from "@/components/ui/folder-name-input";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import {
  inlineCreateUniverseAction,
  publishExperimentAction,
  type WizardMetricInput,
} from "./actions";
import { NewMetricWizard } from "../metrics/new-metric-wizard";

type UniverseRow = { id: string; name: string; unit_type?: string };
type GateRow = { id: string; name: string };
type MetricRow = { id: string; name: string; aggregation?: string };
type CreatedEntity =
  | { kind: "universe"; id: string; name: string; meta?: string }
  | { kind: "event"; id?: string; name: string; meta?: string }
  | { kind: "metric"; id: string; name: string; meta?: string };

const fetcher = async <T,>(url: string): Promise<T> => {
  const res = await fetch(url, { credentials: "same-origin" });
  if (!res.ok) throw new Error(`${url} → HTTP ${res.status}`);
  const body = (await res.json()) as T | { data: T };
  if (Array.isArray(body)) return body as T;
  if (typeof body === "object" && body && "data" in (body as object))
    return (body as { data: T }).data;
  return body as T;
};

type Variant = { name: string; weight: number };

function rebalance(variants: Variant[]): Variant[] {
  const n = variants.length;
  if (n === 0) return [];
  const base = Math.floor(10000 / n);
  const remainder = 10000 - base * n;
  return variants.map((v, i) => ({
    ...v,
    weight: base + (i === 0 ? remainder : 0),
  }));
}

export interface NewExperimentWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  onCreated?: () => void;
}

export function NewExperimentWizard({
  open,
  onOpenChange,
  projectId,
  onCreated,
}: NewExperimentWizardProps) {
  const [step, setStep] = useState(0);
  const [folder, setFolder] = useState("");
  const [leaf, setLeaf] = useState("");
  const [description, setDescription] = useState("");
  const [tag, setTag] = useState("");
  const [universe, setUniverse] = useState<string>("default");
  const [allocation, setAllocation] = useState<number>(100);
  const [gate, setGate] = useState<string>("none");
  const [variants, setVariants] = useState<Variant[]>([
    { name: "control", weight: 5000 },
    { name: "treatment", weight: 5000 },
  ]);
  const [goalMetricId, setGoalMetricId] = useState<string>("");
  const [guardrailIds, setGuardrailIds] = useState<string[]>([]);
  const [secondaryIds, setSecondaryIds] = useState<string[]>([]);
  const [mdePct, setMdePct] = useState<number>(5);
  const [alphaPct, setAlphaPct] = useState<number>(5);
  const [startNow, setStartNow] = useState<boolean>(true);
  const [pending, startTransition] = useTransition();

  const { data: universes, mutate: refetchUniverses } = useSWR<UniverseRow[]>(
    open ? "/api/admin/universes" : null,
    fetcher,
  );
  const { data: gates } = useSWR<GateRow[]>(open ? "/api/admin/gates" : null, fetcher);
  const { data: metrics, mutate: refetchMetrics } = useSWR<MetricRow[]>(
    open ? "/api/admin/metrics" : null,
    fetcher,
  );

  const [universeModalOpen, setUniverseModalOpen] = useState(false);
  const [metricModalOpen, setMetricModalOpen] = useState(false);
  // Collect every inline-created entity so the Integrate step can list them
  // as the "wire-in" punch list for this run.
  const [createdEntities, setCreatedEntities] = useState<CreatedEntity[]>([]);

  function pushCreated(entity: CreatedEntity) {
    setCreatedEntities((prev) =>
      prev.some((e) => e.kind === entity.kind && e.name === entity.name) ? prev : [...prev, entity],
    );
  }

  const derivedName = deriveFolderName(folder, leaf);
  const trimmed = derivedName.fullName;
  const nameValid = derivedName.folderValid && derivedName.leafValid;
  const variantsValid = useMemo(() => {
    if (variants.length < 2) return false;
    if (variants.some((v) => !v.name.trim())) return false;
    const sum = variants.reduce((s, v) => s + v.weight, 0);
    return sum === 10000;
  }, [variants]);
  const metricsValid = goalMetricId.length > 0;

  const universeOptions: ComboboxOption[] = useMemo(() => {
    const seen = new Set<string>();
    const rows: ComboboxOption[] = [];
    rows.push({ value: "default", label: "default" });
    seen.add("default");
    (universes ?? []).forEach((u) => {
      if (!seen.has(u.name)) {
        seen.add(u.name);
        rows.push({ value: u.name, label: u.name, description: u.unit_type });
      }
    });
    return rows;
  }, [universes]);

  const gateOptions: ComboboxOption[] = useMemo(() => {
    const rows: ComboboxOption[] = [{ value: "none", label: "No gate (open to universe)" }];
    (gates ?? []).forEach((g) => rows.push({ value: g.name, label: g.name }));
    return rows;
  }, [gates]);

  const metricOptions: ComboboxOption[] = useMemo(() => {
    return (metrics ?? []).map((m) => ({
      value: m.id,
      label: m.name,
      description: m.aggregation,
    }));
  }, [metrics]);

  useEffect(() => {
    if (!open) {
      setStep(0);
      setFolder("");
      setLeaf("");
      setDescription("");
      setTag("");
      setUniverse("default");
      setAllocation(100);
      setGate("none");
      setVariants([
        { name: "control", weight: 5000 },
        { name: "treatment", weight: 5000 },
      ]);
      setGoalMetricId("");
      setGuardrailIds([]);
      setSecondaryIds([]);
      setMdePct(5);
      setAlphaPct(5);
      setStartNow(true);
    }
  }, [open]);

  function addVariant() {
    setVariants((prev) => {
      if (prev.length >= 6) return prev;
      const next = [...prev, { name: `variant_${prev.length}`, weight: 0 }];
      return rebalance(next);
    });
  }
  function removeVariant(i: number) {
    setVariants((prev) => {
      if (prev.length <= 2) return prev;
      const next = prev.filter((_, idx) => idx !== i);
      return rebalance(next);
    });
  }
  function setVariantName(i: number, n: string) {
    setVariants((prev) => prev.map((v, idx) => (idx === i ? { ...v, name: n } : v)));
  }
  function setVariantWeight(i: number, bps: number) {
    setVariants((prev) => prev.map((v, idx) => (idx === i ? { ...v, weight: bps } : v)));
  }

  function toggleId(arr: string[], id: string): string[] {
    return arr.includes(id) ? arr.filter((x) => x !== id) : [...arr, id];
  }

  const goalMetricName = useMemo(
    () => (metrics ?? []).find((m) => m.id === goalMetricId)?.name ?? null,
    [metrics, goalMetricId],
  );

  const steps: WizardStep[] = [
    {
      id: "basics",
      label: "Basics",
      title: "Hypothesis & basics",
      hint: "A stable identifier and a one-line hypothesis.",
      isValid: () => nameValid,
      content: (
        <div className="flex flex-col gap-4">
          <div>
            <Label htmlFor="experiment-folder">Slug</Label>
            <FolderNameInput
              folder={folder}
              leaf={leaf}
              onFolderChange={setFolder}
              onLeafChange={setLeaf}
              folderPlaceholder="checkout"
              leafPlaceholder="redesign_q2"
              folderId="experiment-folder"
              leafId="experiment-name"
              leafTestId="experiment-name-input"
            />
            <p className="t-mono-xs dim-2 mt-1">
              <code className="font-mono">folder.name</code> · used everywhere the SDK references
              this experiment.
            </p>
          </div>
          <div>
            <Label htmlFor="experiment-description">Question / hypothesis</Label>
            <Textarea
              id="experiment-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="If we collapse the address step into shipping, checkout conversion will rise."
              rows={3}
            />
          </div>
          <div>
            <Label htmlFor="experiment-tag">Tag (optional)</Label>
            <Input
              id="experiment-tag"
              data-mono
              value={tag}
              onChange={(e) => setTag(e.target.value)}
              placeholder="q2-growth"
            />
          </div>
        </div>
      ),
      aside: (
        <ExperimentAside
          trimmed={trimmed}
          universe={universe}
          allocation={allocation}
          variants={variants}
          goalMetricName={goalMetricName}
        />
      ),
    },
    {
      id: "audience",
      label: "Audience",
      title: "Universe & allocation",
      hint: "Who gets enrolled and what slice of them.",
      content: (
        <div className="flex flex-col gap-4">
          <div>
            <div className="flex items-center justify-between">
              <Label htmlFor="experiment-universe">Universe</Label>
              <button
                type="button"
                onClick={() => setUniverseModalOpen(true)}
                className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11.5px] text-[var(--se-accent)] hover:bg-[var(--se-accent-soft)]"
              >
                <Plus className="size-3" /> New universe
              </button>
            </div>
            <Combobox
              id="experiment-universe"
              options={universeOptions}
              value={universe}
              onValueChange={setUniverse}
              placeholder="Pick a universe"
              onCreateNew={() => setUniverseModalOpen(true)}
              createNewLabel="Create new universe"
            />
            <p className="t-mono-xs dim-2 mt-1">
              Universes own the unit (user_id / device_id) and reserve a holdout. Common picks:
              <span className="font-mono"> default</span> for logged-in users,
              <span className="font-mono"> device_id</span> for anonymous.
            </p>
          </div>
          <div>
            <div className="flex items-center justify-between">
              <Label htmlFor="experiment-allocation">Allocation</Label>
              <span
                className="font-mono text-[12px] text-[var(--se-fg-2)]"
                style={{ fontVariantNumeric: "tabular-nums" }}
              >
                {allocation}% of universe
              </span>
            </div>
            <Slider
              id="experiment-allocation"
              min={0}
              max={100}
              step={1}
              value={allocation}
              onValueChange={(v) => setAllocation(Array.isArray(v) ? (v[0] ?? 0) : (v as number))}
            />
            <p className="t-mono-xs dim-2 mt-1">
              Share of universe traffic enrolled into this experiment. Common: <b>100%</b> for quick
              reads, <b>50%</b> when you want a same-population control outside the test,
              <b>10–25%</b> for risky launches.
            </p>
          </div>
          <div>
            <Label htmlFor="experiment-gate">Targeting gate (optional)</Label>
            <Combobox
              id="experiment-gate"
              options={gateOptions}
              value={gate}
              onValueChange={setGate}
              placeholder="No gate"
            />
            <p className="t-mono-xs dim-2 mt-1">
              Only users who pass this gate are eligible for the experiment.
            </p>
          </div>
        </div>
      ),
      aside: (
        <ExperimentAside
          trimmed={trimmed}
          universe={universe}
          allocation={allocation}
          variants={variants}
          goalMetricName={goalMetricName}
        />
      ),
    },
    {
      id: "variants",
      label: "Variants",
      title: "Variants & weights",
      hint: "Weights must sum to 100%.",
      isValid: () => variantsValid,
      content: (
        <div className="flex flex-col gap-3">
          <FieldArray>
            {variants.map((v, i) => (
              <FieldArrayRow
                key={i}
                onRemove={variants.length > 2 ? () => removeVariant(i) : undefined}
              >
                <Input
                  data-mono
                  data-testid={`variant-name-${i}`}
                  value={v.name}
                  onChange={(e) => setVariantName(i, e.target.value)}
                  placeholder={i === 0 ? "control" : `variant_${i}`}
                  className="w-[200px]"
                />
                <div className="flex flex-1 items-center gap-2">
                  <Slider
                    min={0}
                    max={10000}
                    step={100}
                    value={v.weight}
                    onValueChange={(val) =>
                      setVariantWeight(i, Array.isArray(val) ? (val[0] ?? 0) : (val as number))
                    }
                  />
                  <span
                    className="w-[56px] shrink-0 text-right font-mono text-[12px] text-[var(--se-fg-2)]"
                    style={{ fontVariantNumeric: "tabular-nums" }}
                  >
                    {Math.round(v.weight / 100)}%
                  </span>
                </div>
              </FieldArrayRow>
            ))}
            <FieldArrayAdd onClick={addVariant} disabled={variants.length >= 6}>
              Add variant
            </FieldArrayAdd>
          </FieldArray>
          <div className="flex items-center justify-between rounded-md border border-[var(--se-line)] bg-[var(--se-bg-2)] px-3 py-2 text-[12.5px]">
            <span className="dim-2">Sum</span>
            <span
              className={
                variantsValid
                  ? "font-mono text-[var(--se-accent)]"
                  : "font-mono text-[var(--se-danger)]"
              }
              style={{ fontVariantNumeric: "tabular-nums" }}
            >
              {variants.reduce((s, v) => s + v.weight, 0) / 100}%{" "}
              {variantsValid ? "✓" : "(must equal 100%)"}
            </span>
          </div>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => setVariants((prev) => rebalance(prev))}
          >
            Rebalance evenly
          </Button>
        </div>
      ),
      aside: (
        <ExperimentAside
          trimmed={trimmed}
          universe={universe}
          allocation={allocation}
          variants={variants}
          goalMetricName={goalMetricName}
        />
      ),
    },
    {
      id: "metrics",
      label: "Metrics",
      title: "Goal & guardrails",
      hint: "Pick one north-star metric. Guardrails alert when they regress.",
      isValid: () => metricsValid,
      content: (
        <div className="flex flex-col gap-4">
          <div>
            <div className="flex items-center justify-between">
              <Label htmlFor="experiment-goal-metric">Goal metric *</Label>
              <button
                type="button"
                onClick={() => setMetricModalOpen(true)}
                className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11.5px] text-[var(--se-accent)] hover:bg-[var(--se-accent-soft)]"
              >
                <Plus className="size-3" /> New metric
              </button>
            </div>
            <Combobox
              id="experiment-goal-metric"
              options={metricOptions}
              value={goalMetricId}
              onValueChange={setGoalMetricId}
              placeholder={
                metricOptions.length === 0
                  ? 'No metrics registered yet — click "+ New metric"'
                  : "Pick a goal metric"
              }
              onCreateNew={() => setMetricModalOpen(true)}
              createNewLabel="Create new metric"
            />
            <p className="t-mono-xs dim-2 mt-1">
              The primary outcome we evaluate at significance. Drives the verdict on the home
              cockpit.
            </p>
          </div>
          <MetricChipPicker
            title="Guardrail metrics"
            description="Move them in the wrong direction and the run alerts."
            options={metricOptions}
            selected={guardrailIds}
            disable={[goalMetricId, ...secondaryIds]}
            onToggle={(id) => setGuardrailIds((arr) => toggleId(arr, id))}
          />
          <MetricChipPicker
            title="Secondary metrics"
            description="Tracked alongside for context — they don't gate verdicts."
            options={metricOptions}
            selected={secondaryIds}
            disable={[goalMetricId, ...guardrailIds]}
            onToggle={(id) => setSecondaryIds((arr) => toggleId(arr, id))}
          />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="flex items-center justify-between">
                <Label htmlFor="experiment-mde">Min. detectable effect</Label>
                <span
                  className="font-mono text-[12px] text-[var(--se-fg-2)]"
                  style={{ fontVariantNumeric: "tabular-nums" }}
                >
                  {mdePct}%
                </span>
              </div>
              <Slider
                id="experiment-mde"
                min={1}
                max={25}
                step={1}
                value={mdePct}
                onValueChange={(v) => setMdePct(Array.isArray(v) ? (v[0] ?? 5) : (v as number))}
              />
              <p className="t-mono-xs dim-2 mt-1">
                Smallest lift you want to be able to detect. Smaller = bigger sample. Common:
                <b> 5%</b> (default), <b>2%</b> for high-traffic, <b>10%+</b> for early experiments.
              </p>
            </div>
            <div>
              <div className="flex items-center justify-between">
                <Label htmlFor="experiment-alpha">Significance (α)</Label>
                <span
                  className="font-mono text-[12px] text-[var(--se-fg-2)]"
                  style={{ fontVariantNumeric: "tabular-nums" }}
                >
                  {alphaPct}%
                </span>
              </div>
              <Slider
                id="experiment-alpha"
                min={1}
                max={20}
                step={1}
                value={alphaPct}
                onValueChange={(v) => setAlphaPct(Array.isArray(v) ? (v[0] ?? 5) : (v as number))}
              />
              <p className="t-mono-xs dim-2 mt-1">
                False-positive tolerance. Verdict fires when p &lt; α. Common: <b>5%</b> industry
                default, <b>1%</b> when shipping risk is high, <b>10%</b> for rapid iteration.
              </p>
            </div>
          </div>
        </div>
      ),
      aside: (
        <ExperimentAside
          trimmed={trimmed}
          universe={universe}
          allocation={allocation}
          variants={variants}
          goalMetricName={goalMetricName}
        />
      ),
    },
    {
      id: "integrate",
      label: "Integrate",
      title: "Wire it up",
      hint: "Drop one of these into your codebase. SDK reads are sub-millisecond after the first hydrate.",
      content: (
        <div className="flex flex-col gap-3">
          <IntegrationBlock
            experimentSlug={trimmed || "your_experiment"}
            variants={variants}
            entities={createdEntities}
            startNow={startNow}
            setStartNow={setStartNow}
            universeName={universe}
            goalMetricName={goalMetricName}
            allocation={allocation}
          />
        </div>
      ),
      aside: (
        <ExperimentAside
          trimmed={trimmed}
          universe={universe}
          allocation={allocation}
          variants={variants}
          goalMetricName={goalMetricName}
        />
      ),
    },
  ];

  function handleSubmit() {
    if (!nameValid || !variantsValid || !metricsValid) {
      setStep(nameValid ? (variantsValid ? 3 : 2) : 0);
      return;
    }
    const metricsInput: WizardMetricInput[] = [
      { metric_id: goalMetricId, role: "goal" },
      ...guardrailIds.map<WizardMetricInput>((id) => ({ metric_id: id, role: "guardrail" })),
      ...secondaryIds.map<WizardMetricInput>((id) => ({ metric_id: id, role: "secondary" })),
    ];
    startTransition(async () => {
      const result = await publishExperimentAction({
        name: trimmed,
        description: description.trim() || null,
        tag: tag.trim() || null,
        universe,
        targeting_gate: gate === "none" ? null : gate,
        allocation_pct: allocation * 100,
        groups: variants.map((v) => ({ name: v.name, weight: v.weight, params: {} })),
        params: {},
        significance_threshold: alphaPct / 100,
        min_runtime_days: 0,
        min_sample_size: 100,
        sequential_testing: false,
        metrics: metricsInput,
        start: startNow,
      });
      if (result.ok) {
        toast.success(result.message);
        onCreated?.();
      } else {
        toast.error(result.error ?? "Failed to create experiment");
      }
    });
  }

  return (
    <>
      <BigModalWizard
        open={open}
        onOpenChange={onOpenChange}
        kind="experiments"
        title="Design the experiment"
        eyebrow={{ project: projectId }}
        steps={steps}
        current={step}
        onStepChange={setStep}
        onSubmit={handleSubmit}
        submitLabel={startNow ? undefined : "Save as draft"}
        submitting={pending}
      />
      <InlineCreateUniverseModal
        open={universeModalOpen}
        onOpenChange={setUniverseModalOpen}
        forExperiment={trimmed || null}
        onCreated={async (u) => {
          await refetchUniverses();
          setUniverse(u.name);
          pushCreated({ kind: "universe", id: u.id, name: u.name, meta: u.unit_type });
          setUniverseModalOpen(false);
        }}
      />
      {/* Full metric creation wizard, overlayed. Any events the user creates
       * inline inside it bubble up too. */}
      <NewMetricWizard
        open={metricModalOpen}
        onOpenChange={setMetricModalOpen}
        projectId={projectId}
        nested
        forContext={trimmed ? { kind: "experiment", name: trimmed } : undefined}
        onCreated={async (m) => {
          for (const ev of m.createdEvents) {
            pushCreated({ kind: "event", name: ev.name });
          }
          await refetchMetrics();
          setGoalMetricId(m.id);
          pushCreated({ kind: "metric", id: m.id, name: m.name, meta: m.aggregation });
          setMetricModalOpen(false);
        }}
      />
    </>
  );
}

function ExperimentAside({
  trimmed,
  universe,
  allocation,
  variants,
  goalMetricName,
}: {
  trimmed: string;
  universe: string;
  allocation: number;
  variants: Variant[];
  goalMetricName: string | null;
}) {
  const rows: Array<{ k: string; v: React.ReactNode; mono?: boolean }> = [
    { k: "slug", v: trimmed || "—", mono: true },
    { k: "universe", v: universe, mono: true },
    { k: "alloc", v: `${allocation}%`, mono: true },
    {
      k: "variants",
      v: variants.length ? `${variants.length} · ${variants.map((v) => v.name).join(" / ")}` : "—",
      mono: true,
    },
    { k: "goal", v: goalMetricName ?? "—", mono: !!goalMetricName },
  ];
  return (
    <>
      <div className="t-caps dim-2 flex items-center gap-1.5">
        <span className="inline-block size-[5px] rounded-full bg-[var(--se-accent)]" />
        Summary
      </div>
      <dl className="flex flex-col gap-1.5">
        {rows.map((r) => (
          <div key={r.k} className="grid grid-cols-[72px_minmax(0,1fr)] items-baseline gap-2">
            <dt className="font-mono text-[10.5px] uppercase tracking-[0.06em] text-[var(--se-fg-3)]">
              {r.k}
            </dt>
            <dd
              className={
                r.mono
                  ? "truncate font-mono text-[12.5px] text-[var(--se-fg-2)]"
                  : "truncate text-[12.5px] text-[var(--se-fg-2)]"
              }
            >
              {r.v}
            </dd>
          </div>
        ))}
      </dl>
      <div className="mt-1 rounded-[var(--radius-sm)] border border-dashed border-[var(--se-line-2)] bg-[var(--se-bg-1)] p-2.5 font-mono text-[11px] text-[var(--se-fg-3)]">
        shipeasy.experiment(&quot;{trimmed || "slug"}&quot;).group
      </div>
    </>
  );
}

function MetricChipPicker({
  title,
  description,
  options,
  selected,
  disable,
  onToggle,
}: {
  title: string;
  description: string;
  options: ComboboxOption[];
  selected: string[];
  disable: string[];
  onToggle: (id: string) => void;
}) {
  return (
    <div>
      <Label>{title}</Label>
      <p className="t-mono-xs dim-2 mt-0.5 mb-2">{description}</p>
      {options.length === 0 ? (
        <div className="rounded-md border border-dashed border-[var(--se-line)] px-3 py-2.5 text-[12px] text-[var(--se-fg-3)]">
          No metrics registered.
        </div>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {options.map((o) => {
            const on = selected.includes(o.value);
            const disabled = disable.includes(o.value);
            return (
              <button
                type="button"
                key={o.value}
                onClick={() => !disabled && onToggle(o.value)}
                disabled={disabled}
                aria-pressed={on}
                className={
                  on
                    ? "rounded-full border border-[color-mix(in_oklab,var(--se-accent)_45%,transparent)] bg-[var(--se-accent-soft)] px-2.5 py-0.5 font-mono text-[11.5px] text-[var(--se-accent)]"
                    : disabled
                      ? "rounded-full border border-[var(--se-line)] bg-[var(--se-bg-2)] px-2.5 py-0.5 font-mono text-[11.5px] text-[var(--se-fg-4)] line-through"
                      : "rounded-full border border-[var(--se-line-2)] bg-[var(--se-bg-2)] px-2.5 py-0.5 font-mono text-[11.5px] text-[var(--se-fg-2)] hover:border-[var(--se-line-3)] hover:bg-[var(--se-bg-3)]"
                }
              >
                {o.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Integration block (lang tabs + per-entity copyable cards + AI brief) ────

type LangKey = "ts" | "py" | "go" | "curl";
const LANGS: ReadonlyArray<{ key: LangKey; label: string; icon: string; codeLang: string }> = [
  { key: "ts", label: "TypeScript", icon: "TS", codeLang: "ts" },
  { key: "py", label: "Python", icon: "PY", codeLang: "py" },
  { key: "go", label: "Go", icon: "GO", codeLang: "go" },
  { key: "curl", label: "cURL", icon: "sh", codeLang: "bash" },
];

type Snippet = Record<LangKey, string>;

function IntegrationBlock({
  experimentSlug,
  variants,
  entities,
  startNow,
  setStartNow,
  universeName,
  goalMetricName,
  allocation,
}: {
  experimentSlug: string;
  variants: Variant[];
  entities: CreatedEntity[];
  startNow: boolean;
  setStartNow: (v: boolean) => void;
  universeName: string;
  goalMetricName: string | null;
  allocation: number;
}) {
  const [lang, setLang] = useState<LangKey>("ts");

  const expSnippet = useMemo(
    () =>
      buildExperimentSnippets(
        experimentSlug,
        variants.map((v) => v.name),
      ),
    [experimentSlug, variants],
  );

  const cards = useMemo<IntegrationCardData[]>(() => {
    const out: IntegrationCardData[] = [];
    for (const e of entities) {
      if (e.kind === "universe") {
        out.push({
          kind: "universe",
          title: `Universe · ${e.name}`,
          meta: e.meta ?? null,
          snippet: buildUniverseSnippets(e.name, e.meta ?? "user_id"),
        });
      } else if (e.kind === "event") {
        out.push({
          kind: "event",
          title: `Event · ${e.name}`,
          meta: null,
          snippet: buildEventSnippets(e.name),
        });
      } else if (e.kind === "metric") {
        out.push({
          kind: "metric",
          title: `Metric · ${e.name}`,
          meta: e.meta ?? null,
          snippet: buildMetricSnippets(e.name, e.meta ?? "count_users"),
        });
      }
    }
    out.push({
      kind: "experiment",
      title: `Experiment · ${experimentSlug}`,
      meta: `${variants.length} variants · ${allocation}% of ${universeName}`,
      snippet: expSnippet,
    });
    return out;
  }, [entities, experimentSlug, variants, allocation, universeName, expSnippet]);

  function copyBrief() {
    const blocks = cards
      .map(
        (c) =>
          `### ${c.title}\n${c.meta ? `${c.meta}\n` : ""}\`\`\`${LANGS.find((l) => l.key === lang)?.codeLang ?? "ts"}\n${c.snippet[lang]}\n\`\`\``,
      )
      .join("\n\n");
    const brief = `You are an AI coding assistant. Wire this Shipeasy experiment into the codebase.

Universe: ${universeName}
Allocation: ${allocation}%
Goal metric: ${goalMetricName ?? "—"}
Variants: ${variants.map((v) => `${v.name} (${Math.round(v.weight / 100)}%)`).join(", ")}
Start mode: ${startNow ? "running immediately on publish" : "draft (manual start)"}

For every entity below, locate the appropriate place in the codebase and integrate the SDK call. Treat the snippets as canonical: package import paths, function signatures, and event names must match exactly.

${blocks}

Open a PR titled \`feat: wire ${experimentSlug} experiment\` summarising what was added and where, and include a checklist of any inline-created entities that still need follow-up dashboard config.`;
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      void navigator.clipboard.writeText(brief);
      toast.success("AI setup brief copied to clipboard");
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Top bar: language tabs + AI brief button */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-1 rounded-md border border-[var(--se-line)] bg-[var(--se-bg-2)] p-1">
          {LANGS.map((l) => {
            const on = l.key === lang;
            return (
              <button
                key={l.key}
                type="button"
                onClick={() => setLang(l.key)}
                aria-pressed={on}
                className={
                  on
                    ? "inline-flex items-center gap-1.5 rounded px-2.5 py-1 text-[12px] font-medium text-[var(--se-accent)] bg-[var(--se-accent-soft)]"
                    : "inline-flex items-center gap-1.5 rounded px-2.5 py-1 text-[12px] font-medium text-[var(--se-fg-3)] hover:text-[var(--se-fg-2)] hover:bg-[var(--se-bg-3)]"
                }
              >
                <span
                  className={
                    on
                      ? "inline-grid place-items-center size-4 rounded-sm bg-[var(--se-accent)] text-[var(--se-accent-fg)] font-mono text-[9px] font-bold"
                      : "inline-grid place-items-center size-4 rounded-sm bg-[var(--se-bg-3)] text-[var(--se-fg-3)] font-mono text-[9px] font-bold"
                  }
                >
                  {l.icon}
                </span>
                {l.label}
              </button>
            );
          })}
        </div>
        <Button type="button" size="sm" variant="outline" onClick={copyBrief}>
          <Sparkles className="size-3" />
          Copy AI setup brief
        </Button>
      </div>

      {/* Stacked per-entity cards */}
      <div className="flex flex-col gap-2.5">
        {cards.map((c) => (
          <IntegrationCard key={`${c.kind}-${c.title}`} card={c} lang={lang} />
        ))}
      </div>

      {/* Start-now toggle */}
      <label className="flex cursor-pointer items-start gap-2.5 rounded-[var(--radius-md)] border border-[var(--se-line)] bg-[var(--se-bg-2)] px-3.5 py-3">
        <input
          type="checkbox"
          checked={startNow}
          onChange={(e) => setStartNow(e.target.checked)}
          className="mt-0.5"
          aria-label="Start experiment immediately"
        />
        <span className="flex flex-col gap-0.5 text-[12.5px]">
          <span className="font-medium text-[var(--se-fg)]">Start immediately on publish</span>
          <span className="text-[var(--se-fg-3)]">
            If off, the experiment is saved as a draft. You can start it from the detail pane later.
          </span>
        </span>
      </label>
    </div>
  );
}

type IntegrationCardData = {
  kind: "experiment" | "universe" | "event" | "metric";
  title: string;
  meta: string | null;
  snippet: Snippet;
};

function IntegrationCard({ card, lang }: { card: IntegrationCardData; lang: LangKey }) {
  const [copied, setCopied] = useState(false);
  const code = card.snippet[lang];
  const codeLang = LANGS.find((l) => l.key === lang)?.codeLang ?? "ts";
  const KIND_DOT: Record<IntegrationCardData["kind"], string> = {
    experiment: "var(--se-warn)",
    universe: "#74c7ec",
    event: "var(--se-accent)",
    metric: "var(--se-purple)",
  };

  function copy() {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      void navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    }
  }

  return (
    <div className="overflow-hidden rounded-[var(--radius-md)] border border-[var(--se-line)] bg-[var(--se-bg-1)]">
      <div className="flex items-center gap-2.5 border-b border-[var(--se-line)] bg-[var(--se-bg-2)] px-3.5 py-2">
        <span
          aria-hidden
          className="inline-block size-[7px] rounded-full"
          style={{ background: KIND_DOT[card.kind] }}
        />
        <span className="font-mono text-[12.5px] text-[var(--se-fg)]">{card.title}</span>
        {card.meta ? (
          <span className="font-mono text-[10.5px] uppercase tracking-[0.06em] text-[var(--se-fg-3)]">
            {card.meta}
          </span>
        ) : null}
        <Button type="button" size="xs" variant="outline" onClick={copy} className="ml-auto">
          {copied ? "Copied" : "Copy"}
        </Button>
      </div>
      <CodeBlock language={codeLang} className="rounded-none border-0">
        {code}
      </CodeBlock>
    </div>
  );
}

function buildExperimentSnippets(slug: string, variants: string[]) {
  const switchBody = variants
    .map((v) => `    case '${v}': return render_${v.replace(/[^a-z0-9_]/gi, "_")}();`)
    .join("\n");
  return {
    ts: `import { shipeasy } from '@shipeasy/sdk';

const { group } = await shipeasy.experiment('${slug}', {
  user_id: ctx.user.id,
});

switch (group) {
${variants.map((v) => `  case '${v}': return render_${v.replace(/[^a-z0-9_]/gi, "_")}();`).join("\n")}
  case 'holdout': return renderControl();
}`,
    py: `from shipeasy import client

assignment = client.experiment(
    "${slug}",
    user_id=ctx.user.id,
)

if assignment.group == "holdout":
    return render_control()
${variants.map((v) => `if assignment.group == "${v}":\n    return render_${v.replace(/[^a-z0-9_]/gi, "_")}()`).join("\n")}`,
    go: `assignment, _ := shipeasy.Experiment(ctx, "${slug}", &shipeasy.Subject{
    UserID: ctx.User.ID,
})

switch assignment.Group {
${switchBody}
case "holdout":
    return renderControl()
}`,
    curl: `curl -H "Authorization: Bearer $SHIPEASY_KEY" \\
  -H "Content-Type: application/json" \\
  -X POST https://api.shipeasy.dev/v1/experiments/${slug}/evaluate \\
  -d '{ "user_id": "u_123" }'`,
  };
}

// ── Snippet builders per entity ──────────────────────────────────────────────

function buildUniverseSnippets(name: string, unit: string): Snippet {
  return {
    ts: `// Universe '${name}' (${unit}) is created in the Shipeasy dashboard.
// No SDK call required — experiments reference it by name.
// Subjects are hashed on '${unit}'.`,
    py: `# Universe '${name}' (${unit}) is created in the Shipeasy dashboard.
# No SDK call required — experiments reference it by name.
# Subjects are hashed on '${unit}'.`,
    go: `// Universe '${name}' (${unit}) is created in the Shipeasy dashboard.
// No SDK call required — experiments reference it by name.
// Subjects are hashed on '${unit}'.`,
    curl: `curl -H "Authorization: Bearer $SHIPEASY_KEY" \\
  -X POST https://api.shipeasy.dev/v1/universes \\
  -d '{ "name": "${name}", "unit_type": "${unit}" }'`,
  };
}

function buildEventSnippets(name: string): Snippet {
  return {
    ts: `import { shipeasy } from '@shipeasy/sdk';

// Emit this event from your codebase wherever it happens.
shipeasy.event('${name}', {
  user_id: ctx.user.id,
  // payload: { ... }
});`,
    py: `from shipeasy import client

# Emit this event from your codebase wherever it happens.
client.event(
    "${name}",
    user_id=ctx.user.id,
    # payload={...},
)`,
    go: `// Emit this event from your codebase wherever it happens.
shipeasy.Event(ctx, "${name}", &shipeasy.EventOpts{
    UserID: ctx.User.ID,
    // Payload: map[string]any{...},
})`,
    curl: `curl -H "Authorization: Bearer $SHIPEASY_KEY" \\
  -H "Content-Type: application/json" \\
  -X POST https://api.shipeasy.dev/v1/collect \\
  -d '{ "name": "${name}", "user_id": "u_123" }'`,
  };
}

function buildMetricSnippets(name: string, aggregation: string): Snippet {
  return {
    ts: `// Metric '${name}' (${aggregation}) is computed automatically by the
// Shipeasy analysis pipeline from emitted events. No SDK call required.
// Reference it as the goal/guardrail metric on any experiment.`,
    py: `# Metric '${name}' (${aggregation}) is computed automatically by the
# Shipeasy analysis pipeline from emitted events. No SDK call required.
# Reference it as the goal/guardrail metric on any experiment.`,
    go: `// Metric '${name}' (${aggregation}) is computed automatically by the
// Shipeasy analysis pipeline from emitted events. No SDK call required.
// Reference it as the goal/guardrail metric on any experiment.`,
    curl: `# Metric '${name}' (${aggregation}) is computed automatically — no API call.
curl -H "Authorization: Bearer $SHIPEASY_KEY" \\
  https://api.shipeasy.dev/v1/metrics/${encodeURIComponent(name)}`,
  };
}

// ── Inline create modals ─────────────────────────────────────────────────────

const SLUG_RE = /^[a-z0-9][a-z0-9_-]{0,63}$/;

function slugify(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 64);
}

function InlineCreateUniverseModal({
  open,
  onOpenChange,
  onCreated,
  forExperiment,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onCreated: (u: { id: string; name: string; unit_type: string }) => void | Promise<void>;
  forExperiment?: string | null;
}) {
  const [folder, setFolder] = useState("");
  const [leaf, setLeaf] = useState("");
  const [unit, setUnit] = useState("user_id");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const derived = deriveFolderName(folder, leaf);
  const slug = derived.fullName;
  const slugValid = derived.folderValid && derived.leafValid;

  useEffect(() => {
    if (!open) {
      setFolder("");
      setLeaf("");
      setUnit("user_id");
      setError(null);
    }
  }, [open]);

  function submit() {
    setError(null);
    if (!slugValid) {
      setError("Name must be folder.name — e.g. web.users.");
      return;
    }
    startTransition(async () => {
      const res = await inlineCreateUniverseAction({
        name: slug,
        unit_type: unit,
        holdout_lo: null,
        holdout_hi: null,
      });
      if (res.ok) {
        await onCreated({ id: res.id, name: res.name, unit_type: unit });
      } else {
        setError(res.error);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!max-w-[520px] p-5">
        <DialogTitle>
          Create universe
          {forExperiment ? (
            <span className="ml-2 font-mono text-[11.5px] uppercase tracking-[0.06em] text-[var(--se-fg-3)]">
              for experiment <span className="text-[var(--se-fg-2)]">{forExperiment}</span>
            </span>
          ) : null}
        </DialogTitle>
        <DialogDescription className="mt-1">
          Universes own the unit (user_id, device_id, …) and the hash salt.
        </DialogDescription>
        <div className="mt-4 flex flex-col gap-3">
          <div>
            <Label htmlFor="new-universe-folder">Name</Label>
            <FolderNameInput
              folder={folder}
              leaf={leaf}
              onFolderChange={setFolder}
              onLeafChange={setLeaf}
              folderPlaceholder="web"
              leafPlaceholder="users"
              folderId="new-universe-folder"
              leafId="new-universe-name"
            />
            <p className="t-mono-xs dim-2 mt-1">
              Slug ·{" "}
              <span className={slugValid ? "text-[var(--se-accent)]" : "text-[var(--se-danger)]"}>
                {slug || "—"}
              </span>
            </p>
          </div>
          <div>
            <Label htmlFor="new-universe-unit">Unit type</Label>
            <select
              id="new-universe-unit"
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              className="h-9 w-full rounded-[var(--radius-md)] border border-[var(--se-line-2)] bg-[var(--se-bg-2)] px-2.5 text-[13px] outline-none focus:border-[var(--se-accent)]"
            >
              <option value="user_id">user_id</option>
              <option value="device_id">device_id</option>
              <option value="customer_id">customer_id</option>
              <option value="session_id">session_id</option>
              <option value="account_id">account_id</option>
            </select>
          </div>
          {error ? (
            <p className="text-[12px] text-[var(--se-danger)]" role="alert">
              {error}
            </p>
          ) : null}
        </div>
        <div className="mt-5 flex items-center justify-end gap-2">
          <Button type="button" variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" size="sm" onClick={submit} disabled={!slugValid || pending}>
            {pending ? "Creating…" : "Create universe"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
