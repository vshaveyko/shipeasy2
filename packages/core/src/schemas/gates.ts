import { z } from "zod";

export const gateCreateSchema = z.object({
  name: z.string().regex(/^[a-z0-9][a-z0-9_-]{0,63}$/),
  rollout_pct: z.number().int().min(0).max(10000),
  rules: z.array(z.unknown()).default([]),
  killswitch: z.boolean().default(false),
});
