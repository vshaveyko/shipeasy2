import { expect, test } from "@playwright/test";

test.describe("Product switcher", () => {
  test("shows the current product on the Configs and Experiments routes", async ({ page }) => {
    const cases: Array<{ url: string; name: RegExp }> = [
      { url: "/dashboard/configs", name: /configs/i },
      { url: "/dashboard/experiments", name: /experiments/i },
    ];

    for (const c of cases) {
      await page.goto(c.url);
      const trigger = page.getByRole("button", { name: /switch product/i });
      await expect(trigger).toBeVisible();
      await expect(trigger).toContainText(c.name);
    }
  });

  test("switching between Configs and Experiments navigates to the product root", async ({
    page,
  }) => {
    await page.goto("/dashboard/configs");

    await page.getByRole("button", { name: /switch product/i }).click();
    const experiments = page.getByRole("menuitem", { name: /^experiments/i });
    await expect(experiments).toBeVisible();
    await experiments.click();
    await expect(page).toHaveURL(/\/dashboard\/experiments$/);

    await page.getByRole("button", { name: /switch product/i }).click();
    const configs = page.getByRole("menuitem", { name: /^configs/i });
    await expect(configs).toBeVisible();
    await configs.click();
    await expect(page).toHaveURL(/\/dashboard\/configs\/values$/);
  });

  test("menu lists all four products", async ({ page }) => {
    await page.goto("/dashboard/configs/values");
    await page.getByRole("button", { name: /switch product/i }).click();

    for (const name of [/^gates/i, /^configs/i, /^experiments/i, /string manager/i]) {
      await expect(page.getByRole("menuitem", { name })).toBeVisible();
    }
  });

  test("dashboard root shows product cards linking to each product", async ({ page }) => {
    await page.goto("/dashboard");

    const main = page.locator("main");
    for (const label of [
      /open gates/i,
      /open configs/i,
      /open experiments/i,
      /open string manager/i,
    ]) {
      await expect(main.getByRole("link", { name: label })).toBeVisible();
    }

    await main.getByRole("link", { name: /open configs/i }).click();
    await expect(page).toHaveURL(/\/dashboard\/configs\/values$/);
  });
});
