// Drizzle schema — source of truth for D1.
// See experiment-platform/01-schema.md for the full table layout.

import {
  sqliteTable,
  text,
  real,
  integer,
  uniqueIndex,
  index,
  primaryKey,
} from "drizzle-orm/sqlite-core";

export type GateRule = { attr: string; op: string; value: unknown };

export type ExperimentGroup = {
  name: string;
  weight: number;
  params: Record<string, unknown>;
};

export type ParamSchema = Record<string, "string" | "bool" | "number">;

export type EventProperty = {
  name: string;
  type: "string" | "number" | "boolean";
  required: boolean;
  description: string;
};

export const projects = sqliteTable("projects", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  ownerEmail: text("owner_email").notNull().unique(),
  plan: text("plan", { enum: ["free", "pro", "premium", "enterprise"] })
    .notNull()
    .default("free"),
  status: text("status", { enum: ["active", "inactive"] })
    .notNull()
    .default("active"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export type ProjectMemberRole = "admin" | "editor" | "viewer";
export type ProjectMemberStatus = "active" | "pending" | "removed";

export const projectMembers = sqliteTable(
  "project_members",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    role: text("role", { enum: ["admin", "editor", "viewer"] })
      .notNull()
      .default("editor"),
    status: text("status", { enum: ["active", "pending", "removed"] })
      .notNull()
      .default("pending"),
    invitedByEmail: text("invited_by_email").notNull(),
    invitedAt: text("invited_at").notNull(),
    acceptedAt: text("accepted_at"),
    removedAt: text("removed_at"),
  },
  (t) => ({
    projectIdx: index("project_members_project").on(t.projectId, t.status),
    projectEmailUniq: uniqueIndex("project_members_project_email").on(t.projectId, t.email),
  }),
);

export const sdkKeys = sqliteTable(
  "sdk_keys",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    keyHash: text("key_hash").unique().notNull(),
    type: text("type", { enum: ["server", "client", "admin"] }).notNull(),
    scope: text("scope", { enum: ["experiments", "i18n"] })
      .notNull()
      .default("experiments"),
    createdAt: text("created_at").notNull(),
    revokedAt: text("revoked_at"),
    expiresAt: text("expires_at"),
  },
  (t) => ({ hashIdx: index("sdk_keys_hash").on(t.keyHash) }),
);

export const cliAuthSessions = sqliteTable(
  "cli_auth_sessions",
  {
    state: text("state").primaryKey(),
    codeChallenge: text("code_challenge").notNull(),
    projectId: text("project_id").references(() => projects.id),
    tokenHash: text("token_hash"),
    status: text("status", { enum: ["pending", "complete", "expired"] })
      .notNull()
      .default("pending"),
    createdAt: text("created_at").notNull(),
    expiresAt: text("expires_at").notNull(),
    completedAt: text("completed_at"),
  },
  (t) => ({ expiresIdx: index("cli_auth_sessions_expires").on(t.expiresAt) }),
);

export const cliTokens = sqliteTable(
  "cli_tokens",
  {
    tokenId: text("token_id").primaryKey(),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    userEmail: text("user_email").notNull(),
    issuedAt: text("issued_at").notNull(),
    expiresAt: text("expires_at").notNull(),
    revokedAt: text("revoked_at"),
    lastUsedAt: text("last_used_at"),
  },
  (t) => ({
    projectIdx: index("cli_tokens_project").on(t.projectId),
    expiresIdx: index("cli_tokens_expires").on(t.expiresAt),
  }),
);

export const analysisFailures = sqliteTable("analysis_failures", {
  projectId: text("project_id")
    .primaryKey()
    .references(() => projects.id),
  failedAt: text("failed_at").notNull(),
  retryCount: integer("retry_count").notNull().default(3),
  messageBody: text("message_body"),
  resolvedAt: text("resolved_at"),
});

export const systemHealth = sqliteTable("system_health", {
  key: text("key").primaryKey(),
  lastFiredAt: text("last_fired_at").notNull(),
  projectsEnqueued: integer("projects_enqueued"),
});

export const auditLog = sqliteTable(
  "audit_log",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id),
    actorEmail: text("actor_email").notNull(),
    actorType: text("actor_type", { enum: ["user", "cli", "system"] }).notNull(),
    action: text("action").notNull(),
    resourceType: text("resource_type").notNull(),
    resourceId: text("resource_id"),
    payload: text("payload"),
    createdAt: text("created_at").notNull(),
  },
  (t) => ({
    projectIdx: index("audit_log_project").on(t.projectId, t.createdAt),
    actorIdx: index("audit_log_actor").on(t.actorEmail),
    resourceIdx: index("audit_log_resource").on(t.resourceType, t.resourceId),
  }),
);

export const gates = sqliteTable(
  "gates",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    rules: text("rules", { mode: "json" }).$type<GateRule[]>().notNull(),
    rolloutPct: integer("rollout_pct").notNull().default(0),
    salt: text("salt").notNull(),
    enabled: integer("enabled").notNull().default(1),
    killswitch: integer("killswitch").notNull().default(0),
    updatedAt: text("updated_at").notNull(),
    deletedAt: text("deleted_at"),
  },
  (t) => ({
    projectIdx: index("gates_project").on(t.projectId),
    projectNameUniq: uniqueIndex("gates_project_name").on(t.projectId, t.name),
  }),
);

export const CONFIG_ENVS = ["dev", "staging", "prod"] as const;
export type ConfigEnv = (typeof CONFIG_ENVS)[number];
export const CONFIG_VALUE_TYPES = ["string", "number", "boolean", "object", "array"] as const;
export type ConfigValueType = (typeof CONFIG_VALUE_TYPES)[number];

export const configs = sqliteTable(
  "configs",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description"),
    valueType: text("value_type", { enum: CONFIG_VALUE_TYPES }).notNull().default("object"),
    updatedAt: text("updated_at").notNull(),
    deletedAt: text("deleted_at"),
  },
  (t) => ({ uniq: uniqueIndex("configs_project_name").on(t.projectId, t.name) }),
);

/** Per-(config, env) published value history. `version` is monotonic per (configId, env).
 *  `projectId` is denormalized so scopedDb can enforce project scoping without a join. */
export const configValues = sqliteTable(
  "config_values",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    configId: text("config_id")
      .notNull()
      .references(() => configs.id, { onDelete: "cascade" }),
    env: text("env", { enum: CONFIG_ENVS }).notNull(),
    valueJson: text("value_json", { mode: "json" }).$type<unknown>().notNull(),
    version: integer("version").notNull(),
    publishedAt: text("published_at").notNull(),
    publishedBy: text("published_by").notNull(),
  },
  (t) => ({
    projectIdx: index("config_values_project").on(t.projectId),
    configEnvIdx: index("config_values_config_env").on(t.configId, t.env, t.version),
    uniq: uniqueIndex("config_values_config_env_version").on(t.configId, t.env, t.version),
  }),
);

/** Open, unpublished draft — at most one per (configId, env). */
export const configDrafts = sqliteTable(
  "config_drafts",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    configId: text("config_id")
      .notNull()
      .references(() => configs.id, { onDelete: "cascade" }),
    env: text("env", { enum: CONFIG_ENVS }).notNull(),
    valueJson: text("value_json", { mode: "json" }).$type<unknown>().notNull(),
    baseVersion: integer("base_version").notNull(),
    authorEmail: text("author_email").notNull(),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (t) => ({
    projectIdx: index("config_drafts_project").on(t.projectId),
    uniq: uniqueIndex("config_drafts_config_env").on(t.configId, t.env),
  }),
);

export const universes = sqliteTable(
  "universes",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    unitType: text("unit_type").notNull().default("user_id"),
    holdoutRange: text("holdout_range", { mode: "json" }).$type<[number, number] | null>(),
    createdAt: text("created_at").notNull(),
    deletedAt: text("deleted_at"),
  },
  (t) => ({
    projectIdx: index("universes_project").on(t.projectId),
    projectUniq: uniqueIndex("universes_project_name").on(t.projectId, t.name),
  }),
);

export const experiments = sqliteTable(
  "experiments",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    universe: text("universe").notNull(),
    targetingGate: text("targeting_gate"),
    allocationPct: integer("allocation_pct").notNull().default(0),
    salt: text("salt").notNull(),
    params: text("params", { mode: "json" }).$type<ParamSchema>().notNull(),
    groups: text("groups", { mode: "json" }).$type<ExperimentGroup[]>().notNull(),
    status: text("status", { enum: ["draft", "running", "stopped", "archived"] })
      .notNull()
      .default("draft"),
    startedAt: text("started_at"),
    stoppedAt: text("stopped_at"),
    significanceThreshold: real("significance_threshold").notNull().default(0.05),
    minRuntimeDays: integer("min_runtime_days").notNull().default(0),
    minSampleSize: integer("min_sample_size").notNull().default(100),
    cupedFrozenAt: text("cuped_frozen_at"),
    sequentialTesting: integer("sequential_testing", { mode: "boolean" }).notNull().default(false),
    hashVersion: integer("hash_version").notNull().default(1),
    updatedAt: text("updated_at").notNull(),
  },
  (t) => ({
    projectIdx: index("experiments_project").on(t.projectId),
    projectUniq: uniqueIndex("experiments_project_name").on(t.projectId, t.name),
  }),
);

export const events = sqliteTable(
  "events",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description"),
    properties: text("properties", { mode: "json" }).$type<EventProperty[]>().notNull().default([]),
    pending: integer("pending").notNull().default(0),
    createdAt: text("created_at").notNull(),
    deletedAt: text("deleted_at"),
  },
  (t) => ({
    projectIdx: index("events_project").on(t.projectId),
    projectUniq: uniqueIndex("events_project_name").on(t.projectId, t.name),
  }),
);

export const metrics = sqliteTable(
  "metrics",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    eventName: text("event_name").notNull(),
    valuePath: text("value_path"),
    aggregation: text("aggregation", {
      enum: ["count_users", "count_events", "sum", "avg", "retention_Nd"],
    })
      .notNull()
      .default("count_users"),
    winsorizePct: integer("winsorize_pct").notNull().default(99),
    minDetectableEffect: real("min_detectable_effect"),
    updatedAt: text("updated_at").notNull(),
    deletedAt: text("deleted_at"),
  },
  (t) => ({ uniq: uniqueIndex("metrics_project_name").on(t.projectId, t.name) }),
);

export const experimentMetrics = sqliteTable(
  "experiment_metrics",
  {
    id: text("id").primaryKey(),
    experimentId: text("experiment_id")
      .notNull()
      .references(() => experiments.id, { onDelete: "cascade" }),
    metricId: text("metric_id")
      .notNull()
      .references(() => metrics.id, { onDelete: "cascade" }),
    role: text("role", { enum: ["goal", "guardrail", "secondary"] }).notNull(),
    createdAt: integer("created_at").notNull(),
  },
  (t) => ({ uniq: uniqueIndex("exp_metrics_uniq").on(t.experimentId, t.metricId) }),
);

export const experimentResults = sqliteTable(
  "experiment_results",
  {
    projectId: text("project_id").notNull(),
    experiment: text("experiment").notNull(),
    metric: text("metric").notNull(),
    groupName: text("group_name").notNull(),
    ds: text("ds").notNull(),
    n: integer("n"),
    mean: real("mean"),
    variance: real("variance"),
    delta: real("delta"),
    deltaPct: real("delta_pct"),
    ci95Low: real("ci_95_low"),
    ci95High: real("ci_95_high"),
    ci99Low: real("ci_99_low"),
    ci99High: real("ci_99_high"),
    pValue: real("p_value"),
    expectedN: integer("expected_n"),
    srmPValue: real("srm_p_value"),
    srmDetected: integer("srm_detected").notNull().default(0),
    msprtLambda: real("msprt_lambda"),
    msprtSignificant: integer("msprt_significant"),
    isFinal: integer("is_final").notNull().default(0),
    peekWarning: integer("peek_warning").notNull().default(0),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.projectId, t.experiment, t.metric, t.groupName, t.ds] }),
    dsIdx: index("experiment_results_ds").on(t.projectId, t.ds),
  }),
);

export const userMetricBaseline = sqliteTable(
  "user_metric_baseline",
  {
    projectId: text("project_id").notNull(),
    userId: text("user_id").notNull(),
    metricName: text("metric_name").notNull(),
    avgValue: real("avg_value").notNull(),
    updatedDs: text("updated_ds").notNull(),
  },
  (t) => ({ pk: primaryKey({ columns: [t.projectId, t.userId, t.metricName] }) }),
);

export const userAliases = sqliteTable(
  "user_aliases",
  {
    projectId: text("project_id").notNull(),
    anonymousId: text("anonymous_id").notNull(),
    userId: text("user_id").notNull(),
    createdAt: text("created_at").notNull(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.projectId, t.anonymousId] }),
    userIdx: index("user_aliases_user").on(t.projectId, t.userId),
  }),
);

export const userAttributes = sqliteTable(
  "user_attributes",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    type: text("type", { enum: ["string", "number", "boolean", "enum", "date"] }).notNull(),
    enumValues: text("enum_values", { mode: "json" }).$type<string[] | null>(),
    required: integer("required").notNull().default(0),
    description: text("description"),
    sdkPath: text("sdk_path"),
    createdAt: text("created_at").notNull(),
    deletedAt: text("deleted_at"),
  },
  (t) => ({
    projectIdx: index("user_attributes_project").on(t.projectId),
    projectUniq: uniqueIndex("user_attributes_project_name").on(t.projectId, t.name),
  }),
);

// ── i18n (string-manager) ────────────────────────────────────────────────────
// See string-manager-platform/plan.md § Schema additions.

export const labelProfiles = sqliteTable(
  "label_profiles",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    defaultChunkId: text("default_chunk_id"),
    createdAt: text("created_at").notNull(),
    deletedAt: text("deleted_at"),
  },
  (t) => ({
    projectIdx: index("label_profiles_project").on(t.projectId),
    projectNameUniq: uniqueIndex("label_profiles_project_name").on(t.projectId, t.name),
  }),
);

export const labelChunks = sqliteTable(
  "label_chunks",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id").notNull(),
    profileId: text("profile_id")
      .notNull()
      .references(() => labelProfiles.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    isIndex: integer("is_index").notNull().default(0),
    publishedUrl: text("published_url"),
    publishedHash: text("published_hash"),
    publishedAt: text("published_at"),
    etag: text("etag"),
  },
  (t) => ({
    projectIdx: index("label_chunks_project").on(t.projectId),
    profileNameUniq: uniqueIndex("label_chunks_profile_name").on(t.profileId, t.name),
  }),
);

export const labelKeys = sqliteTable(
  "label_keys",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id").notNull(),
    profileId: text("profile_id")
      .notNull()
      .references(() => labelProfiles.id, { onDelete: "cascade" }),
    chunkId: text("chunk_id")
      .notNull()
      .references(() => labelChunks.id, { onDelete: "cascade" }),
    key: text("key").notNull(),
    value: text("value").notNull(),
    description: text("description"),
    // JSON array of variable names extracted from the value's {{var}} placeholders.
    // `null` = no variables detected; `[]` = explicitly none (normalized).
    variables: text("variables", { mode: "json" }).$type<string[] | null>(),
    updatedAt: text("updated_at").notNull(),
    updatedBy: text("updated_by").notNull(),
  },
  (t) => ({
    projectIdx: index("label_keys_project").on(t.projectId),
    chunkIdx: index("label_keys_chunk").on(t.chunkId),
    profileKeyUniq: uniqueIndex("label_keys_profile_key").on(t.profileId, t.key),
  }),
);

export const labelDrafts = sqliteTable(
  "label_drafts",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id").notNull(),
    profileId: text("profile_id")
      .notNull()
      .references(() => labelProfiles.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    sourceProfileId: text("source_profile_id").references(() => labelProfiles.id, {
      onDelete: "set null",
    }),
    createdBy: text("created_by").notNull(),
    status: text("status", { enum: ["open", "merged", "abandoned"] })
      .notNull()
      .default("open"),
    createdAt: text("created_at").notNull(),
    publishedAt: text("published_at"),
  },
  (t) => ({
    projectIdx: index("label_drafts_project").on(t.projectId),
    projectNameUniq: uniqueIndex("label_drafts_project_name").on(t.projectId, t.name),
  }),
);

export const labelDraftKeys = sqliteTable(
  "label_draft_keys",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id").notNull(),
    draftId: text("draft_id")
      .notNull()
      .references(() => labelDrafts.id, { onDelete: "cascade" }),
    key: text("key").notNull(),
    value: text("value").notNull(),
    description: text("description"),
    variables: text("variables", { mode: "json" }).$type<string[] | null>(),
    updatedBy: text("updated_by").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (t) => ({
    draftKeyUniq: uniqueIndex("label_draft_keys_draft_key").on(t.draftId, t.key),
    projectIdx: index("label_draft_keys_project").on(t.projectId),
  }),
);

// ── Feedback (bug reports + feature requests) ───────────────────────────────

export const BUG_STATUSES = ["open", "triaged", "in_progress", "resolved", "wont_fix"] as const;
export type BugStatus = (typeof BUG_STATUSES)[number];

export const bugReports = sqliteTable(
  "bug_reports",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    stepsToReproduce: text("steps_to_reproduce").notNull().default(""),
    actualResult: text("actual_result").notNull().default(""),
    expectedResult: text("expected_result").notNull().default(""),
    status: text("status", { enum: BUG_STATUSES }).notNull().default("open"),
    reporterEmail: text("reporter_email"),
    pageUrl: text("page_url"),
    userAgent: text("user_agent"),
    viewport: text("viewport"),
    context: text("context", { mode: "json" }).$type<Record<string, unknown> | null>(),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (t) => ({
    projectIdx: index("bug_reports_project").on(t.projectId, t.status),
    createdIdx: index("bug_reports_created").on(t.projectId, t.createdAt),
  }),
);

export const FEATURE_REQUEST_STATUSES = [
  "open",
  "considering",
  "planned",
  "shipped",
  "declined",
] as const;
export type FeatureRequestStatus = (typeof FEATURE_REQUEST_STATUSES)[number];

export const FEATURE_REQUEST_IMPORTANCES = ["nice_to_have", "important", "critical"] as const;
export type FeatureRequestImportance = (typeof FEATURE_REQUEST_IMPORTANCES)[number];

export const featureRequests = sqliteTable(
  "feature_requests",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description").notNull().default(""),
    useCase: text("use_case").notNull().default(""),
    importance: text("importance", { enum: FEATURE_REQUEST_IMPORTANCES })
      .notNull()
      .default("nice_to_have"),
    status: text("status", { enum: FEATURE_REQUEST_STATUSES }).notNull().default("open"),
    reporterEmail: text("reporter_email"),
    pageUrl: text("page_url"),
    userAgent: text("user_agent"),
    context: text("context", { mode: "json" }).$type<Record<string, unknown> | null>(),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (t) => ({
    projectIdx: index("feature_requests_project").on(t.projectId, t.status),
    createdIdx: index("feature_requests_created").on(t.projectId, t.createdAt),
  }),
);

export const REPORT_KINDS = ["bug", "feature_request"] as const;
export type ReportKind = (typeof REPORT_KINDS)[number];

export const ATTACHMENT_KINDS = ["screenshot", "recording", "file"] as const;
export type AttachmentKind = (typeof ATTACHMENT_KINDS)[number];

export const reportAttachments = sqliteTable(
  "report_attachments",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    reportKind: text("report_kind", { enum: REPORT_KINDS }).notNull(),
    reportId: text("report_id").notNull(),
    kind: text("kind", { enum: ATTACHMENT_KINDS }).notNull(),
    filename: text("filename").notNull(),
    mimeType: text("mime_type").notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    r2Key: text("r2_key").notNull(),
    createdAt: text("created_at").notNull(),
  },
  (t) => ({
    reportIdx: index("report_attachments_report").on(t.projectId, t.reportKind, t.reportId),
  }),
);

export const i18nUsageDaily = sqliteTable(
  "i18n_usage_daily",
  {
    projectId: text("project_id").notNull(),
    sdkKeyId: text("sdk_key_id").notNull(),
    date: text("date").notNull(),
    requestCount: integer("request_count").notNull().default(0),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.projectId, t.sdkKeyId, t.date] }),
    projectDateIdx: index("i18n_usage_daily_project_date").on(t.projectId, t.date),
  }),
);
