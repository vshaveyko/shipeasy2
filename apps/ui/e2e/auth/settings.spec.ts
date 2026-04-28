import { expect, test } from "@playwright/test";

test.describe("Settings", () => {
  test("shows project, plan, and account sections", async ({ page }) => {
    await page.goto("/dashboard/settings");

    await expect(page.getByRole("heading", { name: /^settings$/i, level: 1 })).toBeVisible();

    const main = page.locator("main");
    await expect(main.getByText(/^project$/i).first()).toBeVisible();
    await expect(page.getByLabel(/domain/i)).toBeVisible();
    await expect(page.getByLabel(/display name/i)).toBeVisible();
    await expect(page.getByLabel(/project id/i)).toBeVisible();

    await expect(main.getByText(/^plan$/i).first()).toBeVisible();
    await expect(page.getByText(/^current$/i)).toBeVisible();
    await expect(page.getByRole("link", { name: /manage billing/i })).toBeVisible();

    await expect(page.getByText("e2e@shipeasy.test")).toBeVisible();
    await expect(page.getByText(/e2e test user/i).first()).toBeVisible();
  });

  test("sign-out button on settings page signs the user out", async ({ page }) => {
    await page.goto("/dashboard/settings");

    await page
      .locator("main")
      .getByRole("button", { name: /^sign out$/i })
      .click();

    await page.waitForURL(/\/$|\/auth\/signin$/);
    const nextUrl = page.url();
    expect(nextUrl).toMatch(/\/$|\/auth\/signin$/);

    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/auth\/signin$/);
  });
});
