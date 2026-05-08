import { z } from "zod";
import { CONFIG_ENVS } from "../db/schema";

// Allow dot-separated namespace keys e.g. `pricing.tiers`, `ranker.weights.ltr`.
// Each segment matches the old rule; whole key <=128 chars.
export const configNameSchema = z
  .string()
  .max(128)
  .regex(/^[a-z0-9](?:[a-z0-9_-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9_-]*[a-z0-9])?)*$/, {
    message: "Must be lowercase segments separated by dots (e.g. `pricing.tiers`).",
  });

export const configEnvSchema = z.enum(CONFIG_ENVS);

/** JSON Schema describing the shape of a config value.
 * Configs are object-only; the top-level `type` must be `"object"`. */
export const jsonSchemaSchema = z
  .record(z.string(), z.unknown())
  .refine((s) => s.type === "object", { message: "Top-level schema type must be 'object'" });

export type JsonSchemaInput = z.infer<typeof jsonSchemaSchema>;

/** Seed values for each env at creation time. When omitted, the initial value is applied to all envs. */
const initialValuesSchema = z.union([z.unknown(), z.record(configEnvSchema, z.unknown())]);

export const configCreateSchema = z.object({
  name: configNameSchema,
  description: z.string().max(512).optional(),
  schema: jsonSchemaSchema,
  value: initialValuesSchema.optional(),
});

/** Flat update — accepts an optional new schema and/or a flat value applied to all envs. */
export const configUpdateSchema = z.object({
  schema: jsonSchemaSchema.optional(),
  value: z.unknown().optional(),
});

/** Schema-only update — does not bump value versions or rebuild KV. */
export const configSchemaUpdateSchema = z.object({
  schema: jsonSchemaSchema,
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
export type ConfigSchemaUpdateInput = z.infer<typeof configSchemaUpdateSchema>;
export type ConfigDraftUpsertInput = z.infer<typeof configDraftUpsertSchema>;
export type ConfigPublishInput = z.infer<typeof configPublishSchema>;
