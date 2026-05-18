import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Gauge } from "lucide-react";

import { auth } from "@/auth";
import { Page, PageBody, PageHeader } from "@/components/dashboard/page";
import { StatCard } from "@/components/dashboard/stat-card";
import { PRODUCTS } from "@/lib/products";
import { listAllGates } from "@/lib/handlers/gates";
import { listAllConfigs } from "@/lib/handlers/configs";
import { listAllExperiments } from "@/lib/handlers/experiments";
import { listProfiles } from "@/lib/handlers/i18n";
import { getProject } from "@/lib/handlers/projects";
import { getEffectivePlan } from "@shipeasy/core";

export const metadata: Metadata = { title: "Overview" };

export default async function OverviewPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const session = await auth();
  const firstName = session?.user?.name?.split(" ")[0];
  const actorEmail = session?.user?.email ?? "unknown";
  const identity = { projectId, actorEmail, source: "jwt" as const };

  const EXTRA_PRODUCTS = [
    {
      id: "metrics",
      name: "Metrics",
      tagline: "Web vitals, errors & custom events",
      icon: Gauge,
      rootHref: `/dashboard/${projectId}/metrics`,
    },
  ];

  const scopedHref = (href: string) => {
    if (!href.startsWith("/dashboard/")) return href;
    if (href.startsWith(`/dashboard/${projectId}/`) || href === `/dashboard/${projectId}`)
      return href;
    return href.replace("/dashboard/", `/dashboard/${projectId}/`);
  };

  let gatesCount = 0;
  let configsCount = 0;
  let runningCount = 0;
  let localesCount = 0;
  let planName = "Free";
  let projectName: string | null = null;

  if (projectId) {
    try {
      const [gates, configs, experiments, profiles, project] = await Promise.all([
        listAllGates(identity).catch(() => []),
        listAllConfigs(identity).catch(() => []),
        listAllExperiments(identity).catch(() => []),
        listProfiles(identity).catch(() => []),
        getProject(identity, projectId).catch(() => null),
      ]);
      gatesCount = gates.length;
      configsCount = configs.length;
      runningCount = experiments.filter((e) => e.status === "running").length;
      localesCount = profiles.length;
      if (project) {
        planName = getEffectivePlan(project).display_name ?? "Free";
        projectName = project.name ?? null;
      }
    } catch {
      // DB not available in dev without wrangler
    }
  }

  return (
    <Page>
      <PageHeader
        kicker={projectName ? `Workspace overview · ${projectName}` : "Workspace overview"}
        title={firstName ? `Welcome back, ${firstName}` : "Overview"}
        description="Pick a product to work in, or keep tabs on everything at a glance."
      />
      <PageBody className="space-y-6">
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Gates + configs"
            value={String(gatesCount + configsCount)}
            hint="across environments"
          />
          <StatCard
            label="Running experiments"
            value={String(runningCount)}
            hint="live with traffic"
            accent
          />
          <StatCard
            label="Published locales"
            value={String(localesCount)}
            hint={`string profile${localesCount === 1 ? "" : "s"} live`}
          />
          <Link href="/dashboard/billing" className="block">
            <StatCard label="Plan" value={planName} hint="upgrade for more limits" />
          </Link>
        </div>

        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          {[...PRODUCTS, ...EXTRA_PRODUCTS].map((p) => (
            <a
              key={p.id}
              href={scopedHref(p.rootHref)}
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
      </PageBody>
    </Page>
  );
}
