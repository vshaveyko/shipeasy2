"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2, Type } from "lucide-react";

import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { ARRAY_ITEM_TYPES, TYPE_OPTS, type FieldType, type WizField } from "./wizard-helpers";

const GROUPS: { g: "basic" | "fmt" | "comp"; label: string }[] = [
  { g: "basic", label: "Primitive" },
  { g: "fmt", label: "Formatted string" },
  { g: "comp", label: "Composite" },
];

export function EditFieldDialog({
  field,
  onClose,
  onSave,
  onDelete,
}: {
  field: WizField | null;
  onClose: () => void;
  onSave: (id: string, patch: Partial<WizField>) => void;
  onDelete: (id: string) => void;
}) {
  const [draft, setDraft] = useState<WizField | null>(field);

  useEffect(() => {
    if (field) {
      setDraft({
        ...field,
        enumValues: field.enumValues ? [...field.enumValues] : undefined,
      });
    } else {
      setDraft(null);
    }
  }, [field]);

  const open = !!field;
  if (!draft) return null;

  function setType(t: FieldType) {
    setDraft((d) =>
      d
        ? {
            ...d,
            type: t,
            children: t === "object" ? (d.children ?? []) : undefined,
            itemsType: t === "array" ? (d.itemsType ?? "string") : undefined,
            enumValues: t === "enum" ? (d.enumValues ?? ["option_a", "option_b"]) : undefined,
          }
        : d,
    );
  }

  function updEnum(i: number, v: string) {
    setDraft((d) => {
      if (!d) return d;
      const next = [...(d.enumValues ?? [])];
      next[i] = v;
      return { ...d, enumValues: next };
    });
  }

  function rmEnum(i: number) {
    setDraft((d) => {
      if (!d) return d;
      const next = [...(d.enumValues ?? [])];
      next.splice(i, 1);
      return { ...d, enumValues: next };
    });
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-[680px] gap-0 p-0">
        <div className="flex items-center gap-3 border-b border-[var(--se-line)] bg-[var(--se-bg-2)] px-5 py-4">
          <div className="grid size-9 place-items-center rounded-[9px] border border-[var(--se-line-2)] bg-[var(--se-accent-soft)] text-[var(--se-accent)]">
            <Type className="size-4" />
          </div>
          <div className="min-w-0">
            <DialogTitle>
              Edit field <span className="font-mono text-[var(--se-fg-2)]">{draft.key}</span>
            </DialogTitle>
            <DialogDescription className="mt-0.5 font-mono text-[10.5px] tracking-[0.06em] uppercase">
              schema definition
            </DialogDescription>
          </div>
        </div>

        <div className="flex max-h-[70vh] flex-col gap-5 overflow-y-auto p-5">
          <Field label="Field name" hint="lowercase, snake_case">
            <input
              value={draft.key}
              onChange={(e) =>
                setDraft({ ...draft, key: e.target.value.replace(/[^a-z0-9_]/gi, "_") })
              }
              aria-label="Field name"
              className="h-9 w-full rounded-md border border-[var(--se-line-2)] bg-[var(--se-bg-2)] px-3 font-mono text-[13.5px] text-foreground outline-none focus:border-[var(--se-accent)] focus:bg-[var(--se-bg-1)]"
            />
          </Field>

          <Field label="Type" hint="how this value is validated and rendered">
            <div className="flex flex-col gap-3">
              {GROUPS.map((grp) => (
                <div key={grp.g} className="flex flex-col gap-1.5">
                  <span className="font-mono text-[9.5px] tracking-[0.08em] uppercase text-[var(--se-fg-4)]">
                    {grp.label}
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {TYPE_OPTS.filter((t) => t.group === grp.g).map((t) => (
                      <button
                        key={t.k}
                        type="button"
                        onClick={() => setType(t.k)}
                        aria-label={`Field type ${t.label}`}
                        className={cn(
                          "inline-flex items-center gap-1.5 rounded-[6px] border px-3 py-1.5 font-mono text-[12px] transition-colors",
                          draft.type === t.k
                            ? "border-[color-mix(in_oklab,var(--se-accent)_50%,transparent)] bg-[color-mix(in_oklab,var(--se-accent)_16%,transparent)] text-[var(--se-accent)]"
                            : "border-[var(--se-line-2)] bg-[var(--se-bg-2)] text-[var(--se-fg-2)] hover:border-[var(--se-line-3)] hover:text-foreground",
                        )}
                      >
                        <span className="w-3.5 text-center text-[11px] font-semibold opacity-85">
                          {t.glyph}
                        </span>
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </Field>

          <Field label="Requirement">
            <div className="inline-flex items-center gap-2.5 py-1.5 text-[13px] text-[var(--se-fg-2)]">
              <Switch
                label="Required"
                checked={draft.required}
                onCheckedChange={(v) => setDraft({ ...draft, required: v })}
              />
              <span>
                <b className="font-medium text-foreground">
                  {draft.required ? "Required" : "Optional"}
                </b>
                <span className="text-[var(--se-fg-3)]">
                  {" · "}
                  {draft.required
                    ? "Consumers must receive a value."
                    : "May be omitted at consumption time."}
                </span>
              </span>
            </div>
          </Field>

          <Field label="Description" hint="shown in SDK docs and IDE tooltips">
            <textarea
              value={draft.description ?? ""}
              onChange={(e) => setDraft({ ...draft, description: e.target.value })}
              placeholder="What this field controls. Two or three sentences is plenty."
              className="min-h-[96px] w-full rounded-md border border-[var(--se-line-2)] bg-[var(--se-bg-2)] px-3 py-2.5 text-[13.5px] leading-[1.55] outline-none focus:border-[var(--se-accent)] focus:bg-[var(--se-bg-1)]"
            />
          </Field>

          {draft.type === "enum" ? (
            <Field
              label="Allowed values"
              hint={`${(draft.enumValues ?? []).length} option${
                (draft.enumValues ?? []).length === 1 ? "" : "s"
              }`}
            >
              <div className="flex flex-col gap-2 rounded-md">
                {(draft.enumValues ?? []).map((v, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 rounded-[6px] border border-[var(--se-line)] bg-[var(--se-bg-2)] p-1.5"
                  >
                    <span className="w-6 text-right font-mono text-[11px] text-[var(--se-fg-4)]">
                      {i}
                    </span>
                    <input
                      value={v}
                      onChange={(e) => updEnum(i, e.target.value)}
                      aria-label={`Option ${i}`}
                      className="h-7 flex-1 rounded-[4px] border border-[var(--se-line-2)] bg-[var(--se-bg-1)] px-2 font-mono text-[13px] text-[var(--se-accent)] outline-none focus:border-[var(--se-accent)]"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => rmEnum(i)}
                      className="text-[var(--se-fg-3)] hover:bg-[var(--se-danger-soft)] hover:text-[var(--se-danger)]"
                      aria-label={`Remove option ${i}`}
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
                onClick={() =>
                  setDraft({
                    ...draft,
                    enumValues: [...(draft.enumValues ?? []), "new_option"],
                  })
                }
                className="mt-1.5 w-fit"
              >
                <Plus className="size-3" /> Add option
              </Button>
            </Field>
          ) : null}

          {draft.type === "array" ? (
            <Field label="Item type" hint="element type for array entries">
              <div className="flex flex-wrap gap-1.5">
                {ARRAY_ITEM_TYPES.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setDraft({ ...draft, itemsType: t })}
                    aria-label={`Item type ${t}`}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-[6px] border px-3 py-1.5 font-mono text-[12px] transition-colors",
                      (draft.itemsType ?? "string") === t
                        ? "border-[color-mix(in_oklab,var(--se-accent)_50%,transparent)] bg-[color-mix(in_oklab,var(--se-accent)_16%,transparent)] text-[var(--se-accent)]"
                        : "border-[var(--se-line-2)] bg-[var(--se-bg-2)] text-[var(--se-fg-2)] hover:border-[var(--se-line-3)] hover:text-foreground",
                    )}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </Field>
          ) : null}
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-[var(--se-line)] bg-[var(--se-bg-2)] px-5 py-3">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              onDelete(draft.id);
              onClose();
            }}
            className="text-[var(--se-danger)] hover:bg-[var(--se-danger-soft)]"
          >
            <Trash2 className="size-3" /> Remove field
          </Button>
          <div className="flex items-center gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => {
                onSave(draft.id, draft);
                onClose();
              }}
            >
              Save changes
            </Button>
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
