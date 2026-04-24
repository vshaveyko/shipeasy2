import { z } from "zod";
import { CONFIG_ENVS, CONFIG_VALUE_TYPES } from "../db/schema";

// Allow dot-separated namespace keys e.g. `pricing.tiers`, `ranker.weights.ltr`.
// Each segment matches the old rule; whole key <=128 chars.
export const configNameSchema = z
  .string()
  .max(128)
  .regex(/^[a-z0-9](?:[a-z0-9_-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9_-]*[a-z0-9])?)*$/, {
    message: "Must be lowercase segments separated by dots (e.g. `pricing.tiers`).",
  });

export const configEnvSchema = z.enum(CONFIG_ENVS);
export const configValueTypeSchema = z.enum(CONFIG_VALUE_TYPES);

/** Seed values for each env at creation time. When omitted, the initial value is applied to all envs. */
const initialValuesSchema = z.union([z.unknown(), z.record(configEnvSchema, z.unknown())]);

export const configCreateSchema = z.object({
  name: configNameSchema,
  description: z.string().max(512).optional(),
  valueType: configValueTypeSchema.optional(),
  value: initialValuesSchema,
});

/** Legacy flat update — updates all envs to the same value. Kept for back-compat of the
 * existing API shape; new UI uses draft/publish instead. */
export const configUpdateSchema = z.object({
  value: z.unknown(),
});

export const configDraftUpsertSchema = z.object({
  env: configEnvSchema,
  value: z.unknown(),
});

export const configPublishSchema = z.object({
  env: configEnvSchema,
});

export type ConfigCreateInput = z.infer<typeof configCreateSchema>;
export type ConfigUpdateInput = z.infer<typeof configUpdateSchema>;
export type ConfigDraftUpsertInput = z.infer<typeof configDraftUpsertSchema>;
export type ConfigPublishInput = z.infer<typeof configPublishSchema>;
