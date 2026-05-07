import { notFound, redirect } from "next/navigation";
import {
  ArrowLeft,
  Bug,
  Languages,
  Lightbulb,
  Settings2,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { auth } from "@/auth";
import { findProjectById } from "@shipeasy/core";
import type { ProjectModuleKey } from "@shipeasy/core";
import { getEnvAsync } from "@/lib/env";
import { getIdentity } from "@/lib/server-action";
import { PageHeader } from "@/components/dashboard/page-header";
import { LinkButton } from "@/components/ui/link-button";
import { selectAndOpenProjectAction } from "./actions";
import { ModuleToggleCard } from "./module-toggle-card";

interface Props {
  params: Promise<{ id: string }>;
}

const MODULES: Array<{
  key: ProjectModuleKey;
  title: string;
  description: string;
  icon: React.ReactNode;
}> = [
  {
    key: "translations",
    title: "Translations",
    description: "i18n profiles, drafts, and label keys served from the CDN to your apps.",
    icon: <Languages className="size-4" />,
  },
  {
    key: "configs",
    title: "Configs",
    description: "Per-environment JSON config values published to your SDK clients.",
    icon: <Settings2 className="size-4" />,
  },
  {
    key: "gates",
    title: "Gatekeepers",
    description: "Feature gates with targeting rules, percentage rollouts, and killswitches.",
    icon: <ShieldCheck className="size-4" />,
  },
  {
    key: "experiments",
    title: "Experiments",
    description: "A/B tests with universes, metrics, and statistical analysis.",
    icon: <Sparkles className="size-4" />,
  },
  {
    key: "feedback",
    title: "Bugs & feature requests",
    description: "In-app bug reports and feature requests captured via the devtools overlay.",
    icon: <Bug className="size-4" />,
  },
];

export default async function ProjectDetailPage({ params }: Props) {
  const { id } = await params;
  const session = await auth();
  const email = session?.user?.email;
  if (!email) redirect("/auth/signin");

  let env;
  try {
    env = await getEnvAsync();
  } catch {
    notFound();
  }
  const project = await findProjectById(env.DB, id);
  if (!project || project.ownerEmail !== email) notFound();

  // Update handlers (and getProject) enforce identity.projectId === id, so
  // the active-project cookie must match. If the user landed here without
  // first switching (e.g. via direct URL), surface a small switcher that
  // posts to selectAndOpenProjectAction — that sets the cookie and brings
  // them right back to this page.
  const identity = await getIdentity();
  if (identity.projectId !== id) {
    return <ProjectSwitchPrompt projectName={project.name} projectId={id} />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        kicker={
          <LinkButton size="sm" variant="ghost" href="/dashboard/projects">
            <ArrowLeft className="size-3" /> All projects
          </LinkButton>
        }
        title={project.name}
        description={
          project.domain
            ? `${project.domain} · Toggle which modules are exposed in this project's devtools overlay and admin tabs.`
            : "Toggle which modules are exposed in this project's devtools overlay and admin tabs."
        }
      />

      <div className="grid gap-3 md:grid-cols-2">
        {MODULES.map((m) => (
          <ModuleToggleCard
            key={m.key}
            moduleKey={m.key}
            title={m.title}
            description={m.description}
            icon={m.icon}
            initialEnabled={
              {
                translations: project.moduleTranslations,
                configs: project.moduleConfigs,
                gates: project.moduleGates,
                experiments: project.moduleExperiments,
                feedback: project.moduleFeedback,
              }[m.key]
            }
          />
        ))}
      </div>
    </div>
  );
}

function ProjectSwitchPrompt({
  projectName,
  projectId,
}: {
  projectName: string;
  projectId: string;
}) {
  return (
    <div className="rounded-lg border bg-muted/40 p-4 text-sm">
      <p className="mb-3">
        You&apos;re viewing <strong>{projectName}</strong> but your active project is different.
        Switch to it to manage its modules.
      </p>
      <form action={selectAndOpenProjectAction}>
        <input type="hidden" name="projectId" value={projectId} />
        <button
          type="submit"
          className="inline-flex h-8 items-center gap-1.5 rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground hover:bg-primary/90"
        >
          <Lightbulb className="size-3" /> Switch to {projectName}
        </button>
      </form>
    </div>
  );
}
