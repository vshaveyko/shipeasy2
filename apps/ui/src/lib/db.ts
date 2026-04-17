import { scopedDb as scopedDbCore, type ScopedDb } from "@shipeasy/core";
import { getEnv } from "./env";

export function scopedDb(projectId: string): ScopedDb {
  return scopedDbCore(getEnv().DB, projectId);
}
