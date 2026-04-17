import { expect, test } from "@playwright/test";

test.describe("Top bar", () => {
  test("shows the current project and plan badge", async ({ page }) => {
    await page.goto("/dashboard");

    const header = page.locator("header");
    await expect(header.getByText(/default project/i).first()).toBeVisible();
    await expect(header.getByText(/^free$/i)).toBeVisible();
  });

  test("user menu opens and exposes settings, keys, and sign out", async ({ page }) => {
    await page.goto("/dashboard");

    await page.getByRole("button", { name: /e2e test user/i }).click();

    await expect(page.getByText("e2e@shipeasy.test")).toBeVisible();
    await expect(page.getByRole("menuitem", { name: /^settings$/i })).toBeVisible();
    await expect(page.getByRole("menuitem", { name: /^sdk keys$/i })).toBeVisible();
    await expect(page.getByRole("menuitem", { name: /^sign out$/i })).toBeVisible();
  });

  test("user menu sign-out returns to landing or signin", async ({ page }) => {
    await page.goto("/dashboard");

    await page.getByRole("button", { name: /e2e test user/i }).click();
    await page.getByRole("menuitem", { name: /^sign out$/i }).click();

    await page.waitForURL(/\/$|\/auth\/signin$/);
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/auth\/signin$/);
  });
});
