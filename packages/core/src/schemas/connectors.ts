import { z } from "zod";
import { CONNECTOR_EVENTS, CONNECTOR_PROVIDERS } from "../db/schema";

export const connectorEventSchema = z.enum(CONNECTOR_EVENTS);
export const connectorProviderSchema = z.enum(CONNECTOR_PROVIDERS);

export const googleSheetsConfigSchema = z.object({
  spreadsheetId: z.string().min(1),
  spreadsheetName: z.string().optional(),
  sheetTitle: z.string().min(1),
});

export const connectorCreateSchema = z.object({
  provider: connectorProviderSchema,
  name: z.string().trim().min(1).max(80),
  events: z.array(connectorEventSchema).min(1),
});

export const connectorUpdateSchema = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  enabled: z.boolean().optional(),
  events: z.array(connectorEventSchema).min(1).optional(),
  config: z.record(z.string(), z.unknown()).optional(),
});
