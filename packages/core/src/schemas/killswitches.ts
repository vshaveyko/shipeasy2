import { z } from "zod";
import { configEnvSchema, configNameSchema } from "./configs.js";

/** A switch key is a single lowercase segment (no dots). */
export const switchKeySchema = z
  .string()
  .max(64)
  .regex(/^[a-z0-9](?:[a-z0-9_-]*[a-z0-9])?$/, {
    message: "Switch keys must be lowercase, no dots.",
  });

/** The fixed runtime payload delivered to clients:
 *
 *   { value: <bool>, switches?: { <switch_key>: <bool>, … } }
 *
 * `switches` is optional. When present, an entry takes precedence over `value`
 * for that specific switch_key on the client. */
export const killswitchValueSchema = z.object({
  value: z.boolean(),
  switches: z.record(switchKeySchema, z.boolean()).optional(),
});

export type KillswitchValue = z.infer<typeof killswitchValueSchema>;

export const killswitchCreateSchema = z.object({
  name: configNameSchema,
  description: z.string().max(512).optional(),
  /** Default value applied to every env at creation. Defaults to `false`. */
  value: z.boolean().optional(),
  switches: z.record(switchKeySchema, z.boolean()).optional(),
});

export const killswitchUpdateSchema = z.object({
  description: z.string().max(512).nullish(),
  /** Apply a flat value to every env (publishes a new version per env). */
  value: z.boolean().optional(),
  /** Replace the switches map wholesale on every env. */
  switches: z.record(switchKeySchema, z.boolean()).optional(),
});

/** PUT one switch entry on one env. */
export const killswitchSwitchSetSchema = z.object({
  env: configEnvSchema,
  switchKey: switchKeySchema,
  value: z.boolean(),
});

/** DELETE one switch entry on one env. */
export const killswitchSwitchUnsetSchema = z.object({
  env: configEnvSchema,
  switchKey: switchKeySchema,
});

export type KillswitchCreateInput = z.infer<typeof killswitchCreateSchema>;
export type KillswitchUpdateInput = z.infer<typeof killswitchUpdateSchema>;
export type KillswitchSwitchSetInput = z.infer<typeof killswitchSwitchSetSchema>;
export type KillswitchSwitchUnsetInput = z.infer<typeof killswitchSwitchUnsetSchema>;
