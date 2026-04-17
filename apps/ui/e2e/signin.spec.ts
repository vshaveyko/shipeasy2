import { test, expect } from "@playwright/test";

test.describe("Sign-in page", () => {
  test("renders OAuth options", async ({ page }) => {
    await page.goto("/auth/signin");

    await expect(page.getByRole("heading", { name: /welcome back/i })).toBeVisible();

    await expect(page.getByRole("button", { name: /continue with google/i })).toBeVisible();

    await expect(page.getByRole("button", { name: /continue with github/i })).toBeVisible();

    await expect(page.getByRole("link", { name: /terms of service/i })).toHaveAttribute(
      "href",
      "/docs",
    );
  });

  test("logo links back to landing page", async ({ page }) => {
    await page.goto("/auth/signin");

    await page.getByRole("link", { name: /shipeasy/i }).click();

    await expect(page).toHaveURL(/\/$/);
  });
});
