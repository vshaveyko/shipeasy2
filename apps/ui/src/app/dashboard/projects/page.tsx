import { ArrowRight, Plus, Search } from "lucide-react";
import { auth } from "@/auth";
import { getProject } from "@/lib/handlers/projects";
import { listGates } from "@/lib/handlers/gates";
import { listExperiments } from "@/lib/handlers/experiments";
import { HeroEmptyState } from "@/components/dashboard/hero-empty-state";
import { PageHeader } from "@/components/dashboard/page-header";
import { Button } from "@/components/ui/button";
import { LinkButton } from "@/components/ui/link-button";

const COLORS = ["#22a06b", "#3b82f6", "#a78bfa", "#f5a623", "#ec4899", "#06b6d4"];

function colorForKey(key: string): string {
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  return COLORS[h % COLORS.length]!;
}

function initialsForName(name: string): string {
  const cleaned = name.replace(/[^a-zA-Z0-9 _-]/g, "");
  const parts = cleaned.split(/[\s_-]+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0]![0]! + parts[1]![0]!).toUpperCase();
  return (parts[0] ?? "P").slice(0, 2).toUpperCase();
}

export default async function ProjectsPage() {
  const session = await auth();
  const projectId = session?.user?.project_id;
  const actorEmail = session?.user?.email ?? "unknown";

  type ProjectRow = {
    id: string;
    name: string;
    plan: string;
    updatedAt: string;
    color: string;
    mark: string;
    gateCount: number;
    expRunning: number;
    isCurrent: boolean;
  };

  const items: ProjectRow[] = [];
  if (projectId) {
    try {
      const identity = { projectId, actorEmail, source: "jwt" as const };
      const [proj, gates, experiments] = await Promise.all([
        getProject(identity, projectId),
        listGates(identity).catch(() => []),
        listExperiments(identity).catch(() => []),
      ]);
      items.push({
        id: proj.id,
        name: proj.name,
        plan: proj.plan,
        updatedAt: proj.updatedAt,
        color: colorForKey(proj.id),
        mark: initialsForName(proj.name),
        gateCount: gates.length,
        expRunning: experiments.filter((e) => e.status === "running").length,
        isCurrent: true,
      });
    } catch {
      // DB unavailable in dev — fall through to empty state
    }
  }

  if (items.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Projects"
          description="One project per app, surface, or service. Experiments, gates, configs, and SDK keys live inside a project."
          actions={
            <Button size="sm" disabled title="Multi-project workspaces coming soon">
              <Plus className="size-3" /> New project
            </Button>
          }
        />
        <HeroEmptyState
          kind="gates"
          ctaHref="/dashboard/gates/new"
          ctaLabel="Set up your first project"
        />
      </div>
    );
  }

  const totalRunning = items.reduce((s, p) => s + p.expRunning, 0);
  const totalGates = items.reduce((s, p) => s + p.gateCount, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        kicker={`${items.length} project${items.length === 1 ? "" : "s"} · ${totalRunning} running experiment${totalRunning === 1 ? "" : "s"} · ${totalGates} gate${totalGates === 1 ? "" : "s"}`}
        title="Projects"
        description="One project per app, surface, or service. Experiments, gates, configs, and SDK keys live inside a project — switch in the sidebar to scope your view."
        actions={
          <Button size="sm" disabled title="Multi-project workspaces coming soon">
            <Plus className="size-3" /> New project
          </Button>
        }
      />

      <div className="flex items-center gap-2">
        <div className="flex h-8 w-[240px] items-center gap-2 rounded-[var(--radius-md)] border border-[var(--se-line-2)] bg-[var(--se-bg-2)] px-2.5 text-[13px]">
          <Search className="size-3 text-[var(--se-fg-3)]" />
          <input
            placeholder="Find a project"
            className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-[var(--se-fg-4)]"
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {items.map((p) => (
          <article
            key={p.id}
            className="relative flex flex-col gap-3.5 overflow-hidden rounded-[var(--radius-lg)] border border-[var(--se-line)] bg-[var(--se-bg-1)] p-5 transition-colors hover:border-[var(--se-line-3)]"
          >
            <span
              aria-hidden
              className="absolute inset-y-0 left-0 w-[3px] opacity-70"
              style={{ background: p.color }}
            />
            <header className="flex items-center gap-2.5">
              <div
                className="grid size-8 place-items-center rounded-[8px] border border-[var(--se-line-2)] bg-[var(--se-bg-2)] font-mono text-[13px] font-semibold"
                style={{ color: p.color }}
              >
                {p.mark}
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="m-0 truncate text-[15px] font-medium tracking-[-0.01em]">
                  {p.name}
                </h3>
                <div className="mt-0.5 t-mono-xs dim-2">
                  {p.plan} · updated {timeAgo(p.updatedAt)}
                </div>
              </div>
              {p.isCurrent ? (
                <span className="se-badge se-badge-live">
                  <span className="dot" />
                  CURRENT
                </span>
              ) : null}
            </header>

            <div className="grid grid-cols-3 gap-2.5 border-t border-[var(--se-line)] pt-3.5">
              <Stat v={String(p.expRunning)} k="Active exps" accent />
              <Stat v={String(p.gateCount)} k="Gates" />
              <Stat v={p.plan.toUpperCase()} k="Plan" />
            </div>

            <footer className="flex items-center gap-2 text-[12px] text-[var(--se-fg-3)]">
              <span className="t-mono-xs dim-2">id · {p.id.slice(0, 10)}…</span>
              <LinkButton size="sm" variant="ghost" href="/dashboard" className="ml-auto">
                Open <ArrowRight className="size-3" />
              </LinkButton>
            </footer>
          </article>
        ))}

        <button
          type="button"
          disabled
          className="grid min-h-[220px] cursor-not-allowed place-items-center rounded-[var(--radius-lg)] border border-dashed border-[var(--se-line-2)] bg-[var(--se-bg-2)] text-center text-[var(--se-fg-3)] opacity-60"
          title="Multi-project workspaces coming soon"
        >
          <div className="flex flex-col items-center gap-1.5">
            <div className="grid size-10 place-items-center rounded-[10px] border border-[var(--se-line-2)] bg-[var(--se-bg-1)]">
              <Plus className="size-4" />
            </div>
            <div className="text-[14px] font-medium text-foreground">New project</div>
            <div className="text-[12px]">Multi-project workspaces coming soon</div>
          </div>
        </button>
      </div>
    </div>
  );
}

function Stat({ v, k, accent }: { v: string; k: string; accent?: boolean }) {
  return (
    <div>
      <div
        className="font-mono text-[14px] font-semibold tabular-nums"
        style={{ color: accent ? "var(--se-accent)" : undefined }}
      >
        {v}
      </div>
      <div className="t-caps dim-3 mt-0.5 text-[10px]">{k}</div>
    </div>
  );
}

function timeAgo(iso: string): string {
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return "—";
  const sec = Math.max(1, Math.round((Date.now() - t) / 1000));
  if (sec < 60) return `${sec}s ago`;
  if (sec < 3600) return `${Math.round(sec / 60)}m ago`;
  if (sec < 86400) return `${Math.round(sec / 3600)}h ago`;
  return `${Math.round(sec / 86400)}d ago`;
}
