import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Trash2 } from "lucide-react";

import { auth } from "@/auth";
import { getBug } from "@/lib/handlers/bugs";
import { PageHeader } from "@/components/dashboard/page-header";
import { BUG_STATUSES, type BugStatus } from "@shipeasy/core/db/schema";
import { updateBugStatusAction, deleteBugAction } from "./actions";

const STATUS_LABEL: Record<BugStatus, string> = {
  open: "Open",
  triaged: "Triaged",
  in_progress: "In progress",
  resolved: "Resolved",
  wont_fix: "Won't fix",
};

function fmt(iso: string): string {
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return iso;
  return new Date(t).toLocaleString();
}

function attachmentUrl(id: string) {
  return `/api/admin/reports/attachments/${id}`;
}

export default async function BugDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  const projectId = session?.user?.project_id;
  if (!projectId) notFound();

  let bug: Awaited<ReturnType<typeof getBug>>;
  try {
    bug = await getBug(
      { projectId, actorEmail: session?.user?.email ?? "unknown", source: "jwt" },
      id,
    );
  } catch {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/dashboard/bugs"
          className="inline-flex items-center gap-1.5 text-[12px] text-[var(--se-fg-3)] hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" />
          All bugs
        </Link>
      </div>

      <PageHeader
        kicker={`Reported ${fmt(bug.createdAt)}${bug.reporterEmail ? ` · ${bug.reporterEmail}` : ""}`}
        title={bug.title}
        actions={
          <form action={deleteBugAction}>
            <input type="hidden" name="id" value={bug.id} />
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 rounded-md border border-[var(--se-line-2)] bg-[var(--se-danger-soft)] px-2.5 py-1.5 text-[12px] text-[var(--se-danger)] hover:bg-[color-mix(in_oklab,var(--se-danger)_22%,transparent)]"
            >
              <Trash2 className="size-3.5" />
              Delete
            </button>
          </form>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        <div className="space-y-4">
          <Section title="Steps to reproduce" body={bug.stepsToReproduce} />
          <Section title="Actual result" body={bug.actualResult} />
          <Section title="Expected result" body={bug.expectedResult} />

          <div className="rounded-[var(--radius-lg)] border border-[var(--se-line)] bg-[var(--se-bg-1)] p-4">
            <div className="mb-3 t-caps text-[var(--se-fg-3)]">Attachments</div>
            {bug.attachments.length === 0 ? (
              <div className="text-[12.5px] text-[var(--se-fg-4)]">None.</div>
            ) : (
              <ul className="space-y-3">
                {bug.attachments.map((a) => (
                  <li key={a.id} className="space-y-2">
                    <div className="flex items-center justify-between text-[12.5px]">
                      <span className="font-mono text-[var(--se-fg-2)]">{a.filename}</span>
                      <span className="text-[var(--se-fg-4)]">
                        {a.kind} · {(a.sizeBytes / 1024).toFixed(0)} KB
                      </span>
                    </div>
                    {a.kind === "screenshot" ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={attachmentUrl(a.id)}
                        alt={a.filename}
                        className="max-h-[480px] w-full rounded border border-[var(--se-line-2)] object-contain"
                      />
                    ) : a.kind === "recording" ? (
                      <video
                        src={attachmentUrl(a.id)}
                        controls
                        className="w-full rounded border border-[var(--se-line-2)]"
                      />
                    ) : (
                      <a
                        href={attachmentUrl(a.id)}
                        target="_blank"
                        rel="noopener"
                        className="inline-block rounded border border-[var(--se-line-2)] bg-[var(--se-bg-2)] px-3 py-1.5 text-[12px] hover:bg-[var(--se-bg-3)]"
                      >
                        Download ↗
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-[var(--radius-lg)] border border-[var(--se-line)] bg-[var(--se-bg-1)] p-4">
            <form action={updateBugStatusAction} className="space-y-2">
              <input type="hidden" name="id" value={bug.id} />
              <label className="t-caps block text-[var(--se-fg-3)]">Status</label>
              <select
                name="status"
                defaultValue={bug.status}
                className="w-full rounded border border-[var(--se-line-2)] bg-[var(--se-bg-2)] px-2 py-1.5 text-[13px]"
              >
                {BUG_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {STATUS_LABEL[s]}
                  </option>
                ))}
              </select>
              <button
                type="submit"
                className="w-full rounded border border-transparent bg-[var(--se-accent)] px-3 py-1.5 text-[12px] font-medium text-[var(--se-accent-fg)] hover:opacity-90"
              >
                Update status
              </button>
            </form>
          </div>

          <Meta label="Page URL" value={bug.pageUrl} link />
          <Meta label="User agent" value={bug.userAgent} />
          <Meta label="Viewport" value={bug.viewport} />
          <Meta label="Updated" value={fmt(bug.updatedAt)} />
        </div>
      </div>
    </div>
  );
}

function Section({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-[var(--radius-lg)] border border-[var(--se-line)] bg-[var(--se-bg-1)] p-4">
      <div className="mb-2 t-caps text-[var(--se-fg-3)]">{title}</div>
      {body.trim() ? (
        <pre className="whitespace-pre-wrap font-sans text-[13px] text-[var(--se-fg)]">{body}</pre>
      ) : (
        <div className="text-[12.5px] text-[var(--se-fg-4)]">Not provided.</div>
      )}
    </div>
  );
}

function Meta({
  label,
  value,
  link,
}: {
  label: string;
  value: string | null | undefined;
  link?: boolean;
}) {
  return (
    <div className="rounded-[var(--radius-lg)] border border-[var(--se-line)] bg-[var(--se-bg-1)] p-3">
      <div className="t-caps text-[var(--se-fg-3)]">{label}</div>
      <div className="mt-1 break-all text-[12.5px] text-[var(--se-fg-2)]">
        {value ? (
          link ? (
            <a href={value} target="_blank" rel="noopener" className="hover:underline">
              {value}
            </a>
          ) : (
            value
          )
        ) : (
          <span className="text-[var(--se-fg-4)]">—</span>
        )}
      </div>
    </div>
  );
}
