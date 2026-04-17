import { test, expect } from "@playwright/test";

test.describe("Docs", () => {
  test("renders the introduction page", async ({ page }) => {
    await page.goto("/docs");

    await expect(page.getByRole("heading", { name: /introduction/i, level: 1 })).toBeVisible();

    await expect(page.getByText(/welcome to shipeasy/i)).toBeVisible();
  });
});
