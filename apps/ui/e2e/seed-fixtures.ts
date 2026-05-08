import { execSync } from "node:child_process";
import { readdirSync } from "node:fs";
import path from "node:path";

/** Locate the miniflare D1 sqlite file used by both the UI and worker dev servers. */
function locateD1(): string | null {
  const dir = path.join(__dirname, "../.wrangler/state/v3/d1/miniflare-D1DatabaseObject");
  let files: string[];
  try {
    files = readdirSync(dir).filter((f) => f.endsWith(".sqlite") && !f.includes("metadata"));
  } catch {
    return null;
  }
  if (files.length === 0) return null;
  return path.join(dir, files[0]);
}

/**
 * Idempotent re-seed of the i18n fixture (en:test profile + 5 keys). Specs
 * that touch `label_profiles` / `label_keys` should call this in
 * `test.beforeEach` so they don't get clobbered by sibling tests deleting
 * the seeded rows.
 */
export function seedI18nFixture(): void {
  const db = locateD1();
  if (!db) return;
  const pid = "e2e-project-id";
  const seeds = [
    `INSERT OR IGNORE INTO label_profiles (id, project_id, name, created_at) VALUES ('e2e00000-0000-4000-8000-000000000001', '${pid}', 'en:test', '2024-01-01T00:00:00.000Z')`,
    `INSERT OR IGNORE INTO label_chunks (id, project_id, profile_id, name, is_index) VALUES ('e2e00000-0000-4000-8000-000000000002', '${pid}', 'e2e00000-0000-4000-8000-000000000001', 'main', 1)`,
    `INSERT OR IGNORE INTO label_keys (id, project_id, profile_id, chunk_id, key, value, updated_at, updated_by) VALUES ('e2e00000-0000-4000-8000-000000000003', '${pid}', 'e2e00000-0000-4000-8000-000000000001', 'e2e00000-0000-4000-8000-000000000002', 'simple', 'Simple value', '2024-01-01T00:00:00.000Z', 'e2e')`,
    `INSERT OR IGNORE INTO label_keys (id, project_id, profile_id, chunk_id, key, value, updated_at, updated_by) VALUES ('e2e00000-0000-4000-8000-000000000004', '${pid}', 'e2e00000-0000-4000-8000-000000000001', 'e2e00000-0000-4000-8000-000000000002', 'auth.login.title', 'Sign in', '2024-01-01T00:00:00.000Z', 'e2e')`,
    `INSERT OR IGNORE INTO label_keys (id, project_id, profile_id, chunk_id, key, value, updated_at, updated_by) VALUES ('e2e00000-0000-4000-8000-000000000005', '${pid}', 'e2e00000-0000-4000-8000-000000000001', 'e2e00000-0000-4000-8000-000000000002', 'auth.login.subtitle', 'Welcome back', '2024-01-01T00:00:00.000Z', 'e2e')`,
    `INSERT OR IGNORE INTO label_keys (id, project_id, profile_id, chunk_id, key, value, updated_at, updated_by) VALUES ('e2e00000-0000-4000-8000-000000000006', '${pid}', 'e2e00000-0000-4000-8000-000000000001', 'e2e00000-0000-4000-8000-000000000002', 'auth.signup.title', 'Create account', '2024-01-01T00:00:00.000Z', 'e2e')`,
    `INSERT OR IGNORE INTO label_keys (id, project_id, profile_id, chunk_id, key, value, updated_at, updated_by) VALUES ('e2e00000-0000-4000-8000-000000000007', '${pid}', 'e2e00000-0000-4000-8000-000000000001', 'e2e00000-0000-4000-8000-000000000002', 'app.menu', 'Dashboard', '2024-01-01T00:00:00.000Z', 'e2e')`,
  ];
  for (const sql of seeds) {
    try {
      execSync(`sqlite3 "${db}" "${sql}"`);
    } catch {
      // ignore — table may be missing in older migrations
    }
  }
}
