"use client";

import { Plus, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

export const FIELD_TYPES = ["string", "number", "boolean", "array", "enum"] as const;
export type FieldType = (typeof FIELD_TYPES)[number];

export const ARRAY_ITEM_TYPES = ["string", "number", "boolean"] as const;
export type ArrayItemType = (typeof ARRAY_ITEM_TYPES)[number];

export type ConfigField =
  | {
      name: string;
      type: "string";
      required: boolean;
      defaultValue: string;
    }
  | {
      name: string;
      type: "number";
      required: boolean;
      defaultValue: string;
    }
  | {
      name: string;
      type: "boolean";
      required: boolean;
      defaultValue: boolean;
    }
  | {
      name: string;
      type: "array";
      required: boolean;
      itemsType: ArrayItemType;
      defaultValue: string;
    }
  | {
      name: string;
      type: "enum";
      required: boolean;
      values: string[];
      defaultValue: string;
    };

export function makeBlankField(existing: ConfigField[]): ConfigField {
  let i = existing.length + 1;
  let name = `field_${i}`;
  const taken = new Set(existing.map((f) => f.name));
  while (taken.has(name)) {
    i += 1;
    name = `field_${i}`;
  }
  return { name, type: "string", required: false, defaultValue: "" };
}

function placeholderForType(t: FieldType): string {
  switch (t) {
    case "string":
      return "default text";
    case "number":
      return "0";
    case "array":
      return "comma, separated, values";
    default:
      return "";
  }
}

type Props = {
  fields: ConfigField[];
  onChange: (next: ConfigField[]) => void;
};

export function FieldsEditor({ fields, onChange }: Props) {
  function patchField(idx: number, patch: Partial<ConfigField>) {
    const next = fields.slice();
    next[idx] = { ...next[idx], ...patch } as ConfigField;
    onChange(next);
  }

  function changeType(idx: number, type: FieldType) {
    const prev = fields[idx];
    const base = { name: prev.name, required: prev.required };
    let next: ConfigField;
    if (type === "string") next = { ...base, type, defaultValue: "" };
    else if (type === "number") next = { ...base, type, defaultValue: "" };
    else if (type === "boolean") next = { ...base, type, defaultValue: false };
    else if (type === "array") {
      next = {
        ...base,
        type,
        itemsType: prev.type === "array" ? prev.itemsType : "string",
        defaultValue: "",
      };
    } else {
      next = {
        ...base,
        type,
        values: prev.type === "enum" ? prev.values : [],
        defaultValue: "",
      };
    }
    const updated = fields.slice();
    updated[idx] = next;
    onChange(updated);
  }

  function removeField(idx: number) {
    onChange(fields.filter((_, i) => i !== idx));
  }

  function addField() {
    onChange([...fields, makeBlankField(fields)]);
  }

  return (
    <div className="flex flex-col gap-3">
      {fields.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-md border border-dashed border-[var(--se-line-2)] bg-[var(--se-bg-2)] px-6 py-8 text-center">
          <p className="text-[13px] text-[var(--se-fg-2)]">No fields yet.</p>
          <p className="max-w-[44ch] text-[12px] text-[var(--se-fg-3)]">
            Each field becomes a property on the config object. Define its type and the default
            value SDKs return until you publish a change.
          </p>
          <Button type="button" variant="outline" size="sm" onClick={addField} className="mt-1">
            <Plus className="size-3.5" /> Add field
          </Button>
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {fields.map((f, idx) => (
            <li
              key={idx}
              className="rounded-md border border-[var(--se-line-2)] bg-[var(--se-bg-2)]"
            >
              <div className="grid grid-cols-[minmax(0,1.4fr)_140px_minmax(0,1.6fr)_auto_auto] items-center gap-2 p-2">
                <Input
                  aria-label="Field name"
                  value={f.name}
                  onChange={(e) => patchField(idx, { name: e.target.value })}
                  placeholder="field_name"
                  className="font-mono text-[12.5px]"
                />
                <select
                  aria-label="Field type"
                  value={f.type}
                  onChange={(e) => changeType(idx, e.target.value as FieldType)}
                  className="h-8 rounded-md border border-input bg-transparent px-2 text-[12.5px]"
                >
                  {FIELD_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
                <DefaultValueInput field={f} idx={idx} onPatch={patchField} />
                <label
                  className={cn(
                    "flex items-center gap-1.5 px-1 text-[11px] uppercase tracking-wide text-[var(--se-fg-3)]",
                  )}
                  title="Required fields must be present in every published value"
                >
                  <Switch
                    label={`Field ${f.name} required`}
                    checked={f.required}
                    onCheckedChange={(checked: boolean) => patchField(idx, { required: checked })}
                  />
                  req
                </label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  aria-label="Remove field"
                  onClick={() => removeField(idx)}
                >
                  <X className="size-3.5" />
                </Button>
              </div>

              {f.type === "enum" ? (
                <div className="grid grid-cols-[88px_minmax(0,1fr)] items-center gap-2 border-t border-[var(--se-line-2)] px-2 py-2">
                  <span className="px-1 text-[11px] uppercase tracking-wide text-[var(--se-fg-3)]">
                    options
                  </span>
                  <Input
                    aria-label="Enum values (comma-separated)"
                    value={f.values.join(", ")}
                    onChange={(e) =>
                      patchField(idx, {
                        values: e.target.value
                          .split(",")
                          .map((v) => v.trim())
                          .filter(Boolean),
                      } as Partial<ConfigField>)
                    }
                    placeholder="option_a, option_b, option_c"
                    className="text-[12.5px]"
                  />
                </div>
              ) : null}

              {f.type === "array" ? (
                <div className="grid grid-cols-[88px_minmax(0,1fr)] items-center gap-2 border-t border-[var(--se-line-2)] px-2 py-2">
                  <span className="px-1 text-[11px] uppercase tracking-wide text-[var(--se-fg-3)]">
                    items
                  </span>
                  <select
                    aria-label="Array item type"
                    value={f.itemsType}
                    onChange={(e) =>
                      patchField(idx, {
                        itemsType: e.target.value as ArrayItemType,
                      } as Partial<ConfigField>)
                    }
                    className="h-8 w-fit rounded-md border border-input bg-transparent px-2 text-[12.5px]"
                  >
                    {ARRAY_ITEM_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      {fields.length > 0 ? (
        <Button type="button" variant="outline" size="sm" onClick={addField} className="w-fit">
          <Plus className="mr-1 size-3.5" /> Add field
        </Button>
      ) : null}
    </div>
  );
}

function DefaultValueInput({
  field,
  idx,
  onPatch,
}: {
  field: ConfigField;
  idx: number;
  onPatch: (idx: number, patch: Partial<ConfigField>) => void;
}) {
  if (field.type === "boolean") {
    return (
      <label className="flex items-center gap-2 px-1 text-[12px] text-[var(--se-fg-2)]">
        <Switch
          label={`Default for ${field.name}`}
          checked={field.defaultValue}
          onCheckedChange={(checked: boolean) =>
            onPatch(idx, { defaultValue: checked } as Partial<ConfigField>)
          }
        />
        <span className="font-mono text-[12px] text-[var(--se-fg-3)]">
          {field.defaultValue ? "true" : "false"}
        </span>
      </label>
    );
  }

  if (field.type === "enum") {
    return (
      <select
        aria-label={`Default value for ${field.name}`}
        value={field.defaultValue}
        onChange={(e) => onPatch(idx, { defaultValue: e.target.value } as Partial<ConfigField>)}
        disabled={field.values.length === 0}
        className="h-8 rounded-md border border-input bg-transparent px-2 text-[12.5px] disabled:opacity-50"
      >
        {field.values.length === 0 ? <option value="">— add options below —</option> : null}
        {field.values.map((v) => (
          <option key={v} value={v}>
            {v}
          </option>
        ))}
      </select>
    );
  }

  return (
    <Input
      aria-label={`Default value for ${field.name}`}
      type={field.type === "number" ? "number" : "text"}
      value={field.defaultValue}
      onChange={(e) => onPatch(idx, { defaultValue: e.target.value } as Partial<ConfigField>)}
      placeholder={placeholderForType(field.type)}
      className="text-[12.5px]"
    />
  );
}
