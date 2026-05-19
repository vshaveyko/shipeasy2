import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { listProfiles } from "@/lib/handlers/i18n";

export const metadata: Metadata = { title: "New draft" };
import { Page, PageBody, PageHeader } from "@/components/dashboard/page";
import { LinkButton } from "@/components/ui/link-button";
import { NewDraftForm } from "./new-draft-form";

export default async function NewDraftPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const session = await auth();
  if (!session?.user?.project_id) redirect("/auth/signin");
  const identity = {
    projectId: session.user.project_id,
    actorEmail: session.user.email ?? "unknown",
    source: "jwt" as const,
  };

  const profiles = await listProfiles(identity).catch(() => []);

  return (
    <Page>
      <PageHeader
        title="New draft"
        description="A draft collects proposed translations before they are published to a profile."
        actions={
          <LinkButton variant="ghost" size="sm" href={`/dashboard/${projectId}/i18n/drafts`}>
            Cancel
          </LinkButton>
        }
      />
      <PageBody>
        <NewDraftForm profiles={profiles} />
      </PageBody>
    </Page>
  );
}
