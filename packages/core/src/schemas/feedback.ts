import { z } from "zod";
import { BUG_STATUSES, FEATURE_REQUEST_STATUSES, FEATURE_REQUEST_IMPORTANCES } from "../db/schema";

const titleSchema = z.string().trim().min(1).max(200);

export const bugCreateSchema = z.object({
  title: titleSchema,
  stepsToReproduce: z.string().max(8000).optional().default(""),
  actualResult: z.string().max(8000).optional().default(""),
  expectedResult: z.string().max(8000).optional().default(""),
  reporterEmail: z.string().email().optional().nullable(),
  pageUrl: z.string().url().optional().nullable(),
  userAgent: z.string().max(500).optional().nullable(),
  viewport: z.string().max(40).optional().nullable(),
  context: z.record(z.string(), z.unknown()).optional().nullable(),
});

export const bugUpdateSchema = z.object({
  title: titleSchema.optional(),
  stepsToReproduce: z.string().max(8000).optional(),
  actualResult: z.string().max(8000).optional(),
  expectedResult: z.string().max(8000).optional(),
  status: z.enum(BUG_STATUSES).optional(),
});

export const featureRequestCreateSchema = z.object({
  title: titleSchema,
  description: z.string().max(8000).optional().default(""),
  useCase: z.string().max(8000).optional().default(""),
  importance: z.enum(FEATURE_REQUEST_IMPORTANCES).optional().default("nice_to_have"),
  reporterEmail: z.string().email().optional().nullable(),
  pageUrl: z.string().url().optional().nullable(),
  userAgent: z.string().max(500).optional().nullable(),
  context: z.record(z.string(), z.unknown()).optional().nullable(),
});

export const featureRequestUpdateSchema = z.object({
  title: titleSchema.optional(),
  description: z.string().max(8000).optional(),
  useCase: z.string().max(8000).optional(),
  importance: z.enum(FEATURE_REQUEST_IMPORTANCES).optional(),
  status: z.enum(FEATURE_REQUEST_STATUSES).optional(),
});

export type BugCreateInput = z.infer<typeof bugCreateSchema>;
export type BugUpdateInput = z.infer<typeof bugUpdateSchema>;
export type FeatureRequestCreateInput = z.infer<typeof featureRequestCreateSchema>;
export type FeatureRequestUpdateInput = z.infer<typeof featureRequestUpdateSchema>;
