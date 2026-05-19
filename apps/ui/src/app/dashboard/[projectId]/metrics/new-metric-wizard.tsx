"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import useSWR from "swr";

import { BigModalWizard, type WizardStep } from "@/components/shell/big-modal-wizard";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { CodeBlock } from "@/components/ui/code-block";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { createMetric } from "@/actions/metrics";

const NAME_RE = /^[a-z0-9][a-z0-9_-]{0,63}$/;

type EventRow = { id: string; name: string; description?: string | null };

const AGGREGATIONS = [
  {
    k: "count_users",
    label: "Unique users",
    hint: "Distinct subjects with at least one event",
    needsPath: false,
  },
  {
    k: "count_events",
    label: "Event count",
    hint: "Total events across all subjects",
    needsPath: false,
  },
  { k: "sum", label: "Sum of value", hint: "Add all numeric values", needsPath: true },
  { k: "avg", label: "Average value", hint: "Mean of numeric values", needsPath: true },
  {
    k: "retention_Nd",
    label: "N-day retention",
    hint: "Fraction returning within window",
    needsPath: false,
  },
] as const;

type AggregationKey = (typeof AGGREGATIONS)[number]["k"];

const fetcher = async <T,>(url: string): Promise<T> => {
  const res = await fetch(url, { credentials: "same-origin" });
  if (!res.ok) throw new Error(`${url} → HTTP ${res.status}`);
  const body = (await res.json()) as T | { data: T };
  if (Array.isArray(body)) return body as T;
  if (typeof body === "object" && body && "data" in (body as object))
    return (body as { data: T }).data;
  return body as T;
};

export interface NewMetricWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId?: string;
  onComplete?: () => void;
}

export function NewMetricWizard({
  open,
  onOpenChange,
  projectId,
  onComplete,
}: NewMetricWizardProps) {
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [eventName, setEventName] = useState("");
  const [newEventDraft, setNewEventDraft] = useState("");
  const [valuePath, setValuePath] = useState("");
  const [aggregation, setAggregation] = useState<AggregationKey>("count_users");
  const [direction, setDirection] = useState<"up" | "down">("up");
  const [winsorize, setWinsorize] = useState<number>(99);
  const [mdePct, setMdePct] = useState<number>(5);
  const [search, setSearch] = useState("");
  const [pending, startTransition] = useTransition();

  const { data: events, mutate: refetchEvents } = useSWR<EventRow[]>(
    open ? "/api/admin/events" : null,
    fetcher,
  );

  useEffect(() => {
    if (!open) {
      setStep(0);
      setName("");
      setDescription("");
      setEventName("");
      setNewEventDraft("");
      setValuePath("");
      setAggregation("count_users");
      setDirection("up");
      setWinsorize(99);
      setMdePct(5);
      setSearch("");
    }
  }, [open]);

  const trimmed = name.trim();
  const nameValid = NAME_RE.test(trimmed);
  const sourceValid = eventName.length > 0;
  const aggregationMeta = useMemo(
    () => AGGREGATIONS.find((a) => a.k === aggregation) ?? AGGREGATIONS[0],
    [aggregation],
  );
  const valuePathRequired = aggregationMeta.needsPath;
  const shapeValid = !valuePathRequired || valuePath.trim().length > 0;

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
            <Label htmlFor="metric-name">Name *</Label>
            <Input
              id="metric-name"
              data-mono
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="checkout_conversion"
              pattern="[a-z0-9][a-z0-9_-]{0,63}"
            />
            <p className="t-mono-xs dim-2 mt-1">
              Lowercase letters, digits, _ or -. Max 64 characters.
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
          valuePath={valuePath}
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
          valuePath={valuePath}
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
          {valuePathRequired ? (
            <div>
              <Label htmlFor="metric-value-path">Value path *</Label>
              <Input
                id="metric-value-path"
                data-mono
                value={valuePath}
                onChange={(e) => setValuePath(e.target.value)}
                placeholder="value.amount"
              />
              <p className="t-mono-xs dim-2 mt-1">
                JSON pointer into the event payload, e.g. <code>value.amount</code>.
              </p>
            </div>
          ) : null}
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
          valuePath={valuePath}
        />
      ),
    },
    {
      id: "integrate",
      label: "Integrate",
      title: "Wire it up",
      hint: "Emit the source event from your code and the metric updates automatically.",
      content: (
        <MetricIntegrate eventName={eventName} valuePath={valuePathRequired ? valuePath : null} />
      ),
      aside: (
        <MetricAside
          name={trimmed}
          eventName={eventName}
          aggregation={aggregation}
          valuePath={valuePath}
        />
      ),
    },
  ];

  function handleSubmit() {
    if (!nameValid || !sourceValid || !shapeValid) {
      setStep(!nameValid ? 0 : !sourceValid ? 1 : 2);
      return;
    }
    startTransition(async () => {
      try {
        await createMetric({
          name: trimmed,
          event_name: eventName,
          value_path: valuePathRequired ? valuePath.trim() : null,
          aggregation,
          winsorize_pct: winsorize,
          min_detectable_effect: mdePct / 100,
        });
        toast.success(`Registered metric "${trimmed}"`);
        onComplete?.();
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
  valuePath,
}: {
  name: string;
  eventName: string;
  aggregation: string;
  valuePath: string;
}) {
  const rows: Array<{ k: string; v: string }> = [
    { k: "name", v: name || "—" },
    { k: "event", v: eventName || "—" },
    { k: "agg", v: aggregation },
    { k: "path", v: valuePath || "—" },
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
      <p className="t-sm dim">
        Metrics never hard-delete. You can archive them anytime once the dependent experiments stop
        referencing them.
      </p>
    </>
  );
}

function MetricIntegrate({
  eventName,
  valuePath,
}: {
  eventName: string;
  valuePath: string | null;
}) {
  const ev = eventName || "your_event";
  const path = valuePath ?? null;
  const snippets = useMemo(() => buildSnippets(ev, path), [ev, path]);
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

function buildSnippets(eventName: string, valuePath: string | null) {
  const payload = valuePath
    ? `{ ${valuePath
        .split(".")
        .reverse()
        .reduce((acc, k) => `${k}: ${acc}`, "amount")} }`
    : "{ }";
  return {
    ts: `import { shipeasy } from '@shipeasy/sdk';

shipeasy.event('${eventName}', {
  user_id: ctx.user.id,
  ${valuePath ? `payload: ${payload}` : "// no payload needed for this aggregation"}
});`,
    py: `from shipeasy import client

client.event(
    "${eventName}",
    user_id=ctx.user.id,
    ${valuePath ? `payload=${payload.replace(/: /g, "=")},` : "# no payload needed"}
)`,
    go: `shipeasy.Event(ctx, "${eventName}", &shipeasy.EventOpts{
    UserID: ctx.User.ID,
    ${valuePath ? `Payload: map[string]any${payload},` : "// no payload needed"}
})`,
    curl: `curl -H "Authorization: Bearer $SHIPEASY_KEY" \\
  -H "Content-Type: application/json" \\
  -X POST https://api.shipeasy.dev/v1/collect \\
  -d '{ "name": "${eventName}", "user_id": "u_123"${valuePath ? `, "payload": ${payload}` : ""} }'`,
  };
}
