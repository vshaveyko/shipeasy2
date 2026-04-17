import { test, expect } from "@playwright/test";

test.describe("Dashboard access control", () => {
  test("redirects unauthenticated users to sign-in", async ({ page }) => {
    await page.goto("/dashboard");

    await expect(page).toHaveURL(/\/auth\/signin$/);
    await expect(page.getByText(/welcome back/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /continue with google/i })).toBeVisible();
  });
});
