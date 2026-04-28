import { expect, test } from "@playwright/test";

test.describe("Billing", () => {
  test("billing page loads with heading and subscription card", async ({ page }) => {
    await page.goto("/dashboard/billing");

    await expect(page.getByRole("heading", { name: /^billing$/i, level: 1 })).toBeVisible();
    await expect(page.getByText(/subscription/i).first()).toBeVisible();
  });

  test("free plan user sees Free status badge", async ({ page }) => {
    await page.goto("/dashboard/billing");

    // e2e user is on the free plan — status badge should read "Free"
    await expect(page.getByText(/^free$/i).first()).toBeVisible();
  });

  test("free plan user sees upgrade buttons", async ({ page }) => {
    await page.goto("/dashboard/billing");

    await expect(page.getByRole("button", { name: /upgrade.*monthly/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /upgrade.*annual/i })).toBeVisible();
  });

  test("annual upgrade button shows discount", async ({ page }) => {
    await page.goto("/dashboard/billing");

    await expect(page.getByRole("button", { name: /−20%/i })).toBeVisible();
  });

  test("plan limits grid renders stat boxes", async ({ page }) => {
    await page.goto("/dashboard/billing");

    const main = page.locator("main");
    await expect(main.getByText(/gates/i).first()).toBeVisible();
    await expect(main.getByText(/configs/i).first()).toBeVisible();
    await expect(main.getByText(/running experiments/i).first()).toBeVisible();
  });

  test("free plan user sees 'unlock with a paid plan' section", async ({ page }) => {
    await page.goto("/dashboard/billing");

    await expect(page.getByText(/unlock with a paid plan/i)).toBeVisible();
    await expect(page.getByText(/unlimited gates/i)).toBeVisible();
  });

  test("free plan user does not see 'Manage billing' button", async ({ page }) => {
    await page.goto("/dashboard/billing");

    await expect(page.getByRole("button", { name: /manage billing/i })).not.toBeVisible();
  });

  test("billing nav item is visible in sidebar", async ({ page }) => {
    await page.goto("/dashboard");

    await expect(page.getByRole("link", { name: /^billing$/i })).toBeVisible();
  });

  test("billing link in sidebar navigates to billing page", async ({ page }) => {
    await page.goto("/dashboard");

    await page.getByRole("link", { name: /^billing$/i }).click();
    await expect(page).toHaveURL(/\/dashboard\/billing$/);
    await expect(page.getByRole("heading", { name: /^billing$/i, level: 1 })).toBeVisible();
  });

  test("unauthenticated user is redirected to sign-in", async ({ browser }) => {
    const ctx = await browser.newContext({ storageState: { cookies: [], origins: [] } });
    const page = await ctx.newPage();
    await page.goto("/dashboard/billing");
    await expect(page).toHaveURL(/\/auth\/signin/);
    await ctx.close();
  });
});
