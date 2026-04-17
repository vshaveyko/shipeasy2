import { drizzle, type DrizzleD1Database } from "drizzle-orm/d1";
import * as schema from "./schema";

export type Db = DrizzleD1Database<typeof schema>;

let cached: Db | null = null;
let cachedFor: D1Database | null = null;

export function getDb(d1: D1Database): Db {
  if (cached && cachedFor === d1) return cached;
  cached = drizzle(d1, { schema });
  cachedFor = d1;
  return cached;
}
