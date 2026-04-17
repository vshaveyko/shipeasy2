import { z } from "zod";

export const experimentNameSchema = z.string().regex(/^[a-z0-9][a-z0-9_-]{0,63}$/);

export const experimentGroupSchema = z.object({
  name: z.string().min(1).max(64),
  weight: z.number().int().min(0).max(10000),
  params: z.record(z.string(), z.unknown()).default({}),
});

export const paramSchemaSchema = z.record(z.string(), z.enum(["string", "bool", "number"]));

export const experimentCreateSchema = z
  .object({
    name: experimentNameSchema,
    universe: z.string().min(1),
    targeting_gate: z.string().nullable().default(null),
    allocation_pct: z.number().int().min(0).max(10000).default(0),
    salt: z.string().min(1).max(64).optional(),
    params: paramSchemaSchema.default({}),
    groups: z.array(experimentGroupSchema).min(2),
    significance_threshold: z.number().min(0.0001).max(0.5).default(0.05),
    min_runtime_days: z.number().int().min(0).max(365).default(0),
    min_sample_size: z.number().int().min(1).default(100),
    sequential_testing: z.boolean().default(false),
  })
  .refine(
    (e) => e.groups.reduce((s, g) => s + g.weight, 0) === 10000,
    "groups weights must sum to exactly 10000",
  );

export const experimentUpdateSchema = z.object({
  name: experimentNameSchema.optional(),
  targeting_gate: z.string().nullable().optional(),
  allocation_pct: z.number().int().min(0).max(10000).optional(),
  salt: z.string().min(1).max(64).optional(),
  universe: z.string().optional(),
  params: paramSchemaSchema.optional(),
  groups: z.array(experimentGroupSchema).min(2).optional(),
  significance_threshold: z.number().min(0.0001).max(0.5).optional(),
  min_runtime_days: z.number().int().min(0).max(365).optional(),
  min_sample_size: z.number().int().min(1).optional(),
  sequential_testing: z.boolean().optional(),
});

export const experimentStatusUpdateSchema = z.object({
  status: z.enum(["draft", "running", "stopped", "archived"]),
});

export const experimentMetricsUpdateSchema = z.object({
  metrics: z.array(
    z.object({
      metric_id: z.string(),
      role: z.enum(["goal", "guardrail", "secondary"]),
    }),
  ),
});

export type ExperimentCreateInput = z.infer<typeof experimentCreateSchema>;
export type ExperimentUpdateInput = z.infer<typeof experimentUpdateSchema>;
