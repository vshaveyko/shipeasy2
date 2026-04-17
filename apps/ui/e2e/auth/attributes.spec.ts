import { expect, test } from "@playwright/test";

test("attributes page renders empty state", async ({ page }) => {
  await page.goto("/dashboard/experiments/attributes");

  await expect(page.getByRole("heading", { name: /^user attributes$/i, level: 1 })).toBeVisible();
  await expect(page.getByText(/no attributes declared/i)).toBeVisible();
  await expect(page.getByRole("button", { name: /^add attribute$/i })).toBeEnabled();
});
