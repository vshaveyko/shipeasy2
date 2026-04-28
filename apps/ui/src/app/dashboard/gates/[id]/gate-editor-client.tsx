"use client";

import { useMemo, useState, useTransition } from "react";
import { Check, Play, Plus, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { saveGateRulesAction } from "./actions";

interface Attribute {
  id: string;
  name: string;
}

interface Rule {
  attr: string;
  op: string;
  value: string;
}

const OPERATORS = [
  "eq",
  "neq",
  "in",
  "not_in",
  "gt",
  "gte",
  "lt",
  "lte",
  "contains",
  "regex",
] as const;

const OP_LABEL: Record<string, string> = {
  eq: "equals",
  neq: "not equals",
  in: "in",
  not_in: "not in",
  gt: "greater than",
  gte: "greater or equal",
  lt: "less than",
  lte: "less or equal",
  contains: "contains",
  regex: "matches",
};

export function GateEditorClient({
  gateId,
  gateName,
  initialRules,
  initialRolloutPct,
  attributes,
}: {
  gateId: string;
  gateName: string;
  initialRules: Rule[];
  initialRolloutPct: number;
  attributes: Attribute[];
}) {
  const [rules, setRules] = useState<Rule[]>(initialRules);
  const [rolloutPct, setRolloutPct] = useState<number>(initialRolloutPct);
  const [isPending, startTransition] = useTransition();
  const attrOptions = useMemo(() => {
    const names = new Set<string>(attributes.map((a) => a.name));
    rules.forEach((r) => r.attr && names.add(r.attr));
    return Array.from(names);
  }, [attributes, rules]);

  function addRule() {
    setRules([...rules, { attr: attrOptions[0] ?? "", op: "eq", value: "" }]);
  }

  function removeRule(idx: number) {
    setRules(rules.filter((_, i) => i !== idx));
  }

  function updateRule(idx: number, patch: Partial<Rule>) {
    setRules(rules.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  }

  function onSave() {
    const fd = new FormData();
    fd.set("gate_id", gateId);
    fd.set("rule_count", String(rules.length));
    fd.set("rollout_pct", String(rolloutPct));
    rules.forEach((r, i) => {
      fd.set(`rule_attr_${i}`, r.attr);
      fd.set(`rule_op_${i}`, r.op);
      fd.set(`rule_value_${i}`, r.value);
    });
    startTransition(() => {
      void saveGateRulesAction(fd);
    });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
      {/* Rules column */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <div className="t-caps dim-2">Rules · {rules.length} active</div>
          <Button type="button" variant="ghost" size="sm" onClick={addRule}>
            <Plus className="size-3" /> Add rule
          </Button>
        </div>

        {rules.length === 0 ? (
          <div className="rounded-[var(--radius-md)] border border-dashed border-[var(--se-line-2)] p-6 text-center text-[13px] text-[var(--se-fg-3)]">
            No rules yet. Click <b className="text-[var(--se-fg-2)]">Add rule</b> to start targeting
            users — gate falls back to the rollout percentage when nothing matches.
            {attrOptions.length === 0 && (
              <div className="mt-2 text-[12px]">
                To target by attribute, first{" "}
                <a href="/dashboard/experiments/attributes" className="underline text-[var(--se-accent)]">
                  define attributes
                </a>{" "}
                in Experiments.
              </div>
            )}
          </div>
        ) : (
          rules.map((rule, idx) => (
            <RuleCard
              key={idx}
              index={idx}
              rule={rule}
              attrOptions={attrOptions}
              onChange={(patch) => updateRule(idx, patch)}
              onRemove={() => removeRule(idx)}
            />
          ))
        )}

        <div className="mt-2 flex items-center gap-2 rounded-[var(--radius-md)] border border-dashed border-[var(--se-line-2)] bg-[var(--se-bg-2)] px-4 py-3">
          <Sparkles className="size-3 text-[var(--se-accent)]" />
          <span className="text-[13px] text-[var(--se-fg-2)] flex-1">
            <b className="text-[var(--se-fg)]">Tip:</b> ask Claude &ldquo;add a rule for customers
            with LTV over $1k&rdquo;
          </span>
          <Button type="button" variant="ghost" size="sm">
            Ask →
          </Button>
        </div>

        <div className="mt-5">
          <div className="t-caps dim-2 mb-2">Default when no rule matches</div>
          <div className="flex items-center gap-3">
            <input
              type="range"
              min={0}
              max={100}
              value={rolloutPct}
              onChange={(e) => setRolloutPct(Number(e.target.value))}
              className="w-48 accent-[var(--se-accent)]"
            />
            <span
              className="font-mono text-[13px] tabular-nums text-[var(--se-fg)]"
              style={{ fontVariantNumeric: "tabular-nums" }}
            >
              {rolloutPct}%
            </span>
            <span className="t-mono-xs dim-2">rollout</span>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <Button type="button" variant="ghost" size="sm" disabled={isPending}>
            Discard
          </Button>
          <Button type="button" size="sm" onClick={onSave} disabled={isPending}>
            <Check className="size-3" /> {isPending ? "Saving…" : "Save changes"}
          </Button>
        </div>
      </div>

      {/* Test panel column */}
      <div className="space-y-3">
        <TestPanel gateName={gateName} rules={rules} rolloutPct={rolloutPct} />
        <SdkUsage gateName={gateName} />
      </div>
    </div>
  );
}

function RuleCard({
  index,
  rule,
  attrOptions,
  onChange,
  onRemove,
}: {
  index: number;
  rule: Rule;
  attrOptions: string[];
  onChange: (patch: Partial<Rule>) => void;
  onRemove: () => void;
}) {
  return (
    <div
      className="relative mb-2.5 grid gap-3 rounded-[var(--radius-md)] border border-[var(--se-line)] bg-[var(--se-bg-1)] p-4"
      style={{ gridTemplateColumns: "1fr auto" }}
    >
      <span
        className="absolute left-[-1px] top-2.5 bottom-2.5 w-[3px] rounded"
        style={{ background: "var(--se-accent)" }}
      />
      <div className="min-w-0">
        <div className="mb-3 flex flex-wrap items-center gap-2.5">
          <div className="grid size-[22px] place-items-center rounded border border-[var(--se-line-2)] bg-[var(--se-bg-3)] font-mono text-[11px] font-semibold">
            {index + 1}
          </div>
          <span className="se-badge se-badge-live" style={{ padding: "1px 6px" }}>
            ALLOW
          </span>
          <span className="ml-auto t-mono-xs dim">condition</span>
        </div>
        <RuleCondition
          rule={rule}
          attrOptions={attrOptions}
          onChange={onChange}
          onRemove={onRemove}
          first
        />
      </div>
    </div>
  );
}

function RuleCondition({
  rule,
  attrOptions,
  onChange,
  onRemove,
  first,
}: {
  rule: Rule;
  attrOptions: string[];
  onChange: (patch: Partial<Rule>) => void;
  onRemove: () => void;
  first: boolean;
}) {
  return (
    <div
      className="grid items-center gap-2 rounded-[var(--radius-sm)] bg-[var(--se-bg-2)] p-2"
      style={{
        gridTemplateColumns: "36px minmax(0, 1.4fr) minmax(0, 1fr) minmax(0, 1.6fr) 28px",
      }}
    >
      <span className="rounded bg-[var(--se-bg-3)] py-[3px] text-center font-mono text-[10px] tracking-[.05em] text-[var(--se-fg-3)]">
        {first ? "IF" : "AND"}
      </span>
      <select
        value={rule.attr}
        onChange={(e) => onChange({ attr: e.target.value })}
        className="h-[30px] min-w-0 rounded-[var(--radius-sm)] border border-[var(--se-line-2)] bg-[var(--se-bg-1)] pl-2.5 pr-6 text-[12px] outline-none focus-visible:border-ring"
      >
        {attrOptions.length === 0 ? (
          <option value="">—</option>
        ) : (
          attrOptions.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))
        )}
      </select>
      <select
        value={rule.op}
        onChange={(e) => onChange({ op: e.target.value })}
        className="h-[30px] min-w-0 rounded-[var(--radius-sm)] border border-[var(--se-line-2)] bg-[var(--se-bg-1)] pl-2.5 pr-6 text-[12px] outline-none focus-visible:border-ring"
      >
        {OPERATORS.map((op) => (
          <option key={op} value={op}>
            {OP_LABEL[op] ?? op}
          </option>
        ))}
      </select>
      <input
        value={rule.value}
        onChange={(e) => onChange({ value: e.target.value })}
        placeholder="value"
        className="h-[30px] min-w-0 rounded-[var(--radius-sm)] border border-[var(--se-line-2)] bg-[var(--se-bg-1)] px-2.5 font-mono text-[12px] outline-none focus-visible:border-ring"
      />
      <button
        type="button"
        onClick={onRemove}
        aria-label="Remove condition"
        className="grid size-7 place-items-center rounded text-[var(--se-fg-3)] hover:bg-[var(--se-bg-3)] hover:text-[var(--se-fg)]"
      >
        <X className="size-3" />
      </button>
    </div>
  );
}

function TestPanel({ gateName, rules, rolloutPct }: { gateName: string; rules: Rule[]; rolloutPct: number }) {
  const [userId, setUserId] = useState("usr_3b20a9f2");
  const sample = useMemo(
    () =>
      ({
        "user.plan": "team",
        "user.status": "active",
        "user.country": "US",
      }) as Record<string, string>,
    [],
  );
  const evaluation = useMemo(() => {
    return rules.map((r) => {
      const left = sample[r.attr];
      let pass = false;
      if (left != null) {
        switch (r.op) {
          case "eq":
            pass = left === r.value;
            break;
          case "neq":
            pass = left !== r.value;
            break;
          case "contains":
            pass = String(left).includes(r.value);
            break;
          default:
            pass = false;
        }
      }
      return { rule: r, pass };
    });
  }, [rules, sample]);
  const firstPass = evaluation.findIndex((e) => e.pass);
  // If a rule matched, it wins; otherwise fall back to rollout percentage.
  // For the test panel we treat 100% as always-true and 0% as always-false;
  // intermediate values are probabilistic (shown as a hint, not a definite bool).
  const result = firstPass !== -1 || rolloutPct === 100;

  return (
    <div className="rounded-[var(--radius-lg)] border border-[var(--se-line)] bg-[var(--se-bg-2)] p-4">
      <div className="mb-3 flex items-center gap-2">
        <Play className="size-3 text-[var(--se-accent)]" />
        <b className="text-[13px] font-medium">Test against a user</b>
        <span className="ml-auto t-mono-xs dim-2">live</span>
      </div>

      <div className="mb-2.5 flex h-8 items-center gap-2 rounded-[var(--radius-md)] border border-[var(--se-line-2)] bg-[var(--se-bg-1)] px-2.5 text-[12px]">
        <span className="font-mono text-[10.5px] text-[var(--se-fg-3)]">user_id</span>
        <input
          value={userId}
          onChange={(e) => setUserId(e.target.value)}
          className="min-w-0 flex-1 bg-transparent font-mono outline-none"
        />
      </div>

      <div className="rounded-[var(--radius-md)] border border-[var(--se-line)] bg-[var(--se-bg-1)] p-3">
        <div className="mb-2.5 flex items-center gap-2">
          <div
            className="grid size-7 place-items-center rounded-full text-[12px] font-medium text-white"
            style={{ background: "#7c5cff" }}
          >
            M
          </div>
          <div>
            <div className="text-[13px] font-medium">maya@acme.co</div>
            <div className="t-mono-xs dim-2">us-east · team plan · 94d old</div>
          </div>
        </div>
        <div className="rounded bg-[var(--se-bg-2)] px-2.5 py-2 font-mono text-[11px] leading-[1.7] text-[var(--se-fg-2)]">
          {Object.entries(sample).map(([k, v]) => (
            <div key={k}>
              <span className="dim-3">{k}</span> = &quot;{v}&quot;
            </div>
          ))}
        </div>
      </div>

      <div className="mt-3.5">
        <div className="t-caps dim-2 mb-2">Evaluation</div>
        {evaluation.length === 0 ? (
          <div className="text-[12.5px] text-[var(--se-fg-3)]">
            No rules to evaluate.{" "}
            <span className="text-[var(--se-fg-2)]">Falls through to {rolloutPct}% rollout.</span>
          </div>
        ) : (
          <>
            {evaluation.map((e, i) => {
              const skipped = firstPass !== -1 && i > firstPass;
              return (
                <div
                  key={i}
                  className={`flex items-center gap-2.5 py-1.5 text-[12.5px] ${
                    skipped ? "text-[var(--se-fg-3)]" : ""
                  }`}
                >
                  <span
                    className="rounded px-1.5 py-0.5 font-mono text-[10.5px]"
                    style={{
                      background: skipped
                        ? "var(--se-bg-3)"
                        : e.pass
                          ? "var(--se-accent-soft)"
                          : "var(--se-danger-soft)",
                      color: skipped
                        ? "var(--se-fg-2)"
                        : e.pass
                          ? "var(--se-accent)"
                          : "var(--se-danger)",
                    }}
                  >
                    {skipped ? "skip" : e.pass ? "PASS" : "FAIL"}
                  </span>
                  <span className={skipped ? "dim" : ""}>
                    Rule {i + 1} · {e.rule.attr || "—"} {e.rule.op}{" "}
                    {e.rule.value ? `"${e.rule.value}"` : ""}
                  </span>
                </div>
              );
            })}
            {firstPass === -1 && (
              <div className="flex items-center gap-2.5 py-1.5 text-[12.5px] text-[var(--se-fg-3)]">
                <span className="rounded px-1.5 py-0.5 font-mono text-[10.5px] bg-[var(--se-bg-3)] text-[var(--se-fg-2)]">
                  fall
                </span>
                <span>Rollout · {rolloutPct}% of users</span>
              </div>
            )}
          </>
        )}
      </div>

      <div
        className="mt-4 flex items-center gap-2.5 rounded-[var(--radius-md)] px-3.5 py-3"
        style={{
          background: result ? "var(--se-accent-soft)" : "var(--se-danger-soft)",
          border: `1px solid color-mix(in oklab, ${
            result ? "var(--se-accent)" : "var(--se-danger)"
          } 30%, transparent)`,
        }}
      >
        <div
          className="font-mono text-[11px]"
          style={{ color: result ? "var(--se-accent)" : "var(--se-danger)" }}
        >
          RESULT
        </div>
        <div
          className="font-mono text-[16px] font-semibold"
          style={{ color: result ? "var(--se-accent)" : "var(--se-danger)" }}
        >
          {String(result)}
        </div>
        <span
          className="ml-auto t-mono-xs"
          style={{ color: result ? "var(--se-accent)" : "var(--se-danger)" }}
        >
          {gateName}
        </span>
      </div>
    </div>
  );
}

function SdkUsage({ gateName }: { gateName: string }) {
  return (
    <div className="rounded-[var(--radius-lg)] border border-[var(--se-line)] bg-[var(--se-bg-1)] p-4">
      <div className="t-caps dim-2 mb-2.5">SDK usage</div>
      <pre
        className="m-0 whitespace-pre-wrap rounded-[var(--radius-sm)] border border-[var(--se-line)] bg-[var(--se-bg-2)] px-3 py-2.5 text-[11.5px] leading-[1.7] text-[var(--se-fg-2)]"
        style={{ fontFamily: "var(--se-mono)" }}
      >
        <span style={{ color: "#a78bfa" }}>const</span> allowed ={" "}
        <span style={{ color: "#a78bfa" }}>await</span> shipeasy.gate(
        <span style={{ color: "var(--se-accent)" }}>&quot;{gateName}&quot;</span>);{"\n"}
        <span style={{ color: "#a78bfa" }}>if</span> (allowed) {"<"}
        <span style={{ color: "#74c7ec" }}>PremiumPanel</span> {"/>"};
      </pre>
    </div>
  );
}
