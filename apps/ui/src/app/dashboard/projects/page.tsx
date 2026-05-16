import type { Metadata } from "next";
import { cookies } from "next/headers";
import { auth } from "@/auth";

export const metadata: Metadata = { title: "Projects" };
import { listProjectsByEmail, findProjectById, getEffectivePlan } from "@shipeasy/core";
import { getEnvAsync } from "@/lib/env";
import { listAllGates } from "@/lib/handlers/gates";
import { listAllExperiments } from "@/lib/handlers/experiments";
import { listMembers } from "@/lib/handlers/members";
import { Page, PageBody, PageHeader } from "@/components/dashboard/page";
import { selectAndOpenProjectAction } from "./[id]/actions";
import { createProjectAction } from "./actions";
import { ProjectsGrid, ProjectsHeaderActions, type ProjectRow } from "./projects-view";

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

function avatarFromEmail(email: string): string {
  const local = email.split("@")[0] ?? email;
  return (local[0] ?? "?").toUpperCase();
}

function descriptionFor(proj: { domain: string | null; name: string }): string {
  if (proj.domain === "*") return "Any origin — SDK calls accepted from any domain.";
  if (proj.domain) return proj.domain;
  return `Workspace for ${proj.name}.`;
}

export default async function ProjectsPage() {
  const session = await auth();
  const defaultProjectId = session?.user?.project_id;
  const actorEmail = session?.user?.email ?? "unknown";

  let activeProjectId = defaultProjectId ?? "";
  const cookieStore = await cookies();
  const cookieProjectId = cookieStore.get("active_project_id")?.value;

  let items: ProjectRow[] = [];

  if (defaultProjectId) {
    try {
      const env = await getEnvAsync();
      const allProjects = await listProjectsByEmail(env.DB, actorEmail);

      if (cookieProjectId) {
        const cookieProj = await findProjectById(env.DB, cookieProjectId);
        if (cookieProj && cookieProj.ownerEmail === actorEmail) {
          activeProjectId = cookieProjectId;
        }
      }

      items = await Promise.all(
        allProjects.map(async (proj): Promise<ProjectRow> => {
          const identity = { projectId: proj.id, actorEmail, source: "jwt" as const };
          const [gates, experiments, members] = await Promise.all([
            listAllGates(identity).catch(() => []),
            listAllExperiments(identity).catch(() => []),
            listMembers(identity).catch(() => []),
          ]);
          const memberEmails = [
            proj.ownerEmail,
            ...members.filter((m) => m.email !== proj.ownerEmail).map((m) => m.email),
          ];
          return {
            id: proj.id,
            name: proj.name,
            domain: proj.domain ?? null,
            plan: proj.plan,
            planLabel: getEffectivePlan(proj).display_name,
            updatedAt: proj.updatedAt,
            color: colorForKey(proj.id),
            mark: initialsForName(proj.name),
            description: descriptionFor(proj),
            gateCount: gates.length,
            expRunning: experiments.filter((e) => e.status === "running").length,
            members: memberEmails.slice(0, 4).map(avatarFromEmail),
            memberCount: memberEmails.length,
            isActive: proj.id === activeProjectId,
          };
        }),
      );
    } catch {
      // DB unavailable in dev
    }
  }

  const totalRunning = items.reduce((s, p) => s + p.expRunning, 0);
  const totalGates = items.reduce((s, p) => s + p.gateCount, 0);

  return (
    <Page>
      <PageHeader
        kicker={
          items.length > 0
            ? `${items.length} project${items.length === 1 ? "" : "s"} · ${totalRunning} running experiment${totalRunning === 1 ? "" : "s"} · ${totalGates} gate${totalGates === 1 ? "" : "s"}`
            : undefined
        }
        title="Projects"
        description="One project per app, surface, or service. Experiments, gates, configs, and SDK keys live inside a project — switch in the sidebar to scope your view."
        actions={<ProjectsHeaderActions createProject={createProjectAction} />}
      />
      <PageBody>
        <ProjectsGrid
          items={items}
          selectAndOpenProject={selectAndOpenProjectAction}
          createProject={createProjectAction}
        />
      </PageBody>
    </Page>
  );
}
