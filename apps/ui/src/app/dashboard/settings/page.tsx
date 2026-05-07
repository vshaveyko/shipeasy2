import { auth, signOut } from "@/auth";
import { getProject } from "@/lib/handlers/projects";
import { getEffectivePlan } from "@shipeasy/core";
import { PageHeader } from "@/components/dashboard/page-header";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ProjectSettingsForm } from "./project-settings-form";

type Project = Awaited<ReturnType<typeof getProject>>;

export default async function SettingsPage() {
  const session = await auth();
  const projectId = session?.user?.project_id;

  let project: Project | null = null;
  if (projectId) {
    try {
      project = await getProject(
        { projectId, actorEmail: session?.user?.email ?? "unknown", source: "jwt" },
        projectId,
      );
    } catch {
      // DB not available in dev without wrangler
    }
  }

  const plan = project ? getEffectivePlan(project) : null;

  return (
    <div className="space-y-6">
      <PageHeader title="Settings" description="Manage your project, plan, and sign-in." />

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
            <div className="text-xs text-muted-foreground">
              {plan
                ? `${plan.max_flags === -1 ? "∞" : plan.max_flags} gates · ${plan.max_configs === -1 ? "∞" : plan.max_configs} configs · ${plan.max_experiments_running === -1 ? "∞" : plan.max_experiments_running} running experiments · ${plan.max_sdk_keys === -1 ? "∞" : plan.max_sdk_keys} keys`
                : "—"}
            </div>
            <Badge variant="secondary">Current</Badge>
          </div>
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
    </div>
  );
}
