import { redirect } from "next/navigation";
import { FileText, FolderTree, Languages, PencilLine } from "lucide-react";

import { auth } from "@/auth";
import { getI18nStats } from "@/lib/handlers/i18n";
import { PageHeader } from "@/components/dashboard/page-header";
import { StatCard } from "@/components/dashboard/stat-card";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LinkButton } from "@/components/ui/link-button";

export default async function I18nOverviewPage() {
  const session = await auth();
  if (!session?.user?.project_id) redirect("/auth/signin");
  const identity = {
    projectId: session.user.project_id,
    actorEmail: session.user.email ?? "unknown",
    source: "jwt" as const,
  };

  const stats = await getI18nStats(identity).catch(() => ({
    profiles: 0,
    keys: 0,
    openDrafts: 0,
    loaderReqDaily: 0,
  }));

  return (
    <div className="space-y-8">
      <PageHeader
        title="String Manager"
        description="Ship localized copy without a redeploy. Profiles group chunks of keys per locale + environment."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Profiles" value={stats.profiles} hint="Locales × environments" />
        <StatCard label="Keys" value={stats.keys} hint="Declared label keys" />
        <StatCard label="Open drafts" value={stats.openDrafts} hint="Pending translations" />
        <StatCard label="Loader req / 24h" value={stats.loaderReqDaily} hint="CDN delivery" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader className="border-b pb-4">
            <CardTitle className="flex items-center gap-2">
              <FolderTree className="size-4" />
              Profiles
            </CardTitle>
            <CardDescription>
              Locale + environment groupings — e.g. <code>en:prod</code>, <code>fr:staging</code>.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <LinkButton size="sm" variant="outline" href="/dashboard/i18n/profiles">
              Manage profiles
            </LinkButton>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="border-b pb-4">
            <CardTitle className="flex items-center gap-2">
              <FileText className="size-4" />
              Keys
            </CardTitle>
            <CardDescription>
              Declared label keys discovered from your code via the CLI or MCP scan.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <LinkButton size="sm" variant="outline" href="/dashboard/i18n/keys">
              Browse keys
            </LinkButton>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="border-b pb-4">
            <CardTitle className="flex items-center gap-2">
              <PencilLine className="size-4" />
              Drafts
            </CardTitle>
            <CardDescription>
              In-progress translations awaiting review before publish.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <LinkButton size="sm" variant="outline" href="/dashboard/i18n/drafts">
              Review drafts
            </LinkButton>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="border-b pb-4">
          <CardTitle className="flex items-center gap-2">
            <Languages className="size-4" />
            Get started
          </CardTitle>
          <CardDescription>
            Install the loader, scan your code for strings, and publish your first profile.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 pt-4 md:grid-cols-3">
          <div className="flex flex-col gap-2 rounded-lg border bg-background p-4">
            <div className="font-medium">1. Create a profile</div>
            <p className="flex-1 text-sm text-muted-foreground">
              A profile maps to a locale + environment, e.g. <code>en:prod</code>.
            </p>
            <LinkButton
              variant="ghost"
              size="sm"
              className="w-fit -ml-2"
              href="/dashboard/i18n/profiles/new"
            >
              New profile
            </LinkButton>
          </div>
          <div className="flex flex-col gap-2 rounded-lg border bg-background p-4">
            <div className="font-medium">2. Scan your codebase</div>
            <p className="flex-1 text-sm text-muted-foreground">
              <code>shipeasy i18n push</code> or the MCP scan tool discovers keys.
            </p>
            <LinkButton
              variant="ghost"
              size="sm"
              className="w-fit -ml-2"
              href="/dashboard/i18n/keys"
            >
              Browse keys
            </LinkButton>
          </div>
          <div className="flex flex-col gap-2 rounded-lg border bg-background p-4">
            <div className="font-medium">3. Create a draft</div>
            <p className="flex-1 text-sm text-muted-foreground">
              Draft translations, then publish to your live loader manifest.
            </p>
            <LinkButton
              variant="ghost"
              size="sm"
              className="w-fit -ml-2"
              href="/dashboard/i18n/drafts/new"
            >
              New draft
            </LinkButton>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
