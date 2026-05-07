"use client";

import { useEffect, useState, useTransition } from "react";

import { configureConnectorAction } from "../actions";

type DriveFile = { id: string; name: string };
type Tab = { title: string; sheetId: number };

type Props = {
  connectorId: string;
  initialEnabled: boolean;
  initialEvents: string[];
  initialSpreadsheetId: string;
  initialSpreadsheetName: string;
  initialSheetTitle: string;
};

export function SheetPicker(props: Props) {
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
