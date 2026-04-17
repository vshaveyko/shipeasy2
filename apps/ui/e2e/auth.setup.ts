import path from "node:path";

import { test as setup } from "@playwright/test";
import { encode } from "next-auth/jwt";

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
