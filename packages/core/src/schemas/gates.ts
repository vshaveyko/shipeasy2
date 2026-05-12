import { z } from "zod";

export const gateRuleSchema = z
  .object({
    attr: z
      .string()
      .min(1)
      .describe(
        "Attribute key on the evaluation context (e.g. `country`, `plan`, `email`). Matched case-sensitively against `Shipeasy.checkGate(user, name)` input.",
      ),
    op: z
      .enum(["eq", "neq", "in", "not_in", "gt", "gte", "lt", "lte", "contains", "regex"])
      .describe(
        "Comparison operator. Equality: `eq`/`neq`. Set membership: `in`/`not_in` (value is an array). Numeric order: `gt`/`gte`/`lt`/`lte`. String: `contains` (substring), `regex` (JS-flavour pattern, value is the pattern string).",
      ),
    value: z
      .unknown()
      .describe(
        "Operand. Shape depends on `op`: scalar for `eq/neq/gt/gte/lt/lte/contains`; array of scalars for `in/not_in`; string pattern for `regex`.",
      ),
  })
  .describe(
    "Single targeting predicate. A gate's `rules` array is evaluated with AND semantics; use the gatekeeper `stack` for OR / fall-through logic.",
  );

export const gateNameSchema = z
  .string()
  .regex(/^[a-z0-9][a-z0-9_-]{0,63}$/, "lowercase, digits, _/-; max 64 chars")
  .describe(
    "Stable gate key used by SDKs (`Shipeasy.checkGate(user, '<name>')`). Lowercase letters, digits, `_` or `-`, must start with a letter/digit, max 64 chars. Immutable after create — rename = delete + recreate.",
  );

const stackedConditionSchema = z
  .object({
    id: z
      .string()
      .min(1)
      .describe(
        "Client-supplied stable id for the stack entry (used for React keys, audit diffs).",
      ),
    type: z
      .literal("condition")
      .describe("Discriminator. `condition` = rule-based predicate sub-gate."),
    name: z.string().optional().describe("Human label shown in the dashboard."),
    fromTemplate: z
      .string()
      .nullable()
      .optional()
      .describe(
        "Id of the project template this entry was seeded from, or `null` if hand-authored.",
      ),
    pass: z
      .enum(["all", "any"])
      .optional()
      .describe("Combinator across `rules`. `all` = AND (default), `any` = OR."),
    rules: z
      .array(gateRuleSchema)
      .default([])
      .describe("Predicates evaluated under `pass`. Empty array = match nothing."),
    locked: z
      .boolean()
      .optional()
      .describe("If `true`, dashboard hides edit controls (e.g. the trailing public-floor entry)."),
  })
  .describe(
    "Rule-based sub-gate. When matched, evaluation short-circuits and the gate returns `true` for the current caller.",
  );

const stackedRolloutSchema = z
  .object({
    id: z.string().min(1).describe("Client-supplied stable id for the stack entry."),
    type: z.literal("rollout").describe("Discriminator. `rollout` = percentage-bucket sub-gate."),
    name: z.string().optional().describe("Human label shown in the dashboard."),
    fromTemplate: z.string().nullable().optional().describe("Source template id, or `null`."),
    rolloutPct: z
      .number()
      .int()
      .min(0)
      .max(10000)
      .describe(
        "Bucket size in basis points (0–10000 = 0%–100%). `5000` = 50%, `100` = 1%, allows sub-1% precision.",
      ),
    bucketBy: z
      .string()
      .optional()
      .describe(
        "Attribute used to hash the caller into a bucket. Defaults to `user.userID`. Use e.g. `accountID` to bucket whole accounts together.",
      ),
    salt: z
      .string()
      .optional()
      .describe(
        "Per-entry hash salt. Defaults to the gate's salt. Set explicitly to keep two rollouts independent or correlated across gates.",
      ),
    locked: z.boolean().optional().describe("If `true`, dashboard hides edit controls."),
  })
  .describe(
    "Percentage-rollout sub-gate. Hashes `bucketBy` (default `userID`) with `salt` and returns `true` for `rolloutPct/10000` fraction of callers.",
  );

export const stackedGateEntrySchema = z
  .discriminatedUnion("type", [stackedConditionSchema, stackedRolloutSchema])
  .describe(
    "One entry in the ordered gatekeeper stack. Evaluated top-to-bottom; first matching entry decides. Mix `condition` and `rollout` entries to express `internal-only` + `1% beta` + `50% public` in a single gate.",
  );

const gateMetadataFields = {
  title: z
    .string()
    .max(140)
    .optional()
    .describe("Human-readable title shown in the dashboard. Free-form, no key format constraint."),
  description: z
    .string()
    .max(2000)
    .optional()
    .describe("Long-form description / runbook. Markdown is rendered in the dashboard."),
  folder: z
    .string()
    .max(64)
    .optional()
    .describe(
      "Folder label for dashboard organisation. Free-form; folders are inferred from the set of values.",
    ),
  group: z
    .string()
    .max(64)
    .optional()
    .describe("Group label for dashboard organisation (e.g. team or product area)."),
  owner_email: z
    .string()
    .max(190)
    .optional()
    .describe("Owner contact. Displayed verbatim; not used for auth."),
};

export const gateMetadataPatchSchema = z.object(gateMetadataFields);

export const gateCreateSchema = z
  .object({
    name: gateNameSchema,
    enabled: z
      .boolean()
      .default(true)
      .describe(
        "Master switch. Defaults to `true`. Set `false` to create the gate disabled (evaluates to `false` regardless of rules/rollout); flip on via `POST /{id}/enable` or PATCH.",
      ),
    rollout_pct: z
      .number()
      .int()
      .min(0)
      .max(10000)
      .default(0)
      .describe(
        "Initial rollout in basis points (0–10000 = 0%–100%). Use `0` to create the gate dark and ramp via PATCH after deploy validation.",
      ),
    rules: z
      .array(gateRuleSchema)
      .default([])
      .describe(
        "Targeting predicates. AND-combined. If non-empty, the gate returns `true` only for callers that satisfy every rule **and** fall under `rollout_pct`.",
      ),
    salt: z
      .string()
      .min(1)
      .max(64)
      .optional()
      .describe(
        "Hash salt for percentage bucketing. Auto-generated if omitted. Provide explicitly to keep a gate's buckets stable across delete/recreate. **Immutable after create** — there is no PATCH for `salt` because changing it would re-bucket every caller.",
      ),
    stack: z
      .array(stackedGateEntrySchema)
      .nullable()
      .optional()
      .describe(
        "Optional gatekeeper stack. When provided, takes precedence over `rules` + `rollout_pct` at evaluation time. Omit (or pass `null`) for a flat gate.",
      ),
    ...gateMetadataFields,
  })
  .describe(
    "Body for `POST /api/admin/gates`. At minimum supply `name`; everything else has sensible defaults.",
  );

export const gateUpdateSchema = z
  .object({
    rollout_pct: z
      .number()
      .int()
      .min(0)
      .max(10000)
      .optional()
      .describe("New rollout in basis points (0–10000 = 0%–100%). Omit to leave unchanged."),
    rules: z
      .array(gateRuleSchema)
      .optional()
      .describe(
        "Replaces the rule list wholesale. To add a value to an `in` rule, send the full new `rules` array with the augmented `value` (e.g. previous `['US','CA']` → `['US','CA','GB']`).",
      ),
    enabled: z
      .boolean()
      .optional()
      .describe(
        "Master switch. `false` makes the gate evaluate to `false` for every caller regardless of `rollout_pct`, `rules`, or `stack` — use as kill switch.",
      ),
    stack: z
      .array(stackedGateEntrySchema)
      .nullable()
      .optional()
      .describe(
        "Replaces the gatekeeper stack wholesale. Send `null` to revert to flat `rules` + `rollout_pct` evaluation.",
      ),
    ...gateMetadataFields,
  })
  .describe(
    "Body for `PATCH /api/admin/gates/{id}`. Partial — only supplied fields change. Array fields (`rules`, `stack`) replace, not merge.",
  );

export type GateCreateInput = z.input<typeof gateCreateSchema>;
export type GateUpdateInput = z.input<typeof gateUpdateSchema>;
export type StackedGateEntryInput = z.input<typeof stackedGateEntrySchema>;

// ── Response shapes (server → client) ───────────────────────────────────────
//
// These describe what the admin API actually returns. Used by the OpenAPI
// builder; the runtime handlers don't currently `.parse()` outgoing rows
// (D1 row shape is trusted), so consider these documentation-only contracts.

export const gateResponseSchema = z.object({
  id: z.string().describe("Stable opaque gate id (`gat_…`)."),
  name: gateNameSchema,
  /** D1 stores enabled as 0/1; clients see either form. */
  enabled: z
    .union([z.boolean(), z.number().int().min(0).max(1)])
    .describe("Master switch. Returned as `1`/`0` from D1; treat truthy as enabled."),
  /** Rollout percentage in basis points (0–10000 = 0%–100%). */
  rolloutPct: z
    .number()
    .int()
    .min(0)
    .max(10000)
    .describe("Current rollout in basis points (0–10000)."),
  rules: z.array(gateRuleSchema).optional(),
  salt: z.string().optional().describe("Hash salt used for percentage bucketing."),
  title: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  folder: z.string().nullable().optional(),
  groupName: z
    .string()
    .nullable()
    .optional()
    .describe("Group label (note: `groupName` in response, `group` in request)."),
  ownerEmail: z
    .string()
    .nullable()
    .optional()
    .describe("Owner email (note: `ownerEmail` in response, `owner_email` in request)."),
  stack: z.array(stackedGateEntrySchema).nullable().optional(),
  updatedAt: z.string().describe("ISO-8601 timestamp of last mutation."),
});

export const gateCreateResponseSchema = z.object({
  id: z.string().describe("Newly assigned gate id (`gat_…`)."),
  name: gateNameSchema,
});

export const gateUpdateResponseSchema = z
  .object({ id: z.string().describe("Gate id that was updated.") })
  .describe("Update returns only the id — re-fetch via `GET /api/admin/gates` for the full row.");

export const gateDeleteResponseSchema = z.object({ ok: z.literal(true) });

export const gateToggleResponseSchema = z.object({
  id: z.string(),
  enabled: z.boolean(),
});
