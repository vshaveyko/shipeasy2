// KV read helpers with module-scope caches.

import type { CoreEnv } from "../env";

export interface FlagsBlob {
  blobFormat?: number;
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

export async function getFlags(env: CoreEnv, projectId: string): Promise<FlagsBlob> {
  const hit = flagsCache.get(projectId);
  if (hit && Date.now() < hit.expiry) return hit.data;
  if (!env.FLAGS_KV) throw new Error("FLAGS_KV binding missing");
  const raw = await env.FLAGS_KV.get(`${projectId}:flags`);
  if (!raw) throw new Error(`No flags for project ${projectId}`);
  const data = JSON.parse(raw) as FlagsBlob;
  flagsCache.set(projectId, { data, expiry: Date.now() + 10_000 });
  return data;
}

export async function getExperiments(env: CoreEnv, projectId: string): Promise<ExpsBlob> {
  const hit = expsCache.get(projectId);
  if (hit && Date.now() < hit.expiry) return hit.data;
  if (!env.FLAGS_KV) throw new Error("FLAGS_KV binding missing");
  const raw = await env.FLAGS_KV.get(`${projectId}:experiments`);
  if (!raw) throw new Error(`No experiments for project ${projectId}`);
  const data = JSON.parse(raw) as ExpsBlob;
  expsCache.set(projectId, { data, expiry: Date.now() + 10_000 });
  return data;
}

export async function getCatalog(env: CoreEnv, projectId: string): Promise<Set<string>> {
  const hit = catalogCache.get(projectId);
  if (hit && Date.now() < hit.expiry) return hit.data;
  if (!env.FLAGS_KV) return new Set<string>();
  const raw = await env.FLAGS_KV.get(`${projectId}:catalog`);
  const names = raw ? new Set<string>(JSON.parse(raw) as string[]) : new Set<string>();
  catalogCache.set(projectId, { data: names, expiry: Date.now() + 60_000 });
  return names;
}
