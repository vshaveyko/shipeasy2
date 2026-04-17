import { z } from "zod";

export const experimentCreateSchema = z.object({
  name: z.string(),
  universe_id: z.string(),
});
