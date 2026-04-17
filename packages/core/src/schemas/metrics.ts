import { z } from "zod";

export const metricCreateSchema = z.object({
  name: z.string(),
});
