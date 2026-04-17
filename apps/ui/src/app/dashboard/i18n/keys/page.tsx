import { redirect } from "next/navigation";
import { FileText, Trash2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

import { auth } from "@/auth";
import { listKeys, listProfiles } from "@/lib/handlers/i18n";
import { EmptyState } from "@/components/dashboard/empty-state";
import { PageHeader } from "@/components/dashboard/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { deleteKeyAction } from "./actions";
import { ProfileFilter } from "./_components/profile-filter";

type Props = { searchParams: Promise<{ profile?: string }> };

export default async function I18nKeysPage({ searchParams }: Props) {
  const session = await auth();
  if (!session?.user?.project_id) redirect("/auth/signin");
  const identity = {
    projectId: session.user.project_id,
    actorEmail: session.user.email ?? "unknown",
    source: "jwt" as const,
  };

  const { profile: profileFilter } = await searchParams;

  const [profiles, keys] = await Promise.all([
    listProfiles(identity).catch(() => []),
    listKeys(identity, profileFilter).catch(() => []),
  ]);

  const currentUrl = profileFilter
    ? `/dashboard/i18n/keys?profile=${profileFilter}`
    : "/dashboard/i18n/keys";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Label keys"
        description="Declared label keys discovered from your code. Push keys via the CLI or MCP scan tool."
      />

      <div className="flex items-center gap-3">
        <label htmlFor="profile-filter" className="text-sm text-muted-foreground shrink-0">
          Profile
        </label>
        <ProfileFilter profiles={profiles} value={profileFilter} />
        <span className="ml-auto text-xs text-muted-foreground">
          {keys.length} {keys.length === 1 ? "key" : "keys"}
        </span>
      </div>

      {keys.length === 0 ? (
        <EmptyState
          icon={FileText}
          title={profileFilter ? "No keys for this profile" : "No keys yet"}
          description="Run `shipeasy i18n push` or invoke the MCP scan tool to auto-discover keys from your codebase."
        />
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Key</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Value</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Chunk</th>
                {!profileFilter && (
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Profile</th>
                )}
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Updated</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {keys.map((k) => (
                <tr key={k.id} className="border-b last:border-0 hover:bg-muted/30">
                  <td className="px-4 py-3">
                    <span className="font-mono text-xs">{k.key}</span>
                  </td>
                  <td className="max-w-xs px-4 py-3 text-muted-foreground">
                    <span className="line-clamp-2 break-all">{k.value}</span>
                  </td>
                  <td className="px-4 py-3">
                    {k.chunkName && (
                      <Badge variant="outline" className="font-mono text-xs">
                        {k.chunkName}
                      </Badge>
                    )}
                  </td>
                  {!profileFilter && (
                    <td className="px-4 py-3 text-muted-foreground">
                      {k.profileName && <span className="font-mono text-xs">{k.profileName}</span>}
                    </td>
                  )}
                  <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                    {formatDistanceToNow(new Date(k.updatedAt), { addSuffix: true })}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <form action={deleteKeyAction}>
                      <input type="hidden" name="id" value={k.id} />
                      <input type="hidden" name="back" value={currentUrl} />
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        type="submit"
                        aria-label={`Delete key ${k.key}`}
                      >
                        <Trash2 className="size-4 text-destructive" />
                      </Button>
                    </form>
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
