import { z } from "zod";

const profileNameSchema = z
  .string()
  .min(1)
  .max(64)
  .regex(/^[a-z0-9][a-z0-9_:.-]*$/, "lowercase, digits, _, :, ., - only");

export const profileCreateSchema = z.object({
  name: profileNameSchema,
});

export const keyPushItemSchema = z.object({
  key: z.string().min(1).max(256),
  value: z.string(),
  description: z.string().optional(),
});

export const keysPushSchema = z.object({
  profile_id: z.string().uuid(),
  chunk: z.string().min(1).max(64).default("default"),
  keys: z.array(keyPushItemSchema).min(1).max(5000),
});

export const keyUpdateSchema = z.object({
  value: z.string(),
  description: z.string().optional(),
});

export const draftCreateSchema = z.object({
  name: z.string().min(1).max(64),
  profile_id: z.string().uuid(),
  source_profile_id: z.string().uuid().optional(),
});

export const draftUpdateSchema = z.object({
  status: z.enum(["open", "merged", "abandoned"]).optional(),
});

export type ProfileCreateInput = z.infer<typeof profileCreateSchema>;
export type KeysPushInput = z.infer<typeof keysPushSchema>;
export type KeyUpdateInput = z.infer<typeof keyUpdateSchema>;
export type DraftCreateInput = z.infer<typeof draftCreateSchema>;
export type DraftUpdateInput = z.infer<typeof draftUpdateSchema>;
