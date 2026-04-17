import { test, expect } from "@playwright/test";

test.describe("Dashboard access control", () => {
  test("redirects unauthenticated users to sign-in", async ({ page }) => {
    const response = await page.goto("/dashboard");

    await expect(page).toHaveURL(/\/auth\/signin$/);
    expect(response?.ok()).toBeTruthy();
    await expect(page.getByRole("heading", { name: /welcome back/i })).toBeVisible();
  });
});
