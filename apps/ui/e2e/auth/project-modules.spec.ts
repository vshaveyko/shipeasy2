import { expect, test } from "@playwright/test";

test.describe("Project module toggles", () => {
  test("clicking a project card opens its module page", async ({ page }) => {
    await page.goto("/dashboard/projects");

    // The active project card carries an ACTIVE badge — submit that card's
    // form to land on its detail page.
    const activeCard = page.locator("button[type=submit]").filter({ hasText: "CURRENT" }).first();
    await activeCard.click();

    await expect(page).toHaveURL(/\/dashboard\/projects\/[\w-]+$/);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });

  test("module page renders all seven toggle cards with switches", async ({ page }) => {
    await page.goto("/dashboard/projects");
    const activeCard = page.locator("button[type=submit]").filter({ hasText: "CURRENT" }).first();
    await activeCard.click();
    await page.waitForURL(/\/dashboard\/projects\/[\w-]+$/);

    const main = page.getByRole("main");
    for (const title of [
      "Translations",
      "Configs",
      "Gatekeepers",
      "Experiments",
      "Bugs & feature requests",
      "User",
      "Events",
    ]) {
      await expect(main.getByText(title, { exact: true })).toBeVisible();
    }

    const switches = page.getByRole("switch");
    await expect(switches).toHaveCount(7);

    // All modules default to enabled
    for (let i = 0; i < 7; i++) {
      await expect(switches.nth(i)).toHaveAttribute("aria-checked", "true");
    }
  });

  test("project detail page exposes Modules and Keys tabs", async ({ page }) => {
    await page.goto("/dashboard/projects");
    const activeCard = page.locator("button[type=submit]").filter({ hasText: "CURRENT" }).first();
    await activeCard.click();
    await page.waitForURL(/\/dashboard\/projects\/[\w-]+$/);

    const tablist = page.getByRole("tablist", { name: /project sections/i });
    await expect(tablist).toBeVisible();
    await expect(tablist.getByRole("tab", { name: /^modules$/i })).toHaveAttribute(
      "aria-selected",
      "true",
    );

    await tablist.getByRole("tab", { name: /^keys$/i }).click();
    await expect(page).toHaveURL(/\?tab=keys$/);
    // Either the empty-state copy or the table header renders — both are valid
    // "the panel mounted" signals.
    await expect(
      page.getByText(/No SDK keys yet/i).or(page.getByRole("columnheader", { name: /^type$/i })),
    ).toBeVisible();

    // Switching back to Modules drops the query param.
    await tablist.getByRole("tab", { name: /^modules$/i }).click();
    await expect(page).toHaveURL(/\/dashboard\/projects\/[\w-]+$/);
    await expect(page.getByRole("switch").first()).toBeVisible();
  });

  test("toggling a switch persists across reload", async ({ page }) => {
    await page.goto("/dashboard/projects");
    const activeCard = page.locator("button[type=submit]").filter({ hasText: "CURRENT" }).first();
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
