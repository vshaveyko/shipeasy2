// KV read helpers with module-scope caches.

import type { CoreEnv } from "../env";
import { CONFIG_ENVS, type ConfigEnv } from "../db/schema";

export interface FlagsBlob {
  blobFormat?: number;
  env?: ConfigEnv;
  version: string;
  plan: string;
  gates: Record<string, unknown>;
  configs: Record<string, unknown>;
}

export interface ExpsBlob {
  blobFormat?: number;
  version: string;
  universes: Record<string, unknown>;
  experiments: Record<string, unknown>;
}

const flagsCache = new Map<string, { data: FlagsBlob; expiry: number }>();
const expsCache = new Map<string, { data: ExpsBlob; expiry: number }>();
const catalogCache = new Map<string, { data: Set<string>; expiry: number }>();

function flagsCacheKey(projectId: string, env: ConfigEnv): string {
  return `${projectId}:${env}`;
}

function isConfigEnv(value: string | undefined | null): value is ConfigEnv {
  return (
    value !== undefined && value !== null && (CONFIG_ENVS as readonly string[]).includes(value)
  );
}

export function resolveEnv(input: string | undefined | null): ConfigEnv {
  return isConfigEnv(input) ? input : "prod";
}

export async function getFlags(
  env: CoreEnv,
  projectId: string,
  targetEnv: ConfigEnv = "prod",
): Promise<FlagsBlob> {
  const ttl = env.FLAGS_CACHE_TTL_MS !== undefined ? Number(env.FLAGS_CACHE_TTL_MS) : 10_000;
  const cacheKey = flagsCacheKey(projectId, targetEnv);
  if (ttl > 0) {
    const hit = flagsCache.get(cacheKey);
    if (hit && Date.now() < hit.expiry) return hit.data;
  }
  if (!env.FLAGS_KV) throw new Error("FLAGS_KV binding missing");
  const raw = await env.FLAGS_KV.get(`${projectId}:${targetEnv}:flags`);
  if (!raw) throw new Error(`No flags for project ${projectId} (env=${targetEnv})`);
  const data = JSON.parse(raw) as FlagsBlob;
  if (ttl > 0) flagsCache.set(cacheKey, { data, expiry: Date.now() + ttl });
  return data;
}

export async function getExperiments(env: CoreEnv, projectId: string): Promise<ExpsBlob> {
  const ttl = env.FLAGS_CACHE_TTL_MS !== undefined ? Number(env.FLAGS_CACHE_TTL_MS) : 10_000;
  if (ttl > 0) {
    const hit = expsCache.get(projectId);
    if (hit && Date.now() < hit.expiry) return hit.data;
  }
  if (!env.FLAGS_KV) throw new Error("FLAGS_KV binding missing");
  const raw = await env.FLAGS_KV.get(`${projectId}:experiments`);
  if (!raw) throw new Error(`No experiments for project ${projectId}`);
  const data = JSON.parse(raw) as ExpsBlob;
  if (ttl > 0) expsCache.set(projectId, { data, expiry: Date.now() + ttl });
  return data;
}

export interface I18nBlob {
  strings: Record<string, string>;
  locale: string;
  version: string;
}

const i18nCache = new Map<string, { data: I18nBlob; expiry: number }>();

export async function getI18nStrings(
  env: CoreEnv,
  projectId: string,
  profileName: string,
): Promise<I18nBlob | null> {
  const ttl = env.FLAGS_CACHE_TTL_MS !== undefined ? Number(env.FLAGS_CACHE_TTL_MS) : 10_000;
  const cacheKey = `${projectId}:${profileName}`;
  if (ttl > 0) {
    const hit = i18nCache.get(cacheKey);
    if (hit && Date.now() < hit.expiry) return hit.data;
  }
  if (!env.FLAGS_KV) return null;
  const raw = await env.FLAGS_KV.get(`${projectId}:i18n:${profileName}`);
  if (!raw) return null;
  const data = JSON.parse(raw) as I18nBlob;
  if (ttl > 0) i18nCache.set(cacheKey, { data, expiry: Date.now() + ttl });
  return data;
}

/** Clears all in-process KV caches. Intended for tests. */
export function clearCaches(projectId?: string): void {
  if (projectId) {
    for (const envName of CONFIG_ENVS) flagsCache.delete(flagsCacheKey(projectId, envName));
    expsCache.delete(projectId);
    catalogCache.delete(projectId);
    for (const key of i18nCache.keys()) {
      if (key.startsWith(`${projectId}:`)) i18nCache.delete(key);
    }
  } else {
    flagsCache.clear();
    expsCache.clear();
    catalogCache.clear();
    i18nCache.clear();
  }
}

export async function getCatalog(env: CoreEnv, projectId: string): Promise<Set<string>> {
  const ttl = env.FLAGS_CACHE_TTL_MS !== undefined ? Number(env.FLAGS_CACHE_TTL_MS) : 60_000;
  if (ttl > 0) {
    const hit = catalogCache.get(projectId);
    if (hit && Date.now() < hit.expiry) return hit.data;
  }
  if (!env.FLAGS_KV) return new Set<string>();
  const raw = await env.FLAGS_KV.get(`${projectId}:catalog`);
  const names = raw ? new Set<string>(JSON.parse(raw) as string[]) : new Set<string>();
  if (ttl > 0) catalogCache.set(projectId, { data: names, expiry: Date.now() + ttl });
  return names;
}
