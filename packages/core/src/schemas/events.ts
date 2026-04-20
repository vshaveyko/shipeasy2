import { z } from "zod";

export const eventNameSchema = z.string().regex(/^[a-zA-Z0-9_][a-zA-Z0-9_\-.]{0,127}$/);

export const eventPropertySchema = z.object({
  name: z.string().min(1).max(64),
  type: z.enum(["string", "number", "boolean"]),
  required: z.boolean().default(false),
  description: z.string().default(""),
});

export const eventCreateSchema = z.object({
  name: eventNameSchema,
  description: z.string().optional(),
  properties: z.array(eventPropertySchema).default([]),
});

export const eventUpdateSchema = z.object({
  description: z.string().optional(),
  properties: z.array(eventPropertySchema).optional(),
});

export const eventApproveSchema = z.object({
  description: z.string().optional(),
  properties: z.array(eventPropertySchema).optional(),
});

export type EventCreateInput = z.infer<typeof eventCreateSchema>;
export type EventUpdateInput = z.infer<typeof eventUpdateSchema>;
