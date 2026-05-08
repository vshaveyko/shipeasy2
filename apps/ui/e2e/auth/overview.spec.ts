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

    // Product cards on the overview render the product name + tagline inside
    // an <a>, so the accessible name is e.g. "Configs Dynamic values & remote
    // config". Match by substring to find the right card without depending on
    // marketing copy.
    await main
      .getByRole("link", { name: /configs/i })
      .first()
      .click();
    await expect(page).toHaveURL(/\/dashboard\/e2e-project-id\/configs\/values$/);
    await page.goBack();

    await main
      .getByRole("link", { name: /experiments/i })
      .first()
      .click();
    await expect(page).toHaveURL(/\/dashboard\/e2e-project-id\/experiments$/);
    await page.goBack();

    await main
      .getByRole("link", { name: /string manager/i })
      .first()
      .click();
    await expect(page).toHaveURL(/\/dashboard\/e2e-project-id\/i18n$/);
  });
});
