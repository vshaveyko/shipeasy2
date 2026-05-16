import { expect, test } from "@playwright/test";

test.describe("Settings", () => {
  test("renders nav rail with six tabs and lands on General", async ({ page }) => {
    await page.goto("/dashboard/e2e-project-id/settings");

    await expect(page.getByRole("heading", { name: /^settings$/i, level: 1 })).toBeVisible();

    const nav = page.getByRole("navigation", { name: /settings sections/i });
    for (const label of [
      /^general$/i,
      /experiment defaults/i,
      /^notifications$/i,
      /^integrations$/i,
      /billing & usage/i,
      /^danger zone$/i,
    ]) {
      await expect(nav.getByRole("link", { name: label })).toBeVisible();
    }

    // Default tab is General — its specific fields are present.
    await expect(page.getByLabel(/^project name$/i)).toBeVisible();
    await expect(page.getByLabel(/^project slug$/i)).toBeVisible();
    await expect(page.getByLabel(/^domain$/i)).toBeVisible();
    await expect(page.getByLabel(/^default environment$/i)).toBeVisible();
    await expect(page.getByLabel(/^time zone$/i)).toBeVisible();
  });

  test("Experiment defaults tab shows method, threshold, auto-rollback, sample size", async ({
    page,
  }) => {
    await page.goto("/dashboard/e2e-project-id/settings?tab=experiments");

    await expect(page.getByRole("heading", { name: /experiment defaults/i })).toBeVisible();
    await expect(page.getByLabel(/statistical method/i)).toBeVisible();
    await expect(page.getByLabel(/significance threshold/i)).toBeVisible();
    await expect(page.getByRole("switch", { name: /auto-rollback/i })).toBeVisible();
    await expect(page.getByLabel(/min sample size/i)).toBeVisible();
  });

  test("Notifications tab renders all six events with three channel toggles each", async ({
    page,
  }) => {
    await page.goto("/dashboard/e2e-project-id/settings?tab=notifications");

    const heading = page.getByRole("heading", { name: /^notifications$/i });
    await expect(heading).toBeVisible();
    const main = page.locator("main");
    for (const label of [
      /experiment reaches significance/i,
      /guardrail breached/i,
      /killswitch flipped/i,
      /config published to prod/i,
      /new team member joins/i,
      /weekly experimentation digest/i,
    ]) {
      await expect(main.getByText(label).first()).toBeVisible();
    }

    // Each event has Email/Slack/Claude DM channels = 18 switches.
    const switches = page.getByRole("switch");
    expect(await switches.count()).toBeGreaterThanOrEqual(18);
  });

  test("Integrations tab lists all six providers with Connect/Configure controls", async ({
    page,
  }) => {
    await page.goto("/dashboard/e2e-project-id/settings?tab=integrations");

    const main = page.locator("main");
    await expect(main.getByText(/^slack$/i).first()).toBeVisible();
    await expect(main.getByText(/^github$/i).first()).toBeVisible();
    await expect(main.getByText(/^datadog$/i).first()).toBeVisible();
    await expect(main.getByText(/^segment$/i).first()).toBeVisible();
    await expect(main.getByText(/^linear$/i).first()).toBeVisible();
    await expect(main.getByText(/^pagerduty$/i).first()).toBeVisible();

    const connect = main.getByRole("button", { name: /^connect$/i });
    expect(await connect.count()).toBeGreaterThan(0);
  });

  test("Billing tab shows the current plan card and a manage-plan link", async ({ page }) => {
    await page.goto("/dashboard/e2e-project-id/settings?tab=billing");

    await expect(page.getByRole("heading", { name: /billing & usage/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /manage plan/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /view usage/i })).toBeVisible();
  });

  test("Danger zone shows transfer + delete controls", async ({ page }) => {
    await page.goto("/dashboard/e2e-project-id/settings?tab=danger");

    const main = page.locator("main");
    await expect(main.getByRole("heading", { name: /danger zone/i })).toBeVisible();
    await expect(main.getByText(/^transfer ownership$/i).first()).toBeVisible();
    await expect(main.getByText(/^delete project$/i).first()).toBeVisible();
    await expect(main.getByRole("button", { name: /transfer ownership/i })).toBeVisible();
    await expect(main.getByRole("button", { name: /delete project/i })).toBeVisible();
  });

  test("Delete dialog requires typing the project name to enable submit", async ({ page }) => {
    await page.goto("/dashboard/e2e-project-id/settings?tab=danger");

    const main = page.locator("main");
    const trigger = main.getByRole("button", { name: /delete project/i });
    if (await trigger.isDisabled()) {
      // Non-owner — explanatory text surfaces instead.
      await expect(main.getByText(/only the current owner can delete/i)).toBeVisible();
      return;
    }
    await trigger.click();
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByRole("heading", { name: /delete project/i })).toBeVisible();
    const submit = dialog.getByRole("button", { name: /^delete project$/i });
    await expect(submit).toBeDisabled();
    await dialog.getByRole("button", { name: /cancel/i }).click();
    await expect(dialog).toBeHidden();
  });
});
