import { expect, test } from "@playwright/test";

test.describe("Overview page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/dashboard");
  });

  test("renders welcome heading with the signed-in user's first name", async ({ page }) => {
    await expect(page.getByRole("heading", { name: /welcome back, e2e/i, level: 1 })).toBeVisible();
  });

  test("shows the four stat cards with default zero values", async ({ page }) => {
    for (const label of [
      /gates \+ configs/i,
      /running experiments/i,
      /published locales/i,
      /^plan$/i,
    ]) {
      await expect(page.getByText(label).first()).toBeVisible();
    }
  });

  test("product cards link to each product root", async ({ page }) => {
    const main = page.locator("main");

    await main.getByRole("link", { name: /open configs/i }).click();
    await expect(page).toHaveURL(/\/dashboard\/configs\/values$/);
    await page.goBack();

    await main.getByRole("link", { name: /open experiments/i }).click();
    await expect(page).toHaveURL(/\/dashboard\/experiments$/);
    await page.goBack();

    await main.getByRole("link", { name: /open string manager/i }).click();
    await expect(page).toHaveURL(/\/dashboard\/i18n$/);
  });
});
