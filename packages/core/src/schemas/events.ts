import { z } from "zod";

export const eventCreateSchema = z.object({
  name: z.string(),
});
