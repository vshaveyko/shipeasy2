"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";

import { projectIdFromPathname } from "@/lib/project-path";
import { Plug, Plus, ChevronLeft } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

import {
  configureConnectorAction,
  createConnectorAction,
  deleteConnectorAction,
} from "../connectors/actions";

const PROVIDER_LABEL: Record<string, string> = {
  google_sheets: "Google Sheets",
};

const EVENT_LABEL: Record<string, string> = {
  "bug.created": "Bug created",
  "feature_request.created": "Feature request created",
};

export type ConnectorListItem = {
  id: string;
  provider: string;
  name: string;
  enabled: boolean;
  events: string[];
  accountLabel: string | null;
  hasCredentials: boolean;
  config: { spreadsheetId?: string; spreadsheetName?: string; sheetTitle?: string };
};

type View = { kind: "list" } | { kind: "new" } | { kind: "configure"; connectorId: string };

type Props = {
  connectors: ConnectorListItem[];
  triggerLabel?: string;
};

export function ConnectorsModal({ connectors, triggerLabel = "Connectors" }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const projectId = projectIdFromPathname(pathname) ?? "";
  const openParam = searchParams.get("connectors");
  const connectorParam = searchParams.get("connector");
  const connectedParam = searchParams.get("connected");
  const errorParam = searchParams.get("error");

  const [open, setOpen] = useState(false);
  const [view, setView] = useState<View>({ kind: "list" });
  const [banner, setBanner] = useState<{ kind: "ok" | "error"; message: string } | null>(null);

  // Auto-open after OAuth callback (?connector=<id>) or explicit ?connectors=open.
  useEffect(() => {
    if (connectorParam) {
      setOpen(true);
      setView({ kind: "configure", connectorId: connectorParam });
      if (connectedParam) {
        setBanner({
          kind: "ok",
          message: "Connected. Pick a spreadsheet and tab to start syncing.",
        });
      }
    } else if (openParam === "open") {
      setOpen(true);
      setView({ kind: "list" });
    }
    if (errorParam) {
      setOpen(true);
      setBanner({ kind: "error", message: `OAuth error: ${errorParam}` });
    }
  }, [connectorParam, connectedParam, openParam, errorParam]);

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) {
      // Clear URL params on close so the modal doesn't reopen on refresh.
      if (openParam || connectorParam || connectedParam || errorParam) {
        router.replace(`/dashboard/${projectId}/feedback`, { scroll: false });
      }
      setBanner(null);
      setView({ kind: "list" });
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="ml-auto -mb-px border-b-2 border-transparent px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        {triggerLabel}
      </button>
      <DialogContent className="max-w-xl">
        {view.kind === "list" ? (
          <ListView
            connectors={connectors}
            banner={banner}
            onClearBanner={() => setBanner(null)}
            onNew={() => {
              setBanner(null);
              setView({ kind: "new" });
            }}
            onConfigure={(id) => {
              setBanner(null);
              setView({ kind: "configure", connectorId: id });
            }}
          />
        ) : null}
        {view.kind === "new" ? <NewView onBack={() => setView({ kind: "list" })} /> : null}
        {view.kind === "configure" ? (
          <ConfigureView
            connector={connectors.find((c) => c.id === view.connectorId) ?? null}
            connectorId={view.connectorId}
            banner={banner}
            onClearBanner={() => setBanner(null)}
            onBack={() => setView({ kind: "list" })}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function Banner({
  banner,
  onDismiss,
}: {
  banner: { kind: "ok" | "error"; message: string } | null;
  onDismiss?: () => void;
}) {
  if (!banner) return null;
  return (
    <div
      role={banner.kind === "error" ? "alert" : "status"}
      className={cn(
        "rounded-md border px-3 py-2 text-[13px]",
        banner.kind === "ok"
          ? "border-emerald-500/30 bg-emerald-500/10"
          : "border-red-500/30 bg-red-500/10",
      )}
      onClick={onDismiss}
    >
      {banner.message}
    </div>
  );
}

function ListView({
  connectors,
  banner,
  onClearBanner,
  onNew,
  onConfigure,
}: {
  connectors: ConnectorListItem[];
  banner: { kind: "ok" | "error"; message: string } | null;
  onClearBanner: () => void;
  onNew: () => void;
  onConfigure: (id: string) => void;
}) {
  return (
    <div className="space-y-4">
      <DialogHeader>
        <DialogTitle>Connectors</DialogTitle>
        <DialogDescription>
          Sync new bug reports and feature requests out to external tools. Today only Google Sheets
          is available.
        </DialogDescription>
      </DialogHeader>

      <Banner banner={banner} onDismiss={onClearBanner} />

      <div className="flex justify-end">
        <button
          type="button"
          onClick={onNew}
          className="inline-flex items-center gap-1.5 rounded-md bg-foreground px-3 py-1.5 text-[13px] font-medium text-background hover:opacity-90"
        >
          <Plus className="size-3.5" />
          New connector
        </button>
      </div>

      <div className="overflow-hidden rounded-[var(--radius-md)] border border-[var(--se-line)]">
        {connectors.length === 0 ? (
          <div className="px-6 py-10 text-center">
            <Plug className="mx-auto mb-3 size-5 text-[var(--se-fg-3)]" />
            <div className="text-[14px] font-medium">No connectors yet</div>
            <p className="mx-auto mt-1 max-w-[44ch] text-[12px] text-[var(--se-fg-3)]">
              Push every new bug or feature request straight to a Google Sheet.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-[var(--se-line)]">
            {connectors.map((c) => {
              const status = !c.hasCredentials
                ? "Needs OAuth"
                : !c.config.sheetTitle
                  ? "Needs sheet"
                  : c.enabled
                    ? "Active"
                    : "Disabled";
              return (
                <li key={c.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <button
                      type="button"
                      onClick={() => onConfigure(c.id)}
                      className="block truncate text-left text-[14px] font-medium hover:underline"
                    >
                      {c.name}
                    </button>
                    <div className="mt-0.5 truncate text-[12px] text-[var(--se-fg-3)]">
                      {PROVIDER_LABEL[c.provider] ?? c.provider}
                      {c.accountLabel ? ` · ${c.accountLabel}` : ""}
                      {c.config.spreadsheetName
                        ? ` · ${c.config.spreadsheetName} / ${c.config.sheetTitle}`
                        : ""}
                    </div>
                    <div className="mt-0.5 text-[11px] text-[var(--se-fg-3)]">
                      {c.events.map((e) => EVENT_LABEL[e] ?? e).join(", ")}
                    </div>
                  </div>
                  <span className="rounded-full bg-[var(--se-bg-2)] px-2 py-0.5 text-[11px] uppercase tracking-wide text-[var(--se-fg-3)]">
                    {status}
                  </span>
                  <button
                    type="button"
                    onClick={() => onConfigure(c.id)}
                    className="text-[12px] text-muted-foreground hover:text-foreground"
                  >
                    Configure
                  </button>
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

function NewView({ onBack }: { onBack: () => void }) {
  return (
    <div className="space-y-4">
      <DialogHeader>
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1 self-start text-[12px] text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="size-3.5" />
          Back
        </button>
        <DialogTitle>New connector</DialogTitle>
        <DialogDescription>
          Pick a destination, choose which lifecycle events to forward, then complete OAuth.
        </DialogDescription>
      </DialogHeader>

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
          You&apos;ll be redirected to Google to authorize Shipeasy. After consent you&apos;ll come
          back here to pick the spreadsheet and tab.
        </p>
      </form>
    </div>
  );
}

function ConfigureView({
  connector,
  connectorId,
  banner,
  onClearBanner,
  onBack,
}: {
  connector: ConnectorListItem | null;
  connectorId: string;
  banner: { kind: "ok" | "error"; message: string } | null;
  onClearBanner: () => void;
  onBack: () => void;
}) {
  const needsAuth = connector ? !connector.hasCredentials : false;
  const title = connector?.name ?? "Connector";
  const subtitle = connector
    ? connector.provider === "google_sheets"
      ? `Google Sheets${connector.accountLabel ? ` · ${connector.accountLabel}` : ""}`
      : connector.provider
    : "";

  return (
    <div className="space-y-4">
      <DialogHeader>
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1 self-start text-[12px] text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="size-3.5" />
          Back
        </button>
        <DialogTitle>{title}</DialogTitle>
        {subtitle ? <DialogDescription>{subtitle}</DialogDescription> : null}
      </DialogHeader>

      <Banner banner={banner} onDismiss={onClearBanner} />

      {connector === null ? (
        <p className="text-[13px] text-[var(--se-fg-3)]">Connector not found.</p>
      ) : needsAuth ? (
        <div className="rounded-md border border-[var(--se-line)] bg-[var(--se-bg-1)] p-4 text-[13px]">
          <p className="mb-3">
            This connector hasn&apos;t completed OAuth yet. Authorize Google to pick a spreadsheet.
          </p>
          <a
            href={`/api/connectors/oauth/google/start?connectorId=${connectorId}`}
            className="inline-flex items-center rounded-md bg-foreground px-3 py-1.5 text-[13px] font-medium text-background hover:opacity-90"
          >
            Authorize Google
          </a>
        </div>
      ) : (
        <SheetPicker
          connectorId={connectorId}
          initialEnabled={connector.enabled}
          initialEvents={connector.events}
          initialSpreadsheetId={connector.config.spreadsheetId ?? ""}
          initialSpreadsheetName={connector.config.spreadsheetName ?? ""}
          initialSheetTitle={connector.config.sheetTitle ?? ""}
        />
      )}
    </div>
  );
}

type DriveFile = { id: string; name: string };
type Tab = { title: string; sheetId: number };

function SheetPicker(props: {
  connectorId: string;
  initialEnabled: boolean;
  initialEvents: string[];
  initialSpreadsheetId: string;
  initialSpreadsheetName: string;
  initialSheetTitle: string;
}) {
  const [files, setFiles] = useState<DriveFile[] | null>(null);
  const [tabs, setTabs] = useState<Tab[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [spreadsheetId, setSpreadsheetId] = useState(props.initialSpreadsheetId);
  const [spreadsheetName, setSpreadsheetName] = useState(props.initialSpreadsheetName);
  const [sheetTitle, setSheetTitle] = useState(props.initialSheetTitle);
  const [enabled, setEnabled] = useState(props.initialEnabled);
  const [events, setEvents] = useState<string[]>(props.initialEvents);
  const [pending, startTransition] = useTransition();
  const [savedMsg, setSavedMsg] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/admin/connectors/${props.connectorId}/sheets`, { credentials: "include" })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`${r.status}`))))
      .then((j) => {
        if (!cancelled) setFiles((j as { files: DriveFile[] }).files);
      })
      .catch((e: Error) => !cancelled && setError(e.message));
    return () => {
      cancelled = true;
    };
  }, [props.connectorId]);

  useEffect(() => {
    if (!spreadsheetId) {
      setTabs(null);
      return;
    }
    let cancelled = false;
    fetch(
      `/api/admin/connectors/${props.connectorId}/tabs?spreadsheetId=${encodeURIComponent(spreadsheetId)}`,
      { credentials: "include" },
    )
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`${r.status}`))))
      .then((j) => {
        if (!cancelled) setTabs((j as { tabs: Tab[] }).tabs);
      })
      .catch((e: Error) => !cancelled && setError(e.message));
    return () => {
      cancelled = true;
    };
  }, [props.connectorId, spreadsheetId]);

  function toggleEvent(value: string) {
    setEvents((prev) =>
      prev.includes(value) ? prev.filter((e) => e !== value) : [...prev, value],
    );
  }

  async function onSave(formData: FormData) {
    formData.set("id", props.connectorId);
    formData.set("spreadsheetId", spreadsheetId);
    formData.set("spreadsheetName", spreadsheetName);
    formData.set("sheetTitle", sheetTitle);
    if (enabled) formData.set("enabled", "on");
    formData.delete("events");
    for (const e of events) formData.append("events", e);
    startTransition(async () => {
      const res = await configureConnectorAction(formData);
      setSavedMsg(res.ok ? "Saved" : `Error: ${res.error}`);
    });
  }

  return (
    <form action={onSave} className="space-y-5">
      <div className="space-y-1">
        <label className="t-caps" htmlFor="spreadsheet">
          Spreadsheet
        </label>
        <select
          id="spreadsheet"
          value={spreadsheetId}
          onChange={(e) => {
            setSpreadsheetId(e.target.value);
            const file = files?.find((f) => f.id === e.target.value);
            setSpreadsheetName(file?.name ?? "");
            setSheetTitle("");
          }}
          className="w-full rounded-md border border-[var(--se-line)] bg-[var(--se-bg-1)] px-3 py-2 text-[14px]"
        >
          <option value="">{files === null ? "Loading…" : "Select a spreadsheet"}</option>
          {files?.map((f) => (
            <option key={f.id} value={f.id}>
              {f.name}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1">
        <label className="t-caps" htmlFor="tab">
          Tab
        </label>
        <select
          id="tab"
          value={sheetTitle}
          onChange={(e) => setSheetTitle(e.target.value)}
          disabled={!spreadsheetId}
          className="w-full rounded-md border border-[var(--se-line)] bg-[var(--se-bg-1)] px-3 py-2 text-[14px] disabled:opacity-50"
        >
          <option value="">{tabs === null && spreadsheetId ? "Loading…" : "Select a tab"}</option>
          {tabs?.map((t) => (
            <option key={t.sheetId} value={t.title}>
              {t.title}
            </option>
          ))}
        </select>
      </div>

      <fieldset className="space-y-2">
        <legend className="t-caps">Events</legend>
        <label className="flex items-center gap-2 text-[13px]">
          <input
            type="checkbox"
            checked={events.includes("bug.created")}
            onChange={() => toggleEvent("bug.created")}
          />
          Bug reported
        </label>
        <label className="flex items-center gap-2 text-[13px]">
          <input
            type="checkbox"
            checked={events.includes("feature_request.created")}
            onChange={() => toggleEvent("feature_request.created")}
          />
          Feature request submitted
        </label>
      </fieldset>

      <label className="flex items-center gap-2 text-[13px]">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => setEnabled(e.target.checked)}
          disabled={!spreadsheetId || !sheetTitle}
        />
        Enabled
      </label>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-foreground px-4 py-2 text-[13px] font-medium text-background hover:opacity-90 disabled:opacity-50"
        >
          {pending ? "Saving…" : "Save"}
        </button>
        {savedMsg ? <span className="text-[12px] text-muted-foreground">{savedMsg}</span> : null}
        {error ? <span className="text-[12px] text-red-500">{error}</span> : null}
      </div>
    </form>
  );
}
