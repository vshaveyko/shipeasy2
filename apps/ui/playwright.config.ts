import path from "node:path";

import { defineConfig, devices } from "@playwright/test";

const PORT = Number(process.env.PLAYWRIGHT_PORT ?? 3100);
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? `http://localhost:${PORT}`;

const AUTH_STATE_FILE = path.join(__dirname, "e2e/.auth/user.json");

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "setup",
      testMatch: "auth.setup.ts",
    },
    {
      name: "guest",
      testMatch: "guest/**/*.spec.ts",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1440, height: 900 },
      },
    },
    {
      name: "auth",
      testMatch: "auth/**/*.spec.ts",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1440, height: 900 },
        storageState: AUTH_STATE_FILE,
      },
      dependencies: ["setup"],
    },
  ],
  webServer: process.env.PLAYWRIGHT_BASE_URL
    ? undefined
    : {
        command: `next dev -p ${PORT}`,
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
        stdout: "ignore",
        stderr: "pipe",
        env: {
          AUTH_SECRET: process.env.AUTH_SECRET ?? "e2e-test-secret-not-for-production-use-only",
          AUTH_GOOGLE_ID: process.env.AUTH_GOOGLE_ID ?? "test-google-id",
          AUTH_GOOGLE_SECRET: process.env.AUTH_GOOGLE_SECRET ?? "test-google-secret",
          AUTH_GITHUB_ID: process.env.AUTH_GITHUB_ID ?? "test-github-id",
          AUTH_GITHUB_SECRET: process.env.AUTH_GITHUB_SECRET ?? "test-github-secret",
        },
      },
});
