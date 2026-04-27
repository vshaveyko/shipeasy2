"use client";

import useSWR from "swr";
import { Search, Shield, MoreHorizontal } from "lucide-react";

import { HeroEmptyState } from "@/components/dashboard/hero-empty-state";
import { PageHeader } from "@/components/dashboard/page-header";
import { Button } from "@/components/ui/button";
import { LinkButton } from "@/components/ui/link-button";
import { deleteGateAction, enableGateAction } from "./actions";

interface GateRow {
  id: string;
  name: string;
  rolloutPct: number;
  rules: unknown;
  enabled: number | boolean;
  killswitch: number | boolean;
}

const fetcher = async (url: string): Promise<GateRow[]> => {
  const res = await fetch(url, { credentials: "same-origin" });
  if (!res.ok) throw new Error(`${url} → HTTP ${res.status}`);
  return (await res.json()) as GateRow[];
};

export function GatesContent() {
  const { data, isLoading } = useSWR<GateRow[]>("/api/admin/gates", fetcher);
  const gates = data ?? [];

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Gates"
          description="Gates toggle features on and off per user, attribute, or percentage."
        />
        <div className="text-muted-foreground text-sm">Loading…</div>
      </div>
    );
  }

  const total = gates.length;
  const enabled = gates.filter((g) => Boolean(g.enabled)).length;
  const paused = total - enabled;

  if (total === 0) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Gates"
          description="Gates toggle features on and off per user, attribute, or percentage. Edge-cached — evaluations run against KV in under 10ms."
          actions={
            <LinkButton size="sm" href="/dashboard/gates/new">
              New gate
            </LinkButton>
          }
        />
        <HeroEmptyState kind="gates" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        kicker={`${total} gate${total === 1 ? "" : "s"} · ${enabled} enabled · ${paused} paused`}
        title="Gates"
        description="Gates toggle features on and off per user, attribute, or percentage. Edge-cached — evaluations run against KV in under 10ms."
        actions={
          <LinkButton size="sm" href="/dashboard/gates/new">
            New gate
          </LinkButton>
        }
      />

      <div className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--se-line)] bg-[var(--se-bg-1)]">
        <div className="flex items-center gap-3 border-b border-[var(--se-line)] px-4 py-3">
          <div className="text-[14px] font-medium">All gates</div>
          <div className="ml-auto flex h-8 w-[220px] items-center gap-2 rounded-[var(--radius-md)] border border-[var(--se-line-2)] bg-[var(--se-bg-2)] px-2.5 text-[13px]">
            <Search className="size-3 text-[var(--se-fg-3)]" />
            <input
              placeholder="Filter gates"
              className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-[var(--se-fg-4)]"
            />
          </div>
        </div>

        <div
          className="grid gap-3 border-b border-[var(--se-line)] px-5 py-2"
          style={{
            gridTemplateColumns: "20px minmax(0,1fr) 120px 90px 120px 60px 32px",
            background: "var(--se-bg-2)",
          }}
        >
          <span />
          <span className="t-caps dim-3">Gate</span>
          <span className="t-caps dim-3">Rollout</span>
          <span className="t-caps dim-3">Rules</span>
          <span className="t-caps dim-3">Status</span>
          <span />
          <span />
        </div>
        {gates.map((gate) => {
          const ruleCount = Array.isArray(gate.rules) ? gate.rules.length : 0;
          const isEnabled = Boolean(gate.enabled);
          const isKill = Boolean(gate.killswitch);
          const color = isKill
            ? "var(--se-danger)"
            : isEnabled
              ? "var(--se-accent)"
              : "var(--se-fg-4)";
          return (
            <div
              key={gate.id}
              className="grid items-center gap-3 border-b border-[var(--se-line)] px-5 py-3 transition-colors last:border-none hover:bg-[var(--se-bg-2)]"
              style={{ gridTemplateColumns: "20px minmax(0,1fr) 120px 90px 120px 60px 32px" }}
            >
              <Shield className="size-3.5" style={{ color }} />
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <a
                    href={`/dashboard/gates/${gate.id}`}
                    className="truncate font-mono text-[13px] font-medium hover:underline"
                  >
                    {gate.name}
                  </a>
                  {isKill ? (
                    <span className="se-badge se-badge-killed">
                      <span className="dot" />
                      KILLSWITCH
                    </span>
                  ) : null}
                </div>
              </div>
              <div
                className="font-mono text-[11px] text-[var(--se-fg-2)]"
                style={{ fontVariantNumeric: "tabular-nums" }}
              >
                {gate.rolloutPct}%
              </div>
              <div className="font-mono text-[11px] text-[var(--se-fg-2)]">
                {ruleCount} rule{ruleCount === 1 ? "" : "s"}
              </div>
              <div className="flex justify-end">
                {isEnabled ? (
                  <span className="se-badge se-badge-live">
                    <span className="dot" />
                    ENABLED
                  </span>
                ) : (
                  <span className="se-badge">
                    <span className="dot" />
                    DISABLED
                  </span>
                )}
              </div>
              <form action={enableGateAction} className="flex justify-end">
                <input type="hidden" name="id" value={gate.id} />
                <input type="hidden" name="enabled" value={isEnabled ? "false" : "true"} />
                <button
                  type="submit"
                  aria-label={isEnabled ? "Disable gate" : "Enable gate"}
                  className={`se-toggle ${isEnabled ? "on" : ""}`}
                />
              </form>
              <form action={deleteGateAction} className="flex justify-end">
                <input type="hidden" name="id" value={gate.id} />
                <Button
                  type="submit"
                  size="sm"
                  variant="ghost"
                  className="size-7 p-0 text-[var(--se-fg-3)] hover:bg-[var(--se-danger-soft)] hover:text-[var(--se-danger)]"
                  aria-label="Delete gate"
                >
                  <MoreHorizontal className="size-3" />
                </Button>
              </form>
            </div>
          );
        })}
      </div>
    </div>
  );
}
