"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { Plus, X } from "lucide-react";
import { toast } from "sonner";
import useSWR from "swr";

import {
  render as renderDsl,
  type AggKind,
  type Filter as DslFilter,
  type GroupBy as DslGroupBy,
  type MatchOp,
  type Query as DslQuery,
} from "@shipeasy/query-dsl";

import { BigModalWizard, type WizardStep } from "@/components/shell/big-modal-wizard";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { CodeBlock } from "@/components/ui/code-block";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { FolderNameInput, deriveFolderName } from "@/components/ui/folder-name-input";
import { createMetric } from "@/actions/metrics";

const NAME_RE = /^[a-z0-9][a-z0-9_-]{0,63}$/;

type EventProperty = { name: string; type: "string" | "number" | "boolean"; required?: boolean };

type EventRow = {
  id: string;
  name: string;
  description?: string | null;
  properties?: EventProperty[];
};

type AggregationKey =
  | "count_users"
  | "count_events"
  | "sum"
  | "avg"
  | "min"
  | "max"
  | "unique"
  | "quantile"
  | "retention_Nd";

type AggregationMeta = {
  k: AggregationKey;
  label: string;
  hint: string;
  needsValue: boolean;
};

const AGGREGATIONS: readonly AggregationMeta[] = [
  {
    k: "count_users",
    label: "Unique users",
    hint: "Distinct subjects with at least one event",
    needsValue: false,
  },
  {
    k: "count_events",
    label: "Event count",
    hint: "Total events across all subjects",
    needsValue: false,
  },
  { k: "sum", label: "Sum", hint: "Add all numeric values", needsValue: true },
  { k: "avg", label: "Average", hint: "Mean of numeric values", needsValue: true },
  { k: "min", label: "Minimum", hint: "Smallest observed value", needsValue: true },
  { k: "max", label: "Maximum", hint: "Largest observed value", needsValue: true },
  { k: "unique", label: "Unique values", hint: "Distinct numeric values seen", needsValue: true },
  { k: "quantile", label: "Percentile", hint: "p50/p75/p90/p95/p99/p999", needsValue: true },
  {
    k: "retention_Nd",
    label: "N-day retention",
    hint: "Fraction returning within window",
    needsValue: false,
  },
] as const;

const QUANTILE_CHOICES = [0.5, 0.75, 0.9, 0.95, 0.99, 0.999] as const;
type QuantileChoice = (typeof QUANTILE_CHOICES)[number];
const QUANTILE_LABEL: Record<string, string> = {
  "0.5": "p50",
  "0.75": "p75",
  "0.9": "p90",
  "0.95": "p95",
  "0.99": "p99",
  "0.999": "p999",
};

const FILTER_OPS: { op: MatchOp; label: string; stringOnly?: boolean }[] = [
  { op: "=", label: "=" },
  { op: "!=", label: "≠" },
  { op: "=~", label: "matches", stringOnly: true },
  { op: "!~", label: "no match", stringOnly: true },
];

const fetcher = async <T,>(url: string): Promise<T> => {
  const res = await fetch(url, { credentials: "same-origin" });
  if (!res.ok) throw new Error(`${url} → HTTP ${res.status}`);
  const body = (await res.json()) as T | { data: T };
  if (Array.isArray(body)) return body as T;
  if (typeof body === "object" && body && "data" in (body as object))
    return (body as { data: T }).data;
  return body as T;
};

export type NewMetricWizardCreated = {
  id: string;
  name: string;
  eventName: string;
  aggregation: AggregationKey;
  valueLabel: string | null;
  queryIr: DslQuery;
  createdEvents: { name: string }[];
};

export interface NewMetricWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId?: string;
  onComplete?: () => void;
  /** When set, the wizard does not close on submit nor surface its own toast.
   * It hands the created metric (plus any inline-created events) to the
   * parent so a host wizard can capture and bubble them further. */
  onCreated?: (metric: NewMetricWizardCreated) => void | Promise<void>;
  /** Parent record context (e.g. `{kind:"experiment", name:"checkout"}`). */
  forContext?: { kind: string; name: string };
  /** Render at the nested wizard size when stacked on top of a host wizard. */
  nested?: boolean;
}

export function NewMetricWizard({
  open,
  onOpenChange,
  projectId,
  onComplete,
  onCreated,
  forContext,
  nested = false,
}: NewMetricWizardProps) {
  const [step, setStep] = useState(0);
  const [folder, setFolder] = useState("");
  const [leaf, setLeaf] = useState("");
  const [description, setDescription] = useState("");
  const [eventName, setEventName] = useState("");
  const [newEventDraft, setNewEventDraft] = useState("");
  const [aggregation, setAggregation] = useState<AggregationKey>("count_users");
  const [quantileP, setQuantileP] = useState<QuantileChoice>(0.99);
  const [retentionN, setRetentionN] = useState<number>(7);
  const [valueLabel, setValueLabel] = useState<string>("");
  const [filters, setFilters] = useState<DslFilter[]>([]);
  const [groupByOp, setGroupByOp] = useState<"by" | "without">("by");
  const [groupByLabels, setGroupByLabels] = useState<string[]>([]);
  const [direction, setDirection] = useState<"up" | "down">("up");
  const [winsorize, setWinsorize] = useState<number>(99);
  const [mdePct, setMdePct] = useState<number>(5);
  const [search, setSearch] = useState("");
  const [inlineEvents, setInlineEvents] = useState<{ name: string }[]>([]);
  const [pending, startTransition] = useTransition();

  const { data: events, mutate: refetchEvents } = useSWR<EventRow[]>(
    open ? "/api/admin/events" : null,
    fetcher,
  );

  useEffect(() => {
    if (!open) {
      setStep(0);
      setFolder("");
      setLeaf("");
      setDescription("");
      setEventName("");
      setNewEventDraft("");
      setAggregation("count_users");
      setQuantileP(0.99);
      setRetentionN(7);
      setValueLabel("");
      setFilters([]);
      setGroupByOp("by");
      setGroupByLabels([]);
      setDirection("up");
      setWinsorize(99);
      setMdePct(5);
      setSearch("");
      setInlineEvents([]);
    }
  }, [open]);

  const derivedName = deriveFolderName(folder, leaf);
  const trimmed = derivedName.fullName;
  const nameValid = derivedName.folderValid && derivedName.leafValid;
  const sourceValid = eventName.length > 0;
  const aggregationMeta = useMemo(
    () => AGGREGATIONS.find((a) => a.k === aggregation) ?? AGGREGATIONS[0],
    [aggregation],
  );
  const valueRequired = aggregationMeta.needsValue;
  const selectedEvent = useMemo(
    () => (events ?? []).find((e) => e.name === eventName),
    [events, eventName],
  );
  const eventProps = selectedEvent?.properties ?? [];
  const numericProps = useMemo(() => eventProps.filter((p) => p.type === "number"), [eventProps]);
  const stringProps = useMemo(() => eventProps.filter((p) => p.type === "string"), [eventProps]);
  const allLabelNames = useMemo(
    () => ["user_id", "anonymous_id", ...eventProps.map((p) => p.name)],
    [eventProps],
  );
  // Group-by only makes sense for low-cardinality string labels; numeric
  // properties (amounts, durations) would produce one series per distinct
  // value. Keep the user-id columns (always strings) + string props only.
  const groupableLabelNames = useMemo(
    () => ["user_id", "anonymous_id", ...stringProps.map((p) => p.name)],
    [stringProps],
  );
  const shapeValid =
    (!valueRequired || valueLabel.trim().length > 0) &&
    filters.every((f) => f.label && f.value.length > 0) &&
    groupByLabels.every((l) => l.length > 0);

  const aggIr: AggKind = useMemo(() => {
    switch (aggregation) {
      case "quantile":
        return { kind: "quantile", p: quantileP };
      case "retention_Nd":
        return { kind: "retention_Nd", n: retentionN };
      default:
        return { kind: aggregation } as AggKind;
    }
  }, [aggregation, quantileP, retentionN]);

  const groupByIr: DslGroupBy | undefined =
    groupByLabels.length > 0 ? { op: groupByOp, labels: groupByLabels } : undefined;

  const queryIr: DslQuery = useMemo(
    () => ({
      agg: aggIr,
      metric: eventName || "event_name",
      valueLabel: valueRequired && valueLabel ? valueLabel : undefined,
      filters,
      groupBy: groupByIr,
    }),
    [aggIr, eventName, valueRequired, valueLabel, filters, groupByIr],
  );

  const dslPreview = useMemo(() => {
    try {
      return renderDsl(queryIr);
    } catch {
      return "";
    }
  }, [queryIr]);

  // When the source event changes, drop label refs that no longer exist on the new event.
  useEffect(() => {
    if (!eventName) return;
    const known = new Set<string>(allLabelNames);
    setFilters((prev) => prev.filter((f) => known.has(f.label)));
    setGroupByLabels((prev) => prev.filter((l) => known.has(l)));
    setValueLabel((prev) => (prev && numericProps.find((p) => p.name === prev) ? prev : ""));
  }, [eventName, allLabelNames, numericProps]);

  const filteredEvents = useMemo(() => {
    const q = search.trim().toLowerCase();
    const all = events ?? [];
    if (!q) return all;
    return all.filter((e) => e.name.toLowerCase().includes(q));
  }, [events, search]);

  async function inlineCreateEvent() {
    const n = newEventDraft.trim();
    if (!NAME_RE.test(n)) {
      toast.error("Event name must match [a-z0-9_-]");
      return;
    }
    try {
      const res = await fetch("/api/admin/events", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: n }),
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(err.error ?? `Failed (${res.status})`);
      }
      setNewEventDraft("");
      setEventName(n);
      setInlineEvents((prev) => (prev.some((e) => e.name === n) ? prev : [...prev, { name: n }]));
      await refetchEvents();
      toast.success(`Registered event "${n}"`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to register event");
    }
  }

  const steps: WizardStep[] = [
    {
      id: "details",
      label: "Details",
      title: "Identify the metric",
      hint: "Pick a stable name — SDKs and dashboards both reference it.",
      isValid: () => nameValid,
      content: (
        <div className="flex flex-col gap-4">
          <div>
            <Label htmlFor="metric-folder">Name *</Label>
            <FolderNameInput
              folder={folder}
              leaf={leaf}
              onFolderChange={setFolder}
              onLeafChange={setLeaf}
              folderPlaceholder="checkout"
              leafPlaceholder="conversion"
              folderId="metric-folder"
              leafId="metric-name"
            />
            <p className="t-mono-xs dim-2 mt-1">
              <code className="font-mono">folder.name</code> · lowercase letters, digits,{" "}
              <code className="font-mono">-</code> or <code className="font-mono">_</code>.
            </p>
          </div>
          <div>
            <Label htmlFor="metric-description">Description (optional)</Label>
            <Textarea
              id="metric-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What this measures, who owns it, and how it's used in decisions."
              rows={3}
            />
            <p className="t-mono-xs dim-2 mt-1">
              Stored in the audit log. Not persisted to the metric row (today).
            </p>
          </div>
        </div>
      ),
      aside: (
        <MetricAside
          name={trimmed}
          eventName={eventName}
          aggregation={aggregation}
          valueLabel={valueLabel}
          dsl={dslPreview}
        />
      ),
    },
    {
      id: "source",
      label: "Source",
      title: "Pick a source event",
      hint: "Metrics aggregate over a single event. Register the event first if it's new.",
      isValid: () => sourceValid,
      content: (
        <div className="flex flex-col gap-3">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search events…"
            data-mono
          />
          <div className="max-h-[260px] overflow-y-auto rounded-[var(--radius-md)] border border-[var(--se-line-2)] bg-[var(--se-bg-1)]">
            {events === undefined ? (
              <div className="px-4 py-6 text-center text-[12px] text-[var(--se-fg-3)]">
                Loading…
              </div>
            ) : filteredEvents.length === 0 ? (
              <div className="px-4 py-6 text-center text-[12px] text-[var(--se-fg-3)]">
                {search ? `No event matches "${search}".` : "No events registered yet."}
              </div>
            ) : (
              filteredEvents.map((ev) => {
                const on = eventName === ev.name;
                return (
                  <button
                    type="button"
                    key={ev.id}
                    onClick={() => setEventName(ev.name)}
                    aria-pressed={on}
                    className={
                      on
                        ? "flex w-full items-center justify-between gap-3 border-b border-[var(--se-line)] bg-[var(--se-accent-soft)] px-4 py-2.5 text-left last:border-b-0"
                        : "flex w-full items-center justify-between gap-3 border-b border-[var(--se-line)] px-4 py-2.5 text-left hover:bg-[var(--se-bg-2)] last:border-b-0"
                    }
                  >
                    <span className="flex min-w-0 flex-col">
                      <span
                        className={
                          on
                            ? "font-mono text-[12.5px] font-medium text-[var(--se-accent)]"
                            : "font-mono text-[12.5px] font-medium text-[var(--se-fg-2)]"
                        }
                      >
                        {ev.name}
                      </span>
                      {ev.description ? (
                        <span className="truncate text-[11.5px] text-[var(--se-fg-3)]">
                          {ev.description}
                        </span>
                      ) : null}
                    </span>
                    {on ? (
                      <span className="font-mono text-[10.5px] uppercase tracking-[0.06em] text-[var(--se-accent)]">
                        selected
                      </span>
                    ) : null}
                  </button>
                );
              })
            )}
          </div>
          <div className="flex items-center gap-2 rounded-[var(--radius-md)] border border-dashed border-[var(--se-line-2)] bg-[var(--se-bg-2)] px-3 py-2.5">
            <span className="font-mono text-[10.5px] uppercase tracking-[0.06em] text-[var(--se-fg-3)]">
              Add new event
            </span>
            <Input
              value={newEventDraft}
              onChange={(e) => setNewEventDraft(e.target.value)}
              placeholder="signup_completed"
              data-mono
              className="h-7"
            />
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => void inlineCreateEvent()}
              disabled={!newEventDraft.trim()}
            >
              <Plus className="size-3" /> Register
            </Button>
          </div>
        </div>
      ),
      aside: (
        <MetricAside
          name={trimmed}
          eventName={eventName}
          aggregation={aggregation}
          valueLabel={valueLabel}
          dsl={dslPreview}
        />
      ),
    },
    {
      id: "shape",
      label: "Aggregation",
      title: "Aggregation & shape",
      hint: "How to roll up event rows into a single number per subject.",
      isValid: () => shapeValid,
      content: (
        <div className="flex flex-col gap-4">
          <div>
            <Label>Aggregation</Label>
            <div className="mt-1.5 grid grid-cols-1 gap-1.5 sm:grid-cols-2">
              {AGGREGATIONS.map((a) => {
                const on = a.k === aggregation;
                return (
                  <button
                    type="button"
                    key={a.k}
                    onClick={() => setAggregation(a.k)}
                    aria-pressed={on}
                    className={
                      on
                        ? "flex flex-col gap-0.5 rounded-md border border-[color-mix(in_oklab,var(--se-accent)_45%,transparent)] bg-[var(--se-accent-soft)] px-3 py-2 text-left"
                        : "flex flex-col gap-0.5 rounded-md border border-[var(--se-line-2)] bg-[var(--se-bg-2)] px-3 py-2 text-left hover:border-[var(--se-line-3)] hover:bg-[var(--se-bg-3)]"
                    }
                  >
                    <span
                      className={
                        on
                          ? "font-mono text-[11.5px] text-[var(--se-accent)]"
                          : "font-mono text-[11.5px] text-[var(--se-fg-2)]"
                      }
                    >
                      {a.label}
                    </span>
                    <span className="text-[11px] text-[var(--se-fg-3)]">{a.hint}</span>
                  </button>
                );
              })}
            </div>
          </div>
          {aggregation === "quantile" ? (
            <div>
              <Label>Percentile</Label>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {QUANTILE_CHOICES.map((p) => {
                  const on = p === quantileP;
                  return (
                    <button
                      type="button"
                      key={p}
                      onClick={() => setQuantileP(p)}
                      aria-pressed={on}
                      className={
                        on
                          ? "rounded-md border border-[color-mix(in_oklab,var(--se-accent)_45%,transparent)] bg-[var(--se-accent-soft)] px-2.5 py-1 font-mono text-[11.5px] text-[var(--se-accent)]"
                          : "rounded-md border border-[var(--se-line-2)] bg-[var(--se-bg-2)] px-2.5 py-1 font-mono text-[11.5px] text-[var(--se-fg-2)] hover:bg-[var(--se-bg-3)]"
                      }
                    >
                      {QUANTILE_LABEL[String(p)]}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}
          {aggregation === "retention_Nd" ? (
            <div className="grid grid-cols-[auto_1fr] items-end gap-3">
              <div>
                <Label htmlFor="metric-retention-n">N (days)</Label>
                <Input
                  id="metric-retention-n"
                  data-mono
                  type="number"
                  min={1}
                  max={90}
                  value={retentionN}
                  onChange={(e) =>
                    setRetentionN(Math.max(1, Math.min(90, Number(e.target.value) || 1)))
                  }
                  className="w-24"
                />
              </div>
              <p className="t-mono-xs dim-2">
                Per-user reducer: 1 if the user has any event in [N, N+1) days after exposure.
              </p>
            </div>
          ) : null}
          {valueRequired ? (
            <div>
              <Label htmlFor="metric-value-label">Value property *</Label>
              {numericProps.length > 0 ? (
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {numericProps.map((p) => {
                    const on = p.name === valueLabel;
                    return (
                      <button
                        type="button"
                        key={p.name}
                        onClick={() => setValueLabel(p.name)}
                        aria-pressed={on}
                        className={
                          on
                            ? "rounded-md border border-[color-mix(in_oklab,var(--se-accent)_45%,transparent)] bg-[var(--se-accent-soft)] px-2.5 py-1 font-mono text-[11.5px] text-[var(--se-accent)]"
                            : "rounded-md border border-[var(--se-line-2)] bg-[var(--se-bg-2)] px-2.5 py-1 font-mono text-[11.5px] text-[var(--se-fg-2)] hover:bg-[var(--se-bg-3)]"
                        }
                      >
                        {p.name}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <Input
                  id="metric-value-label"
                  data-mono
                  value={valueLabel}
                  onChange={(e) => setValueLabel(e.target.value)}
                  placeholder="value"
                />
              )}
              <p className="t-mono-xs dim-2 mt-1">
                Numeric property emitted with each event. Declare on the source event so the SDK
                packs it into the right AE column.
              </p>
            </div>
          ) : null}
          <FiltersEditor
            filters={filters}
            onChange={setFilters}
            stringProps={stringProps}
            numericProps={numericProps}
          />
          <GroupByEditor
            op={groupByOp}
            labels={groupByLabels}
            onOpChange={setGroupByOp}
            onLabelsChange={setGroupByLabels}
            availableLabels={groupableLabelNames}
          />
          <div>
            <Label>DSL preview</Label>
            <pre
              className="mt-1.5 overflow-x-auto rounded-md border border-[var(--se-line-2)] bg-[var(--se-bg-1)] px-3 py-2 font-mono text-[12px] text-[var(--se-fg-2)]"
              data-testid="metric-dsl-preview"
            >
              {dslPreview || "—"}
            </pre>
            <p className="t-mono-xs dim-2 mt-1">
              Canonical text rendering of the query. The IR (not this text) is what we store.
            </p>
          </div>
          <div>
            <Label>Direction</Label>
            <div className="mt-1.5 inline-flex overflow-hidden rounded-md border border-[var(--se-line-2)] bg-[var(--se-bg-2)]">
              <button
                type="button"
                onClick={() => setDirection("up")}
                aria-pressed={direction === "up"}
                className={
                  direction === "up"
                    ? "px-3 py-1.5 font-mono text-[11.5px] text-[var(--se-accent)] bg-[var(--se-accent-soft)]"
                    : "px-3 py-1.5 font-mono text-[11.5px] text-[var(--se-fg-2)] hover:bg-[var(--se-bg-3)]"
                }
              >
                Higher is better
              </button>
              <button
                type="button"
                onClick={() => setDirection("down")}
                aria-pressed={direction === "down"}
                className={
                  direction === "down"
                    ? "px-3 py-1.5 font-mono text-[11.5px] text-[var(--se-accent)] bg-[var(--se-accent-soft)]"
                    : "px-3 py-1.5 font-mono text-[11.5px] text-[var(--se-fg-2)] hover:bg-[var(--se-bg-3)]"
                }
              >
                Lower is better
              </button>
            </div>
            <p className="t-mono-xs dim-2 mt-1">
              Determines which experiment verdicts are wins vs regressions.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="flex items-center justify-between">
                <Label htmlFor="metric-winsorize">Winsorize</Label>
                <span
                  className="font-mono text-[12px] text-[var(--se-fg-2)]"
                  style={{ fontVariantNumeric: "tabular-nums" }}
                >
                  {winsorize}%
                </span>
              </div>
              <Slider
                id="metric-winsorize"
                min={90}
                max={99}
                step={1}
                value={winsorize}
                onValueChange={(v) => setWinsorize(Array.isArray(v) ? (v[0] ?? 99) : (v as number))}
              />
              <p className="t-mono-xs dim-2 mt-1">Clip extreme outliers to the p-X value.</p>
            </div>
            <div>
              <div className="flex items-center justify-between">
                <Label htmlFor="metric-mde">Min detectable effect</Label>
                <span
                  className="font-mono text-[12px] text-[var(--se-fg-2)]"
                  style={{ fontVariantNumeric: "tabular-nums" }}
                >
                  {mdePct}%
                </span>
              </div>
              <Slider
                id="metric-mde"
                min={1}
                max={25}
                step={1}
                value={mdePct}
                onValueChange={(v) => setMdePct(Array.isArray(v) ? (v[0] ?? 5) : (v as number))}
              />
              <p className="t-mono-xs dim-2 mt-1">Used to size experiments using this metric.</p>
            </div>
          </div>
        </div>
      ),
      aside: (
        <MetricAside
          name={trimmed}
          eventName={eventName}
          aggregation={aggregation}
          valueLabel={valueLabel}
          dsl={dslPreview}
        />
      ),
    },
    {
      id: "integrate",
      label: "Integrate",
      title: "Wire it up",
      hint: "Emit the source event from your code and the metric updates automatically.",
      content: (
        <MetricIntegrate eventName={eventName} valueLabel={valueRequired ? valueLabel : null} />
      ),
      aside: (
        <MetricAside
          name={trimmed}
          eventName={eventName}
          aggregation={aggregation}
          valueLabel={valueLabel}
          dsl={dslPreview}
        />
      ),
    },
  ];

  function handleSubmit() {
    if (!nameValid || !sourceValid || !shapeValid) {
      setStep(!nameValid ? 0 : !sourceValid ? 1 : 2);
      return;
    }
    const finalIr: DslQuery = { ...queryIr, metric: eventName };
    startTransition(async () => {
      try {
        const created = (await createMetric({
          name: trimmed,
          event_name: eventName,
          query_ir: finalIr,
          winsorize_pct: winsorize,
          min_detectable_effect: mdePct / 100,
        })) as { id: string; name: string };
        if (onCreated) {
          await onCreated({
            id: created.id,
            name: created.name,
            eventName,
            aggregation,
            valueLabel: valueRequired ? valueLabel : null,
            queryIr: finalIr,
            createdEvents: inlineEvents,
          });
        } else {
          toast.success(`Registered metric "${trimmed}"`);
          onComplete?.();
        }
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to register metric");
      }
    });
  }

  return (
    <BigModalWizard
      open={open}
      onOpenChange={onOpenChange}
      kind="metrics"
      title="Register a metric"
      eyebrow={{ project: projectId }}
      forContext={forContext}
      nested={nested}
      steps={steps}
      current={step}
      onStepChange={setStep}
      onSubmit={handleSubmit}
      submitting={pending}
    />
  );
}

function MetricAside({
  name,
  eventName,
  aggregation,
  valueLabel,
  dsl,
}: {
  name: string;
  eventName: string;
  aggregation: string;
  valueLabel: string;
  dsl?: string;
}) {
  const rows: Array<{ k: string; v: string }> = [
    { k: "name", v: name || "—" },
    { k: "event", v: eventName || "—" },
    { k: "agg", v: aggregation },
    { k: "value", v: valueLabel || "—" },
  ];
  return (
    <>
      <div className="t-caps dim-2 flex items-center gap-1.5">
        <span className="inline-block size-[5px] rounded-full bg-[var(--se-purple)]" />
        Summary
      </div>
      <dl className="flex flex-col gap-1.5">
        {rows.map((r) => (
          <div key={r.k} className="grid grid-cols-[60px_minmax(0,1fr)] items-baseline gap-2">
            <dt className="font-mono text-[10.5px] uppercase tracking-[0.06em] text-[var(--se-fg-3)]">
              {r.k}
            </dt>
            <dd className="truncate font-mono text-[12.5px] text-[var(--se-fg-2)]">{r.v}</dd>
          </div>
        ))}
      </dl>
      {dsl ? (
        <pre className="whitespace-pre-wrap break-all rounded-md border border-[var(--se-line-2)] bg-[var(--se-bg-1)] px-2.5 py-1.5 font-mono text-[11.5px] leading-snug text-[var(--se-fg-2)]">
          {dsl}
        </pre>
      ) : null}
      <p className="t-sm dim">
        Metrics never hard-delete. You can archive them anytime once the dependent experiments stop
        referencing them.
      </p>
    </>
  );
}

function FiltersEditor({
  filters,
  onChange,
  stringProps,
  numericProps,
}: {
  filters: DslFilter[];
  onChange: (next: DslFilter[]) => void;
  stringProps: EventProperty[];
  numericProps: EventProperty[];
}) {
  const all = [...stringProps, ...numericProps];
  function update(i: number, patch: Partial<DslFilter>) {
    onChange(filters.map((f, idx) => (idx === i ? { ...f, ...patch } : f)));
  }
  function add() {
    const first = all[0];
    onChange([...filters, { label: first?.name ?? "", op: "=", value: "" }]);
  }
  function remove(i: number) {
    onChange(filters.filter((_, idx) => idx !== i));
  }
  return (
    <div>
      <div className="flex items-center justify-between">
        <Label>Filters</Label>
        <Button type="button" size="sm" variant="outline" onClick={add} disabled={all.length === 0}>
          <Plus className="size-3" /> Add filter
        </Button>
      </div>
      {filters.length === 0 ? (
        <p className="t-mono-xs dim-2 mt-1">
          {all.length === 0
            ? "Source event has no declared properties — register them on the event first."
            : "No filters. All events with this name go into the metric."}
        </p>
      ) : (
        <div className="mt-1.5 flex flex-col gap-1.5">
          {filters.map((f, i) => {
            const prop = all.find((p) => p.name === f.label);
            const isNumeric = prop?.type === "number" || prop?.type === "boolean";
            return (
              <div
                key={i}
                className="grid grid-cols-[minmax(0,1fr)_120px_minmax(0,2fr)_auto] items-center gap-1.5"
              >
                <select
                  value={f.label}
                  onChange={(e) => update(i, { label: e.target.value })}
                  className="h-8 rounded-md border border-[var(--se-line-2)] bg-[var(--se-bg-2)] px-2 font-mono text-[12px] text-[var(--se-fg-2)]"
                >
                  {all.map((p) => (
                    <option key={p.name} value={p.name}>
                      {p.name} ({p.type})
                    </option>
                  ))}
                </select>
                <select
                  value={f.op}
                  onChange={(e) => update(i, { op: e.target.value as MatchOp })}
                  className="h-8 rounded-md border border-[var(--se-line-2)] bg-[var(--se-bg-2)] px-2 font-mono text-[12px] text-[var(--se-fg-2)]"
                >
                  {FILTER_OPS.filter((o) => !o.stringOnly || !isNumeric).map((o) => (
                    <option key={o.op} value={o.op}>
                      {o.label}
                    </option>
                  ))}
                </select>
                <Input
                  data-mono
                  value={f.value}
                  onChange={(e) => update(i, { value: e.target.value })}
                  placeholder={isNumeric ? "0" : "value"}
                />
                <button
                  type="button"
                  onClick={() => remove(i)}
                  className="rounded-md border border-[var(--se-line-2)] bg-[var(--se-bg-2)] p-1.5 text-[var(--se-fg-3)] hover:text-[var(--se-fg-1)]"
                  aria-label="Remove filter"
                >
                  <X className="size-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function GroupByEditor({
  op,
  labels,
  onOpChange,
  onLabelsChange,
  availableLabels,
}: {
  op: "by" | "without";
  labels: string[];
  onOpChange: (op: "by" | "without") => void;
  onLabelsChange: (labels: string[]) => void;
  availableLabels: string[];
}) {
  function toggle(l: string) {
    if (labels.includes(l)) onLabelsChange(labels.filter((x) => x !== l));
    else if (labels.length < 5) onLabelsChange([...labels, l]);
  }
  return (
    <div>
      <div className="flex items-center justify-between">
        <Label>Group by</Label>
        <div className="inline-flex overflow-hidden rounded-md border border-[var(--se-line-2)] bg-[var(--se-bg-2)]">
          {(["by", "without"] as const).map((o) => (
            <button
              key={o}
              type="button"
              onClick={() => onOpChange(o)}
              aria-pressed={op === o}
              className={
                op === o
                  ? "bg-[var(--se-accent-soft)] px-2.5 py-1 font-mono text-[11px] text-[var(--se-accent)]"
                  : "px-2.5 py-1 font-mono text-[11px] text-[var(--se-fg-2)] hover:bg-[var(--se-bg-3)]"
              }
            >
              {o}
            </button>
          ))}
        </div>
      </div>
      <div className="mt-1.5 flex flex-wrap gap-1.5">
        {availableLabels.length === 0 ? (
          <p className="t-mono-xs dim-2">No groupable labels for this event.</p>
        ) : (
          availableLabels.map((l) => {
            const on = labels.includes(l);
            return (
              <button
                key={l}
                type="button"
                onClick={() => toggle(l)}
                aria-pressed={on}
                className={
                  on
                    ? "rounded-md border border-[color-mix(in_oklab,var(--se-accent)_45%,transparent)] bg-[var(--se-accent-soft)] px-2.5 py-1 font-mono text-[11.5px] text-[var(--se-accent)]"
                    : "rounded-md border border-[var(--se-line-2)] bg-[var(--se-bg-2)] px-2.5 py-1 font-mono text-[11.5px] text-[var(--se-fg-2)] hover:bg-[var(--se-bg-3)]"
                }
              >
                {l}
              </button>
            );
          })
        )}
      </div>
      <p className="t-mono-xs dim-2 mt-1">
        {op === "by"
          ? "Time series split out per selected label."
          : "Time series rolled up across all labels except the selected ones."}
      </p>
    </div>
  );
}

function MetricIntegrate({
  eventName,
  valueLabel,
}: {
  eventName: string;
  valueLabel: string | null;
}) {
  const ev = eventName || "your_event";
  const snippets = useMemo(() => buildSnippets(ev, valueLabel), [ev, valueLabel]);
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

function buildSnippets(eventName: string, valueLabel: string | null) {
  const props = valueLabel ? `{ ${valueLabel}: 1 }` : null;
  return {
    ts: `import { shipeasy } from '@shipeasy/sdk';

shipeasy.event('${eventName}', {
  user_id: ctx.user.id,${
    props
      ? `\n  value: 1,\n  properties: ${props},`
      : "\n  // no value/properties needed for this aggregation"
  }
});`,
    py: `from shipeasy import client

client.event(
    "${eventName}",
    user_id=ctx.user.id,${
      props
        ? `\n    value=1,\n    properties={"${valueLabel}": 1},`
        : "\n    # no value/properties needed"
    }
)`,
    go: `shipeasy.Event(ctx, "${eventName}", &shipeasy.EventOpts{
    UserID: ctx.User.ID,${
      props
        ? `\n    Value: 1,\n    Properties: map[string]any{"${valueLabel}": 1},`
        : "\n    // no value/properties needed"
    }
})`,
    curl: `curl -H "Authorization: Bearer $SHIPEASY_KEY" \\
  -H "Content-Type: application/json" \\
  -X POST https://api.shipeasy.dev/v1/collect \\
  -d '{ "name": "${eventName}", "user_id": "u_123"${
    props ? `, "value": 1, "properties": ${props}` : ""
  } }'`,
  };
}
