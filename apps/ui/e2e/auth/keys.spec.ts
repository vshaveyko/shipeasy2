import { expect, test } from "@playwright/test";

test("sdk keys page shows heading, key-type reference and create button", async ({ page }) => {
  await page.goto("/dashboard/e2e-project-id/keys");

  await expect(page.getByRole("heading", { name: /^sdk keys$/i, level: 1 })).toBeVisible();

  // The full reference section only renders once at least one key exists.
  // In an empty project the page shows a hero with a "Create your first key"
  // CTA — click it (creates a server key) so the populated form + reference
  // descriptions are guaranteed to be visible regardless of run order.
  const firstKeyCta = page.getByRole("button", { name: /create your first key/i });
  if (await firstKeyCta.count()) {
    await firstKeyCta.click();
    await page.waitForSelector("#key-type");
  }

  for (const desc of [
    /full read of flags/i,
    /evaluate-only\. safe to include/i,
    /scoped to admin rest/i,
  ]) {
    await expect(page.getByText(desc)).toBeVisible();
  }

  await expect(page.getByRole("button", { name: /^create key$/i })).toBeEnabled();
});
