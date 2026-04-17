import { z } from "zod";

export const universeCreateSchema = z.object({
  name: z.string(),
});
