import { z } from "zod";

export const gateRuleSchema = z.object({
  attr: z.string().min(1),
  op: z.enum(["eq", "neq", "in", "not_in", "gt", "gte", "lt", "lte", "contains", "regex"]),
  value: z.unknown(),
});

export const gateNameSchema = z
  .string()
  .regex(/^[a-z0-9][a-z0-9_-]{0,63}$/, "lowercase, digits, _/-; max 64 chars");

export const gateCreateSchema = z.object({
  name: gateNameSchema,
  rollout_pct: z.number().int().min(0).max(10000).default(0),
  rules: z.array(gateRuleSchema).default([]),
  salt: z.string().min(1).max(64).optional(),
  killswitch: z.boolean().default(false),
});

export const gateUpdateSchema = z.object({
  rollout_pct: z.number().int().min(0).max(10000).optional(),
  rules: z.array(gateRuleSchema).optional(),
  killswitch: z.boolean().optional(),
  enabled: z.boolean().optional(),
});

export type GateCreateInput = z.infer<typeof gateCreateSchema>;
export type GateUpdateInput = z.infer<typeof gateUpdateSchema>;
