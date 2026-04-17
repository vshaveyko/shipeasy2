// rebuildFlags / rebuildExperiments / rebuildCatalog — KV blob writers.
// See 02-kv-cache.md for blob shapes and propagation invariants.

import { and, eq, ne } from "drizzle-orm";
import { getDb } from "../db";
import { gates, configs, universes, experiments, events } from "../db/schema";
import { sha256 } from "../auth/crypto";
import type { CoreEnv } from "../env";
import { ApiError } from "../errors";
import { purgeCache } from "./purge";

const MAX_KV_BYTES = 24 * 1024 * 1024;
const BLOB_FORMAT = 1;

async function contentVersion(payload: string): Promise<string> {
  return (await sha256(payload)).slice(0, 16);
}

export async function rebuildFlags(
  env: CoreEnv,
  projectId: string,
  planName: string,
): Promise<void> {
  const db = getDb(env.DB);
  const [gateRows, configRows] = await Promise.all([
    db
      .select()
      .from(gates)
      .where(and(eq(gates.projectId, projectId), eq(gates.enabled, 1))),
    db.select().from(configs).where(eq(configs.projectId, projectId)),
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
  const configsMap: Record<string, unknown> = {};
  for (const c of configRows) configsMap[c.name] = { value: c.valueJson };

  const content = JSON.stringify({ gates: gatesMap, configs: configsMap });
  const version = await contentVersion(content);
  const blob = {
    blobFormat: BLOB_FORMAT,
    version,
    plan: planName,
    gates: gatesMap,
    configs: configsMap,
  };

  const serialized = JSON.stringify(blob);
  if (serialized.length > MAX_KV_BYTES) {
    throw new ApiError(
      `Flag configuration exceeds ${MAX_KV_BYTES} bytes (${(serialized.length / 1024 / 1024).toFixed(1)}MB).`,
      422,
    );
  }

  if (!env.FLAGS_KV) return;
  await env.FLAGS_KV.put(`${projectId}:flags`, serialized);
  await purgeCache(env, `/sdk/flags/${projectId}`);
}

export async function rebuildExperiments(env: CoreEnv, projectId: string): Promise<void> {
  const db = getDb(env.DB);
  const [universeRows, experimentRows] = await Promise.all([
    db.select().from(universes).where(eq(universes.projectId, projectId)),
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
    .where(and(eq(events.projectId, projectId), eq(events.pending, 0)));
  const names = eventRows.map((e) => e.name);
  if (!env.FLAGS_KV) return;
  await env.FLAGS_KV.put(`${projectId}:catalog`, JSON.stringify(names));
}

export async function writeSdkKeyEntry(
  env: CoreEnv,
  hash: string,
  meta: { project_id: string; type: "server" | "client" | "admin"; expires_at?: string | null },
): Promise<void> {
  if (!env.FLAGS_KV) return;
  await env.FLAGS_KV.put(`sdk_key:${hash}`, JSON.stringify(meta));
}

export async function deleteSdkKeyEntry(env: CoreEnv, hash: string): Promise<void> {
  if (!env.FLAGS_KV) return;
  await env.FLAGS_KV.delete(`sdk_key:${hash}`);
}
