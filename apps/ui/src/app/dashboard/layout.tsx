import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";

import { auth } from "@/auth";
import { loadProject } from "@/lib/project";
import { getEffectivePlan, listProjectsByEmail, findProjectById } from "@shipeasy/core";
import { getEnvAsync } from "@/lib/env";
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
  let userProjects: { id: string; name: string; domain: string | null }[] = [];
  let activeProjectId = session.user?.project_id ?? "";

  const defaultProjectId = session.user?.project_id;
  if (defaultProjectId) {
    try {
      const env = await getEnvAsync();
      const cookieStore = await cookies();
      const cookieProjectId = cookieStore.get("active_project_id")?.value;

      // Resolve active project
      if (cookieProjectId && cookieProjectId !== defaultProjectId) {
        const cookieProj = await findProjectById(env.DB, cookieProjectId);
        const email = session.user?.email ?? "";
        if (cookieProj && cookieProj.ownerEmail === email) {
          activeProjectId = cookieProjectId;
        }
      }

      const [allProjects, activeProject] = await Promise.all([
        listProjectsByEmail(env.DB, session.user?.email ?? "").catch(() => []),
        loadProject(activeProjectId),
      ]);

      userProjects = allProjects.map((p) => ({ id: p.id, name: p.name, domain: p.domain ?? null }));
      planLabel = getEffectivePlan(activeProject).display_name;
      billingStatus = {
        status: activeProject.subscriptionStatus ?? "none",
        trialEndsAt: activeProject.trialEndsAt ?? null,
      };
      projectLabel = activeProject.domain ?? activeProject.name;
    } catch {
      // DB not available in dev without wrangler — omit plan badge
    }
  }

  return (
    <div className="flex h-dvh bg-background">
      {/* Sidebar — left column, full height */}
      <aside className="hidden w-60 shrink-0 border-r bg-sidebar text-sidebar-foreground md:flex md:flex-col">
        <SidebarNav
          projectName={projectLabel}
          planLabel={planLabel}
          projects={userProjects}
          activeProjectId={activeProjectId}
        />
      </aside>

      {/* Right column: topbar + billing banner + page content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <TopBar user={session.user ?? {}} planLabel={planLabel} projectName={projectLabel} />
        {billingStatus && (
          <BillingBanner status={billingStatus.status} trialEndsAt={billingStatus.trialEndsAt} />
        )}
        <main className="flex-1 overflow-y-auto bg-[var(--se-bg)]">
          <div className="mx-auto flex min-h-full w-full max-w-[1280px] flex-col px-6 py-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
