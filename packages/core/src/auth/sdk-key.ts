// validateSdkKey(rawKey, expectedType, kv) — KV lookup + module cache.

import { sha256 } from "./crypto";

export type SdkKeyType = "server" | "client" | "admin";

export interface SdkKeyMeta {
  project_id: string;
  type: SdkKeyType;
  expires_at?: string | null;
}

const keyCache = new Map<string, { meta: SdkKeyMeta; expiry: number }>();

export async function validateSdkKey(
  rawKey: string,
  expectedType: SdkKeyType,
  kv: KVNamespace | undefined,
): Promise<SdkKeyMeta | null> {
  if (!kv) return null;
  const hash = await sha256(rawKey);

  const cached = keyCache.get(hash);
  if (cached && Date.now() < cached.expiry) {
    if (cached.meta.type !== expectedType && cached.meta.type !== "admin") return null;
    return cached.meta;
  }

  const raw = await kv.get(`sdk_key:${hash}`);
  if (!raw) return null;

  const meta = JSON.parse(raw) as SdkKeyMeta;
  if (meta.expires_at && new Date(meta.expires_at) < new Date()) return null;
  if (meta.type !== expectedType && meta.type !== "admin") return null;

  const ttl = meta.type === "admin" ? 5_000 : 60_000;
  keyCache.set(hash, { meta, expiry: Date.now() + ttl });
  return meta;
}
