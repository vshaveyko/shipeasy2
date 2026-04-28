import { ArrowRight } from "lucide-react";

import { auth } from "@/auth";
import { PageHeader } from "@/components/dashboard/page-header";
import { StatCard } from "@/components/dashboard/stat-card";
import { PRODUCTS } from "@/lib/products";
import { listGates } from "@/lib/handlers/gates";
import { listConfigs } from "@/lib/handlers/configs";
import { listExperiments } from "@/lib/handlers/experiments";
import { listProfiles } from "@/lib/handlers/i18n";
import { getProject } from "@/lib/handlers/projects";
import { getEffectivePlan } from "@shipeasy/core";

export default async function OverviewPage() {
  const session = await auth();
  const firstName = session?.user?.name?.split(" ")[0];
  const projectId = session?.user?.project_id ?? "";
  const actorEmail = session?.user?.email ?? "unknown";
  const identity = { projectId, actorEmail, source: "jwt" as const };

  let gatesCount = 0;
  let configsCount = 0;
  let runningCount = 0;
  let localesCount = 0;
  let planName = "Free";

  if (projectId) {
    try {
      const [gates, configs, experiments, profiles, project] = await Promise.all([
        listGates(identity).catch(() => []),
        listConfigs(identity).catch(() => []),
        listExperiments(identity).catch(() => []),
        listProfiles(identity).catch(() => []),
        getProject(identity, projectId).catch(() => null),
      ]);
      gatesCount = gates.length;
      configsCount = configs.length;
      runningCount = experiments.filter((e) => e.status === "running").length;
      localesCount = profiles.length;
      if (project) {
        planName = getEffectivePlan(project).display_name ?? "Free";
      }
    } catch {
      // DB not available in dev without wrangler
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        kicker="Workspace overview"
        title={firstName ? `Welcome back, ${firstName}` : "Overview"}
        description="Pick a product to work in, or keep tabs on everything at a glance."
      />

      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Gates + configs" value={String(gatesCount + configsCount)} hint="across environments" />
        <StatCard label="Running experiments" value={String(runningCount)} hint="live with traffic" accent />
        <StatCard label="Published locales" value={String(localesCount)} hint="string profiles live" />
        <a href="/dashboard/billing" className="block">
          <StatCard label="Plan" value={planName} hint="upgrade for more limits" />
        </a>
      </div>

      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
        {PRODUCTS.map((p) => (
          <a
            key={p.id}
            href={p.rootHref}
            className="group flex flex-col gap-3 rounded-[var(--radius-lg)] border border-[var(--se-line)] bg-[var(--se-bg-1)] p-5 transition-colors hover:border-[var(--se-line-2)] hover:bg-[var(--se-bg-2)]"
          >
            <div className="flex items-center justify-between">
              <span
                className="grid size-9 place-items-center rounded-[8px]"
                style={{
                  background: "var(--se-accent-soft)",
                  color: "var(--se-accent)",
                  border: "1px solid color-mix(in oklab, var(--se-accent) 30%, transparent)",
                }}
              >
                <p.icon className="size-4" />
              </span>
              <ArrowRight className="size-3.5 text-[var(--se-fg-4)] transition-colors group-hover:text-[var(--se-accent)]" />
            </div>
            <div className="text-[15px] font-medium tracking-[-0.01em]">{p.name}</div>
            <div className="text-[12.5px] leading-[1.5] text-[var(--se-fg-2)]">{p.tagline}</div>
          </a>
        ))}
      </div>
    </div>
  );
}
