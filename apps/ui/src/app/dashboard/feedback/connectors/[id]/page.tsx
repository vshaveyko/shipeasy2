import Link from "next/link";

import { auth } from "@/auth";
import { getConnector } from "@/lib/handlers/connectors";
import { PageHeader } from "@/components/dashboard/page-header";
import { SheetPicker } from "./picker";

export default async function ConnectorDetailPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const session = await auth();
  const projectId = session?.user?.project_id;
  if (!projectId) {
    return <div className="p-6 text-sm text-muted-foreground">Sign in to manage connectors.</div>;
  }
  const connector = await getConnector(
    {
      projectId,
      actorEmail: session?.user?.email ?? "unknown",
      source: "jwt",
    },
    id,
  );
  const cfg = connector.config as {
    spreadsheetId?: string;
    spreadsheetName?: string;
    sheetTitle?: string;
  };
  const needsAuth = !connector.credentialsCipher;

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <PageHeader
        title={connector.name}
        description={
          connector.provider === "google_sheets"
            ? `Google Sheets${connector.accountLabel ? ` · ${connector.accountLabel}` : ""}`
            : connector.provider
        }
      />

      <Link
        href="/dashboard/feedback/connectors"
        className="text-sm text-muted-foreground hover:text-foreground"
      >
        ← Back to connectors
      </Link>

      {needsAuth ? (
        <div className="rounded-md border border-[var(--se-line)] bg-[var(--se-bg-1)] p-4 text-[13px]">
          <p className="mb-3">
            This connector hasn&apos;t completed OAuth yet. Authorize Google to pick a spreadsheet.
          </p>
          <a
            href={`/api/connectors/oauth/google/start?connectorId=${connector.id}`}
            className="inline-flex items-center rounded-md bg-foreground px-3 py-1.5 text-[13px] font-medium text-background hover:opacity-90"
          >
            Authorize Google
          </a>
        </div>
      ) : (
        <SheetPicker
          connectorId={connector.id}
          initialEnabled={connector.enabled}
          initialEvents={connector.events}
          initialSpreadsheetId={cfg.spreadsheetId ?? ""}
          initialSpreadsheetName={cfg.spreadsheetName ?? ""}
          initialSheetTitle={cfg.sheetTitle ?? ""}
        />
      )}
    </div>
  );
}
