import Link from "next/link";

import { PageHeader } from "@/components/dashboard/page-header";
import { createConnectorAction } from "../actions";

export default function NewConnectorPage() {
  return (
    <div className="mx-auto max-w-xl space-y-6">
      <PageHeader
        title="New connector"
        description="Pick a destination, choose which lifecycle events to forward, then complete OAuth."
      />

      <Link
        href="/dashboard/feedback/connectors"
        className="text-sm text-muted-foreground hover:text-foreground"
      >
        ← Back to connectors
      </Link>

      <form action={createConnectorAction} className="space-y-5">
        <fieldset className="space-y-2">
          <legend className="t-caps">Destination</legend>
          <label className="flex items-start gap-3 rounded-md border border-[var(--se-line)] bg-[var(--se-bg-1)] px-3 py-3">
            <input type="radio" name="provider" value="google_sheets" defaultChecked />
            <div>
              <div className="text-[14px] font-medium">Google Sheets</div>
              <div className="text-[12px] text-[var(--se-fg-3)]">
                Append a row to a sheet+tab of your choice for every event.
              </div>
            </div>
          </label>
        </fieldset>

        <div className="space-y-1">
          <label htmlFor="name" className="t-caps">
            Name
          </label>
          <input
            id="name"
            name="name"
            placeholder="e.g. Acme triage sheet"
            className="w-full rounded-md border border-[var(--se-line)] bg-[var(--se-bg-1)] px-3 py-2 text-[14px]"
          />
        </div>

        <fieldset className="space-y-2">
          <legend className="t-caps">Events</legend>
          <label className="flex items-center gap-2 text-[13px]">
            <input type="checkbox" name="events" value="bug.created" defaultChecked /> Bug reported
          </label>
          <label className="flex items-center gap-2 text-[13px]">
            <input type="checkbox" name="events" value="feature_request.created" defaultChecked />{" "}
            Feature request submitted
          </label>
        </fieldset>

        <button
          type="submit"
          className="rounded-md bg-foreground px-4 py-2 text-[13px] font-medium text-background hover:opacity-90"
        >
          Continue with Google
        </button>
        <p className="text-[12px] text-[var(--se-fg-3)]">
          You&apos;ll be redirected to Google to authorize Shipeasy. After consent you&apos;ll pick
          the spreadsheet + tab to write into.
        </p>
      </form>
    </div>
  );
}
