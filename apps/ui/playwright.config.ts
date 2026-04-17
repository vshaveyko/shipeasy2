import path from "node:path";

import { defineConfig, devices } from "@playwright/test";

const PORT = Number(process.env.PLAYWRIGHT_PORT ?? 3100);
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? `http://localhost:${PORT}`;

// Edge worker — shares the same wrangler local state as the UI so KV/D1 writes
// made by the admin API are immediately visible on the hot path.
const WORKER_PORT = Number(process.env.WORKER_PORT ?? 8787);
export const WORKER_BASE_URL = process.env.WORKER_BASE_URL ?? `http://localhost:${WORKER_PORT}`;
const WORKER_DIR = path.resolve(__dirname, "../../packages/worker");
const WORKER_PERSIST = path.resolve(__dirname, ".wrangler");

const AUTH_STATE_FILE = path.join(__dirname, "e2e/.auth/user.json");

// Build the list of servers to start.  Each entry is optional so callers can
// bypass auto-start by setting PLAYWRIGHT_BASE_URL / WORKER_BASE_URL.
const uiServer = process.env.PLAYWRIGHT_BASE_URL
  ? null
  : {
      command: `next dev -p ${PORT}`,
      url: baseURL,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      stdout: "ignore" as const,
      stderr: "pipe" as const,
      env: {
        AUTH_SECRET: process.env.AUTH_SECRET ?? "e2e-test-secret-not-for-production-use-only",
        AUTH_GOOGLE_ID: process.env.AUTH_GOOGLE_ID ?? "test-google-id",
        AUTH_GOOGLE_SECRET: process.env.AUTH_GOOGLE_SECRET ?? "test-google-secret",
        AUTH_GITHUB_ID: process.env.AUTH_GITHUB_ID ?? "test-github-id",
        AUTH_GITHUB_SECRET: process.env.AUTH_GITHUB_SECRET ?? "test-github-secret",
      },
    };

// Start the edge worker alongside the UI so SDK endpoint tests can exercise
// the full KV → worker pipeline without mocking.
// Skip by setting WORKER_BASE_URL to any value (e.g. an already-running worker).
const workerServer = process.env.WORKER_BASE_URL
  ? null
  : {
      command: `sh -c 'cd "${WORKER_DIR}" && pnpm exec wrangler dev --port ${WORKER_PORT} --persist-to "${WORKER_PERSIST}"'`,
      url: `${WORKER_BASE_URL}/healthz`,
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
      stdout: "ignore" as const,
      stderr: "pipe" as const,
    };

const servers = [uiServer, workerServer].filter(Boolean) as NonNullable<typeof uiServer>[];

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
  webServer: servers.length ? servers : undefined,
});
