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
    `INSERT OR REPLACE INTO label_keys (id, project_id, profile_id, chunk_id, key, value, updated_at, updated_by) VALUES ('e2e00000-0000-4000-8000-000000000003', '${pid}', 'e2e00000-0000-4000-8000-000000000001', 'e2e00000-0000-4000-8000-000000000002', 'simple', 'Simple value', '2024-01-01T00:00:00.000Z', 'e2e')`,
    `INSERT OR REPLACE INTO label_keys (id, project_id, profile_id, chunk_id, key, value, updated_at, updated_by) VALUES ('e2e00000-0000-4000-8000-000000000004', '${pid}', 'e2e00000-0000-4000-8000-000000000001', 'e2e00000-0000-4000-8000-000000000002', 'auth.login.title', 'Sign in', '2024-01-01T00:00:00.000Z', 'e2e')`,
    `INSERT OR REPLACE INTO label_keys (id, project_id, profile_id, chunk_id, key, value, updated_at, updated_by) VALUES ('e2e00000-0000-4000-8000-000000000005', '${pid}', 'e2e00000-0000-4000-8000-000000000001', 'e2e00000-0000-4000-8000-000000000002', 'auth.login.subtitle', 'Welcome back', '2024-01-01T00:00:00.000Z', 'e2e')`,
    `INSERT OR REPLACE INTO label_keys (id, project_id, profile_id, chunk_id, key, value, updated_at, updated_by) VALUES ('e2e00000-0000-4000-8000-000000000006', '${pid}', 'e2e00000-0000-4000-8000-000000000001', 'e2e00000-0000-4000-8000-000000000002', 'auth.signup.title', 'Create account', '2024-01-01T00:00:00.000Z', 'e2e')`,
    `INSERT OR REPLACE INTO label_keys (id, project_id, profile_id, chunk_id, key, value, updated_at, updated_by) VALUES ('e2e00000-0000-4000-8000-000000000007', '${pid}', 'e2e00000-0000-4000-8000-000000000001', 'e2e00000-0000-4000-8000-000000000002', 'app.menu', 'Dashboard', '2024-01-01T00:00:00.000Z', 'e2e')`,
  ];
  for (const sql of seeds) {
    try {
      execSync(`sqlite3 "${db}" "${sql}"`);
    } catch {
      // ignore — table may be missing in older migrations
    }
  }
}

/** Transiently set the e2e fixture project's domain. Pass `null` to clear it.
 *  Specs that exercise origin-allowlisted flows (devtools-auth, admin bearer
 *  token via /devtools-auth) must set the domain to match the test origin in
 *  beforeAll, then clear it in afterAll so other specs see a null-domain
 *  project. */
export function setProjectDomain(domain: string | null): void {
  const db = locateD1();
  if (!db) return;
  const pid = "e2e-project-id";
  const literal = domain === null ? "NULL" : `'${domain.replace(/'/g, "''")}'`;
  try {
    execSync(`sqlite3 "${db}" "UPDATE projects SET domain=${literal} WHERE id='${pid}'"`);
  } catch {
    // ignore
  }
}

/** Transiently switch the e2e fixture project to a different plan. Specs that
 *  exceed free-plan limits (e.g. creating multiple configs/experiments) should
 *  bump to "paid" in beforeAll and reset to "free" in afterAll. */
export function setProjectPlan(plan: "free" | "paid"): void {
  const db = locateD1();
  if (!db) return;
  const pid = "e2e-project-id";
  try {
    execSync(`sqlite3 "${db}" "UPDATE projects SET plan='${plan}' WHERE id='${pid}'"`);
  } catch {
    // ignore
  }
}

/** Insert (or no-op) an event row so the metric wizard's event picker has
 *  something to select. `properties` is a JSON-encoded EventProperty[]. */
export function seedEvent(
  name: string,
  properties: {
    name: string;
    type: "string" | "number" | "boolean";
    required?: boolean;
    description?: string;
  }[] = [],
): void {
  const db = locateD1();
  if (!db) return;
  const pid = "e2e-project-id";
  const id = `evt-e2e-${name}`;
  const props = JSON.stringify(
    properties.map((p) => ({
      name: p.name,
      type: p.type,
      required: p.required ?? false,
      description: p.description ?? "",
    })),
  ).replace(/'/g, "''");
  const sql =
    `INSERT OR IGNORE INTO events (id, project_id, name, description, folder, properties, pending, created_at) ` +
    `VALUES ('${id}', '${pid}', '${name}', NULL, NULL, '${props}', 0, '2024-01-01T00:00:00.000Z')`;
  try {
    execSync(`sqlite3 "${db}" "${sql}"`);
  } catch {
    // ignore
  }
}

/** Delete a seeded event (and any metric that referenced it). */
export function cleanupEvent(name: string): void {
  const db = locateD1();
  if (!db) return;
  const pid = "e2e-project-id";
  try {
    execSync(
      `sqlite3 "${db}" "DELETE FROM metrics WHERE project_id='${pid}' AND event_name='${name}'"`,
    );
    execSync(`sqlite3 "${db}" "DELETE FROM events WHERE project_id='${pid}' AND name='${name}'"`);
  } catch {
    // ignore
  }
}
