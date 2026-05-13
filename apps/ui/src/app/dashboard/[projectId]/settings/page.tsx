import type { Metadata } from "next";

import { auth, signOut } from "@/auth";
import { getProject } from "@/lib/handlers/projects";
import { listMembers } from "@/lib/handlers/members";
import { getEffectivePlan } from "@shipeasy/core";

export const metadata: Metadata = { title: "Settings" };
import { Page, PageBody, PageHeader } from "@/components/dashboard/page";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ProjectSettingsForm } from "./project-settings-form";
import { TransferOwnershipForm } from "./transfer-ownership-form";

type Project = Awaited<ReturnType<typeof getProject>>;

export default async function SettingsPage() {
  const session = await auth();
  const projectId = session?.user?.project_id;
  const sessionEmail = (session?.user?.email ?? "").toLowerCase();

  let project: Project | null = null;
  let members: Awaited<ReturnType<typeof listMembers>> = [];
  if (projectId) {
    const identity = {
      projectId,
      actorEmail: session?.user?.email ?? "unknown",
      source: "jwt" as const,
    };
    try {
      [project, members] = await Promise.all([
        getProject(identity, projectId),
        listMembers(identity),
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

  return (
    <Page>
      <PageHeader title="Settings" description="Manage your project, plan, and sign-in." />
      <PageBody className="space-y-6">
        <Card>
          <CardHeader className="border-b pb-4">
            <CardTitle>Project</CardTitle>
            <CardDescription>Metadata visible to your team and SDKs.</CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <ProjectSettingsForm
              projectId={project?.id ?? projectId ?? ""}
              name={project?.name ?? ""}
              domain={project?.domain ?? ""}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="border-b pb-4">
            <CardTitle>Plan</CardTitle>
            <CardDescription>Limits and features for the current subscription.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium">{plan?.display_name ?? "—"}</div>
              <Badge variant="secondary">Current</Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              See{" "}
              <a href="/dashboard/billing" className="underline">
                Billing
              </a>{" "}
              for the full list of limits.
            </p>
            {plan && (
              <div className="grid gap-2 text-sm">
                <div className="text-xs text-muted-foreground">
                  Poll interval: {plan.poll_interval_seconds}s
                </div>
                <div className="text-xs text-muted-foreground">
                  Analytics retention: {plan.ae_retention_days} days
                </div>
                <div className="text-xs text-muted-foreground">
                  CUPED variance reduction: {plan.cuped_enabled ? "Enabled" : "Not included"}
                </div>
              </div>
            )}
            <a
              href="/dashboard/billing"
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              Manage billing →
            </a>
          </CardContent>
        </Card>

        {project && (
          <Card className="border-[var(--se-danger)]/30">
            <CardHeader className="border-b border-[var(--se-danger)]/30 pb-4">
              <CardTitle className="text-[var(--se-danger)]">Danger zone</CardTitle>
              <CardDescription>
                Irreversible actions. The new owner inherits billing and member management.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 pt-4">
              <div className="flex flex-col gap-1">
                <div className="text-sm font-medium">Transfer ownership</div>
                <p className="text-xs text-muted-foreground">
                  Hand this project to another active team member. You stay on as an admin member
                  until they remove you.
                </p>
              </div>
              <TransferOwnershipForm
                projectName={project.name}
                isOwner={isOwner}
                targets={transferTargets}
              />
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader className="border-b pb-4">
            <CardTitle>Account</CardTitle>
            <CardDescription>Signed in identity.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            <div className="flex flex-col gap-0.5 text-sm">
              <span className="font-medium">{session?.user?.name}</span>
              <span className="text-muted-foreground">{session?.user?.email}</span>
            </div>
            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/" });
              }}
            >
              <Button variant="outline" size="sm" type="submit">
                Sign out
              </Button>
            </form>
          </CardContent>
        </Card>
      </PageBody>
    </Page>
  );
}
