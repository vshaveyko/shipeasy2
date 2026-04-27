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
  CONFIG_ENVS,
  type ConfigEnv,
} from "../db/schema";
import { sha256 } from "../auth/crypto";
import type { CoreEnv } from "../env";
import { ApiError } from "../errors";
import { purgeCache } from "./purge";

const MAX_KV_BYTES = 24 * 1024 * 1024;
const BLOB_FORMAT = 2;

async function contentVersion(payload: string): Promise<string> {
  return (await sha256(payload)).slice(0, 16);
}

export function flagsKvKey(projectId: string, env: ConfigEnv): string {
  return `${projectId}:${env}:flags`;
}

export function flagsCdnPath(projectId: string, env: ConfigEnv): string {
  return `/sdk/flags/${projectId}?env=${env}`;
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
    gatesMap[g.name] = {
      rules: g.rules,
      rolloutPct: g.rolloutPct,
      salt: g.salt,
      enabled: g.enabled,
      killswitch: g.killswitch,
    };
  }

  // Config id → name lookup.
  const nameByConfigId = new Map<string, string>();
  for (const c of configRows) nameByConfigId.set(c.id, c.name);

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
    for (const [configId, byEnv] of latest) {
      const entry = byEnv.get(envName);
      if (!entry) continue;
      const name = nameByConfigId.get(configId);
      if (!name) continue;
      configsMap[name] = { value: entry.value, version: entry.version };
    }

    const content = JSON.stringify({ gates: gatesMap, configs: configsMap });
    const version = await contentVersion(content);
    const blob = {
      blobFormat: BLOB_FORMAT,
      env: envName,
      version,
      plan: planName,
      gates: gatesMap,
      configs: configsMap,
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

  const universesMap: Record<string, unknown> = {};
  for (const u of universeRows) {
    universesMap[u.name] = { holdout_range: u.holdoutRange, unit_type: u.unitType };
  }

  const experimentsMap: Record<string, unknown> = {};
  for (const e of experimentRows) {
    experimentsMap[e.name] = {
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
  await purgeCache(env, `/sdk/experiments/${projectId}`);
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
  },
): Promise<void> {
  if (!env.FLAGS_KV) return;
  await env.FLAGS_KV.put(`sdk_key:${hash}`, JSON.stringify(meta));
}

export async function deleteSdkKeyEntry(env: CoreEnv, hash: string): Promise<void> {
  if (!env.FLAGS_KV) return;
  await env.FLAGS_KV.delete(`sdk_key:${hash}`);
}
