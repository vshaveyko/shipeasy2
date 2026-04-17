// Playwright config for post-deploy smoke tests.
// No webServer — tests run against the live production worker URL.
// Required env vars: SMOKE_WORKER_URL, SMOKE_SERVER_KEY, SMOKE_CLIENT_KEY.

import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e/smoke",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 4,
  reporter: process.env.CI ? "github" : "list",
  use: {
    // No baseURL — smoke tests call SMOKE_WORKER_URL directly.
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "smoke",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
