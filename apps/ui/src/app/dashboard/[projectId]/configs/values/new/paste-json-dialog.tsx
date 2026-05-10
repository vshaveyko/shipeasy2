"use client";

import { useEffect, useMemo, useState } from "react";
import { ClipboardPaste } from "lucide-react";

import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { WizField } from "./wizard-helpers";

/**
 * Walk the existing field tree and copy values out of `source` into each
 * leaf where the path matches. Unknown keys in `source` are ignored — schema
 * doesn't change, only values do.
 */
function applyValues(fields: WizField[], source: Record<string, unknown>): WizField[] {
  return fields.map((f) => {
    if (!(f.key in source)) return f;
    const v = source[f.key];
    if (f.type === "object") {
      if (v && typeof v === "object" && !Array.isArray(v)) {
        return {
          ...f,
          children: f.children ? applyValues(f.children, v as Record<string, unknown>) : f.children,
        };
      }
      return f;
    }
    if (f.type === "array") {
      if (Array.isArray(v)) return { ...f, arrayValue: v };
      return f;
    }
    if (f.type === "boolean") {
      return { ...f, value: typeof v === "boolean" ? v : Boolean(v) };
    }
    if (f.type === "number") {
      const n = typeof v === "number" ? v : Number(v);
      return { ...f, value: Number.isFinite(n) ? n : f.value };
    }
    return { ...f, value: v == null ? "" : String(v) };
  });
}

function countMatches(fields: WizField[], source: unknown): number {
  if (!source || typeof source !== "object" || Array.isArray(source)) return 0;
  const obj = source as Record<string, unknown>;
  let n = 0;
  for (const f of fields) {
    if (f.key in obj) {
      n += 1;
      if (f.type === "object" && f.children) {
        n += countMatches(f.children, obj[f.key]);
      }
    }
  }
  return n;
}

export function PasteJsonDialog({
  open,
  onClose,
  fields,
  onApply,
}: {
  open: boolean;
  onClose: () => void;
  fields: WizField[];
  onApply: (next: WizField[]) => void;
}) {
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setText("");
      setError(null);
    }
  }, [open]);

  const matches = useMemo(() => {
    if (!text.trim()) return null;
    try {
      const parsed = JSON.parse(text);
      return countMatches(fields, parsed);
    } catch {
      return null;
    }
  }, [text, fields]);

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
    onApply(applyValues(fields, parsed as Record<string, unknown>));
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-[680px] gap-0 p-0">
        <div className="flex items-center gap-3 border-b border-[var(--se-line)] bg-[var(--se-bg-2)] px-5 py-4">
          <div className="grid size-9 place-items-center rounded-[9px] border border-[var(--se-line-2)] bg-[var(--se-accent-soft)] text-[var(--se-accent)]">
            <ClipboardPaste className="size-4" />
          </div>
          <div className="min-w-0">
            <DialogTitle>Paste JSON values</DialogTitle>
            <DialogDescription className="mt-0.5">
              Paste a JSON object — keys that match existing fields update their default value.
              Unknown keys are ignored; the schema is unchanged.
            </DialogDescription>
          </div>
        </div>

        <div className="flex flex-col gap-3 p-5">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={`{\n  "feature_enabled": true,\n  "rollout_pct": 25\n}`}
            aria-label="JSON values to apply"
            className="min-h-[260px] w-full rounded-md border border-[var(--se-line-2)] bg-[var(--se-bg-2)] px-3 py-2.5 font-mono text-[12.5px] leading-[1.55] outline-none focus:border-[var(--se-accent)] focus:bg-[var(--se-bg-1)]"
          />
          <div className="flex items-center justify-between text-[11.5px]">
            {error ? (
              <span role="alert" className="text-[var(--se-danger)]">
                {error}
              </span>
            ) : matches !== null ? (
              <span className="text-[var(--se-fg-3)]">
                <span className="font-mono text-[var(--se-fg-2)]">{matches}</span> field
                {matches === 1 ? "" : "s"} match the schema.
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
            Apply values
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
