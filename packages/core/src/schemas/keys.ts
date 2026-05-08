import { z } from "zod";

export const keyCreateSchema = z.object({
  type: z.enum(["server", "client", "admin"]),
});

// Hostname segments per RFC 1035 (loosely): each label 1–63 chars, alnum or
// hyphen, no leading/trailing hyphen. At least two labels (i.e. an actual
// FQDN like example.com — bare "localhost" is rejected, since this field
// guards public SDK origins). IDN inputs should be punycoded by the caller.
const FQDN_RE = /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)+$/i;

/**
 * Project domain field. Accepts:
 *   - `*` → match any origin (stored as "*").
 *   - `http(s)://<fqdn>[:port][/...]` → stored as the bare hostname (lowercased).
 *
 * Anything else is rejected. Empty is rejected. Bare hostnames (without a
 * scheme) are rejected so the input stays unambiguous and users have to
 * commit to one scheme.
 */
export const projectDomainSchema = z
  .string()
  .trim()
  .min(1, "Domain is required (use '*' to allow any origin)")
  .max(2048)
  .transform((raw, ctx) => {
    if (raw === "*") return "*";
    let url: URL;
    try {
      url = new URL(raw);
    } catch {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "Domain must include http:// or https:// (e.g. https://app.example.com), or '*' for any origin",
      });
      return z.NEVER;
    }
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Domain must use http:// or https://",
      });
      return z.NEVER;
    }
    const host = url.hostname.toLowerCase();
    if (!host || !FQDN_RE.test(host)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Domain must include a fully qualified hostname like app.example.com",
      });
      return z.NEVER;
    }
    return host;
  });

export const projectUpdateSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  domain: projectDomainSchema.optional(),
  moduleTranslations: z.boolean().optional(),
  moduleConfigs: z.boolean().optional(),
  moduleGates: z.boolean().optional(),
  moduleExperiments: z.boolean().optional(),
  moduleFeedback: z.boolean().optional(),
  moduleUser: z.boolean().optional(),
  moduleEvents: z.boolean().optional(),
});

export const projectPlanUpdateSchema = z.object({
  plan: z.enum(["free", "paid"]),
});

export type KeyCreateInput = z.infer<typeof keyCreateSchema>;
