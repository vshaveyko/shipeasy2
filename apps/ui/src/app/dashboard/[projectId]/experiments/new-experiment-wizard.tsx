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
import { FieldArray, FieldArrayRow, FieldArrayAdd } from "@/components/ui/field-array";
import { createExperimentAction } from "./actions";

const NAME_RE = /^[a-z0-9][a-z0-9_-]{0,59}$/;

type UniverseRow = { id: string; name: string; unit_type?: string };
type GateRow = { id: string; name: string };

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
  const [pending, startTransition] = useTransition();

  const { data: universes } = useSWR<UniverseRow[]>(open ? "/api/admin/universes" : null, fetcher);
  const { data: gates } = useSWR<GateRow[]>(open ? "/api/admin/gates" : null, fetcher);

  const trimmed = name.trim();
  const nameValid = NAME_RE.test(trimmed);
  const variantsValid = useMemo(() => {
    if (variants.length < 2) return false;
    if (variants.some((v) => !v.name.trim())) return false;
    const sum = variants.reduce((s, v) => s + v.weight, 0);
    return sum === 10000;
  }, [variants]);

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

  const steps: WizardStep[] = [
    {
      id: "identity",
      label: "Name & describe",
      hint: "A stable identifier and a one-line hypothesis.",
      isValid: () => nameValid,
      content: (
        <div className="flex flex-col gap-4">
          <div>
            <Label htmlFor="experiment-name">Name</Label>
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
            <Label htmlFor="experiment-description">Hypothesis</Label>
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
        <div className="flex flex-col gap-2 text-[12.5px]">
          <div className="t-caps dim-2">Identity</div>
          <p className="dim">
            Pick a name you can paste into <code>shipeasy.experiment(…)</code> without renaming
            later. Tags group experiments in the list.
          </p>
        </div>
      ),
    },
    {
      id: "audience",
      label: "Audience & traffic",
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
        <div className="flex flex-col gap-2 text-[12.5px]">
          <div className="t-caps dim-2">Allocation</div>
          <p className="dim">
            <span className="font-mono">{allocation}%</span> of{" "}
            <span className="font-mono">{universe}</span>{" "}
            {gate !== "none" ? (
              <>
                · filtered by gate <span className="font-mono">{gate}</span>
              </>
            ) : null}
          </p>
        </div>
      ),
    },
    {
      id: "variants",
      label: "Variants",
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
        <div className="flex flex-col gap-2 text-[12.5px]">
          <div className="t-caps dim-2">Variants</div>
          <p className="dim">
            Add up to 6. SDK call{" "}
            <code>shipeasy.experiment(&quot;{trimmed || "name"}&quot;).group</code> returns one of:{" "}
            <span className="font-mono">{variants.map((v) => v.name).join(", ") || "—"}</span>.
          </p>
        </div>
      ),
    },
    {
      id: "review",
      label: "Review",
      hint: "Confirm and create as draft.",
      content: (
        <div className="grid gap-3 md:grid-cols-2">
          <ReviewCard label="Name" value={trimmed || "—"} mono />
          <ReviewCard label="Tag" value={tag.trim() || "—"} mono />
          <ReviewCard label="Universe" value={universe} mono />
          <ReviewCard label="Allocation" value={`${allocation}%`} mono />
          <ReviewCard label="Targeting gate" value={gate === "none" ? "—" : gate} mono />
          <ReviewCard
            label="Variants"
            value={
              <span className="flex flex-wrap gap-1">
                {variants.map((v) => (
                  <span
                    key={v.name}
                    className="rounded border border-[var(--se-line-2)] bg-[var(--se-bg-3)] px-1.5 py-0.5 font-mono text-[11px]"
                  >
                    {v.name} · {Math.round(v.weight / 100)}%
                  </span>
                ))}
              </span>
            }
          />
          {description.trim() ? (
            <div className="rounded-md border border-[var(--se-line)] bg-[var(--se-bg-2)] p-3 md:col-span-2">
              <div className="t-caps dim-2">Hypothesis</div>
              <p className="mt-1 text-[13px]">{description.trim()}</p>
            </div>
          ) : null}
        </div>
      ),
      aside: (
        <div className="flex flex-col gap-2 text-[12.5px]">
          <div className="t-caps dim-2">After create</div>
          <p className="dim">
            Created in <strong>draft</strong> status. Attach metrics + start it from the detail pane
            or the full editor.
          </p>
        </div>
      ),
    },
  ];

  function handleSubmit() {
    if (!nameValid || !variantsValid) {
      setStep(nameValid ? 2 : 0);
      return;
    }
    startTransition(async () => {
      const fd = new FormData();
      fd.append("name", trimmed);
      if (description.trim()) fd.append("description", description.trim());
      if (tag.trim()) fd.append("tag", tag.trim());
      fd.append("universe", universe);
      fd.append("allocation", String(allocation));
      fd.append("targeting_gate", gate === "none" ? "none" : gate);
      fd.append("group_count", String(variants.length));
      variants.forEach((v, i) => {
        fd.append(`group_name_${i}`, v.name);
        fd.append(`group_weight_${i}`, String(v.weight));
      });
      try {
        await createExperimentAction(fd);
        toast.success("Experiment created");
        onCreated?.();
      } catch (err) {
        const digest = (err as { digest?: string })?.digest;
        if (typeof digest === "string" && digest.startsWith("NEXT_REDIRECT")) {
          // Server action redirected — our list page will reload. Surface a toast & close.
          toast.success("Experiment created");
          onCreated?.();
          throw err;
        }
        toast.error(err instanceof Error ? err.message : "Failed to create experiment");
      }
    });
  }

  return (
    <BigModalWizard
      open={open}
      onOpenChange={onOpenChange}
      kind="experiments"
      title="Design the experiment"
      eyebrow={{ project: projectId, area: "Experiments" }}
      steps={steps}
      current={step}
      onStepChange={setStep}
      onSubmit={handleSubmit}
      submitLabel="Create experiment"
      submitting={pending}
    />
  );
}

function ReviewCard({
  label,
  value,
  mono,
}: {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="rounded-md border border-[var(--se-line)] bg-[var(--se-bg-2)] p-3">
      <div className="t-caps dim-2">{label}</div>
      <div className={mono ? "mt-1 font-mono text-[13px]" : "mt-1 text-[13px]"}>{value}</div>
    </div>
  );
}
