import { and, desc, eq, inArray } from "drizzle-orm";
import { Validator } from "@cfworker/json-schema";
import {
  checkLimit,
  rebuildFlags,
  ApiError,
  getEffectivePlan,
  CONFIG_ENVS,
  DEFAULT_CONFIG_SCHEMA,
  type ConfigEnv,
  type JsonSchema,
} from "@shipeasy/core";
import { configs, configValues, configDrafts, auditLog } from "@shipeasy/core/db/schema";
import {
  configCreateSchema,
  configUpdateSchema,
  configSchemaUpdateSchema,
  configDraftUpsertSchema,
  configPublishSchema,
} from "@shipeasy/core/schemas/configs";
import type { Page, PageQuery } from "@shipeasy/core/pagination";
import { scopedDb, scopedDbSA } from "../db";
import { getEnvAsync } from "../env";
import { loadProject } from "../project";
import { writeAudit } from "../audit";
import { syncUsage } from "../billing";
import type { AdminIdentity } from "../admin-auth";
import { keysetWhere, sliceWithCursor } from "./_pagination";

export type ConfigSummary = {
  id: string;
  name: string;
  description: string | null;
  schema: JsonSchema;
  updatedAt: string;
  envs: Partial<Record<ConfigEnv, { version: number; publishedAt: string; publishedBy: string }>>;
  drafts: Partial<
    Record<ConfigEnv, { updatedAt: string; authorEmail: string; baseVersion: number }>
  >;
};

export type ConfigDetail = ConfigSummary & {
  values: Partial<Record<ConfigEnv, unknown>>;
  draftValues: Partial<Record<ConfigEnv, unknown>>;
};

export type ConfigActivity = {
  id: string;
  action: string;
  actorEmail: string;
  actorType: "user" | "cli" | "system";
  payload: unknown;
  createdAt: string;
};

function latestRowsPerEnv<T extends { configId: string; env: string; version: number }>(
  rows: T[],
): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const r of rows) {
    const key = `${r.configId}:${r.env}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(r);
  }
  return out;
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

/** Throws ApiError(400) if `value` does not conform to `schema`. */
function assertValueMatchesSchema(value: unknown, schema: JsonSchema): void {
  if (!isPlainObject(value)) {
    throw new ApiError("Config value must be a JSON object", 400);
  }
  const validator = new Validator(schema as object, "2020-12", false);
  const result = validator.validate(value);
  if (!result.valid) {
    const detail = result.errors
      .map((e) => `${e.instanceLocation || "/"}: ${e.error}`)
      .slice(0, 5)
      .join("; ");
    throw new ApiError(`Config value does not match schema: ${detail}`, 400);
  }
}

export async function listConfigs(
  identity: AdminIdentity,
  opts: PageQuery,
): Promise<Page<ConfigSummary>> {
  const s = scopedDb(identity.projectId);
  // Killswitches share this table but live behind their own surface.
  const ks = keysetWhere(configs.updatedAt, configs.id, opts.cursor);
  const where = ks ? and(eq(configs.kind, "config"), ks)! : eq(configs.kind, "config");
  const metaRows = await s
    .selectWhere(configs, where)
    .orderBy(desc(configs.updatedAt), desc(configs.id))
    .limit(opts.limit + 1);
  const sliced = sliceWithCursor(metaRows, opts.limit);
  const meta = sliced.data;
  if (meta.length === 0) return { data: [], next_cursor: sliced.next_cursor };

  const [valueRows, draftRows] = await Promise.all([
    s
      .selectWhere(
        configValues,
        inArray(
          configValues.configId,
          meta.map((m) => m.id),
        ),
      )
      .orderBy(desc(configValues.version)),
    s.selectWhere(
      configDrafts,
      inArray(
        configDrafts.configId,
        meta.map((m) => m.id),
      ),
    ),
  ]);

  const latest = latestRowsPerEnv(valueRows);
  const envByConfig = new Map<string, ConfigSummary["envs"]>();
  for (const v of latest) {
    let map = envByConfig.get(v.configId);
    if (!map) {
      map = {};
      envByConfig.set(v.configId, map);
    }
    map[v.env as ConfigEnv] = {
      version: v.version,
      publishedAt: v.publishedAt,
      publishedBy: v.publishedBy,
    };
  }

  const draftsByConfig = new Map<string, ConfigSummary["drafts"]>();
  for (const d of draftRows) {
    let map = draftsByConfig.get(d.configId);
    if (!map) {
      map = {};
      draftsByConfig.set(d.configId, map);
    }
    map[d.env as ConfigEnv] = {
      updatedAt: d.updatedAt,
      authorEmail: d.authorEmail,
      baseVersion: d.baseVersion,
    };
  }

  const data = meta.map((m) => ({
    id: m.id,
    name: m.name,
    description: m.description,
    schema: m.schemaJson,
    updatedAt: m.updatedAt,
    envs: envByConfig.get(m.id) ?? {},
    drafts: draftsByConfig.get(m.id) ?? {},
  }));
  return { data, next_cursor: sliced.next_cursor };
}

export async function listAllConfigs(identity: AdminIdentity): Promise<ConfigSummary[]> {
  const out: ConfigSummary[] = [];
  let cursor: string | undefined;
  do {
    const page = await listConfigs(identity, { limit: 500, cursor });
    out.push(...page.data);
    cursor = page.next_cursor ?? undefined;
  } while (cursor);
  return out;
}

export interface ConfigCounts {
  total: number;
  /** Published in every env (currently 3: dev/staging/prod). */
  live: number;
  /** At least one open draft across any env. */
  draft: number;
  /** Zero published envs. */
  empty: number;
}

/**
 * Aggregate counts for the configs list view. Driven by the same
 * `publishedEnvCount` / `draftCount` derivations the UI used to compute
 * client-side — moved here so the stat trio + tabs don't need to walk every
 * row in the dashboard component.
 */
export async function configCounts(identity: AdminIdentity): Promise<ConfigCounts> {
  const rows = await listAllConfigs(identity);
  let live = 0;
  let draft = 0;
  let empty = 0;
  for (const r of rows) {
    const envs = Object.keys(r.envs ?? {}).length;
    const drafts = Object.keys(r.drafts ?? {}).length;
    if (envs === 3) live++;
    if (drafts > 0) draft++;
    if (envs === 0) empty++;
  }
  return { total: rows.length, live, draft, empty };
}

export async function getConfig(identity: AdminIdentity, id: string): Promise<ConfigDetail> {
  const s = scopedDb(identity.projectId);
  const rows = await s.selectWhere(configs, and(eq(configs.id, id), eq(configs.kind, "config"))!);
  if (rows.length === 0) throw new ApiError("Config not found", 404);
  const meta = rows[0];

  const [valueRows, draftRows] = await Promise.all([
    s.selectWhere(configValues, eq(configValues.configId, id)).orderBy(desc(configValues.version)),
    s.selectWhere(configDrafts, eq(configDrafts.configId, id)),
  ]);

  const latest = latestRowsPerEnv(valueRows);
  const envs: ConfigSummary["envs"] = {};
  const values: ConfigDetail["values"] = {};
  for (const v of latest) {
    envs[v.env as ConfigEnv] = {
      version: v.version,
      publishedAt: v.publishedAt,
      publishedBy: v.publishedBy,
    };
    values[v.env as ConfigEnv] = v.valueJson;
  }

  const drafts: ConfigSummary["drafts"] = {};
  const draftValues: ConfigDetail["draftValues"] = {};
  for (const d of draftRows) {
    drafts[d.env as ConfigEnv] = {
      updatedAt: d.updatedAt,
      authorEmail: d.authorEmail,
      baseVersion: d.baseVersion,
    };
    draftValues[d.env as ConfigEnv] = d.valueJson;
  }

  return {
    id: meta.id,
    name: meta.name,
    description: meta.description,
    schema: meta.schemaJson,
    updatedAt: meta.updatedAt,
    envs,
    drafts,
    values,
    draftValues,
  };
}

function seedValues(parsed: { value: unknown }): Record<ConfigEnv, unknown> {
  const raw = parsed.value as Record<string, unknown> | unknown;
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    const candidate = raw as Record<string, unknown>;
    const envKeys = Object.keys(candidate);
    const isEnvMap =
      envKeys.length > 0 && envKeys.every((k) => (CONFIG_ENVS as readonly string[]).includes(k));
    if (isEnvMap) {
      const out = {} as Record<ConfigEnv, unknown>;
      for (const envName of CONFIG_ENVS) out[envName] = candidate[envName] ?? {};
      return out;
    }
  }
  return { dev: parsed.value, staging: parsed.value, prod: parsed.value };
}

export async function createConfig(identity: AdminIdentity, input: unknown) {
  const parsed = configCreateSchema.parse(input);
  const project = await loadProject(identity.projectId);
  const plan = getEffectivePlan(project);
  const env = await getEnvAsync();

  await checkLimit(env.DB, identity.projectId, "configs", plan);

  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const seed = seedValues({ value: parsed.value ?? {} });
  for (const envName of CONFIG_ENVS) {
    assertValueMatchesSchema(seed[envName], parsed.schema);
  }

  const s = await scopedDbSA(identity.projectId);
  try {
    await s.insert(configs).values({
      id,
      name: parsed.name,
      description: parsed.description ?? null,
      kind: "config",
      schemaJson: parsed.schema,
      updatedAt: now,
    });
  } catch (err) {
    if (String(err).includes("UNIQUE")) throw new ApiError(`Config '${parsed.name}' exists`, 409);
    throw err;
  }

  for (const envName of CONFIG_ENVS) {
    await s.insert(configValues).values({
      id: crypto.randomUUID(),
      configId: id,
      env: envName,
      valueJson: seed[envName],
      version: 1,
      publishedAt: now,
      publishedBy: identity.actorEmail,
    });
  }

  await rebuildFlags(env, identity.projectId, project.plan);
  await syncUsage(env, identity.projectId);
  await writeAudit(identity, "config.create", "config", id, parsed);
  return { id, name: parsed.name };
}

/** Flat update — accepts an optional new schema and/or a flat value applied to all envs. */
export async function updateConfig(identity: AdminIdentity, id: string, input: unknown) {
  const parsed = configUpdateSchema.parse(input);
  const project = await loadProject(identity.projectId);
  const env = await getEnvAsync();
  const now = new Date().toISOString();
  const s = await scopedDbSA(identity.projectId);

  const rows = await s.selectWhere(configs, and(eq(configs.id, id), eq(configs.kind, "config"))!);
  if (rows.length === 0) throw new ApiError("Config not found", 404);
  const meta = rows[0];

  const schema = parsed.schema ?? meta.schemaJson;

  if (parsed.value !== undefined) {
    assertValueMatchesSchema(parsed.value, schema);

    for (const envName of CONFIG_ENVS) {
      const latest = await s
        .selectWhere(
          configValues,
          and(eq(configValues.configId, id), eq(configValues.env, envName))!,
        )
        .orderBy(desc(configValues.version))
        .limit(1);
      const nextVersion = (latest[0]?.version ?? 0) + 1;
      await s.insert(configValues).values({
        id: crypto.randomUUID(),
        configId: id,
        env: envName,
        valueJson: parsed.value,
        version: nextVersion,
        publishedAt: now,
        publishedBy: identity.actorEmail,
      });
    }
  }

  const update: Partial<{ schemaJson: JsonSchema; updatedAt: string }> = { updatedAt: now };
  if (parsed.schema) update.schemaJson = parsed.schema;
  await s.update(configs).set(update).where(eq(configs.id, id));

  if (parsed.value !== undefined) {
    await rebuildFlags(env, identity.projectId, project.plan);
  }
  await writeAudit(identity, "config.update", "config", id, parsed);
  return { id };
}

/** Update only the schema — does NOT bump value versions and does NOT rebuild KV. */
export async function updateConfigSchema(identity: AdminIdentity, id: string, input: unknown) {
  const parsed = configSchemaUpdateSchema.parse(input);
  const s = await scopedDbSA(identity.projectId);
  const rows = await s.selectWhere(configs, and(eq(configs.id, id), eq(configs.kind, "config"))!);
  if (rows.length === 0) throw new ApiError("Config not found", 404);
  await s
    .update(configs)
    .set({ schemaJson: parsed.schema, updatedAt: new Date().toISOString() })
    .where(eq(configs.id, id));
  await writeAudit(identity, "config.schema.update", "config", id, parsed);
  return { id, schema: parsed.schema };
}

export async function saveDraft(identity: AdminIdentity, id: string, input: unknown) {
  const parsed = configDraftUpsertSchema.parse(input);
  const s = await scopedDbSA(identity.projectId);

  const rows = await s.selectWhere(configs, and(eq(configs.id, id), eq(configs.kind, "config"))!);
  if (rows.length === 0) throw new ApiError("Config not found", 404);
  assertValueMatchesSchema(parsed.value, rows[0].schemaJson);

  const latest = await s
    .selectWhere(
      configValues,
      and(eq(configValues.configId, id), eq(configValues.env, parsed.env))!,
    )
    .orderBy(desc(configValues.version))
    .limit(1);
  const baseVersion = latest[0]?.version ?? 0;
  const now = new Date().toISOString();

  const existing = await s
    .selectWhere(
      configDrafts,
      and(eq(configDrafts.configId, id), eq(configDrafts.env, parsed.env))!,
    )
    .limit(1);

  if (existing.length > 0) {
    await s
      .update(configDrafts)
      .set({
        valueJson: parsed.value,
        baseVersion,
        authorEmail: identity.actorEmail,
        updatedAt: now,
      })
      .where(and(eq(configDrafts.configId, id), eq(configDrafts.env, parsed.env))!);
  } else {
    await s.insert(configDrafts).values({
      id: crypto.randomUUID(),
      configId: id,
      env: parsed.env,
      valueJson: parsed.value,
      baseVersion,
      authorEmail: identity.actorEmail,
      createdAt: now,
      updatedAt: now,
    });
  }
  await writeAudit(identity, "config.draft.save", "config", id, {
    env: parsed.env,
    baseVersion,
  });
  return { id, env: parsed.env, baseVersion, updatedAt: now };
}

export async function discardDraft(identity: AdminIdentity, id: string, input: unknown) {
  const parsed = configPublishSchema.parse(input);
  const s = await scopedDbSA(identity.projectId);

  const rows = await s.selectWhere(configs, and(eq(configs.id, id), eq(configs.kind, "config"))!);
  if (rows.length === 0) throw new ApiError("Config not found", 404);

  await s
    .delete(configDrafts)
    .where(and(eq(configDrafts.configId, id), eq(configDrafts.env, parsed.env))!);

  await writeAudit(identity, "config.draft.discard", "config", id, { env: parsed.env });
  return { ok: true };
}

export async function publishDraft(identity: AdminIdentity, id: string, input: unknown) {
  const parsed = configPublishSchema.parse(input);
  const project = await loadProject(identity.projectId);
  const env = await getEnvAsync();
  const s = await scopedDbSA(identity.projectId);

  const rows = await s.selectWhere(configs, and(eq(configs.id, id), eq(configs.kind, "config"))!);
  if (rows.length === 0) throw new ApiError("Config not found", 404);
  const meta = rows[0];

  const draft = await s
    .selectWhere(
      configDrafts,
      and(eq(configDrafts.configId, id), eq(configDrafts.env, parsed.env))!,
    )
    .limit(1);
  if (draft.length === 0) throw new ApiError(`No draft to publish for env=${parsed.env}`, 404);
  assertValueMatchesSchema(draft[0].valueJson, meta.schemaJson);

  const latest = await s
    .selectWhere(
      configValues,
      and(eq(configValues.configId, id), eq(configValues.env, parsed.env))!,
    )
    .orderBy(desc(configValues.version))
    .limit(1);
  const nextVersion = (latest[0]?.version ?? 0) + 1;
  const now = new Date().toISOString();

  await s.insert(configValues).values({
    id: crypto.randomUUID(),
    configId: id,
    env: parsed.env,
    valueJson: draft[0].valueJson,
    version: nextVersion,
    publishedAt: now,
    publishedBy: identity.actorEmail,
  });
  await s
    .delete(configDrafts)
    .where(and(eq(configDrafts.configId, id), eq(configDrafts.env, parsed.env))!);
  await s.update(configs).set({ updatedAt: now }).where(eq(configs.id, id));

  await rebuildFlags(env, identity.projectId, project.plan);
  await writeAudit(identity, "config.publish", "config", id, {
    env: parsed.env,
    version: nextVersion,
  });
  return { id, env: parsed.env, version: nextVersion };
}

export async function deleteConfig(identity: AdminIdentity, id: string) {
  const project = await loadProject(identity.projectId);
  const env = await getEnvAsync();
  const s = await scopedDbSA(identity.projectId);
  const rows = await s.selectWhere(configs, and(eq(configs.id, id), eq(configs.kind, "config"))!);
  if (rows.length === 0) throw new ApiError("Config not found", 404);
  await s.update(configs).set({ deletedAt: new Date().toISOString() }).where(eq(configs.id, id));
  await rebuildFlags(env, identity.projectId, project.plan);
  await syncUsage(env, identity.projectId);
  await writeAudit(identity, "config.delete", "config", id);
  return { ok: true };
}

export async function bulkDeleteConfigs(identity: AdminIdentity, ids: string[]) {
  if (ids.length === 0) return { deleted: 0 };
  const project = await loadProject(identity.projectId);
  const env = await getEnvAsync();
  const s = await scopedDbSA(identity.projectId);
  const existing = await s.selectWhere(
    configs,
    and(inArray(configs.id, ids), eq(configs.kind, "config"))!,
  );
  if (existing.length === 0) throw new ApiError("No matching configs found", 404);
  await s
    .update(configs)
    .set({ deletedAt: new Date().toISOString() })
    .where(and(inArray(configs.id, ids), eq(configs.kind, "config"))!);
  await rebuildFlags(env, identity.projectId, project.plan);
  await writeAudit(identity, "config.bulk_delete", "config", null, {
    count: existing.length,
    ids: existing.map((c) => c.id),
  });
  return { deleted: existing.length };
}

/** Recent audit rows for one config — powers the editor's activity panel. */
export async function listConfigActivity(
  identity: AdminIdentity,
  id: string,
  limit = 20,
): Promise<ConfigActivity[]> {
  const s = scopedDb(identity.projectId);
  const rows = await s
    .selectWhere(auditLog, and(eq(auditLog.resourceType, "config"), eq(auditLog.resourceId, id))!)
    .orderBy(desc(auditLog.createdAt))
    .limit(limit);
  return rows.map((r) => ({
    id: r.id,
    action: r.action,
    actorEmail: r.actorEmail,
    actorType: r.actorType,
    payload: r.payload ? safeParse(r.payload) : null,
    createdAt: r.createdAt,
  }));
}

function safeParse(s: string): unknown {
  try {
    return JSON.parse(s);
  } catch {
    return s;
  }
}

export { DEFAULT_CONFIG_SCHEMA };
