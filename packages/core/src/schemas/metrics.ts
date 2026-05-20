import { z } from "zod";
import { folderSchema } from "./folder";

export const metricNameSchema = z
  .string()
  .regex(/^[a-z0-9](?:[a-z0-9_-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9_-]*[a-z0-9])?)?$/)
  .max(128);

const labelNameSchema = z
  .string()
  .regex(/^[a-z_][a-z0-9_]{0,63}$/i, "label must be a valid identifier");

const aggKindSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("count_users") }),
  z.object({ kind: z.literal("count_events") }),
  z.object({ kind: z.literal("sum") }),
  z.object({ kind: z.literal("avg") }),
  z.object({ kind: z.literal("min") }),
  z.object({ kind: z.literal("max") }),
  z.object({ kind: z.literal("unique") }),
  z.object({
    kind: z.literal("quantile"),
    p: z.union([
      z.literal(0.5),
      z.literal(0.75),
      z.literal(0.9),
      z.literal(0.95),
      z.literal(0.99),
      z.literal(0.999),
    ]),
  }),
  z.object({ kind: z.literal("retention_Nd"), n: z.number().int().min(1).max(90) }),
]);

export const metricFilterSchema = z.object({
  label: labelNameSchema,
  op: z.enum(["=", "!=", "=~", "!~"]),
  value: z.string().max(512),
});

export const metricGroupBySchema = z.object({
  op: z.enum(["by", "without"]),
  labels: z.array(labelNameSchema).max(5),
});

export const metricQueryIrSchema = z.object({
  agg: aggKindSchema,
  metric: z.string().min(1).max(128),
  valueLabel: z.string().min(1).max(128).optional(),
  filters: z.array(metricFilterSchema).max(16).default([]),
  groupBy: metricGroupBySchema.optional(),
});

export type MetricQueryIRInput = z.infer<typeof metricQueryIrSchema>;

// Legacy enum kept on the row for the existing experiment analyzer. Derived from the IR
// at write time so dashboards (IR-aware) and the analyzer (enum-aware) never disagree.
export const LEGACY_AGGS = ["count_users", "count_events", "sum", "avg", "retention_Nd"] as const;
export type LegacyAgg = (typeof LEGACY_AGGS)[number];

export function legacyAggFromIr(ir: MetricQueryIRInput): LegacyAgg {
  switch (ir.agg.kind) {
    case "count_users":
    case "count_events":
    case "sum":
    case "avg":
    case "retention_Nd":
      return ir.agg.kind;
    case "min":
    case "max":
    case "unique":
    case "quantile":
      // No exact per-user reducer. avg is the closest mean-based one t-test can use.
      return "avg";
  }
}

export function legacyValuePathFromIr(ir: MetricQueryIRInput): string | null {
  return ir.valueLabel ?? null;
}

export const metricCreateSchema = z
  .object({
    name: metricNameSchema,
    folder: folderSchema,
    event_name: z.string().min(1),
    // Accept either the IR JSON (`query_ir`) OR the DSL text (`query`). Exactly one
    // must be present; handlers parse text → IR before persisting.
    query_ir: metricQueryIrSchema.optional(),
    query: z.string().min(1).max(4096).optional(),
    winsorize_pct: z.number().int().min(1).max(99).default(99),
    min_detectable_effect: z.number().nullable().default(null),
  })
  .refine((d) => !!d.query_ir !== !!d.query, {
    message: "Provide exactly one of `query_ir` or `query`",
    path: ["query"],
  });

export const metricUpdateSchema = z
  .object({
    folder: folderSchema,
    event_name: z.string().min(1).optional(),
    query_ir: metricQueryIrSchema.optional(),
    query: z.string().min(1).max(4096).optional(),
    winsorize_pct: z.number().int().min(1).max(99).optional(),
    min_detectable_effect: z.number().nullable().optional(),
  })
  .refine((d) => !(d.query_ir && d.query), {
    message: "Provide at most one of `query_ir` or `query`",
    path: ["query"],
  });

export type MetricCreateInput = z.infer<typeof metricCreateSchema>;
export type MetricUpdateInput = z.infer<typeof metricUpdateSchema>;
