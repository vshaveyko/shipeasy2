import { drizzle } from "drizzle-orm/d1";
import { projects } from "@shipeasy/core/db/schema";
import { createTestDb, type SqliteD1 } from "./sqlite-d1";
import { MemoryKV } from "./memory-kv";

export const TEST_PROJECT_ID = "proj_test";
export const TEST_EMAIL = "test@example.com";

export interface TestEnv {
  DB: D1Database;
  FLAGS_KV: KVNamespace;
  _kv: MemoryKV;
}

export function createTestEnv(): TestEnv {
  const d1 = createTestDb();
  const kv = new MemoryKV();
  return {
    DB: d1 as unknown as D1Database,
    FLAGS_KV: kv as unknown as KVNamespace,
    _kv: kv,
  };
}

export async function seedProject(
  env: TestEnv,
  id = TEST_PROJECT_ID,
  email = TEST_EMAIL,
): Promise<void> {
  const db = drizzle(env.DB, {});
  await db.insert(projects).values({
    id,
    name: "Test Project",
    ownerEmail: email,
    plan: "free",
    status: "active",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
}

/** Returns a JSON Request with the given method, path, and body. */
export function req(method: string, url: string, body?: unknown): Request {
  return new Request(`http://localhost${url}`, {
    method,
    headers: body ? { "Content-Type": "application/json" } : {},
    body: body ? JSON.stringify(body) : undefined,
  });
}
