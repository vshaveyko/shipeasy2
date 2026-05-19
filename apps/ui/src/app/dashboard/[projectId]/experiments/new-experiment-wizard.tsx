"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FieldArray, FieldArrayRow, FieldArrayAdd } from "@/components/ui/field-array";
import { publishExperimentAction, type WizardMetricInput } from "./actions";

const NAME_RE = /^[a-z0-9][a-z0-9_-]{0,59}$/;

type UniverseRow = { id: string; name: string; unit_type?: string };
type GateRow = { id: string; name: string };
type MetricRow = { id: string; name: string; aggregation?: string };

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
  const [name, setName] = useState("");
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

  const { data: universes } = useSWR<UniverseRow[]>(open ? "/api/admin/universes" : null, fetcher);
  const { data: gates } = useSWR<GateRow[]>(open ? "/api/admin/gates" : null, fetcher);
  const { data: metrics } = useSWR<MetricRow[]>(open ? "/api/admin/metrics" : null, fetcher);

  const trimmed = name.trim();
  const nameValid = NAME_RE.test(trimmed);
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
      setName("");
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
            <Label htmlFor="experiment-name">Slug</Label>
            <Input
              id="experiment-name"
              data-testid="experiment-name-input"
              data-mono
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="checkout_redesign_q2"
              pattern="[a-z0-9][a-z0-9_-]{0,59}"
              required
            />
            <p className="t-mono-xs dim-2 mt-1">
              Lowercase letters, digits, _ or -. Used everywhere the SDK references this experiment.
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
            <Label>Universe</Label>
            <Combobox
              options={universeOptions}
              value={universe}
              onValueChange={setUniverse}
              placeholder="Pick a universe"
            />
            <p className="t-mono-xs dim-2 mt-1">
              Universes own the unit (user_id / device_id) and reserve a holdout.
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
          </div>
          <div>
            <Label>Targeting gate (optional)</Label>
            <Combobox
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
            <Label>Goal metric *</Label>
            <Combobox
              options={metricOptions}
              value={goalMetricId}
              onValueChange={setGoalMetricId}
              placeholder={
                metricOptions.length === 0 ? "No metrics registered yet" : "Pick a goal metric"
              }
              disabled={metricOptions.length === 0}
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
          <ExperimentIntegrate slug={trimmed || "your_experiment"} variants={variants} />
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
                If off, the experiment is saved as a draft. You can start it from the detail pane
                later.
              </span>
            </span>
          </label>
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

function ExperimentIntegrate({ slug, variants }: { slug: string; variants: Variant[] }) {
  const variantNames = variants.map((v) => v.name);
  const snippets = useMemo(() => buildExperimentSnippets(slug, variantNames), [slug, variantNames]);
  return (
    <Tabs defaultValue="ts">
      <TabsList>
        <TabsTrigger value="ts">TypeScript</TabsTrigger>
        <TabsTrigger value="py">Python</TabsTrigger>
        <TabsTrigger value="go">Go</TabsTrigger>
        <TabsTrigger value="curl">cURL</TabsTrigger>
      </TabsList>
      <TabsContent value="ts" className="mt-3">
        <CodeBlock language="ts">{snippets.ts}</CodeBlock>
      </TabsContent>
      <TabsContent value="py" className="mt-3">
        <CodeBlock language="py">{snippets.py}</CodeBlock>
      </TabsContent>
      <TabsContent value="go" className="mt-3">
        <CodeBlock language="go">{snippets.go}</CodeBlock>
      </TabsContent>
      <TabsContent value="curl" className="mt-3">
        <CodeBlock language="bash">{snippets.curl}</CodeBlock>
      </TabsContent>
    </Tabs>
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
