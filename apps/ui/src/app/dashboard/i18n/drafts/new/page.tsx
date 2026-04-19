import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { listProfiles } from "@/lib/handlers/i18n";
import { PageHeader } from "@/components/dashboard/page-header";
import { LinkButton } from "@/components/ui/link-button";
import { NewDraftForm } from "./new-draft-form";

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

      <NewDraftForm profiles={profiles} />
    </div>
  );
}
