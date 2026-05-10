import { z } from "zod";

export const gateRuleSchema = z.object({
  attr: z.string().min(1),
  op: z.enum(["eq", "neq", "in", "not_in", "gt", "gte", "lt", "lte", "contains", "regex"]),
  value: z.unknown(),
});

export const gateNameSchema = z
  .string()
  .regex(/^[a-z0-9][a-z0-9_-]{0,63}$/, "lowercase, digits, _/-; max 64 chars");

const stackedConditionSchema = z.object({
  id: z.string().min(1),
  type: z.literal("condition"),
  name: z.string().optional(),
  fromTemplate: z.string().nullable().optional(),
  pass: z.enum(["all", "any"]).optional(),
  rules: z.array(gateRuleSchema).default([]),
  locked: z.boolean().optional(),
});

const stackedRolloutSchema = z.object({
  id: z.string().min(1),
  type: z.literal("rollout"),
  name: z.string().optional(),
  fromTemplate: z.string().nullable().optional(),
  rolloutPct: z.number().int().min(0).max(10000),
  bucketBy: z.string().optional(),
  salt: z.string().optional(),
  locked: z.boolean().optional(),
});

export const stackedGateEntrySchema = z.discriminatedUnion("type", [
  stackedConditionSchema,
  stackedRolloutSchema,
]);

export const gateMetadataPatchSchema = z.object({
  title: z.string().max(140).optional(),
  description: z.string().max(2000).optional(),
  folder: z.string().max(64).optional(),
  group: z.string().max(64).optional(),
  owner_email: z.string().max(190).optional(),
});

export const gateCreateSchema = z.object({
  name: gateNameSchema,
  rollout_pct: z.number().int().min(0).max(10000).default(0),
  rules: z.array(gateRuleSchema).default([]),
  salt: z.string().min(1).max(64).optional(),
});

export const gateUpdateSchema = z
  .object({
    rollout_pct: z.number().int().min(0).max(10000).optional(),
    rules: z.array(gateRuleSchema).optional(),
    enabled: z.boolean().optional(),
    stack: z.array(stackedGateEntrySchema).nullable().optional(),
  })
  .merge(gateMetadataPatchSchema);

export type GateCreateInput = z.infer<typeof gateCreateSchema>;
export type GateUpdateInput = z.infer<typeof gateUpdateSchema>;
export type StackedGateEntryInput = z.infer<typeof stackedGateEntrySchema>;

// ── Response shapes (server → client) ───────────────────────────────────────
//
// These describe what the admin API actually returns. Used by the OpenAPI
// builder; the runtime handlers don't currently `.parse()` outgoing rows
// (D1 row shape is trusted), so consider these documentation-only contracts.

export const gateResponseSchema = z.object({
  id: z.string().describe("Stable opaque gate id."),
  name: gateNameSchema,
  /** D1 stores enabled as 0/1; clients see either form. */
  enabled: z.union([z.boolean(), z.number().int().min(0).max(1)]),
  /** Rollout percentage in basis points (0–10000 = 0%–100%). */
  rolloutPct: z.number().int().min(0).max(10000),
  rules: z.array(gateRuleSchema).optional(),
  salt: z.string().optional(),
  title: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  folder: z.string().nullable().optional(),
  groupName: z.string().nullable().optional(),
  ownerEmail: z.string().nullable().optional(),
  stack: z.array(stackedGateEntrySchema).nullable().optional(),
  updatedAt: z.string().describe("ISO-8601 timestamp of last mutation."),
});

export const gateCreateResponseSchema = z.object({
  id: z.string(),
  name: gateNameSchema,
});

export const gateUpdateResponseSchema = z.object({ id: z.string() });

export const gateDeleteResponseSchema = z.object({ ok: z.literal(true) });

export const gateToggleResponseSchema = z.object({
  id: z.string(),
  enabled: z.boolean(),
});
