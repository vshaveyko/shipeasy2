import { expect, test } from "@playwright/test";

test("sdk keys page shows heading, key-type reference and create button", async ({ page }) => {
  await page.goto("/dashboard/keys");

  await expect(page.getByRole("heading", { name: /^sdk keys$/i, level: 1 })).toBeVisible();

  // Key types reference section — check visible description text (not hidden <option> text)
  for (const desc of [
    /full read of flags/i,
    /evaluate-only\. safe to include/i,
    /scoped to admin rest/i,
  ]) {
    await expect(page.getByText(desc)).toBeVisible();
  }

  await expect(page.getByRole("button", { name: /^create key$/i })).toBeEnabled();
});
