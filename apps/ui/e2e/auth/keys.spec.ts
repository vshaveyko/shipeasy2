import { expect, test } from "@playwright/test";

test("sdk keys page shows empty state and key-type reference", async ({ page }) => {
  await page.goto("/dashboard/keys");

  await expect(page.getByRole("heading", { name: /^sdk keys$/i, level: 1 })).toBeVisible();
  await expect(page.getByText(/no keys yet/i)).toBeVisible();

  for (const badge of [/^server$/i, /^client$/i, /^admin$/i]) {
    await expect(page.getByText(badge).first()).toBeVisible();
  }

  await expect(page.getByRole("button", { name: /^create key$/i })).toBeDisabled();
});
