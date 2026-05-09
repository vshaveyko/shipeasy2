import type { Metadata } from "next";
import Link from "next/link";
import { Bug, Lightbulb } from "lucide-react";

import { auth } from "@/auth";
import { listBugs } from "@/lib/handlers/bugs";
import { listFeatureRequests } from "@/lib/handlers/feature-requests";
import { listConnectors } from "@/lib/handlers/connectors";
import { Page, PageBody, PageHeader } from "@/components/dashboard/page";
import { cn } from "@/lib/utils";
import { ConnectorsModal, type ConnectorListItem } from "./_components/connectors-modal";

export const metadata: Metadata = { title: "Feedback" };

function timeAgo(iso: string): string {
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return "—";
  const sec = Math.max(1, Math.round((Date.now() - t) / 1000));
  if (sec < 60) return `${sec}s ago`;
  if (sec < 3600) return `${Math.round(sec / 60)}m ago`;
  if (sec < 86400) return `${Math.round(sec / 3600)}h ago`;
  return `${Math.round(sec / 86400)}d ago`;
}

const BUG_STATUS_LABEL: Record<string, string> = {
  open: "Open",
  triaged: "Triaged",
  in_progress: "In progress",
  resolved: "Resolved",
  wont_fix: "Won't fix",
};

const FR_STATUS_LABEL: Record<string, string> = {
  open: "Open",
  considering: "Considering",
  planned: "Planned",
  shipped: "Shipped",
  declined: "Declined",
};

const IMPORTANCE_LABEL: Record<string, string> = {
  nice_to_have: "Nice to have",
  important: "Important",
  critical: "Critical",
};

type Tab = "bugs" | "requests";

function TabLink({
  href,
  active,
  icon: Icon,
  label,
  count,
}: {
  href: string;
  active: boolean;
  icon: typeof Bug;
  label: string;
  count: number;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "relative -mb-px flex items-center gap-2 border-b-2 px-3 py-2 text-sm font-medium transition-colors",
        active
          ? "border-foreground text-foreground"
          : "border-transparent text-muted-foreground hover:text-foreground",
      )}
    >
      <Icon className="size-3.5" />
      {label}
      <span
        className={cn(
          "ml-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px]",
          active ? "bg-muted text-foreground" : "bg-muted/50 text-muted-foreground",
        )}
      >
        {count}
      </span>
    </Link>
  );
}

export default async function FeedbackPage(props: { searchParams: Promise<{ tab?: string }> }) {
  const sp = await props.searchParams;
  const tab: Tab = sp.tab === "requests" ? "requests" : "bugs";

  const session = await auth();
  const projectId = session?.user?.project_id;
  const identity = projectId
    ? {
        projectId,
        actorEmail: session?.user?.email ?? "unknown",
        source: "jwt" as const,
      }
    : null;

  let bugs: Awaited<ReturnType<typeof listBugs>> = [];
  let requests: Awaited<ReturnType<typeof listFeatureRequests>> = [];
  let connectors: ConnectorListItem[] = [];
  if (identity) {
    try {
      const [b, r, c] = await Promise.all([
        listBugs(identity),
        listFeatureRequests(identity),
        listConnectors(identity),
      ]);
      bugs = b;
      requests = r;
      connectors = c.map((row) => ({
        id: row.id,
        provider: row.provider,
        name: row.name,
        enabled: row.enabled,
        events: row.events,
        accountLabel: row.accountLabel,
        hasCredentials: !!row.credentialsCipher,
        config: (row.config ?? {}) as ConnectorListItem["config"],
      }));
    } catch {
      // DB not available in dev — fall through
    }
  }
  const openBugs = bugs.filter((b) => b.status === "open" || b.status === "triaged").length;

  return (
    <Page>
      <PageHeader
        title="Feedback"
        description="Bug reports and feature requests filed via the in-page Shipeasy nub."
      />
      <PageBody className="space-y-6">
        <div className="flex items-center gap-1 border-b">
          <TabLink
            href={`/dashboard/${projectId}/feedback?tab=bugs`}
            active={tab === "bugs"}
            icon={Bug}
            label="Bugs"
            count={bugs.length}
          />
          <TabLink
            href={`/dashboard/${projectId}/feedback?tab=requests`}
            active={tab === "requests"}
            icon={Lightbulb}
            label="Feature requests"
            count={requests.length}
          />
          <ConnectorsModal connectors={connectors} />
        </div>

        {tab === "bugs" ? (
          <BugsList bugs={bugs} openCount={openBugs} projectId={projectId ?? ""} />
        ) : (
          <RequestsList items={requests} projectId={projectId ?? ""} />
        )}
      </PageBody>
    </Page>
  );
}

function BugsList({
  bugs,
  openCount,
  projectId,
}: {
  bugs: Awaited<ReturnType<typeof listBugs>>;
  openCount: number;
  projectId: string;
}) {
  return (
    <div className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--se-line)] bg-[var(--se-bg-1)]">
      {bugs.length === 0 ? (
        <div className="px-6 py-14 text-center">
          <Bug className="mx-auto mb-4 size-5 text-[var(--se-fg-3)]" />
          <div className="text-[15px] font-medium">No bug reports yet</div>
          <p className="mx-auto mt-1 max-w-[44ch] text-[13px] text-[var(--se-fg-3)]">
            Open the devtools nub on any page running the SDK and click “File a bug”.
          </p>
        </div>
      ) : (
        <>
          <div
            className="grid gap-3 border-b border-[var(--se-line)] px-5 py-2 text-[var(--se-fg-3)]"
            style={{
              gridTemplateColumns: "minmax(0,1fr) 140px 160px 120px",
              background: "var(--se-bg-2)",
            }}
          >
            <span className="t-caps">Title</span>
            <span className="t-caps">Status</span>
            <span className="t-caps">Reporter</span>
            <span className="t-caps">Filed {openCount > 0 ? `· ${openCount} open` : ""}</span>
          </div>
          <ul className="divide-y divide-[var(--se-line)]">
            {bugs.map((b) => (
              <li key={b.id}>
                <Link
                  href={`/dashboard/bugs/${b.id}`}
                  className="grid items-center gap-3 px-5 py-3 hover:bg-[var(--se-bg-2)]"
                  style={{ gridTemplateColumns: "minmax(0,1fr) 140px 160px 120px" }}
                >
                  <span className="truncate text-[14px]">{b.title}</span>
                  <span className="text-[12px] uppercase tracking-wide text-[var(--se-fg-3)]">
                    {BUG_STATUS_LABEL[b.status] ?? b.status}
                  </span>
                  <span className="truncate text-[12px] text-[var(--se-fg-3)]">
                    {b.reporterEmail ?? "—"}
                  </span>
                  <span className="text-[12px] text-[var(--se-fg-3)]">{timeAgo(b.createdAt)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

function RequestsList({
  items,
  projectId,
}: {
  items: Awaited<ReturnType<typeof listFeatureRequests>>;
  projectId: string;
}) {
  return (
    <div className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--se-line)] bg-[var(--se-bg-1)]">
      {items.length === 0 ? (
        <div className="px-6 py-14 text-center">
          <Lightbulb className="mx-auto mb-4 size-5 text-[var(--se-fg-3)]" />
          <div className="text-[15px] font-medium">No feature requests yet</div>
          <p className="mx-auto mt-1 max-w-[44ch] text-[13px] text-[var(--se-fg-3)]">
            Open the devtools nub on a page running the SDK and click “Request a feature”.
          </p>
        </div>
      ) : (
        <>
          <div
            className="grid gap-3 border-b border-[var(--se-line)] px-5 py-2 text-[var(--se-fg-3)]"
            style={{
              gridTemplateColumns: "minmax(0,1fr) 130px 130px 160px 120px",
              background: "var(--se-bg-2)",
            }}
          >
            <span className="t-caps">Title</span>
            <span className="t-caps">Importance</span>
            <span className="t-caps">Status</span>
            <span className="t-caps">Reporter</span>
            <span className="t-caps">Filed</span>
          </div>
          <ul className="divide-y divide-[var(--se-line)]">
            {items.map((r) => (
              <li key={r.id}>
                <Link
                  href={`/dashboard/feature-requests/${r.id}`}
                  className="grid items-center gap-3 px-5 py-3 hover:bg-[var(--se-bg-2)]"
                  style={{ gridTemplateColumns: "minmax(0,1fr) 130px 130px 160px 120px" }}
                >
                  <span className="truncate text-[14px]">{r.title}</span>
                  <span className="text-[12px] text-[var(--se-fg-3)]">
                    {IMPORTANCE_LABEL[r.importance] ?? r.importance}
                  </span>
                  <span className="text-[12px] uppercase tracking-wide text-[var(--se-fg-3)]">
                    {FR_STATUS_LABEL[r.status] ?? r.status}
                  </span>
                  <span className="truncate text-[12px] text-[var(--se-fg-3)]">
                    {r.reporterEmail ?? "—"}
                  </span>
                  <span className="text-[12px] text-[var(--se-fg-3)]">{timeAgo(r.createdAt)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
