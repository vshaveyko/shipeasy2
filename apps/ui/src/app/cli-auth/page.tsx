import { redirect } from "next/navigation";
import Link from "next/link";
import { Terminal } from "lucide-react";
import { auth } from "@/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Logo } from "@shipeasy/shared/Logo";
import { listProjectsByEmail } from "@shipeasy/core";
import { getEnvAsync } from "@/lib/env";
import { approveCliAuthAction } from "./actions";

interface Props {
  searchParams: Promise<{ state?: string; code_challenge?: string }>;
}

export default async function CliAuthPage({ searchParams }: Props) {
  const { state, code_challenge } = await searchParams;

  if (!state || !code_challenge) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="w-full max-w-sm space-y-6 text-center">
          <p className="text-muted-foreground text-sm">
            Invalid link. Run <code className="font-mono">shipeasy auth login</code> again.
          </p>
        </div>
      </div>
    );
  }

  const session = await auth();
  if (!session?.user) {
    const callbackUrl = `/cli-auth?state=${encodeURIComponent(state)}&code_challenge=${encodeURIComponent(code_challenge)}`;
    redirect(`/auth/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`);
  }

  const email = session.user.email ?? "";
  const sessionProjectId = session.user.project_id ?? "";

  // Owned-by-this-user projects, oldest first (matches `/dashboard/projects`).
  // Member-of-but-not-owner projects intentionally excluded for now — CLI
  // tokens are owner-scoped today; broadening to members is a separate change.
  let projects: Array<{ id: string; name: string; domain: string | null }> = [];
  try {
    const env = await getEnvAsync();
    const rows = await listProjectsByEmail(env.DB, email);
    projects = rows.map((p) => ({ id: p.id, name: p.name, domain: p.domain ?? null }));
  } catch {
    // DB unavailable in dev — fall through with empty list and show fallback.
  }

  const hasProjects = projects.length > 0;
  // Pre-select the session's active project so the picker defaults to what
  // the previous flow auto-picked. If the session project isn't in the
  // owner-list (edge case), default to the first project.
  const defaultProjectId =
    projects.find((p) => p.id === sessionProjectId)?.id ?? projects[0]?.id ?? "";

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <Link href="/" className="inline-flex items-center gap-2 font-bold text-2xl">
            <Logo className="size-8" />
            ShipEasy
          </Link>
        </div>

        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto mb-2 flex size-10 items-center justify-center rounded-full bg-muted">
              <Terminal className="size-5" />
            </div>
            <CardTitle>Authorize CLI access</CardTitle>
            <CardDescription>
              The ShipEasy CLI is requesting access as <strong>{email}</strong>. Pick the project
              this CLI session should bind to.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {hasProjects ? (
              <form action={approveCliAuthAction} className="space-y-4">
                <input type="hidden" name="state" value={state} />
                <fieldset className="space-y-2">
                  <legend className="sr-only">Select a project</legend>
                  {projects.map((p) => (
                    <label
                      key={p.id}
                      htmlFor={`cli-project-${p.id}`}
                      className="flex items-start gap-3 rounded-md border bg-background p-3 cursor-pointer hover:bg-muted/50 has-[:checked]:border-primary has-[:checked]:bg-muted/40"
                    >
                      <input
                        type="radio"
                        id={`cli-project-${p.id}`}
                        name="project_id"
                        value={p.id}
                        defaultChecked={p.id === defaultProjectId}
                        required
                        className="mt-1"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium">{p.name}</span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {p.domain ?? "no domain"}
                        </span>
                      </span>
                    </label>
                  ))}
                </fieldset>
                <Button className="w-full" type="submit">
                  Approve access
                </Button>
              </form>
            ) : (
              <p className="text-center text-sm text-muted-foreground">
                You don&apos;t own any projects yet. Create one in the{" "}
                <Link href="/dashboard" className="underline hover:text-foreground">
                  dashboard
                </Link>{" "}
                first, then re-run <code className="font-mono">shipeasy login</code>.
              </p>
            )}
            <p className="text-center text-xs text-muted-foreground">
              Not you?{" "}
              <Link href="/auth/signin" className="underline hover:text-foreground">
                Sign in with a different account
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
