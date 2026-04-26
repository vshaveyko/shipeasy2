import Link from "next/link";
import { Bug } from "lucide-react";

import { auth } from "@/auth";
import { listBugs } from "@/lib/handlers/bugs";
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
  triaged: "Triaged",
  in_progress: "In progress",
  resolved: "Resolved",
  wont_fix: "Won't fix",
};

export default async function BugsPage() {
  const session = await auth();
  const projectId = session?.user?.project_id;

  let bugs: Awaited<ReturnType<typeof listBugs>> = [];
  if (projectId) {
    try {
      bugs = await listBugs({
        projectId,
        actorEmail: session?.user?.email ?? "unknown",
        source: "jwt",
      });
    } catch {
      // DB not available in dev — fall through
    }
  }

  const open = bugs.filter((b) => b.status === "open" || b.status === "triaged").length;

  return (
    <div className="space-y-6">
      <PageHeader
        kicker={
          bugs.length === 0
            ? undefined
            : `${bugs.length} report${bugs.length === 1 ? "" : "s"} · ${open} open`
        }
        title="Bug reports"
        description="Reports filed via the in-page Bugs nub. Includes screenshots, screen recordings, and uploaded files."
      />

      <div className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--se-line)] bg-[var(--se-bg-1)]">
        {bugs.length === 0 ? (
          <div className="px-6 py-14 text-center">
            <Bug className="mx-auto mb-4 size-5 text-[var(--se-fg-3)]" />
            <div className="text-[15px] font-medium">No bug reports yet</div>
            <p className="mx-auto mt-1 max-w-[44ch] text-[13px] text-[var(--se-fg-3)]">
              Open the devtools nub on any page running the SDK and click “File a bug” to file your
              first report.
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
              <span className="t-caps">Filed</span>
            </div>
            <ul className="divide-y divide-[var(--se-line)]">
              {bugs.map((b) => (
                <li key={b.id}>
                  <Link
                    href={`/dashboard/bugs/${b.id}`}
                    className="grid items-center gap-3 px-5 py-3 hover:bg-[var(--se-bg-2)]"
                    style={{
                      gridTemplateColumns: "minmax(0,1fr) 140px 160px 120px",
                    }}
                  >
                    <span className="truncate text-[14px]">{b.title}</span>
                    <span className="text-[12px] uppercase tracking-wide text-[var(--se-fg-3)]">
                      {STATUS_LABEL[b.status] ?? b.status}
                    </span>
                    <span className="truncate text-[12px] text-[var(--se-fg-3)]">
                      {b.reporterEmail ?? "—"}
                    </span>
                    <span className="text-[12px] text-[var(--se-fg-3)]">
                      {timeAgo(b.createdAt)}
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
