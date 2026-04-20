import { redirect } from "next/navigation";
import { PencilLine, Trash2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

import { auth } from "@/auth";
import { listDrafts, listProfiles } from "@/lib/handlers/i18n";
import { EmptyState } from "@/components/dashboard/empty-state";
import { PageHeader } from "@/components/dashboard/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LinkButton } from "@/components/ui/link-button";
import { abandonDraftAction, deleteDraftAction } from "./actions";

const STATUS_BADGE: Record<
  string,
  { label: string; variant: "default" | "secondary" | "outline" | "destructive" }
> = {
  open: { label: "Open", variant: "default" },
  merged: { label: "Merged", variant: "secondary" },
  abandoned: { label: "Abandoned", variant: "outline" },
};

export default async function I18nDraftsPage() {
  const session = await auth();
  if (!session?.user?.project_id) redirect("/auth/signin");
  const identity = {
    projectId: session.user.project_id,
    actorEmail: session.user.email ?? "unknown",
    source: "jwt" as const,
  };

  const [drafts, profiles] = await Promise.all([
    listDrafts(identity).catch(() => []),
    listProfiles(identity).catch(() => []),
  ]);

  const profileMap: Record<string, string> = {};
  for (const p of profiles) profileMap[p.id] = p.name;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Drafts"
        description="Unpublished translation drafts. Review AI-generated translations and tweak copy before promoting to a profile."
        actions={
          <LinkButton size="sm" href="/dashboard/i18n/drafts/new">
            New draft
          </LinkButton>
        }
      />

      {drafts.filter((d) => d.status === "open").length === 0 && (
        <EmptyState
          icon={PencilLine}
          title="No drafts in flight"
          description="Drafts appear here when translators (human or AI) propose changes that haven't been published yet."
          action={
            <LinkButton size="sm" href="/dashboard/i18n/drafts/new">
              New draft
            </LinkButton>
          }
        />
      )}
      {drafts.length > 0 && (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Name</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Profile</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  Created by
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Created</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {drafts.map((draft) => {
                const badge = STATUS_BADGE[draft.status] ?? STATUS_BADGE.open;
                return (
                  <tr key={draft.id} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="px-4 py-3 font-medium">{draft.name}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      <span className="font-mono text-xs">
                        {profileMap[draft.profileId] ?? draft.profileId}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={badge.variant}>{badge.label}</Badge>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{draft.createdBy}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                      {formatDistanceToNow(new Date(draft.createdAt), { addSuffix: true })}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {draft.status === "open" && (
                          <form action={abandonDraftAction}>
                            <input type="hidden" name="id" value={draft.id} />
                            <Button variant="ghost" size="sm" type="submit">
                              Abandon
                            </Button>
                          </form>
                        )}
                        {draft.status !== "open" && (
                          <form action={deleteDraftAction}>
                            <input type="hidden" name="id" value={draft.id} />
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              type="submit"
                              aria-label={`Delete draft ${draft.name}`}
                            >
                              <Trash2 className="size-4 text-destructive" />
                            </Button>
                          </form>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
