import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { listProfiles } from "@/lib/handlers/i18n";
import { PageHeader } from "@/components/dashboard/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LinkButton } from "@/components/ui/link-button";
import { createDraftAction } from "../actions";

export default async function NewDraftPage() {
  const session = await auth();
  if (!session?.user?.project_id) redirect("/auth/signin");
  const identity = {
    projectId: session.user.project_id,
    actorEmail: session.user.email ?? "unknown",
    source: "jwt" as const,
  };

  const profiles = await listProfiles(identity).catch(() => []);

  return (
    <div className="space-y-6">
      <PageHeader
        title="New draft"
        description="A draft collects proposed translations before they are published to a profile."
        actions={
          <LinkButton variant="ghost" size="sm" href="/dashboard/i18n/drafts">
            Cancel
          </LinkButton>
        }
      />

      <form action={createDraftAction} className="max-w-lg">
        <Card>
          <CardHeader className="border-b pb-4">
            <CardTitle>Draft details</CardTitle>
            <CardDescription>
              Give the draft a descriptive name and pick the target profile. Translators and AI
              tools will propose values for the keys in that profile.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            <div className="grid gap-1.5">
              <Label htmlFor="draft-name">Name</Label>
              <Input
                id="draft-name"
                name="name"
                placeholder="fr-translations-q2"
                required
                autoFocus
              />
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="draft-profile">Target profile</Label>
              {profiles.length === 0 ? (
                <div className="rounded-lg border border-dashed px-4 py-3 text-sm text-muted-foreground">
                  No profiles yet.{" "}
                  <LinkButton
                    variant="link"
                    size="sm"
                    className="-ml-1 h-auto p-0"
                    href="/dashboard/i18n/profiles/new"
                  >
                    Create one first.
                  </LinkButton>
                </div>
              ) : (
                <select
                  id="draft-profile"
                  name="profile_id"
                  required
                  className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  <option value="">Select a profile…</option>
                  {profiles.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <LinkButton variant="ghost" size="sm" href="/dashboard/i18n/drafts">
                Cancel
              </LinkButton>
              <Button size="sm" type="submit" disabled={profiles.length === 0}>
                Create draft
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
