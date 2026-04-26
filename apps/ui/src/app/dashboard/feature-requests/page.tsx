import Link from "next/link";
import { Lightbulb } from "lucide-react";

import { auth } from "@/auth";
import { listFeatureRequests } from "@/lib/handlers/feature-requests";
import { PageHeader } from "@/components/dashboard/page-header";

function timeAgo(iso: string): string {
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return "—";
  const sec = Math.max(1, Math.round((Date.now() - t) / 1000));
  if (sec < 60) return `${sec}s ago`;
  if (sec < 3600) return `${Math.round(sec / 60)}m ago`;
  if (sec < 86400) return `${Math.round(sec / 3600)}h ago`;
  return `${Math.round(sec / 86400)}d ago`;
}

const STATUS_LABEL: Record<string, string> = {
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

export default async function FeatureRequestsPage() {
  const session = await auth();
  const projectId = session?.user?.project_id;

  let items: Awaited<ReturnType<typeof listFeatureRequests>> = [];
  if (projectId) {
    try {
      items = await listFeatureRequests({
        projectId,
        actorEmail: session?.user?.email ?? "unknown",
        source: "jwt",
      });
    } catch {
      // DB unavailable in dev
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        kicker={
          items.length === 0 ? undefined : `${items.length} request${items.length === 1 ? "" : "s"}`
        }
        title="Feature requests"
        description="Requests filed via the in-page Feature requests nub."
      />
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
                    style={{
                      gridTemplateColumns: "minmax(0,1fr) 130px 130px 160px 120px",
                    }}
                  >
                    <span className="truncate text-[14px]">{r.title}</span>
                    <span className="text-[12px] text-[var(--se-fg-3)]">
                      {IMPORTANCE_LABEL[r.importance] ?? r.importance}
                    </span>
                    <span className="text-[12px] uppercase tracking-wide text-[var(--se-fg-3)]">
                      {STATUS_LABEL[r.status] ?? r.status}
                    </span>
                    <span className="truncate text-[12px] text-[var(--se-fg-3)]">
                      {r.reporterEmail ?? "—"}
                    </span>
                    <span className="text-[12px] text-[var(--se-fg-3)]">
                      {timeAgo(r.createdAt)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}
