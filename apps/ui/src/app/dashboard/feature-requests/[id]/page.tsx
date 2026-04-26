import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Trash2 } from "lucide-react";

import { auth } from "@/auth";
import { getFeatureRequest } from "@/lib/handlers/feature-requests";
import { PageHeader } from "@/components/dashboard/page-header";
import {
  FEATURE_REQUEST_STATUSES,
  FEATURE_REQUEST_IMPORTANCES,
  type FeatureRequestStatus,
  type FeatureRequestImportance,
} from "@shipeasy/core/db/schema";
import { updateFeatureRequestAction, deleteFeatureRequestAction } from "./actions";

const STATUS_LABEL: Record<FeatureRequestStatus, string> = {
  open: "Open",
  considering: "Considering",
  planned: "Planned",
  shipped: "Shipped",
  declined: "Declined",
};

const IMPORTANCE_LABEL: Record<FeatureRequestImportance, string> = {
  nice_to_have: "Nice to have",
  important: "Important",
  critical: "Critical",
};

function fmt(iso: string): string {
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return iso;
  return new Date(t).toLocaleString();
}

export default async function FeatureRequestDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  const projectId = session?.user?.project_id;
  if (!projectId) notFound();

  let item: Awaited<ReturnType<typeof getFeatureRequest>>;
  try {
    item = await getFeatureRequest(
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
          href="/dashboard/feature-requests"
          className="inline-flex items-center gap-1.5 text-[12px] text-[var(--se-fg-3)] hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" />
          All requests
        </Link>
      </div>

      <PageHeader
        kicker={`Filed ${fmt(item.createdAt)}${item.reporterEmail ? ` · ${item.reporterEmail}` : ""}`}
        title={item.title}
        actions={
          <form action={deleteFeatureRequestAction}>
            <input type="hidden" name="id" value={item.id} />
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
          <Section title="Description" body={item.description} />
          <Section title="Use case" body={item.useCase} />
        </div>
        <div className="space-y-4">
          <div className="rounded-[var(--radius-lg)] border border-[var(--se-line)] bg-[var(--se-bg-1)] p-4">
            <form action={updateFeatureRequestAction} className="space-y-3">
              <input type="hidden" name="id" value={item.id} />
              <div className="space-y-1">
                <label className="t-caps block text-[var(--se-fg-3)]">Status</label>
                <select
                  name="status"
                  defaultValue={item.status}
                  className="w-full rounded border border-[var(--se-line-2)] bg-[var(--se-bg-2)] px-2 py-1.5 text-[13px]"
                >
                  {FEATURE_REQUEST_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {STATUS_LABEL[s]}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="t-caps block text-[var(--se-fg-3)]">Importance</label>
                <select
                  name="importance"
                  defaultValue={item.importance}
                  className="w-full rounded border border-[var(--se-line-2)] bg-[var(--se-bg-2)] px-2 py-1.5 text-[13px]"
                >
                  {FEATURE_REQUEST_IMPORTANCES.map((i) => (
                    <option key={i} value={i}>
                      {IMPORTANCE_LABEL[i]}
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="submit"
                className="w-full rounded border border-transparent bg-[var(--se-accent)] px-3 py-1.5 text-[12px] font-medium text-[var(--se-accent-fg)] hover:opacity-90"
              >
                Save
              </button>
            </form>
          </div>
          <Meta label="Page URL" value={item.pageUrl} link />
          <Meta label="User agent" value={item.userAgent} />
          <Meta label="Updated" value={fmt(item.updatedAt)} />
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
