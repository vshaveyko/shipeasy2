import { z } from "zod";

export const configNameSchema = z.string().regex(/^[a-z0-9][a-z0-9_-]{0,63}$/);

export const configCreateSchema = z.object({
  name: configNameSchema,
  value: z.unknown(),
});

export const configUpdateSchema = z.object({
  value: z.unknown(),
});

export type ConfigCreateInput = z.infer<typeof configCreateSchema>;
export type ConfigUpdateInput = z.infer<typeof configUpdateSchema>;
