import { z } from "zod";

export const keyCreateSchema = z.object({
  type: z.enum(["server", "client", "admin"]),
});

export const projectUpdateSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  domain: z
    .string()
    .min(3)
    .max(253)
    .regex(/^[a-zA-Z0-9][a-zA-Z0-9\-.*]+[a-zA-Z0-9]$/, "Must be a valid hostname or wildcard")
    .optional(),
});

export const projectPlanUpdateSchema = z.object({
  plan: z.enum(["free", "paid"]),
});

export type KeyCreateInput = z.infer<typeof keyCreateSchema>;
