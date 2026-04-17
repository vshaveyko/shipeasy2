import { z } from "zod";

export const keyCreateSchema = z.object({
  type: z.enum(["server", "client", "admin"]),
});
