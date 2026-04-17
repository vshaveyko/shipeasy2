import { scopedDb as scopedDbCore, type ScopedDb } from "@shipeasy/core";
import { getEnv, getEnvAsync } from "./env";

// For RSC rendering — uses the global context set by initOpenNextCloudflareForDev.
export function scopedDb(projectId: string): ScopedDb {
  return scopedDbCore(getEnv().DB, projectId);
}

// For Server Actions — directly calls wrangler if the global context isn't set yet.
// Also warms the global so subsequent sync calls work within the same request chain.
export async function scopedDbSA(projectId: string): Promise<ScopedDb> {
  const env = await getEnvAsync();
  return scopedDbCore(env.DB, projectId);
}
