import { redirect } from "next/navigation";
import { unstable_noStore as noStore } from "next/cache";
import { Languages } from "lucide-react";

import { auth } from "@/auth";
import { listProfiles, listKeys, listDrafts, listDraftKeys } from "@/lib/handlers/i18n";
import { EmptyState } from "@/components/dashboard/empty-state";
import { PageHeader } from "@/components/dashboard/page-header";
import { LinkButton } from "@/components/ui/link-button";
import { KeysTable } from "./_components/keys-table";

export default async function I18nKeysPage() {
  noStore();
  const session = await auth();
  if (!session?.user?.project_id) redirect("/auth/signin");
  const identity = {
    projectId: session.user.project_id,
    actorEmail: session.user.email ?? "unknown",
    source: "jwt" as const,
  };

  const [profiles, allKeys, drafts] = await Promise.all([
    listProfiles(identity).catch(() => []),
    listKeys(identity).catch(() => []),
    listDrafts(identity).catch(() => []),
  ]);

  // Group published keys by profileId
  const keysByProfile: Record<string, (typeof allKeys)[number][]> = {};
  for (const key of allKeys) {
    if (!keysByProfile[key.profileId]) keysByProfile[key.profileId] = [];
    keysByProfile[key.profileId].push(key);
  }

  const openDrafts = drafts.filter((d) => d.status === "open");
  const draftKeysByDraft: Record<string, Awaited<ReturnType<typeof listDraftKeys>>> = {};
  await Promise.all(
    openDrafts.map(async (d) => {
      draftKeysByDraft[d.id] = await listDraftKeys(identity, d.id).catch(() => []);
    }),
  );

  if (profiles.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Label keys"
          description="Manage your translation keys across profiles and drafts."
          actions={
            <LinkButton size="sm" href="/dashboard/i18n/profiles/new">
              New profile
            </LinkButton>
          }
        />
        <EmptyState
          icon={Languages}
          title="No profiles yet"
          description="Create a profile (e.g. en:prod) before pushing keys. Use the CLI or MCP tool to scan your codebase."
          action={
            <LinkButton size="sm" href="/dashboard/i18n/profiles/new">
              New profile
            </LinkButton>
          }
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Label keys"
        description="Manage translation keys across profiles and drafts. Click any value to edit inline."
        actions={
          <LinkButton size="sm" href="/dashboard/i18n/drafts/new">
            New draft
          </LinkButton>
        }
      />

      <KeysTable
        profiles={profiles}
        drafts={openDrafts}
        keysByProfile={keysByProfile}
        draftKeysByDraft={draftKeysByDraft}
      />
    </div>
  );
}
