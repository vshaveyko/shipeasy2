import { z } from "zod";

export const attributeCreateSchema = z.object({
  name: z.string(),
});
