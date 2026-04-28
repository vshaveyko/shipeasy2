"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

const OPERATORS = ["eq", "neq", "in", "not_in", "gt", "gte", "lt", "lte", "contains", "regex"];

interface Props {
  gateId: string;
  initialRules: Rule[];
  attributes: Attribute[];
}

export function RulesBuilder({ gateId, initialRules, attributes }: Props) {
  const [rules, setRules] = useState<Rule[]>(initialRules);

  function addRule() {
    setRules([...rules, { attr: attributes[0]?.name ?? "", op: "eq", value: "" }]);
  }

  function removeRule(idx: number) {
    setRules(rules.filter((_, i) => i !== idx));
  }

  function updateRule(idx: number, field: keyof Rule, value: string) {
    setRules(rules.map((r, i) => (i === idx ? { ...r, [field]: value } : r)));
  }

  return (
    <form action={saveGateRulesAction} className="space-y-4">
      <input type="hidden" name="gate_id" value={gateId} />
      <input type="hidden" name="rule_count" value={rules.length} />

      {rules.length === 0 ? (
        <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
          No rules yet. Click &ldquo;Add rule&rdquo; to start targeting users.
        </div>
      ) : (
        <div className="space-y-3">
          {rules.map((rule, idx) => (
            <div key={idx} className="grid grid-cols-[1fr_1fr_1fr_auto] gap-3 items-end">
              <div className="grid gap-1.5">
                {idx === 0 && (
                  <Label htmlFor={`rule-attr-${idx}`}>Attribute</Label>
                )}
                <select
                  id={`rule-attr-${idx}`}
                  name={`rule_attr_${idx}`}
                  value={rule.attr}
                  onChange={(e) => updateRule(idx, "attr", e.target.value)}
                  className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  {attributes.map((a) => (
                    <option key={a.id} value={a.name}>
                      {a.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid gap-1.5">
                {idx === 0 && (
                  <Label htmlFor={`rule-op-${idx}`}>Operator</Label>
                )}
                <select
                  id={`rule-op-${idx}`}
                  name={`rule_op_${idx}`}
                  value={rule.op}
                  onChange={(e) => updateRule(idx, "op", e.target.value)}
                  className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  {OPERATORS.map((op) => (
                    <option key={op} value={op}>
                      {op}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid gap-1.5">
                {idx === 0 && (
                  <Label htmlFor={`rule-value-${idx}`}>Value</Label>
                )}
                <Input
                  id={`rule-value-${idx}`}
                  name={`rule_value_${idx}`}
                  value={rule.value}
                  onChange={(e) => updateRule(idx, "value", e.target.value)}
                  placeholder="value"
                />
              </div>
              <button
                type="button"
                title="Remove rule"
                onClick={() => removeRule(idx)}
                className="flex size-8 items-center justify-center rounded text-muted-foreground hover:text-foreground"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center gap-3">
        <Button type="button" variant="outline" size="sm" onClick={addRule}>
          Add rule
        </Button>
        {rules.length > 0 && (
          <Button type="submit" size="sm">
            Save rules
          </Button>
        )}
      </div>
    </form>
  );
}
