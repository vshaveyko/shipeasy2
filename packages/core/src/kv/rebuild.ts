// rebuildFlags / rebuildExperiments / rebuildCatalog — KV blob writers.
// See 02-kv-cache.md for blob shapes and propagation invariants.

import { and, eq, isNull, ne, sql } from "drizzle-orm";
import { getDb } from "../db";
import {
  gates,
  configs,
  configValues,
  universes,
  experiments,
  events,
  labelProfiles,
  labelKeys,
  CONFIG_ENVS,
  type ConfigEnv,
} from "../db/schema";
import { sha256 } from "../auth/crypto";
import type { CoreEnv } from "../env";
import { ApiError } from "../errors";
import { sdkCachePath } from "./cdn-cache-keys";
import { purgeCache } from "./purge";

const MAX_KV_BYTES = 24 * 1024 * 1024;
// Bumped from 2 → 3 when folder-prefixed lookup keys were introduced.
// In format 3, gate/config/killswitch/experiment/universe entries are keyed
// as `<folder>/<name>` (root entries keyed as `/<name>`), and each entry
// payload includes a `folder` field (string | null).
const BLOB_FORMAT = 3;

/** Encode the lookup key for a foldered entity. Root entries (no folder) keep
 *  the bare `name` so legacy SDK consumers calling `getConfig("foo")` keep
 *  resolving. Foldered entries are keyed `folder/name`; the SDK resolver
 *  splits on the first `/`. The folder regex disallows `/`, so the bare-vs-
 *  folder distinction is unambiguous. */
export function folderKey(folder: string | null | undefined, name: string): string {
  return folder ? `${folder}/${name}` : name;
}

async function contentVersion(payload: string): Promise<string> {
  return (await sha256(payload)).slice(0, 16);
}

export function flagsKvKey(projectId: string, env: ConfigEnv): string {
  return `${projectId}:${env}:flags`;
}

export function flagsCdnPath(projectId: string, env: ConfigEnv): string {
  return sdkCachePath({ route: "/sdk/flags", projectId, env });
}

/**
 * Rebuilds and publishes the flags blob for every env.
 * Gates don't have an env concept yet — they're emitted identically in all three blobs.
 * Configs pick the latest published value per (configId, env).
 */
export async function rebuildFlags(
  env: CoreEnv,
  projectId: string,
  planName: string,
): Promise<void> {
  const db = getDb(env.DB);
  const [gateRows, configRows, valueRows] = await Promise.all([
    db
      .select()
      .from(gates)
      .where(and(eq(gates.projectId, projectId), eq(gates.enabled, 1), isNull(gates.deletedAt))),
    db
      .select()
      .from(configs)
      .where(and(eq(configs.projectId, projectId), isNull(configs.deletedAt))),
    // Latest version per (configId, env) — selected via window fn isn't available in D1,
    // so we fetch all rows and reduce in JS. Volumes are small (tens–hundreds per project).
    db
      .select({
        configId: configValues.configId,
        env: configValues.env,
        valueJson: configValues.valueJson,
        version: configValues.version,
      })
      .from(configValues)
      .innerJoin(configs, eq(configs.id, configValues.configId))
      .where(and(eq(configs.projectId, projectId), isNull(configs.deletedAt)))
      .orderBy(configValues.configId, configValues.env, sql`${configValues.version} DESC`),
  ]);

  const gatesMap: Record<string, unknown> = {};
  for (const g of gateRows) {
    const entry: Record<string, unknown> = {
      name: g.name,
      folder: g.folder ?? null,
      rules: g.rules,
      rolloutPct: g.rolloutPct,
      salt: g.salt,
      enabled: g.enabled,
    };
    // Stack-aware gatekeepers ship the ordered sub-gate stack in the blob.
    // Legacy SDKs that ignore `stack` still see correct results because the
    // legacy `rules`+`rolloutPct` columns are kept in sync as a best-effort
    // approximation by the writer.
    if (g.stack && Array.isArray(g.stack) && g.stack.length > 0) {
      entry.stack = g.stack;
    }
    gatesMap[folderKey(g.folder, g.name)] = entry;
  }

  // Config id → (name, folder, kind) lookup. Killswitches share the configs
  // table but ship in a separate `killswitches` map so the SDK can expose
  // them through a dedicated read API without re-deriving kind from the
  // schema.
  const nameByConfigId = new Map<string, string>();
  const folderByConfigId = new Map<string, string | null>();
  const kindByConfigId = new Map<string, "config" | "killswitch">();
  for (const c of configRows) {
    nameByConfigId.set(c.id, c.name);
    folderByConfigId.set(c.id, c.folder ?? null);
    kindByConfigId.set(c.id, (c.kind ?? "config") as "config" | "killswitch");
  }

  // Latest published value per (configId, env).
  type Latest = { value: unknown; version: number };
  const latest = new Map<string, Map<ConfigEnv, Latest>>();
  for (const v of valueRows) {
    let byEnv = latest.get(v.configId);
    if (!byEnv) {
      byEnv = new Map();
      latest.set(v.configId, byEnv);
    }
    // Rows are DESC-ordered by version; keep the first we see per (configId, env).
    if (!byEnv.has(v.env as ConfigEnv)) {
      byEnv.set(v.env as ConfigEnv, { value: v.valueJson, version: v.version });
    }
  }

  for (const envName of CONFIG_ENVS) {
    const configsMap: Record<string, unknown> = {};
    const killswitchesMap: Record<string, unknown> = {};
    for (const [configId, byEnv] of latest) {
      const entry = byEnv.get(envName);
      if (!entry) continue;
      const name = nameByConfigId.get(configId);
      if (!name) continue;
      const folder = folderByConfigId.get(configId) ?? null;
      const kind = kindByConfigId.get(configId) ?? "config";
      const payload = { name, folder, value: entry.value, version: entry.version };
      const key = folderKey(folder, name);
      if (kind === "killswitch") killswitchesMap[key] = payload;
      else configsMap[key] = payload;
    }

    const content = JSON.stringify({
      gates: gatesMap,
      configs: configsMap,
      killswitches: killswitchesMap,
    });
    const version = await contentVersion(content);
    const blob = {
      blobFormat: BLOB_FORMAT,
      env: envName,
      version,
      plan: planName,
      gates: gatesMap,
      configs: configsMap,
      killswitches: killswitchesMap,
    };

    const serialized = JSON.stringify(blob);
    if (serialized.length > MAX_KV_BYTES) {
      throw new ApiError(
        `Flag configuration for env=${envName} exceeds ${MAX_KV_BYTES} bytes (${(serialized.length / 1024 / 1024).toFixed(1)}MB).`,
        422,
      );
    }

    if (!env.FLAGS_KV) continue;
    await env.FLAGS_KV.put(flagsKvKey(projectId, envName), serialized);
    await purgeCache(env, flagsCdnPath(projectId, envName));
  }
}

export async function rebuildExperiments(env: CoreEnv, projectId: string): Promise<void> {
  const db = getDb(env.DB);
  const [universeRows, experimentRows] = await Promise.all([
    db
      .select()
      .from(universes)
      .where(and(eq(universes.projectId, projectId), isNull(universes.deletedAt))),
    db
      .select()
      .from(experiments)
      .where(and(eq(experiments.projectId, projectId), ne(experiments.status, "archived"))),
  ]);

  // Universe folder is admin-only metadata: experiments reference universes
  // by bare name, so the KV blob keys them by bare name too.
  const universesMap: Record<string, unknown> = {};
  for (const u of universeRows) {
    universesMap[u.name] = {
      name: u.name,
      folder: u.folder ?? null,
      holdout_range: u.holdoutRange,
      unit_type: u.unitType,
    };
  }

  const experimentsMap: Record<string, unknown> = {};
  for (const e of experimentRows) {
    experimentsMap[folderKey(e.folder, e.name)] = {
      name: e.name,
      folder: e.folder ?? null,
      universe: e.universe,
      targetingGate: e.targetingGate,
      allocationPct: e.allocationPct,
      salt: e.salt,
      params: e.params,
      groups: e.groups,
      status: e.status,
      startedAt: e.startedAt,
      stoppedAt: e.stoppedAt,
      hashVersion: e.hashVersion,
    };
  }

  const content = JSON.stringify({ universes: universesMap, experiments: experimentsMap });
  const version = await contentVersion(content);
  const blob = {
    blobFormat: BLOB_FORMAT,
    version,
    universes: universesMap,
    experiments: experimentsMap,
  };

  const serialized = JSON.stringify(blob);
  if (serialized.length > MAX_KV_BYTES) {
    throw new ApiError(
      `Experiment configuration exceeds ${MAX_KV_BYTES} bytes (${(serialized.length / 1024 / 1024).toFixed(1)}MB).`,
      422,
    );
  }

  if (!env.FLAGS_KV) return;
  await env.FLAGS_KV.put(`${projectId}:experiments`, serialized);
  await purgeCache(env, sdkCachePath({ route: "/sdk/experiments", projectId }));
}

export async function rebuildCatalog(env: CoreEnv, projectId: string): Promise<void> {
  const db = getDb(env.DB);
  const eventRows = await db
    .select({ name: events.name })
    .from(events)
    .where(and(eq(events.projectId, projectId), eq(events.pending, 0), isNull(events.deletedAt)));
  const names = eventRows.map((e) => e.name);
  if (!env.FLAGS_KV) return;
  await env.FLAGS_KV.put(`${projectId}:catalog`, JSON.stringify(names));
}

export async function writeSdkKeyEntry(
  env: CoreEnv,
  hash: string,
  meta: {
    project_id: string;
    type: "server" | "client" | "admin";
    expires_at?: string | null;
    allowed_origin?: string | null;
    created_by_email?: string | null;
  },
): Promise<void> {
  if (!env.FLAGS_KV) return;
  await env.FLAGS_KV.put(`sdk_key:${hash}`, JSON.stringify(meta));
}

export async function deleteSdkKeyEntry(env: CoreEnv, hash: string): Promise<void> {
  if (!env.FLAGS_KV) return;
  await env.FLAGS_KV.delete(`sdk_key:${hash}`);
}

export function i18nKvKey(projectId: string, profileName: string): string {
  return `${projectId}:i18n:${profileName}`;
}

export async function rebuildI18nProfile(
  env: CoreEnv,
  projectId: string,
  profileId: string,
): Promise<void> {
  if (!env.FLAGS_KV) return;
  const db = getDb(env.DB);

  const [profileRows, keyRows] = await Promise.all([
    db
      .select({ name: labelProfiles.name })
      .from(labelProfiles)
      .where(eq(labelProfiles.id, profileId))
      .limit(1),
    db
      .select({ key: labelKeys.key, value: labelKeys.value, updatedAt: labelKeys.updatedAt })
      .from(labelKeys)
      .where(eq(labelKeys.profileId, profileId)),
  ]);

  if (profileRows.length === 0) return;

  const strings: Record<string, string> = {};
  let latestTs = "";
  for (const row of keyRows) {
    strings[row.key] = row.value;
    if (row.updatedAt > latestTs) latestTs = row.updatedAt;
  }
  const version = latestTs ? latestTs.slice(0, 19).replace(/\D/g, "") : "0";

  const profileName = profileRows[0].name;
  await env.FLAGS_KV.put(
    i18nKvKey(projectId, profileName),
    JSON.stringify({ strings, locale: "en", version }),
  );
  await purgeCache(
    env,
    sdkCachePath({ route: "/sdk/i18n/strings", projectId, profile: profileName }),
  );
}
