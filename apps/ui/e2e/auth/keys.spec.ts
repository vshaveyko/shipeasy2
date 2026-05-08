import { expect, test } from "@playwright/test";

test("sdk keys page shows heading, key-type reference and create button", async ({ page }) => {
  await page.goto("/dashboard/e2e-project-id/keys");

  await expect(page.getByRole("heading", { name: /^sdk keys$/i, level: 1 })).toBeVisible();

  // Empty-state reference: abbreviated descriptions next to each example env
  // var. Full descriptions only appear once at least one key has been issued.
  for (const desc of [
    /full read of flags/i,
    /browser-safe, evaluate-only/i,
    /admin REST.*shown once/i,
  ]) {
    await expect(page.getByText(desc)).toBeVisible();
  }

  // Empty-state CTA is "Create your first key"; the bare "Create key" button
  // appears in the header only after at least one key exists.
  await expect(
    page.getByRole("button", { name: /create (your first )?key/i }),
  ).toBeEnabled();
});
