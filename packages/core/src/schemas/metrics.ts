import { z } from "zod";
import { folderSchema } from "./folder";

export const metricNameSchema = z
  .string()
  .regex(/^[a-z0-9](?:[a-z0-9_-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9_-]*[a-z0-9])?)?$/)
  .max(128);

export const metricCreateSchema = z.object({
  name: metricNameSchema,
  folder: folderSchema,
  event_name: z.string().min(1),
  value_path: z.string().nullable().default(null),
  aggregation: z
    .enum(["count_users", "count_events", "sum", "avg", "retention_Nd"])
    .default("count_users"),
  winsorize_pct: z.number().int().min(1).max(99).default(99),
  min_detectable_effect: z.number().nullable().default(null),
});

export const metricUpdateSchema = z.object({
  folder: folderSchema,
  event_name: z.string().min(1).optional(),
  value_path: z.string().nullable().optional(),
  aggregation: z.enum(["count_users", "count_events", "sum", "avg", "retention_Nd"]).optional(),
  winsorize_pct: z.number().int().min(1).max(99).optional(),
  min_detectable_effect: z.number().nullable().optional(),
});

export type MetricCreateInput = z.infer<typeof metricCreateSchema>;
export type MetricUpdateInput = z.infer<typeof metricUpdateSchema>;
