import type { Metadata } from "next";
import Link from "next/link";
import { AlertTriangle, BookOpen, Clock } from "lucide-react";

import { auth } from "@/auth";
import { getProject } from "@/lib/handlers/projects";
import { listMembers } from "@/lib/handlers/members";
import { listNotificationPrefs } from "@/lib/handlers/notifications";
import { listIntegrations } from "@/lib/handlers/integrations";
import { getEffectivePlan } from "@shipeasy/core";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Page, PageBody, PageHeader } from "@/components/dashboard/page";

import "./settings.css";
import { NavRail, isSettingsTab, type SettingsTabKey } from "./nav-rail";
import { GeneralForm } from "./general-form";
import { ExperimentDefaultsForm } from "./experiment-defaults-form";
import { NotificationsForm } from "./notifications-form";
import { IntegrationsList } from "./integrations-list";
import { TransferOwnershipForm } from "./transfer-ownership-form";
import { DeleteProjectForm } from "./delete-project-form";

export const metadata: Metadata = { title: "Settings" };

type Project = Awaited<ReturnType<typeof getProject>>;

type SearchParams = Promise<{ tab?: string | string[] }>;

function pickTab(raw: string | string[] | undefined): SettingsTabKey {
  const candidate = Array.isArray(raw) ? raw[0] : raw;
  return isSettingsTab(candidate) ? candidate : "general";
}

export default async function SettingsPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const tab = pickTab(params.tab);

  const session = await auth();
  const projectId = session?.user?.project_id;
  const sessionEmail = (session?.user?.email ?? "").toLowerCase();

  let project: Project | null = null;
  let members: Awaited<ReturnType<typeof listMembers>> = [];
  let notifPrefs: Awaited<ReturnType<typeof listNotificationPrefs>> = [];
  let integrations: Awaited<ReturnType<typeof listIntegrations>> = [];

  if (projectId) {
    const identity = {
      projectId,
      actorEmail: session?.user?.email ?? "unknown",
      source: "jwt" as const,
    };
    try {
      [project, members, notifPrefs, integrations] = await Promise.all([
        getProject(identity, projectId),
        listMembers(identity),
        listNotificationPrefs(identity),
        listIntegrations(identity),
      ]);
    } catch {
      // DB not available in dev without wrangler
    }
  }

  const plan = project ? getEffectivePlan(project) : null;
  const ownerEmail = (project?.ownerEmail ?? "").toLowerCase();
  const isOwner = !!ownerEmail && ownerEmail === sessionEmail;
  const transferTargets = members
    .filter((m) => m.status === "active" && m.email.toLowerCase() !== ownerEmail)
    .map((m) => ({ email: m.email, role: m.role }));

  const kicker = project
    ? `PROJECT · ${project.slug ? `${project.slug}.shipeasy.dev` : project.id}`
    : "PROJECT";

  return (
    <Page>
      <PageHeader
        kicker={kicker}
        title="Settings"
        description="Manage your project, experiment defaults, integrations, and billing."
        actions={
          <a
            href="https://docs.shipeasy.ai"
            target="_blank"
            rel="noreferrer"
            className={buttonVariants({ variant: "ghost", size: "sm" })}
          >
            <BookOpen className="size-[11px]" /> Docs
          </a>
        }
      />
      <PageBody>
        <div className="settings-grid">
          <NavRail projectId={projectId ?? ""} active={tab} />

          <div>
            {tab === "general" && project ? (
              <GeneralForm
                projectId={project.id}
                name={project.name ?? ""}
                domain={project.domain ?? ""}
                slug={project.slug ?? ""}
                defaultEnv={(project.defaultEnv ?? "staging") as "dev" | "staging" | "prod"}
                timezone={project.timezone ?? "UTC"}
              />
            ) : null}

            {tab === "experiments" && project ? (
              <ExperimentDefaultsForm
                statMethod={
                  (project.statMethod ?? "sequential") as "sequential" | "fixed" | "bayesian"
                }
                sigThreshold={project.sigThreshold ?? "0.05"}
                autoRollback={project.autoRollback ?? true}
                minSampleDays={project.minSampleDays ?? 14}
              />
            ) : null}

            {tab === "notifications" ? <NotificationsForm initial={notifPrefs} /> : null}

            {tab === "integrations" ? <IntegrationsList initial={integrations} /> : null}

            {tab === "billing" && project && plan ? (
              <BillingPanel
                project={project}
                planDisplay={plan.display_name}
                planPrice={plan.price_usd_per_month}
                evaluationsCap={plan.max_evaluate_per_day * 30}
                seatsCap={plan.max_team_members}
                seatsUsed={members.length}
              />
            ) : null}

            {tab === "danger" && project ? (
              <DangerPanel
                projectName={project.name}
                isOwner={isOwner}
                transferTargets={transferTargets}
              />
            ) : null}
          </div>
        </div>
      </PageBody>
    </Page>
  );
}

function BillingPanel({
  project,
  planDisplay,
  planPrice,
  evaluationsCap,
  seatsCap,
  seatsUsed,
}: {
  project: Project & {};
  planDisplay: string;
  planPrice: number;
  evaluationsCap: number;
  seatsCap: number;
  seatsUsed: number;
}) {
  const seatsCapDisplay = seatsCap < 0 ? "∞" : seatsCap;
  const evalsDisplay =
    evaluationsCap < 0 ? "Unlimited" : `${(evaluationsCap / 1_000_000).toFixed(1)}M`;
  // Real billing reflects Stripe state; usage values come from analytics — show
  // the cap with a 0% bar in dev so the page renders without analytics data.
  return (
    <>
      <div className="s-panel">
        <div className="panel-head">
          <div className="flex-1">
            <h2>Billing &amp; usage</h2>
            <div className="desc">Plan, payment, and current usage.</div>
          </div>
          <Link
            href="/dashboard/billing"
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            Manage plan
          </Link>
        </div>

        <div className="billing-card">
          <div className="price">
            {planPrice <= 0 ? (
              <>
                $<em>0</em>
              </>
            ) : (
              <>
                $<em>{planPrice}</em>
              </>
            )}
            <span className="ml-1.5 font-mono text-sm not-italic text-[var(--se-fg-3)]">/ mo</span>
          </div>
          <div className="meta">
            <div className="plan">
              {planDisplay} plan · billed {project.billingInterval ?? "monthly"}
            </div>
            <div className="text-sm font-medium">
              Up to {evalsDisplay} evaluations/mo &amp; {seatsCapDisplay} seats
            </div>
            <div className="usage-bar">
              <div style={{ width: "0%" }} />
            </div>
            <div className="t-mono-xs dim-2 mt-1.5">
              Live usage rolls up daily · {seatsUsed} / {seatsCapDisplay} seats used
            </div>
          </div>
          <Link
            href={`/dashboard/${project.id}/metrics`}
            className={buttonVariants({ variant: "ghost", size: "sm" })}
          >
            View usage →
          </Link>
        </div>

        <div className="billing-mini-grid">
          <div className="billing-mini-card">
            <div className="t-caps dim-2 mb-2">Subscription status</div>
            <div className="flex items-center gap-3">
              <Badge variant="secondary">
                {(() => {
                  const s = project.subscriptionStatus;
                  if (s === "active") return "Active";
                  if (s === "trialing") return "Trial";
                  if (s === "past_due") return "Payment overdue";
                  if (s === "canceled") return "Canceled";
                  if (s === "incomplete") return "Incomplete";
                  return "Free tier";
                })()}
              </Badge>
              {project.currentPeriodEnd ? (
                <div className="t-mono-xs dim-2">
                  Renews {new Date(project.currentPeriodEnd).toLocaleDateString()}
                </div>
              ) : null}
            </div>
          </div>
          <div className="billing-mini-card">
            <div className="t-caps dim-2 mb-2">Trial</div>
            <div className="flex items-center gap-3">
              <Clock className="size-3.5 text-[var(--se-fg-3)]" />
              <div className="text-[13px]">
                {project.trialEndsAt
                  ? `Ends ${new Date(project.trialEndsAt).toLocaleDateString()}`
                  : "No active trial"}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function DangerPanel({
  projectName,
  isOwner,
  transferTargets,
}: {
  projectName: string;
  isOwner: boolean;
  transferTargets: { email: string; role: "admin" | "editor" | "viewer" }[];
}) {
  return (
    <div className="s-panel danger-zone">
      <div className="panel-head">
        <AlertTriangle className="size-[14px] text-[var(--se-danger)] mt-[2px]" />
        <div>
          <h2 className="text-[var(--se-danger)]">Danger zone</h2>
          <div className="desc">Irreversible actions. Double-check before proceeding.</div>
        </div>
      </div>

      <div className="field-row">
        <div className="label">
          <div className="name">Transfer ownership</div>
          <div className="desc">
            Move this project to a different admin. They&apos;ll get full control.
          </div>
        </div>
        <div />
        <div className="control">
          <TransferOwnershipForm
            projectName={projectName}
            isOwner={isOwner}
            targets={transferTargets}
          />
        </div>
      </div>

      <div className="field-row">
        <div className="label">
          <div className="name">Delete project</div>
          <div className="desc">
            Removes all experiments, gates, configs, and audit logs after a 14-day grace period.
          </div>
        </div>
        <div />
        <div className="control">
          <DeleteProjectForm projectName={projectName} isOwner={isOwner} />
        </div>
      </div>
    </div>
  );
}
