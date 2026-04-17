import { z } from "zod";

export const keyCreateSchema = z.object({
  type: z.enum(["server", "client", "admin"]),
});

export const projectUpdateSchema = z.object({
  name: z.string().min(1).max(120).optional(),
});

export const projectPlanUpdateSchema = z.object({
  plan: z.enum(["free", "pro", "premium", "enterprise"]),
});

export type KeyCreateInput = z.infer<typeof keyCreateSchema>;
