import type { ReactNode } from "react";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { loadProject } from "@/lib/project";
import { getEffectivePlan } from "@shipeasy/core";
import { SidebarNav } from "@/components/dashboard/sidebar-nav";
import { TopBar } from "@/components/dashboard/top-bar";
import { BillingBanner } from "@/components/dashboard/billing-banner";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const session = await auth();

  if (!session) {
    redirect("/auth/signin");
  }

  let planLabel: string | undefined;
  let billingStatus: { status: string; trialEndsAt: string | null } | undefined;
  let projectLabel: string | undefined;
  const projectId = session.user?.project_id;
  if (projectId) {
    try {
      const project = await loadProject(projectId);
      planLabel = getEffectivePlan(project).display_name;
      billingStatus = {
        status: project.subscriptionStatus ?? "none",
        trialEndsAt: project.trialEndsAt ?? null,
      };
      projectLabel = project.domain ?? project.name;
    } catch {
      // DB not available in dev without wrangler — omit plan badge
    }
  }

  return (
    <div className="flex h-dvh flex-col bg-background">
      <TopBar user={session.user ?? {}} planLabel={planLabel} projectName={projectLabel} />
      {billingStatus && (
        <BillingBanner status={billingStatus.status} trialEndsAt={billingStatus.trialEndsAt} />
      )}
      <div className="flex flex-1 overflow-hidden">
        <aside className="hidden w-60 shrink-0 overflow-y-auto border-r bg-sidebar text-sidebar-foreground md:block">
          <SidebarNav />
        </aside>
        <main className="flex-1 overflow-y-auto bg-[var(--se-bg)]">
          <div className="mx-auto flex min-h-full w-full max-w-[1280px] flex-col px-6 py-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
