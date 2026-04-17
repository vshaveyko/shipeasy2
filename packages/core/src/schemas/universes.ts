import { z } from "zod";

export const universeNameSchema = z.string().regex(/^[a-z0-9][a-z0-9_-]{0,63}$/);

export const holdoutRangeSchema = z
  .tuple([z.number().int().min(0).max(9999), z.number().int().min(0).max(9999)])
  .refine(([lo, hi]) => lo <= hi, "lo must be <= hi")
  .nullable();

export const universeCreateSchema = z.object({
  name: universeNameSchema,
  unit_type: z.string().default("user_id"),
  holdout_range: holdoutRangeSchema.default(null),
});

export const universeUpdateSchema = z.object({
  holdout_range: holdoutRangeSchema.optional(),
});

export type UniverseCreateInput = z.infer<typeof universeCreateSchema>;
export type UniverseUpdateInput = z.infer<typeof universeUpdateSchema>;
