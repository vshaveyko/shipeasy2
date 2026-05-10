"use client";

import { useEffect, useMemo, useState } from "react";
import { Braces } from "lucide-react";

import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  blankField,
  newId,
  type ArrayItemType,
  type FieldType,
  type WizField,
} from "./wizard-helpers";

/**
 * Infer a wizard field tree from a parsed JSON value. Top-level value must be
 * an object (configs are always objects); each key becomes a root field.
 */
function inferFromValue(input: unknown): WizField[] {
  if (!input || typeof input !== "object" || Array.isArray(input)) return [];
  const out: WizField[] = [];
  for (const [k, v] of Object.entries(input as Record<string, unknown>)) {
    out.push(inferField(k, v));
  }
  return out;
}

function inferField(key: string, v: unknown): WizField {
  if (v === null) {
    return blankField({ key, type: "string", value: "" });
  }
  if (Array.isArray(v)) {
    const itemsType: ArrayItemType =
      typeof v[0] === "number" ? "number" : typeof v[0] === "boolean" ? "boolean" : "string";
    return blankField({
      key,
      type: "array",
      itemsType,
      arrayValue: v.map((entry) => entry),
    });
  }
  if (typeof v === "object") {
    const children: WizField[] = [];
    for (const [ck, cv] of Object.entries(v as Record<string, unknown>)) {
      children.push(inferField(ck, cv));
    }
    return { id: newId(), key, type: "object", required: false, children };
  }
  if (typeof v === "boolean") {
    return blankField({ key, type: "boolean", value: v });
  }
  if (typeof v === "number") {
    return blankField({ key, type: "number", value: v });
  }
  // string
  const s = v as string;
  const type: FieldType = inferStringFormat(s);
  return blankField({ key, type, value: s });
}

const RX_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const RX_URL = /^https?:\/\/[^\s]+$/i;
const RX_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const RX_DATE = /^\d{4}-\d{2}-\d{2}$/;
const RX_DATETIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/;

function inferStringFormat(s: string): FieldType {
  if (RX_DATETIME.test(s)) return "datetime";
  if (RX_DATE.test(s)) return "date";
  if (RX_UUID.test(s)) return "uuid";
  if (RX_EMAIL.test(s)) return "email";
  if (RX_URL.test(s)) return "url";
  return "string";
}

export function ImportJsonDialog({
  open,
  onClose,
  onImport,
}: {
  open: boolean;
  onClose: () => void;
  onImport: (fields: WizField[]) => void;
}) {
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setText("");
      setError(null);
    }
  }, [open]);

  const previewCount = useMemo(() => {
    if (!text.trim()) return null;
    try {
      const parsed = JSON.parse(text);
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
      return Object.keys(parsed).length;
    } catch {
      return null;
    }
  }, [text]);

  function submit() {
    setError(null);
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch (err) {
      setError(`Invalid JSON: ${(err as Error).message}`);
      return;
    }
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      setError("Top-level value must be a JSON object.");
      return;
    }
    const fields = inferFromValue(parsed);
    onImport(fields);
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-[680px] gap-0 p-0">
        <div className="flex items-center gap-3 border-b border-[var(--se-line)] bg-[var(--se-bg-2)] px-5 py-4">
          <div className="grid size-9 place-items-center rounded-[9px] border border-[var(--se-line-2)] bg-[var(--se-accent-soft)] text-[var(--se-accent)]">
            <Braces className="size-4" />
          </div>
          <div className="min-w-0">
            <DialogTitle>Import JSON</DialogTitle>
            <DialogDescription className="mt-0.5">
              Paste a JSON object — its keys, types, and values become wizard fields. This replaces
              any fields you&apos;ve already added.
            </DialogDescription>
          </div>
        </div>

        <div className="flex flex-col gap-3 p-5">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={`{\n  "feature_enabled": true,\n  "rollout_pct": 25,\n  "support_email": "help@example.com"\n}`}
            aria-label="JSON to import"
            className="min-h-[260px] w-full rounded-md border border-[var(--se-line-2)] bg-[var(--se-bg-2)] px-3 py-2.5 font-mono text-[12.5px] leading-[1.55] outline-none focus:border-[var(--se-accent)] focus:bg-[var(--se-bg-1)]"
          />
          <div className="flex items-center justify-between text-[11.5px]">
            {error ? (
              <span role="alert" className="text-[var(--se-danger)]">
                {error}
              </span>
            ) : previewCount !== null ? (
              <span className="text-[var(--se-fg-3)]">
                Will import <span className="font-mono text-[var(--se-fg-2)]">{previewCount}</span>{" "}
                root field
                {previewCount === 1 ? "" : "s"}.
              </span>
            ) : (
              <span className="text-[var(--se-fg-4)]">Paste a JSON object to preview.</span>
            )}
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-[var(--se-line)] bg-[var(--se-bg-2)] px-5 py-3">
          <Button type="button" variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" size="sm" onClick={submit} disabled={!text.trim()}>
            Import
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
