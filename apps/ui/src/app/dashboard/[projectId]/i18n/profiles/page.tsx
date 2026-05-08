import { redirect } from "next/navigation";
import { FolderTree } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

import { auth } from "@/auth";
import { listProfiles, listKeys } from "@/lib/handlers/i18n";
import { EmptyState } from "@/components/dashboard/empty-state";
import { PageHeader } from "@/components/dashboard/page-header";
import { LinkButton } from "@/components/ui/link-button";
import { DeleteProfileButton } from "./delete-profile-button";

export default async function I18nProfilesPage() {
  const session = await auth();
  if (!session?.user?.project_id) redirect("/auth/signin");
  const identity = {
    projectId: session.user.project_id,
    actorEmail: session.user.email ?? "unknown",
    source: "jwt" as const,
  };

  const [profiles, allKeys] = await Promise.all([
    listProfiles(identity).catch(() => []),
    listKeys(identity)
      .then((p) => p.keys)
      .catch(() => []),
  ]);

  const keyCountByProfile: Record<string, number> = {};
  for (const k of allKeys) {
    keyCountByProfile[k.profileId] = (keyCountByProfile[k.profileId] ?? 0) + 1;
  }

  const totalKeys = Object.values(keyCountByProfile).reduce((a, b) => a + b, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        kicker={`${profiles.length} profile${profiles.length === 1 ? "" : "s"} · ${totalKeys} total key${totalKeys === 1 ? "" : "s"}`}
        title="Profiles"
        description="Locale + environment groupings like en:prod or fr:staging. A profile is a versioned manifest of label chunks."
        actions={
          <LinkButton size="sm" href="/dashboard/i18n/profiles/new">
            New profile
          </LinkButton>
        }
      />

      {profiles.length === 0 ? (
        <EmptyState
          icon={FolderTree}
          title="No profiles yet"
          description="Create your first profile to start publishing localized content."
          action={
            <LinkButton size="sm" href="/dashboard/i18n/profiles/new">
              New profile
            </LinkButton>
          }
        />
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Name</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Keys</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Created</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {profiles.map((profile) => (
                <tr key={profile.id} className="border-b last:border-0 hover:bg-muted/30">
                  <td className="px-4 py-3">
                    <span className="font-mono font-medium">{profile.name}</span>
                  </td>
                  <td className="px-4 py-3 tabular-nums text-muted-foreground">
                    {keyCountByProfile[profile.id] ?? 0}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {formatDistanceToNow(new Date(profile.createdAt), { addSuffix: true })}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <LinkButton
                        variant="ghost"
                        size="sm"
                        href={`/dashboard/i18n/keys?profile=${profile.id}`}
                      >
                        Browse keys
                      </LinkButton>
                      <DeleteProfileButton id={profile.id} name={profile.name} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
