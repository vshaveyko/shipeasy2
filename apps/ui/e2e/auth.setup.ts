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
  const tables = [
    "label_draft_keys",
    "label_chunks",
    "label_keys",
    "label_drafts",
    "label_profiles",
    "sdk_keys",
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
    `INSERT OR IGNORE INTO events (id, project_id, name, pending, created_at) VALUES ('e2e-event-id', '${pid}', 'e2e_event', 0, '2024-01-01T00:00:00.000Z')`,
    `INSERT OR IGNORE INTO universes (id, project_id, name, unit_type, holdout_range, created_at) VALUES ('e2e-universe-default', '${pid}', 'default', 'user_id', NULL, '2024-01-01T00:00:00.000Z')`,
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
