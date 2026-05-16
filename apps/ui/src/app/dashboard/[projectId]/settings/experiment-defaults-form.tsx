"use client";

import { useState } from "react";
import { ActionForm } from "@/components/ui/action-form";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { updateProjectAction } from "./actions";

interface Props {
  statMethod: "sequential" | "fixed" | "bayesian";
  sigThreshold: string;
  autoRollback: boolean;
  minSampleDays: number;
}

export function ExperimentDefaultsForm({
  statMethod,
  sigThreshold,
  autoRollback,
  minSampleDays,
}: Props) {
  const [rollback, setRollback] = useState(autoRollback);

  return (
    <ActionForm
      action={updateProjectAction}
      loading="Saving…"
      success="Defaults saved"
      className="s-panel"
    >
      <input type="hidden" name="autoRollback" value={rollback ? "on" : "off"} />
      <div className="panel-head">
        <div className="flex-1">
          <h2>Experiment defaults</h2>
          <div className="desc">Applied to new experiments unless overridden.</div>
        </div>
        <Button type="submit" variant="outline" size="sm">
          Save
        </Button>
      </div>

      <div className="field-row">
        <div className="label">
          <div className="name">Statistical method</div>
          <div className="desc">Sequential always-valid vs. fixed-horizon vs. Bayesian.</div>
        </div>
        <div />
        <div className="control">
          <select
            name="statMethod"
            defaultValue={statMethod}
            aria-label="Statistical method"
            className="h-9 w-[240px] rounded-[var(--radius-md)] border border-[var(--se-line-2)] bg-[var(--se-bg-2)] px-2.5 text-sm outline-none"
          >
            <option value="sequential">Sequential (recommended)</option>
            <option value="fixed">Fixed-horizon (frequentist)</option>
            <option value="bayesian">Bayesian</option>
          </select>
        </div>
      </div>

      <div className="field-row">
        <div className="label">
          <div className="name">Default significance threshold</div>
          <div className="desc">Required p-value to call a winner.</div>
        </div>
        <div />
        <div className="control">
          <select
            name="sigThreshold"
            defaultValue={sigThreshold}
            aria-label="Significance threshold"
            className="h-9 w-[140px] rounded-[var(--radius-md)] border border-[var(--se-line-2)] bg-[var(--se-bg-2)] px-2.5 text-sm outline-none"
          >
            <option value="0.01">0.01</option>
            <option value="0.05">0.05</option>
            <option value="0.10">0.10</option>
          </select>
        </div>
      </div>

      <div className="field-row">
        <div className="label">
          <div className="name">Auto-rollback</div>
          <div className="desc">Pause an experiment if a guardrail metric regresses past threshold.</div>
        </div>
        <div />
        <div className="control">
          <Switch
            checked={rollback}
            onCheckedChange={setRollback}
            label="Auto-rollback"
          />
        </div>
      </div>

      <div className="field-row">
        <div className="label">
          <div className="name">Min sample size warning</div>
          <div className="desc">Show a banner when expected runtime exceeds this many days.</div>
        </div>
        <div />
        <div className="control">
          <div className="flex w-[140px] items-stretch rounded-[var(--radius-md)] border border-[var(--se-line-2)] bg-[var(--se-bg-2)]">
            <input
              name="minSampleDays"
              defaultValue={minSampleDays}
              type="number"
              min={1}
              max={365}
              aria-label="Min sample size in days"
              className="w-full bg-transparent px-2.5 py-[7px] text-sm outline-none"
            />
            <span className="border-l border-[var(--se-line-2)] px-2.5 py-[7px] text-xs text-[var(--se-fg-3)]">
              days
            </span>
          </div>
        </div>
      </div>
    </ActionForm>
  );
}
