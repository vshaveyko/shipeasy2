import { Search, Shield, MoreHorizontal } from "lucide-react";

import { auth } from "@/auth";
import { listGates } from "@/lib/handlers/gates";
import { HeroEmptyState } from "@/components/dashboard/hero-empty-state";
import { PageHeader } from "@/components/dashboard/page-header";
import { Button } from "@/components/ui/button";
import { LinkButton } from "@/components/ui/link-button";
import { deleteGateAction, enableGateAction } from "./actions";

export default async function GatesPage() {
  const session = await auth();
  const projectId = session?.user?.project_id;

  let gates: Awaited<ReturnType<typeof listGates>> = [];
  if (projectId) {
    try {
      gates = await listGates({
        projectId,
        actorEmail: session?.user?.email ?? "unknown",
        source: "jwt",
      });
    } catch {
      // DB not available in dev without wrangler — show empty card
    }
  }

  const total = gates.length;
  const enabled = gates.filter((g) => g.enabled).length;
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

        {gates.length === 0 ? (
          <div className="px-6 py-14 text-center">
            <Shield className="mx-auto mb-4 size-5 text-[var(--se-fg-3)]" />
            <div className="text-[15px] font-medium">No gates yet</div>
            <p className="mx-auto mt-1 max-w-[40ch] text-[13px] text-[var(--se-fg-3)]">
              Create your first gate to start rolling features out to targeted users, percentages,
              or rules.
            </p>
            <div className="mt-5">
              <LinkButton size="sm" href="/dashboard/gates/new">
                Create gate
              </LinkButton>
            </div>
          </div>
        ) : (
          <>
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
              const color = gate.killswitch
                ? "var(--se-danger)"
                : gate.enabled
                  ? "var(--se-accent)"
                  : "var(--se-fg-4)";
              return (
                <div
                  key={gate.id}
                  className="grid items-center gap-3 border-b border-[var(--se-line)] px-5 py-3 transition-colors hover:bg-[var(--se-bg-2)] last:border-none"
                  style={{
                    gridTemplateColumns: "20px minmax(0,1fr) 120px 90px 120px 60px 32px",
                  }}
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
                      {gate.killswitch ? (
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
                    {gate.enabled ? (
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
                    <input type="hidden" name="enabled" value={gate.enabled ? "false" : "true"} />
                    <button
                      type="submit"
                      aria-label={gate.enabled ? "Disable gate" : "Enable gate"}
                      className={`se-toggle ${gate.enabled ? "on" : ""}`}
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
          </>
        )}
      </div>
    </div>
  );
}
