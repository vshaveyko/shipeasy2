import { z } from "zod";

export const configCreateSchema = z.object({
  name: z.string(),
  value: z.unknown(),
});
