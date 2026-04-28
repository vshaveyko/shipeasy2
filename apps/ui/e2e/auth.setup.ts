import { execSync } from "node:child_process";
import { readdirSync } from "node:fs";
import path from "node:path";

import { test as setup } from "@playwright/test";
import { encode } from "next-auth/jwt";

function cleanE2eTestData() {
  const dir = path.join(__dirname, "../.wrangler/state/v3/d1/miniflare-D1DatabaseObject");
  let files: string[];
  try {
    files = readdirSync(dir).filter((f) => f.endsWith(".sqlite") && !f.includes("metadata"));
  } catch {
    return; // wrangler state not initialised yet — first run, nothing to clean
  }
  if (files.length === 0) return;

  const db = path.join(dir, files[0]);
  const pid = "e2e-project-id";
  // experiment_metrics has no project_id column — must use subquery; delete before experiments
  try {
    execSync(
      `sqlite3 "${db}" "DELETE FROM experiment_metrics WHERE experiment_id IN (SELECT id FROM experiments WHERE project_id='${pid}')"`,
    );
  } catch {
    // ignore
  }

  const tables = [
    "label_draft_keys",
    "label_chunks",
    "label_keys",
    "label_drafts",
    "label_profiles",
    "sdk_keys",
    "experiment_results",
    "metrics",
    "gates",
    "configs",
    "events",
    "user_attributes",
    "universes",
    "experiments",
  ];
  for (const tbl of tables) {
    try {
      execSync(`sqlite3 "${db}" "DELETE FROM ${tbl} WHERE project_id='${pid}'"`);
    } catch {
      // table may not exist in older migrations — ignore
    }
  }

  // Re-seed fixed rows that various tests depend on
  const seeds = [
    // Project row must exist (with plan=pro) so loadProject() resolves and TopBar shows plan badge
    // Use INSERT OR IGNORE + UPDATE to avoid CASCADE deleting child rows (universes, etc.)
    `INSERT OR IGNORE INTO projects (id, name, owner_email, plan, status, created_at, updated_at) VALUES ('${pid}', 'Default project', 'e2e@shipeasy.test', 'free', 'active', '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z')`,
    `UPDATE projects SET plan='free', name='Default project', stripe_customer_id=NULL, stripe_subscription_id=NULL, stripe_item_id_base=NULL, stripe_item_id_experiments=NULL, stripe_item_id_gates=NULL, stripe_item_id_configs=NULL, subscription_status='none', current_period_end=NULL, trial_ends_at=NULL, cancel_at_period_end=0, billing_interval='monthly' WHERE id='${pid}'`,
    `INSERT OR IGNORE INTO events (id, project_id, name, pending, created_at) VALUES ('e2e-event-id', '${pid}', 'e2e_event', 0, '2024-01-01T00:00:00.000Z')`,
    `INSERT OR IGNORE INTO universes (id, project_id, name, unit_type, holdout_range, created_at) VALUES ('e2e-universe-default', '${pid}', 'default', 'user_id', NULL, '2024-01-01T00:00:00.000Z')`,
    // i18n test profile (en:test) with 5 keys matching i18n-keys.spec.ts expectations
    // IDs must be valid UUIDs so draftCreateSchema (z.string().uuid()) accepts the profile_id.
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
      // ignore
    }
  }
}

export const AUTH_STATE_FILE = path.join(__dirname, ".auth/user.json");

const SESSION_COOKIE = "authjs.session-token";
const ONE_DAY = 60 * 60 * 24;

const SECRET = process.env.AUTH_SECRET ?? "e2e-test-secret-not-for-production-use-only";

export const E2E_USER = {
  id: "e2e-user-id",
  name: "E2E Test User",
  email: "e2e@shipeasy.test",
};

setup("authenticate", async ({ browser, baseURL }) => {
  cleanE2eTestData();
  if (!baseURL) throw new Error("baseURL missing from Playwright config");
  const url = new URL(baseURL);

  const token = await encode({
    token: {
      sub: E2E_USER.id,
      id: E2E_USER.id,
      name: E2E_USER.name,
      email: E2E_USER.email,
      picture: null,
      project_id: "e2e-project-id",
    },
    secret: SECRET,
    salt: SESSION_COOKIE,
    maxAge: ONE_DAY,
  });

  const context = await browser.newContext();
  await context.addCookies([
    {
      name: SESSION_COOKIE,
      value: token,
      domain: url.hostname,
      path: "/",
      httpOnly: true,
      secure: false,
      sameSite: "Lax",
      expires: Math.floor(Date.now() / 1000) + ONE_DAY,
    },
  ]);

  await context.storageState({ path: AUTH_STATE_FILE });
  await context.close();
});
