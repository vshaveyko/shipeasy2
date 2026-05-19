import type { Metadata } from "next";
import Link from "next/link";
import { Bug, Lightbulb } from "lucide-react";

import { auth } from "@/auth";
import { listBugs } from "@/lib/handlers/bugs";
import { listFeatureRequests } from "@/lib/handlers/feature-requests";
import { listConnectors } from "@/lib/handlers/connectors";
import { Page, PageBody, PageHeader } from "@/components/dashboard/page";
import { HeroEmptyState } from "@/components/dashboard/hero-empty-state";
import {
  BUG_STATUSES,
  BUG_PRIORITIES,
  FEATURE_REQUEST_STATUSES,
  FEATURE_REQUEST_IMPORTANCES,
} from "@shipeasy/core/db/schema";
import { cn } from "@/lib/utils";
import { ConnectorsModal, type ConnectorListItem } from "./_components/connectors-modal";
import { StatusPicker, type StatusOption } from "./_components/status-picker";
import { RowActions } from "./_components/row-actions";
import {
  updateBugFieldAction,
  deleteBugInlineAction,
  updateFeatureRequestFieldAction,
  deleteFeatureRequestInlineAction,
} from "./actions";

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

const BUG_STATUS_OPTIONS: readonly StatusOption[] = [
  { value: "open", label: "Open", tone: "blue" },
  { value: "triaged", label: "Triaged", tone: "amber" },
  { value: "in_progress", label: "In progress", tone: "violet" },
  { value: "ready_for_qa", label: "Ready for QA", tone: "cyan" },
  { value: "resolved", label: "Resolved", tone: "green" },
  { value: "wont_fix", label: "Won't fix", tone: "neutral" },
] as const;
// Schema-coverage assertion: keep options list in sync with BUG_STATUSES
void (BUG_STATUSES satisfies ReadonlyArray<(typeof BUG_STATUS_OPTIONS)[number]["value"]>);

const BUG_PRIORITY_OPTIONS: readonly StatusOption[] = [
  { value: "", label: "No priority", tone: "neutral" },
  { value: "low", label: "Low", tone: "neutral" },
  { value: "medium", label: "Medium", tone: "amber" },
  { value: "high", label: "High", tone: "orange" },
  { value: "critical", label: "Critical", tone: "red" },
] as const;
void (BUG_PRIORITIES satisfies ReadonlyArray<
  Exclude<(typeof BUG_PRIORITY_OPTIONS)[number]["value"], "">
>);

const FR_STATUS_OPTIONS: readonly StatusOption[] = [
  { value: "open", label: "Open", tone: "blue" },
  { value: "considering", label: "Considering", tone: "amber" },
  { value: "planned", label: "Planned", tone: "violet" },
  { value: "shipped", label: "Shipped", tone: "green" },
  { value: "declined", label: "Declined", tone: "neutral" },
] as const;
void (FEATURE_REQUEST_STATUSES satisfies ReadonlyArray<
  (typeof FR_STATUS_OPTIONS)[number]["value"]
>);

const FR_IMPORTANCE_OPTIONS: readonly StatusOption[] = [
  { value: "nice_to_have", label: "Nice to have", tone: "neutral" },
  { value: "important", label: "Important", tone: "amber" },
  { value: "critical", label: "Critical", tone: "red" },
] as const;
void (FEATURE_REQUEST_IMPORTANCES satisfies ReadonlyArray<
  (typeof FR_IMPORTANCE_OPTIONS)[number]["value"]
>);

const BUGS_GRID = "minmax(0,1fr) 130px 110px 160px 90px 70px";
const REQUESTS_GRID = "minmax(0,1fr) 130px 130px 160px 90px 70px";

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

  if (bugs.length === 0 && requests.length === 0) {
    return (
      <HeroEmptyState kind="feedback" ctaHref={`/dashboard/${projectId}/feedback?install=1`} />
    );
  }

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
              gridTemplateColumns: BUGS_GRID,
              background: "var(--se-bg-2)",
            }}
          >
            <span className="t-caps">Title</span>
            <span className="t-caps">Status</span>
            <span className="t-caps">Priority</span>
            <span className="t-caps">Reporter</span>
            <span className="t-caps">Filed {openCount > 0 ? `· ${openCount} open` : ""}</span>
            <span className="t-caps text-right">Actions</span>
          </div>
          <ul className="divide-y divide-[var(--se-line)]">
            {bugs.map((b) => (
              <li
                key={b.id}
                className="grid items-center gap-3 px-5 py-2 hover:bg-[var(--se-bg-2)]"
                style={{ gridTemplateColumns: BUGS_GRID }}
              >
                <Link
                  href={`/dashboard/${projectId}/bugs/${b.id}`}
                  className="truncate text-[14px] hover:underline"
                >
                  {b.title}
                </Link>
                <StatusPicker
                  id={b.id}
                  name="status"
                  value={b.status}
                  options={BUG_STATUS_OPTIONS}
                  action={updateBugFieldAction}
                  ariaLabel={`Status for ${b.title}`}
                />
                <StatusPicker
                  id={b.id}
                  name="priority"
                  value={b.priority ?? ""}
                  options={BUG_PRIORITY_OPTIONS}
                  action={updateBugFieldAction}
                  ariaLabel={`Priority for ${b.title}`}
                />
                <span className="truncate text-[12px] text-[var(--se-fg-3)]">
                  {b.reporterEmail ?? "—"}
                </span>
                <span className="text-[12px] text-[var(--se-fg-3)]">{timeAgo(b.createdAt)}</span>
                <RowActions
                  id={b.id}
                  title={b.title}
                  editHref={`/dashboard/${projectId}/bugs/${b.id}`}
                  deleteAction={deleteBugInlineAction}
                  kind="bug"
                />
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
              gridTemplateColumns: REQUESTS_GRID,
              background: "var(--se-bg-2)",
            }}
          >
            <span className="t-caps">Title</span>
            <span className="t-caps">Status</span>
            <span className="t-caps">Importance</span>
            <span className="t-caps">Reporter</span>
            <span className="t-caps">Filed</span>
            <span className="t-caps text-right">Actions</span>
          </div>
          <ul className="divide-y divide-[var(--se-line)]">
            {items.map((r) => (
              <li
                key={r.id}
                className="grid items-center gap-3 px-5 py-2 hover:bg-[var(--se-bg-2)]"
                style={{ gridTemplateColumns: REQUESTS_GRID }}
              >
                <Link
                  href={`/dashboard/${projectId}/feature-requests/${r.id}`}
                  className="truncate text-[14px] hover:underline"
                >
                  {r.title}
                </Link>
                <StatusPicker
                  id={r.id}
                  name="status"
                  value={r.status}
                  options={FR_STATUS_OPTIONS}
                  action={updateFeatureRequestFieldAction}
                  ariaLabel={`Status for ${r.title}`}
                />
                <StatusPicker
                  id={r.id}
                  name="importance"
                  value={r.importance}
                  options={FR_IMPORTANCE_OPTIONS}
                  action={updateFeatureRequestFieldAction}
                  ariaLabel={`Importance for ${r.title}`}
                />
                <span className="truncate text-[12px] text-[var(--se-fg-3)]">
                  {r.reporterEmail ?? "—"}
                </span>
                <span className="text-[12px] text-[var(--se-fg-3)]">{timeAgo(r.createdAt)}</span>
                <RowActions
                  id={r.id}
                  title={r.title}
                  editHref={`/dashboard/${projectId}/feature-requests/${r.id}`}
                  deleteAction={deleteFeatureRequestInlineAction}
                  kind="request"
                />
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
