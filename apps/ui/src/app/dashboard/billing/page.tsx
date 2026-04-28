import { auth } from "@/auth";
import { getProject } from "@/lib/handlers/projects";
import { getEffectivePlan } from "@shipeasy/core";
import { PageHeader } from "@/components/dashboard/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { startCheckoutAction, openPortalAction } from "./actions";
import { differenceInDays, parseISO } from "date-fns";

function fmtLimit(n: number) {
  return n === -1 ? "∞" : String(n);
}

function TrialBadge({ trialEndsAt }: { trialEndsAt: string }) {
  const daysLeft = differenceInDays(parseISO(trialEndsAt), new Date());
  if (daysLeft < 0) return <Badge variant="destructive">Trial ended</Badge>;
  return (
    <Badge variant="secondary">
      {daysLeft === 0 ? "Trial ends today" : `${daysLeft}d left in trial`}
    </Badge>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === "active") return <Badge className="bg-green-500/15 text-green-700">Active</Badge>;
  if (status === "trialing") return <Badge variant="secondary">Trial</Badge>;
  if (status === "past_due") return <Badge variant="destructive">Payment overdue</Badge>;
  if (status === "canceled") return <Badge variant="outline">Canceled</Badge>;
  if (status === "incomplete") return <Badge variant="destructive">Incomplete</Badge>;
  // "none" or any unrecognised value (e.g. stale DB default) → Free
  return <Badge variant="outline">Free</Badge>;
}

export default async function BillingPage() {
  const session = await auth();
  const projectId = session?.user?.project_id;

  type Project = Awaited<ReturnType<typeof getProject>>;
  let project: Project | null = null;

  if (projectId) {
    try {
      project = await getProject(
        { projectId, actorEmail: session?.user?.email ?? "unknown", source: "jwt" },
        projectId,
      );
    } catch {
      // DB unavailable in dev without wrangler
    }
  }

  const effectivePlan = project ? getEffectivePlan(project) : null;
  const subscriptionStatus = project?.subscriptionStatus ?? "none";
  const hasSubscription = !!project?.stripeSubscriptionId;
  const isFreePlan = effectivePlan?.name === "free";
  const isPaid = !isFreePlan;

  return (
    <div className="space-y-6">
      <PageHeader title="Billing" description="Manage your subscription and usage." />

      {/* Status card */}
      <Card>
        <CardHeader className="border-b pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Subscription</CardTitle>
              <CardDescription>Current plan and billing status.</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {project?.trialEndsAt && subscriptionStatus === "trialing" && (
                <TrialBadge trialEndsAt={project.trialEndsAt} />
              )}
              <StatusBadge status={subscriptionStatus} />
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-4 space-y-4">
          <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
            <Stat label="Plan" value={effectivePlan?.display_name ?? "—"} />
            <Stat label="Gates" value={fmtLimit(effectivePlan?.max_flags ?? 0)} />
            <Stat label="Configs" value={fmtLimit(effectivePlan?.max_configs ?? 0)} />
            <Stat label="Running experiments" value={fmtLimit(effectivePlan?.max_experiments_running ?? 0)} />
          </div>

          {project?.currentPeriodEnd && isPaid && (
            <p className="text-xs text-muted-foreground">
              {project.cancelAtPeriodEnd
                ? `Cancels on ${new Date(project.currentPeriodEnd).toLocaleDateString()}`
                : `Renews on ${new Date(project.currentPeriodEnd).toLocaleDateString()}`}
            </p>
          )}

          <div className="flex gap-2">
            {hasSubscription ? (
              <form action={openPortalAction}>
                <Button type="submit" variant="outline" size="sm">
                  Manage billing
                </Button>
              </form>
            ) : (
              <>
                <form action={startCheckoutAction}>
                  <input type="hidden" name="interval" value="monthly" />
                  <Button type="submit" size="sm">
                    Upgrade — monthly
                  </Button>
                </form>
                <form action={startCheckoutAction}>
                  <input type="hidden" name="interval" value="annual" />
                  <Button type="submit" variant="outline" size="sm">
                    Upgrade — annual (−20%)
                  </Button>
                </form>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Limits card */}
      {effectivePlan && (
        <Card>
          <CardHeader className="border-b pb-4">
            <CardTitle>Plan limits</CardTitle>
            <CardDescription>Hard limits for the {effectivePlan.display_name} plan.</CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
              <Stat label="Gates" value={fmtLimit(effectivePlan.max_flags)} />
              <Stat label="Configs" value={fmtLimit(effectivePlan.max_configs)} />
              <Stat label="Running experiments" value={fmtLimit(effectivePlan.max_experiments_running)} />
              <Stat label="Gatekeepers" value={fmtLimit(effectivePlan.max_universes)} />
              <Stat label="i18n keys" value={fmtLimit(effectivePlan.max_i18n_keys)} />
              <Stat label="i18n profiles" value={fmtLimit(effectivePlan.max_i18n_profiles)} />
              <Stat label="SDK keys" value={fmtLimit(effectivePlan.max_sdk_keys)} />
              <Stat label="Team members" value={fmtLimit(effectivePlan.max_team_members)} />
              <Stat label="Poll interval" value={`${effectivePlan.poll_interval_seconds}s`} />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Paid-only features */}
      {isFreePlan && (
        <Card>
          <CardHeader className="border-b pb-4">
            <CardTitle>Unlock with a paid plan</CardTitle>
            <CardDescription>Features available after upgrading.</CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <ul className="space-y-1.5 text-sm text-muted-foreground list-disc list-inside">
              <li>Unlimited gates, configs, and running experiments</li>
              <li>CUPED variance reduction</li>
              <li>Sequential testing</li>
              <li>Data export</li>
              <li>Holdout groups</li>
              <li>Custom significance threshold</li>
              <li>90-day analytics retention (vs 30 days)</li>
              <li>Up to 20 team members</li>
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border px-3 py-2">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="font-medium">{value}</div>
    </div>
  );
}
