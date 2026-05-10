import type { JsonSchema } from "@shipeasy/core";

export type FieldType =
  | "string"
  | "number"
  | "boolean"
  | "date"
  | "datetime"
  | "email"
  | "url"
  | "uuid"
  | "enum"
  | "object"
  | "array";

export type ArrayItemType =
  | "string"
  | "number"
  | "boolean"
  | "email"
  | "url"
  | "uuid"
  | "date"
  | "datetime";

export type WizField = {
  id: string;
  key: string;
  type: FieldType;
  required: boolean;
  description?: string;
  /** primitives + enum + date(time) values */
  value?: unknown;
  /** array runtime value (each entry is itemsType) */
  arrayValue?: unknown[];
  /** enum allowed values */
  enumValues?: string[];
  /** array element type */
  itemsType?: ArrayItemType;
  /** object children (recursive) */
  children?: WizField[];
};

export const TYPE_OPTS: {
  k: FieldType;
  glyph: string;
  label: string;
  group: "basic" | "fmt" | "comp";
}[] = [
  { k: "string", glyph: "Aa", label: "string", group: "basic" },
  { k: "number", glyph: "#", label: "number", group: "basic" },
  { k: "boolean", glyph: "⊙", label: "boolean", group: "basic" },
  { k: "date", glyph: "▦", label: "date", group: "fmt" },
  { k: "datetime", glyph: "▦", label: "datetime", group: "fmt" },
  { k: "email", glyph: "@", label: "email", group: "fmt" },
  { k: "url", glyph: "/", label: "url", group: "fmt" },
  { k: "uuid", glyph: "∞", label: "uuid", group: "fmt" },
  { k: "enum", glyph: "≡", label: "enum", group: "comp" },
  { k: "object", glyph: "{}", label: "object", group: "comp" },
  { k: "array", glyph: "[]", label: "array", group: "comp" },
];

export const ARRAY_ITEM_TYPES: ArrayItemType[] = [
  "string",
  "number",
  "boolean",
  "email",
  "url",
  "uuid",
  "date",
  "datetime",
];

let _id = 0;
export function newId(): string {
  _id += 1;
  return `f_${Date.now().toString(36)}_${_id}`;
}

export function blankField(over: Partial<WizField> = {}): WizField {
  return {
    id: newId(),
    key: "new_field",
    type: "string",
    required: false,
    value: "",
    description: "",
    ...over,
  };
}

export function findField(fields: WizField[], id: string): WizField | null {
  for (const f of fields) {
    if (f.id === id) return f;
    if (f.children) {
      const r = findField(f.children, id);
      if (r) return r;
    }
  }
  return null;
}

export function updateField(fields: WizField[], id: string, patch: Partial<WizField>): WizField[] {
  return fields.map((f) => {
    if (f.id === id) return { ...f, ...patch };
    if (f.children) return { ...f, children: updateField(f.children, id, patch) };
    return f;
  });
}

export function removeField(fields: WizField[], id: string): WizField[] {
  return fields
    .filter((f) => f.id !== id)
    .map((f) => (f.children ? { ...f, children: removeField(f.children, id) } : f));
}

export function addChild(fields: WizField[], parentId: string): WizField[] {
  return fields.map((f) => {
    if (f.id === parentId && f.type === "object") {
      const child = blankField();
      return { ...f, children: [...(f.children ?? []), child] };
    }
    if (f.children) return { ...f, children: addChild(f.children, parentId) };
    return f;
  });
}

export function flatten(
  fields: WizField[],
  expanded: Record<string, boolean>,
): { field: WizField; depth: number }[] {
  const out: { field: WizField; depth: number }[] = [];
  function walk(arr: WizField[], depth: number) {
    for (const f of arr) {
      out.push({ field: f, depth });
      if (f.type === "object" && expanded[f.id] && f.children) {
        walk(f.children, depth + 1);
      }
    }
  }
  walk(fields, 0);
  return out;
}

export function countAllFields(fields: WizField[]): number {
  let n = 0;
  function walk(arr: WizField[]) {
    for (const f of arr) {
      n += 1;
      if (f.children) walk(f.children);
    }
  }
  walk(fields);
  return n;
}

/** Convert a field tree to its JS default-value representation. */
export function fieldToJson(f: WizField): unknown {
  if (f.type === "object") {
    const o: Record<string, unknown> = {};
    for (const c of f.children ?? []) o[c.key] = fieldToJson(c);
    return o;
  }
  if (f.type === "array") return Array.isArray(f.arrayValue) ? f.arrayValue : [];
  if (f.type === "number") {
    if (f.value === "" || f.value == null) return null;
    const n = typeof f.value === "number" ? f.value : Number(f.value);
    return Number.isFinite(n) ? n : null;
  }
  if (f.type === "boolean") return Boolean(f.value);
  if (f.type === "enum") return f.value ?? null;
  return f.value ?? "";
}

function fieldToSchema(f: WizField): JsonSchema {
  switch (f.type) {
    case "string":
      return { type: "string" };
    case "number":
      return { type: "number" };
    case "boolean":
      return { type: "boolean" };
    case "date":
      return { type: "string", format: "date" };
    case "datetime":
      return { type: "string", format: "date-time" };
    case "email":
      return { type: "string", format: "email" };
    case "url":
      return { type: "string", format: "uri" };
    case "uuid":
      return { type: "string", format: "uuid" };
    case "enum":
      return { type: "string", enum: f.enumValues ?? [] };
    case "array": {
      const items: JsonSchema = (() => {
        switch (f.itemsType ?? "string") {
          case "number":
            return { type: "number" };
          case "boolean":
            return { type: "boolean" };
          case "email":
            return { type: "string", format: "email" };
          case "url":
            return { type: "string", format: "uri" };
          case "uuid":
            return { type: "string", format: "uuid" };
          case "date":
            return { type: "string", format: "date" };
          case "datetime":
            return { type: "string", format: "date-time" };
          default:
            return { type: "string" };
        }
      })();
      return { type: "array", items };
    }
    case "object": {
      const properties: Record<string, JsonSchema> = {};
      const required: string[] = [];
      for (const c of f.children ?? []) {
        properties[c.key] = withDescription(c, fieldToSchema(c));
        if (c.required) required.push(c.key);
      }
      const schema: JsonSchema = {
        type: "object",
        properties,
        additionalProperties: false,
      };
      if (required.length) schema.required = required;
      return schema;
    }
  }
}

function withDescription(f: WizField, s: JsonSchema): JsonSchema {
  return f.description ? { ...s, description: f.description } : s;
}

export type Built = {
  schema: JsonSchema;
  value: Record<string, unknown>;
  error: string | null;
};

export function buildSchemaAndDefault(fields: WizField[]): Built {
  const properties: Record<string, JsonSchema> = {};
  const required: string[] = [];
  const value: Record<string, unknown> = {};
  const seen = new Set<string>();

  for (const f of fields) {
    const name = f.key.trim();
    if (!name) {
      return { schema: { type: "object" }, value: {}, error: "Every field needs a name" };
    }
    if (seen.has(name)) {
      return {
        schema: { type: "object" },
        value: {},
        error: `Duplicate field name "${name}"`,
      };
    }
    seen.add(name);
    if (f.required) required.push(name);

    if (f.type === "enum" && (!f.enumValues || f.enumValues.length === 0)) {
      return {
        schema: { type: "object" },
        value: {},
        error: `Enum field "${name}" needs at least one option`,
      };
    }

    properties[name] = withDescription(f, fieldToSchema(f));
    value[name] = fieldToJson(f);
  }

  return {
    schema: {
      type: "object",
      properties,
      ...(required.length ? { required } : {}),
      additionalProperties: false,
    },
    value,
    error: null,
  };
}

/** Count required leaves with no value set (excludes object containers). */
export function countMissingRequired(fields: WizField[]): number {
  let n = 0;
  function walk(arr: WizField[]) {
    for (const f of arr) {
      if (f.required && f.type !== "object") {
        const v = fieldToJson(f);
        if (v === "" || v === null || v === undefined) n += 1;
      }
      if (f.children) walk(f.children);
    }
  }
  walk(fields);
  return n;
}
