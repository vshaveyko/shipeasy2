"use client";

import { useEffect, useState } from "react";
import { Pencil, Plus, RefreshCw, Trash2 } from "lucide-react";

import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { WizField } from "./wizard-helpers";

export function EditValueDialog({
  field,
  onClose,
  onSave,
}: {
  field: WizField | null;
  onClose: () => void;
  onSave: (id: string, patch: Partial<WizField>) => void;
}) {
  const [val, setVal] = useState<unknown>(undefined);
  const [arr, setArr] = useState<unknown[]>([]);

  useEffect(() => {
    if (field) {
      setVal(field.value);
      setArr(Array.isArray(field.arrayValue) ? [...field.arrayValue] : []);
    }
  }, [field]);

  const open = !!field;
  if (!field) return null;

  function save() {
    if (!field) return;
    if (field.type === "array") {
      onSave(field.id, { arrayValue: arr });
    } else {
      onSave(field.id, { value: val });
    }
    onClose();
  }

  let body: React.ReactNode = null;
  if (
    field.type === "string" ||
    field.type === "email" ||
    field.type === "url" ||
    field.type === "uuid"
  ) {
    body = (
      <Field label="Value" hint={field.type}>
        <textarea
          value={(val as string | undefined) ?? ""}
          onChange={(e) => setVal(e.target.value)}
          placeholder={
            field.type === "email"
              ? "name@host.com"
              : field.type === "url"
                ? "https://…"
                : field.type === "uuid"
                  ? "00000000-0000-0000-0000-000000000000"
                  : "…"
          }
          className="min-h-[120px] w-full rounded-md border border-[var(--se-line-2)] bg-[var(--se-bg-2)] px-3 py-2.5 font-mono text-[14px] leading-[1.55] outline-none focus:border-[var(--se-accent)] focus:bg-[var(--se-bg-1)]"
        />
        {field.type === "uuid" ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-fit"
            onClick={() => {
              const next =
                typeof crypto !== "undefined" && "randomUUID" in crypto
                  ? crypto.randomUUID()
                  : "00000000-0000-0000-0000-000000000000";
              setVal(next);
            }}
          >
            <RefreshCw className="size-3" /> Generate UUID
          </Button>
        ) : null}
      </Field>
    );
  } else if (field.type === "number") {
    body = (
      <Field label="Numeric value">
        <input
          type="number"
          value={(val as number | string | undefined) ?? ""}
          onChange={(e) => setVal(e.target.value === "" ? "" : Number(e.target.value))}
          placeholder="0"
          aria-label="Numeric value"
          className="w-full rounded-md border border-[var(--se-line-2)] bg-[var(--se-bg-2)] px-6 py-4 text-left font-mono text-[42px] font-medium leading-none text-[#f0c674] outline-none focus:border-[var(--se-accent)] focus:bg-[var(--se-bg-1)]"
        />
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {[0, 25, 50, 75, 100].map((n) => (
            <Button key={n} type="button" variant="outline" size="sm" onClick={() => setVal(n)}>
              {n}
            </Button>
          ))}
        </div>
      </Field>
    );
  } else if (field.type === "boolean") {
    const b = val === true;
    const f = val === false;
    body = (
      <Field label="Boolean value">
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setVal(true)}
            aria-label="Set value to true"
            className={cn(
              "flex flex-col items-center gap-2 rounded-md border px-6 py-6 transition-colors",
              b
                ? "border-[#74c7ec] bg-[color-mix(in_oklab,#74c7ec_14%,var(--se-bg-2))] text-[#74c7ec]"
                : "border-[var(--se-line-2)] bg-[var(--se-bg-2)] hover:border-[var(--se-line-3)] hover:bg-[var(--se-bg-3)]",
            )}
          >
            <span className="font-mono text-[24px] font-semibold">true</span>
            <span className="text-[11.5px] text-[var(--se-fg-3)]">
              consumers receive <code className="font-mono">true</code>
            </span>
          </button>
          <button
            type="button"
            onClick={() => setVal(false)}
            aria-label="Set value to false"
            className={cn(
              "flex flex-col items-center gap-2 rounded-md border px-6 py-6 transition-colors",
              f
                ? "border-[var(--se-danger)] bg-[color-mix(in_oklab,var(--se-danger)_14%,var(--se-bg-2))] text-[var(--se-danger)]"
                : "border-[var(--se-line-2)] bg-[var(--se-bg-2)] hover:border-[var(--se-line-3)] hover:bg-[var(--se-bg-3)]",
            )}
          >
            <span className="font-mono text-[24px] font-semibold">false</span>
            <span className="text-[11.5px] text-[var(--se-fg-3)]">
              consumers receive <code className="font-mono">false</code>
            </span>
          </button>
        </div>
      </Field>
    );
  } else if (field.type === "enum") {
    const opts = field.enumValues ?? [];
    body = (
      <Field
        label="Pick one"
        hint={`from the ${opts.length} declared option${opts.length === 1 ? "" : "s"}`}
      >
        <div className="overflow-hidden rounded-md border border-[var(--se-line-2)] bg-[var(--se-bg-2)]">
          {opts.map((opt) => (
            <button
              type="button"
              key={opt}
              onClick={() => setVal(opt)}
              className={cn(
                "flex w-full items-center gap-3 border-b border-[var(--se-line)] px-3.5 py-3 text-left transition-colors last:border-b-0",
                val === opt
                  ? "bg-[color-mix(in_oklab,var(--se-accent)_12%,var(--se-bg-2))]"
                  : "hover:bg-[var(--se-bg-3)]",
              )}
            >
              <span
                className={cn(
                  "grid size-4 shrink-0 place-items-center rounded-full border-[1.5px]",
                  val === opt ? "border-[var(--se-accent)]" : "border-[var(--se-line-3)]",
                )}
              >
                {val === opt ? (
                  <span className="size-2 rounded-full bg-[var(--se-accent)]" />
                ) : null}
              </span>
              <span className="font-mono text-[13.5px] font-medium">{opt}</span>
              {val === opt ? (
                <span className="ml-auto font-mono text-[11.5px] text-[var(--se-fg-3)]">
                  selected
                </span>
              ) : null}
            </button>
          ))}
        </div>
      </Field>
    );
  } else if (field.type === "date" || field.type === "datetime") {
    body = (
      <Field label={field.type === "date" ? "Date" : "Date & time"}>
        <input
          type={field.type === "date" ? "date" : "datetime-local"}
          value={(val as string | undefined) ?? ""}
          onChange={(e) => setVal(e.target.value)}
          aria-label={field.type === "date" ? "Date" : "Date and time"}
          className="h-9 w-full rounded-md border border-[var(--se-line-2)] bg-[var(--se-bg-2)] px-3 text-[13.5px] outline-none focus:border-[var(--se-accent)] focus:bg-[var(--se-bg-1)]"
        />
      </Field>
    );
  } else if (field.type === "array") {
    body = (
      <Field label="Items" hint={`each entry is a ${field.itemsType ?? "string"}`}>
        <div className="flex flex-col gap-2">
          {arr.length === 0 ? (
            <div className="rounded-[6px] border border-dashed border-[var(--se-line-2)] bg-[var(--se-bg-2)] px-4 py-3.5 text-center text-[12.5px] text-[var(--se-fg-3)]">
              Empty array — add an item below.
            </div>
          ) : null}
          {arr.map((v, i) => (
            <div
              key={i}
              className="flex items-center gap-2 rounded-[6px] border border-[var(--se-line)] bg-[var(--se-bg-2)] p-1.5"
            >
              <span className="w-6 text-right font-mono text-[11px] text-[var(--se-fg-4)]">
                {i}
              </span>
              <input
                value={String(v ?? "")}
                onChange={(e) => {
                  const next = [...arr];
                  next[i] = e.target.value;
                  setArr(next);
                }}
                aria-label={`Item ${i}`}
                className="h-7 flex-1 rounded-[4px] border border-[var(--se-line-2)] bg-[var(--se-bg-1)] px-2 font-mono text-[13px] text-[var(--se-accent)] outline-none focus:border-[var(--se-accent)]"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={() => {
                  const next = [...arr];
                  next.splice(i, 1);
                  setArr(next);
                }}
                aria-label={`Remove item ${i}`}
                className="text-[var(--se-fg-3)] hover:bg-[var(--se-danger-soft)] hover:text-[var(--se-danger)]"
              >
                <Trash2 className="size-3" />
              </Button>
            </div>
          ))}
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="mt-1.5 w-fit"
          onClick={() => setArr([...arr, ""])}
        >
          <Plus className="size-3" /> Add item
        </Button>
      </Field>
    );
  } else if (field.type === "object") {
    body = (
      <Field label="Children" hint="this is a container; edit children individually">
        <div className="flex flex-col gap-1.5">
          {(field.children ?? []).map((c) => (
            <div
              key={c.id}
              className="flex items-center gap-2 rounded-[6px] border border-[var(--se-line)] bg-[var(--se-bg-2)] px-2.5 py-1.5"
            >
              <span className="font-mono text-[12px] text-[var(--se-fg-4)]">·</span>
              <span className="font-mono text-[12.5px] text-[var(--se-fg-2)]">
                {c.key}
                <span className="ml-2 text-[var(--se-fg-4)]">{c.type}</span>
              </span>
            </div>
          ))}
        </div>
        <p className="mt-1 text-[11.5px] text-[var(--se-fg-3)]">
          Close this dialog and click a child row to edit its value.
        </p>
      </Field>
    );
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-[680px] gap-0 p-0">
        <div className="flex items-center gap-3 border-b border-[var(--se-line)] bg-[var(--se-bg-2)] px-5 py-4">
          <div className="grid size-9 place-items-center rounded-[9px] border border-[var(--se-line-2)] bg-[var(--se-accent-soft)] text-[var(--se-accent)]">
            <Pencil className="size-4" />
          </div>
          <div className="min-w-0">
            <DialogTitle>
              Set value for <span className="font-mono text-[var(--se-fg-2)]">{field.key}</span>
            </DialogTitle>
            <DialogDescription className="mt-0.5 font-mono text-[10.5px] tracking-[0.06em] uppercase">
              {field.type} · {field.required ? "required" : "optional"}
            </DialogDescription>
          </div>
        </div>

        <div className="flex max-h-[70vh] flex-col gap-5 overflow-y-auto p-5">{body}</div>

        <div className="flex items-center justify-between gap-3 border-t border-[var(--se-line)] bg-[var(--se-bg-2)] px-5 py-3">
          <span className="line-clamp-1 max-w-[380px] text-[11.5px] text-[var(--se-fg-3)]">
            {field.description ?? ""}
          </span>
          <div className="flex items-center gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={onClose}>
              Cancel
            </Button>
            {field.type !== "object" ? (
              <Button type="button" size="sm" onClick={save}>
                Save value
              </Button>
            ) : null}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <span className="flex items-center gap-1.5 font-mono text-[10.5px] tracking-[0.06em] uppercase text-[var(--se-fg-3)]">
        {label}
        {hint ? (
          <span className="font-sans text-[11px] tracking-normal normal-case text-[var(--se-fg-4)]">
            — {hint}
          </span>
        ) : null}
      </span>
      {children}
    </div>
  );
}
