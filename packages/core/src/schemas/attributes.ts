import { z } from "zod";

export const attributeNameSchema = z.string().regex(/^[a-z0-9][a-z0-9_-]{0,63}$/);

export const attributeCreateSchema = z.object({
  name: attributeNameSchema,
  type: z.enum(["string", "number", "boolean", "enum", "date"]),
  enum_values: z.array(z.string()).nullable().default(null),
  required: z.boolean().default(false),
  description: z.string().optional(),
  sdk_path: z.string().optional(),
});

export const attributeUpdateSchema = z.object({
  type: z.enum(["string", "number", "boolean", "enum", "date"]).optional(),
  enum_values: z.array(z.string()).nullable().optional(),
  required: z.boolean().optional(),
  description: z.string().optional(),
  sdk_path: z.string().optional(),
});

export type AttributeCreateInput = z.infer<typeof attributeCreateSchema>;
export type AttributeUpdateInput = z.infer<typeof attributeUpdateSchema>;
