import { FlaskConical, Search, Play, Square } from "lucide-react";

import { auth } from "@/auth";
import { listExperiments } from "@/lib/handlers/experiments";
import { PageHeader } from "@/components/dashboard/page-header";
import { Button } from "@/components/ui/button";
import { LinkButton } from "@/components/ui/link-button";
import { deleteExperimentAction, setExperimentStatusAction } from "./actions";

const STATUS_BADGE: Record<string, string> = {
  running: "se-badge se-badge-live",
  draft: "se-badge",
  stopped: "se-badge se-badge-paused",
  archived: "se-badge se-badge-completed",
};

export default async function ExperimentsPage() {
  const session = await auth();
  const projectId = session?.user?.project_id;

  let experiments: Awaited<ReturnType<typeof listExperiments>> = [];
  if (projectId) {
    try {
      experiments = await listExperiments({
        projectId,
        actorEmail: session?.user?.email ?? "unknown",
        source: "jwt",
      });
    } catch {
      // DB not available in dev
    }
  }

  const running = experiments.filter((e) => e.status === "running").length;
  const drafts = experiments.filter((e) => e.status === "draft").length;
  const stopped = experiments.filter((e) => e.status === "stopped").length;

  return (
    <div className="space-y-6">
      <PageHeader
        kicker={`${experiments.length} experiment${experiments.length === 1 ? "" : "s"} · ${running} running · ${drafts} draft`}
        title="Experiments"
        description="Run A/B tests on metrics with guardrails. Results compute daily once an experiment starts."
        actions={
          <LinkButton size="sm" href="/dashboard/experiments/new">
            New experiment
          </LinkButton>
        }
      />

      <div className="grid gap-3 md:grid-cols-3">
        {[
          { k: "RUNNING", v: running, color: "var(--se-accent)" },
          { k: "DRAFT", v: drafts, color: "var(--se-fg-2)" },
          { k: "STOPPED", v: stopped, color: "var(--se-warn)" },
        ].map((s) => (
          <div
            key={s.k}
            className="rounded-[var(--radius-md)] border border-[var(--se-line)] bg-[var(--se-bg-1)] px-4 py-3"
          >
            <div className="t-caps" style={{ color: s.color }}>
              {s.k}
            </div>
            <div
              className="mt-1 text-[24px] font-medium tracking-[-0.02em]"
              style={{ fontVariantNumeric: "tabular-nums" }}
            >
              {s.v}
            </div>
          </div>
        ))}
      </div>

      <div className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--se-line)] bg-[var(--se-bg-1)]">
        <div className="flex items-center gap-3 border-b border-[var(--se-line)] px-4 py-3">
          <div className="text-[14px] font-medium">All experiments</div>
          <div className="ml-auto flex h-8 w-[220px] items-center gap-2 rounded-[var(--radius-md)] border border-[var(--se-line-2)] bg-[var(--se-bg-2)] px-2.5 text-[13px]">
            <Search className="size-3 text-[var(--se-fg-3)]" />
            <input
              placeholder="Filter experiments"
              className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-[var(--se-fg-4)]"
            />
          </div>
        </div>

        {experiments.length === 0 ? (
          <div className="px-6 py-14 text-center">
            <FlaskConical className="mx-auto mb-4 size-5 text-[var(--se-fg-3)]" />
            <div className="text-[15px] font-medium">No experiments yet</div>
            <p className="mx-auto mt-1 max-w-[40ch] text-[13px] text-[var(--se-fg-3)]">
              Create an experiment to start running A/B tests on your metrics. Ramp, stop, or ship
              via the dashboard or Claude MCP.
            </p>
            <div className="mt-5">
              <LinkButton size="sm" href="/dashboard/experiments/new">
                Create experiment
              </LinkButton>
            </div>
          </div>
        ) : (
          <>
            <div
              className="grid gap-3 border-b border-[var(--se-line)] px-5 py-2"
              style={{
                gridTemplateColumns: "28px minmax(0,1fr) 110px 110px 130px 120px",
                background: "var(--se-bg-2)",
              }}
            >
              <span />
              <span className="t-caps dim-3">Experiment</span>
              <span className="t-caps dim-3">Allocation</span>
              <span className="t-caps dim-3">Variants</span>
              <span className="t-caps dim-3">Status</span>
              <span />
            </div>
            {experiments.map((exp) => {
              const variantCount = Array.isArray(exp.groups) ? exp.groups.length : 0;
              return (
                <div
                  key={exp.id}
                  className="grid items-center gap-3 border-b border-[var(--se-line)] px-5 py-3 hover:bg-[var(--se-bg-2)] last:border-none"
                  style={{
                    gridTemplateColumns: "28px minmax(0,1fr) 110px 110px 130px 120px",
                  }}
                >
                  <div
                    className="grid size-7 place-items-center rounded-md"
                    style={{
                      background:
                        exp.status === "running" ? "var(--se-accent-soft)" : "var(--se-bg-3)",
                      color: exp.status === "running" ? "var(--se-accent)" : "var(--se-fg-3)",
                      border: "1px solid var(--se-line-2)",
                    }}
                  >
                    <FlaskConical className="size-3" />
                  </div>
                  <div className="min-w-0">
                    <a
                      href={`/dashboard/experiments/${exp.id}`}
                      className="block truncate font-mono text-[13px] font-medium hover:underline"
                    >
                      {exp.name}
                    </a>
                    <div className="t-mono-xs dim-2 mt-0.5 truncate">
                      universe · {exp.universe ?? "default"}
                    </div>
                  </div>
                  <div
                    className="font-mono text-[11px] text-[var(--se-fg-2)]"
                    style={{ fontVariantNumeric: "tabular-nums" }}
                  >
                    {exp.allocationPct}%
                  </div>
                  <div
                    className="font-mono text-[11px] text-[var(--se-fg-2)]"
                    style={{ fontVariantNumeric: "tabular-nums" }}
                  >
                    {variantCount}
                  </div>
                  <div className="flex justify-start">
                    <span className={STATUS_BADGE[exp.status] ?? "se-badge"}>
                      <span className="dot" />
                      {exp.status.toUpperCase()}
                    </span>
                  </div>
                  <div className="flex items-center justify-end gap-1">
                    {exp.status === "draft" ? (
                      <form action={setExperimentStatusAction}>
                        <input type="hidden" name="id" value={exp.id} />
                        <input type="hidden" name="status" value="running" />
                        <Button
                          size="sm"
                          variant="ghost"
                          type="submit"
                          aria-label="Start experiment"
                        >
                          <Play className="size-3" />
                        </Button>
                      </form>
                    ) : null}
                    {exp.status === "running" ? (
                      <form action={setExperimentStatusAction}>
                        <input type="hidden" name="id" value={exp.id} />
                        <input type="hidden" name="status" value="stopped" />
                        <Button
                          size="sm"
                          variant="ghost"
                          type="submit"
                          aria-label="Stop experiment"
                        >
                          <Square className="size-3" />
                        </Button>
                      </form>
                    ) : null}
                    {exp.status !== "running" ? (
                      <form action={deleteExperimentAction}>
                        <input type="hidden" name="id" value={exp.id} />
                        <Button
                          size="sm"
                          variant="ghost"
                          type="submit"
                          className="text-[var(--se-fg-3)] hover:bg-[var(--se-danger-soft)] hover:text-[var(--se-danger)]"
                        >
                          Delete
                        </Button>
                      </form>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </>
        )}
      </div>
    </div>
  );
}
