// MetricDef = how a logical metric maps to AE column slots.
// Built from the events table at compile time.

export type PropertyType = "string" | "number" | "boolean";

export type PropertyDef = {
  name: string;
  type: PropertyType;
};

export type MetricDef = {
  // AE dataset binding name (e.g. "METRIC_EVENTS")
  dataset: string;
  // Filter pinned on the event_name column.
  eventName: string;
  // Per-event property slot layout. Each entry's index = its slot within its type bucket.
  // Strings land in blobs[FIXED_BLOB_COUNT + index]; numbers in doubles[FIXED_DOUBLE_COUNT + index].
  // Booleans use a number slot (0/1).
  properties: PropertyDef[];
  // Optional default numeric column for sum/avg/min/max/quantile when valueLabel is unset.
  // For shipeasy METRIC_EVENTS this is "value" (doubles[0]).
  defaultValueColumn?: string;
};

export type Registry = Record<string, MetricDef>;

// AE wire layout for METRIC_EVENTS:
// blobs:   [event_name, user_id, anonymous_id, str_prop_0..str_prop_4]
// doubles: [value, ts, num_prop_0..num_prop_4]
export const METRIC_EVENTS_FIXED_BLOBS = ["event_name", "user_id", "anonymous_id"];
export const METRIC_EVENTS_FIXED_DOUBLES = ["value", "ts"];
export const METRIC_EVENTS_MAX_PROPERTIES_PER_BUCKET = 5;

// Reserved columns the DSL may reference by name in filters/groupBy
// (in addition to whatever is in MetricDef.properties).
export const RESERVED_LABELS: Record<string, { column: string; kind: "string" | "number" }> = {
  user_id: { column: "blob2", kind: "string" },
  anonymous_id: { column: "blob3", kind: "string" },
};

// Resolve a label name to an AE column reference + value kind, using both
// reserved labels and the event's per-property registry.
export function resolveLabel(
  label: string,
  def: MetricDef,
): { column: string; kind: "string" | "number" } | null {
  const reserved = RESERVED_LABELS[label];
  if (reserved) return reserved;

  const strSlot = def.properties
    .filter((p) => p.type === "string")
    .findIndex((p) => p.name === label);
  if (strSlot >= 0) {
    if (strSlot >= METRIC_EVENTS_MAX_PROPERTIES_PER_BUCKET) return null;
    return {
      column: `blob${METRIC_EVENTS_FIXED_BLOBS.length + strSlot + 1}`, // blobs are 1-indexed in AE SQL
      kind: "string",
    };
  }

  const numProps = def.properties.filter((p) => p.type === "number" || p.type === "boolean");
  const numSlot = numProps.findIndex((p) => p.name === label);
  if (numSlot >= 0) {
    if (numSlot >= METRIC_EVENTS_MAX_PROPERTIES_PER_BUCKET) return null;
    return {
      column: `double${METRIC_EVENTS_FIXED_DOUBLES.length + numSlot + 1}`,
      kind: "number",
    };
  }
  return null;
}

export function resolveValueColumn(label: string | undefined, def: MetricDef): string {
  if (!label) {
    if (!def.defaultValueColumn) {
      throw new Error(
        `Aggregation needs a value label, and event '${def.eventName}' has no default value column`,
      );
    }
    return def.defaultValueColumn;
  }
  const r = resolveLabel(label, def);
  if (!r || r.kind !== "number") {
    throw new Error(`Value label '${label}' is not a numeric property of event '${def.eventName}'`);
  }
  return r.column;
}
