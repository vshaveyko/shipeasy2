"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";

import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { ProgressBar } from "@/components/ui/progress-bar";
import { EmbeddedGateEditor, type EmbeddedGateRow } from "./embedded-gate-editor";

interface Rule {
  attr: string;
  op: string;
  value: unknown;
}

export function ReadGateView({ gate }: { gate: EmbeddedGateRow }) {
  const [editing, setEditing] = useState(false);
  if (editing) {
    return (
      <div className="flex min-w-0 flex-col">
        <div className="flex items-center justify-end gap-2 border-b border-[var(--se-line)] bg-[var(--se-bg-1)] px-6 py-2">
          <span className="t-mono-xs dim-2 mr-auto">Editing</span>
          <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
            Done
          </Button>
        </div>
        <EmbeddedGateEditor gate={gate} />
      </div>
    );
  }

  const rolloutPct = Math.round((gate.rolloutPct ?? 0) / 100);
  const enabled = Boolean(gate.enabled);
  const rules = (gate.rules ?? []) as Rule[];
  const stack = (gate.stack ?? null) as {
    entries?: Array<{ id?: string; kind?: string; label?: string }>;
  } | null;
  const stackEntries = stack?.entries ?? [];

  return (
    <div className="flex min-w-0 flex-col gap-5 px-6 py-5">
      <div className="flex items-center justify-end">
        <Button size="sm" variant="outline" onClick={() => setEditing(true)} aria-label="Edit gate">
          <Pencil className="size-3" /> Edit
        </Button>
      </div>

      {gate.description ? (
        <p className="text-[13px] text-[var(--se-fg-2)]">{gate.description}</p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat
          label="State"
          value={
            <StatusBadge tone={enabled ? "success" : "warn"}>
              {enabled ? "ENABLED" : "PAUSED"}
            </StatusBadge>
          }
        />
        <Stat
          label="Public rollout"
          value={<span className="font-mono text-[18px]">{rolloutPct}%</span>}
        />
        <Stat label="Rules" value={<span className="font-mono text-[18px]">{rules.length}</span>} />
      </div>

      <div className="rounded-[var(--radius-md)] border border-[var(--se-line)] bg-[var(--se-bg-2)] p-4">
        <div className="t-caps dim-2 mb-2">Rollout</div>
        <ProgressBar value={rolloutPct} intent="accent" />
        <div className="mt-2 text-[11.5px] text-[var(--se-fg-3)]">
          {rolloutPct}% of qualifying traffic
        </div>
      </div>

      <div>
        <div className="t-caps dim-2 mb-2">Rules</div>
        {rules.length === 0 ? (
          <p className="rounded-md border border-dashed border-[var(--se-line)] px-3 py-3 text-center text-[12px] text-[var(--se-fg-3)]">
            No targeting rules. Gate evaluates against the rollout % only.
          </p>
        ) : (
          <div className="grid gap-1.5">
            {rules.map((r, i) => (
              <div
                key={i}
                className="grid grid-cols-[1fr_60px_1fr] items-center gap-3 rounded-md border border-[var(--se-line)] bg-[var(--se-bg-1)] px-3 py-2"
              >
                <span className="font-mono text-[12.5px] text-[var(--se-fg)]">{r.attr}</span>
                <span className="font-mono text-[11px] uppercase tracking-wider text-[var(--se-fg-3)]">
                  {r.op}
                </span>
                <span className="font-mono text-[12.5px] text-[var(--se-fg-2)] truncate">
                  {typeof r.value === "string" ? r.value : JSON.stringify(r.value)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {stackEntries.length > 0 ? (
        <div>
          <div className="t-caps dim-2 mb-2">Stack</div>
          <div className="grid gap-1.5">
            {stackEntries.map((e, i) => (
              <div
                key={e.id ?? i}
                className="flex items-center gap-3 rounded-md border border-[var(--se-line)] bg-[var(--se-bg-1)] px-3 py-2 text-[12.5px]"
              >
                <span className="font-mono text-[10.5px] uppercase tracking-wider text-[var(--se-fg-3)]">
                  {e.kind ?? "rule"}
                </span>
                <span className="text-[var(--se-fg)]">{e.label ?? `Entry ${i + 1}`}</span>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-[var(--radius-md)] border border-[var(--se-line)] bg-[var(--se-bg-2)] p-3">
      <div className="t-caps dim-2 mb-1.5">{label}</div>
      <div className="flex items-center gap-2">{value}</div>
    </div>
  );
}
