import Link from "next/link";
import { Plug, Plus } from "lucide-react";

import { auth } from "@/auth";
import { listConnectors } from "@/lib/handlers/connectors";
import { PageHeader } from "@/components/dashboard/page-header";
import { deleteConnectorAction } from "./actions";

const PROVIDER_LABEL: Record<string, string> = {
  google_sheets: "Google Sheets",
};

const EVENT_LABEL: Record<string, string> = {
  "bug.created": "Bug created",
  "feature_request.created": "Feature request created",
};

export default async function ConnectorsPage(props: {
  searchParams: Promise<{ connected?: string; error?: string }>;
}) {
  const sp = await props.searchParams;
  const session = await auth();
  const projectId = session?.user?.project_id;

  let connectors: Awaited<ReturnType<typeof listConnectors>> = [];
  if (projectId) {
    try {
      connectors = await listConnectors({
        projectId,
        actorEmail: session?.user?.email ?? "unknown",
        source: "jwt",
      });
    } catch {
      // DB unavailable — fall through
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Connectors"
        description="Sync new bug reports and feature requests out to external tools. Each connector subscribes to lifecycle events; today only Google Sheets is available."
      />

      <div className="flex items-center gap-2">
        <Link
          href="/dashboard/feedback"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Back to feedback
        </Link>
        <div className="ml-auto">
          <Link
            href="/dashboard/feedback/connectors/new"
            className="inline-flex items-center gap-1.5 rounded-md bg-foreground px-3 py-1.5 text-[13px] font-medium text-background hover:opacity-90"
          >
            <Plus className="size-3.5" />
            New connector
          </Link>
        </div>
      </div>

      {sp.connected ? (
        <div className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-[13px]">
          Connected. Pick a spreadsheet and tab to start syncing.
        </div>
      ) : null}
      {sp.error ? (
        <div className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-[13px]">
          OAuth error: {sp.error}
        </div>
      ) : null}

      <div className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--se-line)] bg-[var(--se-bg-1)]">
        {connectors.length === 0 ? (
          <div className="px-6 py-14 text-center">
            <Plug className="mx-auto mb-4 size-5 text-[var(--se-fg-3)]" />
            <div className="text-[15px] font-medium">No connectors yet</div>
            <p className="mx-auto mt-1 max-w-[44ch] text-[13px] text-[var(--se-fg-3)]">
              Push every new bug report or feature request straight to a Google Sheet so the rest of
              the team can triage outside the dashboard.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-[var(--se-line)]">
            {connectors.map((c) => {
              const cfg = c.config as { spreadsheetName?: string; sheetTitle?: string };
              const status = !c.credentialsCipher
                ? "Needs OAuth"
                : !cfg.sheetTitle
                  ? "Needs sheet"
                  : c.enabled
                    ? "Active"
                    : "Disabled";
              return (
                <li key={c.id} className="flex items-center gap-3 px-5 py-3">
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/dashboard/feedback/connectors/${c.id}`}
                      className="block text-[14px] font-medium hover:underline"
                    >
                      {c.name}
                    </Link>
                    <div className="mt-0.5 text-[12px] text-[var(--se-fg-3)]">
                      {PROVIDER_LABEL[c.provider] ?? c.provider}
                      {c.accountLabel ? ` · ${c.accountLabel}` : ""}
                      {cfg.spreadsheetName ? ` · ${cfg.spreadsheetName} / ${cfg.sheetTitle}` : ""}
                    </div>
                    <div className="mt-0.5 text-[11px] text-[var(--se-fg-3)]">
                      {c.events.map((e) => EVENT_LABEL[e] ?? e).join(", ")}
                    </div>
                  </div>
                  <span className="rounded-full bg-[var(--se-bg-2)] px-2 py-0.5 text-[11px] uppercase tracking-wide text-[var(--se-fg-3)]">
                    {status}
                  </span>
                  <Link
                    href={`/dashboard/feedback/connectors/${c.id}`}
                    className="text-[12px] text-muted-foreground hover:text-foreground"
                  >
                    Configure
                  </Link>
                  <form action={deleteConnectorAction}>
                    <input type="hidden" name="id" value={c.id} />
                    <button
                      type="submit"
                      className="text-[12px] text-muted-foreground hover:text-red-500"
                    >
                      Delete
                    </button>
                  </form>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
