import { expect, test } from "@playwright/test";

test.describe("Overview page — home cockpit", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/dashboard");
  });

  test("renders the cockpit with a state discriminator", async ({ page }) => {
    const cockpit = page.locator('[data-slot="home-cockpit"]');
    await expect(cockpit).toBeVisible();
    const stateAttr = await cockpit.getAttribute("data-state");
    expect(["first-run", "quiet", "busy"]).toContain(stateAttr);

    const hero = page.locator('[data-slot="home-hero"]');
    await expect(hero).toBeVisible();
    await expect(hero).toHaveAttribute("data-state", stateAttr ?? "");
  });

  test("renders the launchpad with quick-create links", async ({ page }) => {
    const launchpad = page.locator('[data-slot="home-launchpad"]');
    await expect(launchpad).toBeVisible();
    await expect(launchpad.getByRole("link", { name: /^new gate$/i })).toBeVisible();
    await expect(launchpad.getByRole("link", { name: /^new config$/i })).toBeVisible();
    await expect(launchpad.getByRole("link", { name: /^new experiment$/i })).toBeVisible();
    await expect(launchpad.getByRole("link", { name: /^new killswitch$/i })).toBeVisible();
  });

  test("launchpad 'new gate' opens the gates wizard via ?new=1", async ({ page }) => {
    await page
      .locator('[data-slot="home-launchpad"]')
      .getByRole("link", { name: /^new gate$/i })
      .click();
    await expect(page).toHaveURL(/\/dashboard\/e2e-project-id\/gates\?new=1$/);
    await expect(page.getByRole("dialog")).toBeVisible();
  });

  test("either decisions or onboarding renders, never both", async ({ page }) => {
    const cockpit = page.locator('[data-slot="home-cockpit"]');
    const state = await cockpit.getAttribute("data-state");
    if (state === "first-run") {
      await expect(page.locator('[data-slot="home-onboarding"]')).toBeVisible();
      await expect(page.locator('[data-slot="home-decisions"]')).toHaveCount(0);
    } else {
      await expect(page.locator('[data-slot="home-decisions"]')).toBeVisible();
      await expect(page.locator('[data-slot="home-onboarding"]')).toHaveCount(0);
    }
  });
});
