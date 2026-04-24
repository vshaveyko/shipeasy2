import { redirect } from "next/navigation";
import { ArrowRight, FileText, FolderTree, Languages, PencilLine } from "lucide-react";

import { auth } from "@/auth";
import { getI18nStats } from "@/lib/handlers/i18n";
import { PageHeader } from "@/components/dashboard/page-header";
import { StatCard } from "@/components/dashboard/stat-card";
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
    <div className="space-y-6">
      <PageHeader
        kicker={`${stats.profiles} profile${stats.profiles === 1 ? "" : "s"} · ${stats.keys} key${stats.keys === 1 ? "" : "s"} · ${stats.openDrafts} open draft${stats.openDrafts === 1 ? "" : "s"}`}
        title="String Manager"
        description="Ship localized copy without a redeploy. Profiles group chunks of keys per locale + environment — drafts merge before hitting the CDN."
      />

      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Profiles" value={stats.profiles} hint="locale × env" />
        <StatCard label="Keys" value={stats.keys} hint="declared in code" />
        <StatCard
          label="Open drafts"
          value={stats.openDrafts}
          hint="pending publish"
          accent={stats.openDrafts > 0}
        />
        <StatCard label="Loader req / 24h" value={stats.loaderReqDaily} hint="CDN delivery" />
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        {[
          {
            icon: FolderTree,
            title: "Profiles",
            desc: "Locale + environment groupings — e.g. en:prod, fr:staging. Each profile has its own chunked manifest.",
            href: "/dashboard/i18n/profiles",
            cta: "Manage profiles",
          },
          {
            icon: FileText,
            title: "Keys",
            desc: "Declared label keys discovered from your code via the CLI scan or MCP tool. Group by namespace.",
            href: "/dashboard/i18n/keys",
            cta: "Browse keys",
          },
          {
            icon: PencilLine,
            title: "Drafts",
            desc: "In-progress translations awaiting review before publish. Draft merges atomically into the live manifest.",
            href: "/dashboard/i18n/drafts",
            cta: "Review drafts",
          },
        ].map((c) => (
          <a
            key={c.title}
            href={c.href}
            className="group flex flex-col gap-3 rounded-[var(--radius-lg)] border border-[var(--se-line)] bg-[var(--se-bg-1)] p-5 transition-colors hover:border-[var(--se-line-2)] hover:bg-[var(--se-bg-2)]"
          >
            <div className="flex items-center justify-between">
              <div
                className="grid size-9 place-items-center rounded-[8px]"
                style={{
                  background: "var(--se-accent-soft)",
                  color: "var(--se-accent)",
                  border: "1px solid color-mix(in oklab, var(--se-accent) 30%, transparent)",
                }}
              >
                <c.icon className="size-4" />
              </div>
              <ArrowRight className="size-3.5 text-[var(--se-fg-4)] transition-colors group-hover:text-[var(--se-accent)]" />
            </div>
            <div className="text-[15px] font-medium tracking-[-0.01em]">{c.title}</div>
            <div className="text-[13px] leading-[1.5] text-[var(--se-fg-2)]">{c.desc}</div>
            <div className="t-mono-xs mt-auto text-[var(--se-fg-3)]">{c.cta} →</div>
          </a>
        ))}
      </div>

      <div className="rounded-[var(--radius-lg)] border border-[var(--se-line)] bg-[var(--se-bg-1)] p-5">
        <div className="mb-4 flex items-center gap-2">
          <Languages className="size-4 text-[var(--se-accent)]" />
          <div className="text-[14px] font-medium">Get started in 3 steps</div>
        </div>
        <ol className="grid gap-3 md:grid-cols-3">
          {[
            {
              n: "01",
              t: "Create a profile",
              d: "A profile maps to a locale + environment like `en:prod`.",
              href: "/dashboard/i18n/profiles/new",
              cta: "New profile",
            },
            {
              n: "02",
              t: "Scan your codebase",
              d: "`shipeasy i18n push` or the MCP scan tool discovers your strings.",
              href: "/dashboard/i18n/keys",
              cta: "Browse keys",
            },
            {
              n: "03",
              t: "Create a draft",
              d: "Draft translations, then publish to the live loader manifest.",
              href: "/dashboard/i18n/drafts/new",
              cta: "New draft",
            },
          ].map((s) => (
            <li
              key={s.n}
              className="flex flex-col gap-2 rounded-[var(--radius-md)] border border-[var(--se-line)] bg-[var(--se-bg-2)] p-4"
            >
              <div className="t-mono-xs tracking-[0.08em] text-[var(--se-fg-4)]">STEP {s.n}</div>
              <div className="text-[14px] font-medium">{s.t}</div>
              <p
                className="flex-1 text-[12.5px] leading-[1.5] text-[var(--se-fg-3)]"
                dangerouslySetInnerHTML={{
                  __html: s.d.replace(
                    /`([^`]+)`/g,
                    '<code class="font-mono text-[var(--se-fg-2)]">$1</code>',
                  ),
                }}
              />
              <LinkButton size="sm" variant="ghost" href={s.href} className="-ml-2 w-fit">
                {s.cta}
              </LinkButton>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
