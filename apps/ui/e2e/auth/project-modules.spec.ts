import { expect, test } from "@playwright/test";

test.describe("Project module toggles", () => {
  test("clicking a project card opens its module page", async ({ page }) => {
    await page.goto("/dashboard/projects");

    // The active project card carries an ACTIVE badge — submit that card's
    // form to land on its detail page.
    const activeCard = page.locator("button[type=submit]").filter({ hasText: "ACTIVE" }).first();
    await activeCard.click();

    await expect(page).toHaveURL(/\/dashboard\/projects\/[\w-]+$/);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });

  test("module page renders all five toggle cards with switches", async ({ page }) => {
    await page.goto("/dashboard/projects");
    const activeCard = page.locator("button[type=submit]").filter({ hasText: "ACTIVE" }).first();
    await activeCard.click();
    await page.waitForURL(/\/dashboard\/projects\/[\w-]+$/);

    for (const title of [
      "Translations",
      "Configs",
      "Gatekeepers",
      "Experiments",
      "Bugs & feature requests",
    ]) {
      await expect(page.getByText(title, { exact: true })).toBeVisible();
    }

    const switches = page.getByRole("switch");
    await expect(switches).toHaveCount(5);

    // All modules default to enabled
    for (let i = 0; i < 5; i++) {
      await expect(switches.nth(i)).toHaveAttribute("aria-checked", "true");
    }
  });

  test("toggling a switch persists across reload", async ({ page }) => {
    await page.goto("/dashboard/projects");
    const activeCard = page.locator("button[type=submit]").filter({ hasText: "ACTIVE" }).first();
    await activeCard.click();
    await page.waitForURL(/\/dashboard\/projects\/[\w-]+$/);

    const firstSwitch = page.getByRole("switch").first();
    await firstSwitch.click();
    await expect(firstSwitch).toHaveAttribute("aria-checked", "false");

    await page.reload();
    await expect(page.getByRole("switch").first()).toHaveAttribute("aria-checked", "false");

    // Toggle it back so subsequent test runs start from a clean enabled state.
    await page.getByRole("switch").first().click();
    await expect(page.getByRole("switch").first()).toHaveAttribute("aria-checked", "true");
  });
});
