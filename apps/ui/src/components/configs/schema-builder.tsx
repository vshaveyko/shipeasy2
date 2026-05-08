"use client";

import { useMemo } from "react";
import { Plus, X } from "lucide-react";
import type { JsonSchema } from "@shipeasy/core";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

/** Types our flat schema builder supports. No nested objects. No arrays of objects. */
export const FIELD_TYPES = ["string", "number", "boolean", "array", "enum"] as const;
export type FieldType = (typeof FIELD_TYPES)[number];

/** Items types allowed inside an array field. */
export const ARRAY_ITEM_TYPES = ["string", "number", "boolean"] as const;
export type ArrayItemType = (typeof ARRAY_ITEM_TYPES)[number];

type FieldSpec =
  | { name: string; type: "string"; required: boolean; description?: string }
  | { name: string; type: "number"; required: boolean; description?: string }
  | { name: string; type: "boolean"; required: boolean; description?: string }
  | {
      name: string;
      type: "array";
      required: boolean;
      itemsType: ArrayItemType;
      description?: string;
    }
  | { name: string; type: "enum"; required: boolean; values: string[]; description?: string };

type Props = {
  value: JsonSchema;
  onChange: (next: JsonSchema) => void;
};

/** Convert a flat JSON Schema into our internal field-spec list. */
function schemaToFields(schema: JsonSchema): FieldSpec[] {
  const properties = (schema.properties as Record<string, JsonSchema> | undefined) ?? {};
  const requiredList = (schema.required as string[] | undefined) ?? [];
  const out: FieldSpec[] = [];
  for (const [name, prop] of Object.entries(properties)) {
    const required = requiredList.includes(name);
    const description = typeof prop.description === "string" ? prop.description : undefined;
    if (Array.isArray(prop.enum) && prop.enum.length > 0) {
      out.push({
        name,
        type: "enum",
        required,
        values: prop.enum.map((v) => String(v)),
        description,
      });
      continue;
    }
    if (prop.type === "string" || prop.type === "number" || prop.type === "boolean") {
      out.push({ name, type: prop.type, required, description });
      continue;
    }
    if (prop.type === "array") {
      const items = prop.items as JsonSchema | undefined;
      const itemsType = (items?.type as ArrayItemType) ?? "string";
      const safeItemsType: ArrayItemType = (ARRAY_ITEM_TYPES as readonly string[]).includes(
        itemsType,
      )
        ? itemsType
        : "string";
      out.push({
        name,
        type: "array",
        required,
        itemsType: safeItemsType,
        description,
      });
    }
    // unknown field types are dropped — schema builder is flat-only.
  }
  return out;
}

/** Convert our internal field-spec list back to a flat JSON Schema. */
function fieldsToSchema(fields: FieldSpec[]): JsonSchema {
  const properties: Record<string, JsonSchema> = {};
  const required: string[] = [];
  for (const f of fields) {
    if (!f.name) continue;
    if (f.required) required.push(f.name);
    if (f.type === "enum") {
      properties[f.name] = {
        type: "string",
        enum: f.values,
        ...(f.description ? { description: f.description } : {}),
      };
    } else if (f.type === "array") {
      properties[f.name] = {
        type: "array",
        items: { type: f.itemsType },
        ...(f.description ? { description: f.description } : {}),
      };
    } else {
      properties[f.name] = {
        type: f.type,
        ...(f.description ? { description: f.description } : {}),
      };
    }
  }
  return {
    type: "object",
    properties,
    ...(required.length ? { required } : {}),
    additionalProperties: false,
  };
}

export function SchemaBuilder({ value, onChange }: Props) {
  const fields = useMemo(() => schemaToFields(value), [value]);

  function update(next: FieldSpec[]) {
    onChange(fieldsToSchema(next));
  }

  function setField(idx: number, patch: Partial<FieldSpec>) {
    const next = fields.slice();
    next[idx] = { ...next[idx], ...patch } as FieldSpec;
    update(next);
  }

  function changeType(idx: number, type: FieldType) {
    const prev = fields[idx];
    let replacement: FieldSpec;
    if (type === "enum") {
      replacement = {
        name: prev.name,
        type: "enum",
        required: prev.required,
        values: prev.type === "enum" ? prev.values : [],
        description: prev.description,
      };
    } else if (type === "array") {
      replacement = {
        name: prev.name,
        type: "array",
        required: prev.required,
        itemsType: prev.type === "array" ? prev.itemsType : "string",
        description: prev.description,
      };
    } else {
      replacement = {
        name: prev.name,
        type,
        required: prev.required,
        description: prev.description,
      };
    }
    const next = fields.slice();
    next[idx] = replacement;
    update(next);
  }

  function addField() {
    let i = fields.length + 1;
    let name = `field_${i}`;
    const taken = new Set(fields.map((f) => f.name));
    while (taken.has(name)) {
      i += 1;
      name = `field_${i}`;
    }
    update([...fields, { name, type: "string", required: false }]);
  }

  function removeField(idx: number) {
    update(fields.filter((_, i) => i !== idx));
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <Label className="text-[12px] uppercase tracking-wide text-[var(--se-fg-3)]">Schema</Label>
        <span className="text-[11px] text-[var(--se-fg-4)]">
          {fields.length} {fields.length === 1 ? "field" : "fields"}
        </span>
      </div>

      {fields.length === 0 ? (
        <div className="rounded-md border border-dashed border-[var(--se-line-2)] p-4 text-center text-[12px] text-[var(--se-fg-3)]">
          No fields yet. Click &quot;Add field&quot; to define the shape.
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {fields.map((f, idx) => (
            <li
              key={idx}
              className="flex flex-col gap-2 rounded-md border border-[var(--se-line-2)] bg-[var(--se-bg-2)] p-2"
            >
              <div className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-2">
                <Input
                  aria-label="Field name"
                  value={f.name}
                  onChange={(e) => setField(idx, { name: e.target.value })}
                  placeholder="field_name"
                  className="font-mono text-[12px]"
                />
                <select
                  aria-label="Field type"
                  value={f.type}
                  onChange={(e) => changeType(idx, e.target.value as FieldType)}
                  className="h-8 rounded-md border border-input bg-transparent px-2 text-[12px]"
                >
                  {FIELD_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
                <label className="flex items-center gap-1.5 text-[11px] text-[var(--se-fg-3)]">
                  <Switch
                    label={`Field ${f.name} required`}
                    checked={f.required}
                    onCheckedChange={(checked: boolean) => setField(idx, { required: checked })}
                  />
                  required
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

              {f.type === "enum" && (
                <Input
                  aria-label="Enum values (comma-separated)"
                  value={f.values.join(", ")}
                  onChange={(e) =>
                    setField(idx, {
                      values: e.target.value
                        .split(",")
                        .map((v) => v.trim())
                        .filter(Boolean),
                    } as Partial<FieldSpec>)
                  }
                  placeholder="option_a, option_b, option_c"
                  className="text-[12px]"
                />
              )}

              {f.type === "array" && (
                <div className="flex items-center gap-2 text-[11px] text-[var(--se-fg-3)]">
                  <span>items:</span>
                  <select
                    aria-label="Array item type"
                    value={f.itemsType}
                    onChange={(e) =>
                      setField(idx, {
                        itemsType: e.target.value as ArrayItemType,
                      } as Partial<FieldSpec>)
                    }
                    className="h-7 rounded-md border border-input bg-transparent px-2 text-[12px]"
                  >
                    {ARRAY_ITEM_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      <Button type="button" variant="outline" size="sm" onClick={addField} className="w-fit">
        <Plus className="mr-1 size-3.5" /> Add field
      </Button>
    </div>
  );
}
