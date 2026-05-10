import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  Activity,
  ArrowLeft,
  Bug,
  KeyRound,
  Languages,
  Lightbulb,
  Settings2,
  ShieldCheck,
  Sparkles,
  User,
} from "lucide-react";
import { auth } from "@/auth";
import { findProjectById } from "@shipeasy/core";
import type { ProjectModuleKey } from "@shipeasy/core";
import { listAllKeys } from "@/lib/handlers/keys";
import { getEnvAsync } from "@/lib/env";
import { getIdentity } from "@/lib/server-action";
import { Page, PageBody, PageHeader } from "@/components/dashboard/page";
import { LinkButton } from "@/components/ui/link-button";
import { cn } from "@/lib/utils";
import { selectAndOpenProjectAction } from "./actions";
import { ModuleToggleCard } from "./module-toggle-card";
import { DeleteProjectButton } from "./delete-project-button";
import { projectLabel } from "@/lib/project-label";

const TABS = [
  { key: "modules", label: "Modules" },
  { key: "keys", label: "Keys" },
] as const;
type TabKey = (typeof TABS)[number]["key"];

function isTabKey(v: string | undefined): v is TabKey {
  return v === "modules" || v === "keys";
}

interface Props {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
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
    description: "Feature gates with targeting rules and percentage rollouts.",
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
  {
    key: "user",
    title: "User",
    description:
      "Devtools tab for inspecting and overriding the current SDK user — props, locale, identifiers.",
    icon: <User className="size-4" />,
  },
  {
    key: "events",
    title: "Events",
    description: "Live SDK event stream (evaluations, overrides) shown in the devtools overlay.",
    icon: <Activity className="size-4" />,
  },
];

export default async function ProjectDetailPage({ params, searchParams }: Props) {
  const { id } = await params;
  const sp = await searchParams;
  const activeTab: TabKey = isTabKey(sp.tab) ? sp.tab : "modules";

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

  const description =
    activeTab === "keys"
      ? "SDK keys granted access to this project. Secrets are only shown at creation; revoke and re-mint to rotate."
      : "Toggle which modules are exposed in this project's devtools overlay and admin tabs.";

  return (
    <Page>
      <PageHeader
        kicker={
          <LinkButton size="sm" variant="ghost" href="/dashboard/projects">
            <ArrowLeft className="size-3" /> All projects
          </LinkButton>
        }
        title={projectLabel(project.name, project.domain)}
        description={description}
        actions={
          <DeleteProjectButton id={project.id} name={project.name} domain={project.domain} />
        }
      />
      <PageBody className="space-y-6">
        <ProjectTabs projectId={id} active={activeTab} />

        {activeTab === "modules" ? (
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
                    user: project.moduleUser,
                    events: project.moduleEvents,
                  }[m.key]
                }
              />
            ))}
          </div>
        ) : (
          <KeysList keys={await listAllKeys(identity)} />
        )}
      </PageBody>
    </Page>
  );
}

function ProjectTabs({ projectId, active }: { projectId: string; active: TabKey }) {
  return (
    <div
      role="tablist"
      aria-label="Project sections"
      className="flex items-center gap-1 border-b border-[var(--se-line)]"
    >
      {TABS.map((t) => {
        const isActive = t.key === active;
        return (
          <Link
            key={t.key}
            role="tab"
            aria-selected={isActive}
            href={`/dashboard/projects/${projectId}${t.key === "modules" ? "" : `?tab=${t.key}`}`}
            className={cn(
              "relative -mb-px inline-flex h-9 cursor-pointer items-center px-3 text-[13px] font-medium transition-colors",
              isActive
                ? "border-b-2 border-foreground text-foreground"
                : "text-[var(--se-fg-3)] hover:text-foreground",
            )}
          >
            {t.label}
          </Link>
        );
      })}
    </div>
  );
}

interface KeyRow {
  id: string;
  type: string;
  created_at: string;
  revoked_at: string | null;
  expires_at: string | null;
}

function KeysList({ keys }: { keys: KeyRow[] }) {
  if (keys.length === 0) {
    return (
      <div className="rounded-[var(--radius-lg)] border border-dashed border-[var(--se-line-2)] bg-[var(--se-bg-2)] p-8 text-center text-sm text-[var(--se-fg-3)]">
        <KeyRound className="mx-auto mb-2 size-5 opacity-60" />
        No SDK keys yet. Mint one from the dashboard or via the CLI device-auth flow.
      </div>
    );
  }

  const sorted = [...keys].sort((a, b) => b.created_at.localeCompare(a.created_at));
  return (
    <div className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--se-line)]">
      <table className="w-full text-[13px]">
        <thead>
          <tr className="border-b border-[var(--se-line)] bg-[var(--se-bg-2)] text-left text-[12px] text-[var(--se-fg-3)]">
            <th className="px-4 py-2 font-medium">Type</th>
            <th className="px-4 py-2 font-medium">Key ID</th>
            <th className="px-4 py-2 font-medium">Created</th>
            <th className="px-4 py-2 font-medium">Expires</th>
            <th className="px-4 py-2 font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((k) => {
            const revoked = !!k.revoked_at;
            const expired = k.expires_at ? new Date(k.expires_at) < new Date() : false;
            const status = revoked ? "revoked" : expired ? "expired" : "active";
            return (
              <tr
                key={k.id}
                className={cn(
                  "border-b border-[var(--se-line)] last:border-b-0",
                  (revoked || expired) && "opacity-60",
                )}
              >
                <td className="px-4 py-2.5 font-mono uppercase">{k.type}</td>
                <td className="px-4 py-2.5 font-mono text-[12px]" title={k.id}>
                  {k.id.slice(0, 8)}…
                </td>
                <td className="px-4 py-2.5 text-[var(--se-fg-3)]">
                  {new Date(k.created_at).toLocaleDateString()}
                </td>
                <td className="px-4 py-2.5 text-[var(--se-fg-3)]">
                  {k.expires_at ? new Date(k.expires_at).toLocaleDateString() : "never"}
                </td>
                <td className="px-4 py-2.5">
                  <span
                    className={cn(
                      "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide",
                      status === "active" && "bg-emerald-500/10 text-emerald-600",
                      status === "revoked" && "bg-rose-500/10 text-rose-600",
                      status === "expired" && "bg-amber-500/10 text-amber-700",
                    )}
                  >
                    {status}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
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
