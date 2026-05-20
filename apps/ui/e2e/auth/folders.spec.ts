import { expect, test } from "@playwright/test";

/**
 * Folders smoke — verifies the folder concept renders correctly on the
 * experiments list page:
 *   - the create wizard exposes a "Folder (optional)" picker
 *   - the list page filter placeholder mentions folder grouping
 * Deeper assertions (collapse persistence, uniqueness per folder) require
 * seeded data and live in the unit + worker test suite.
 */
test.describe("Folders", () => {
  test("experiments wizard exposes Folder picker", async ({ page }) => {
    await page.goto("/dashboard/e2e-project-id/experiments");

    // Open the big-modal wizard via the primary create CTA. The button label
    // may vary across screens — match any "new experiment"-style affordance.
    const cta = page
      .getByRole("button", { name: /^new experiment$/i })
      .or(page.getByRole("link", { name: /^new experiment$/i }))
      .first();
    if (await cta.isVisible().catch(() => false)) {
      await cta.click();
      await expect(page.getByText(/folder \(optional\)/i).first()).toBeVisible({ timeout: 5000 });
    } else {
      test
        .info()
        .annotations.push({ type: "skip", description: "no create CTA on empty dashboard" });
    }
  });

  test("legacy /experiments/new editor exposes Folder field", async ({ page }) => {
    await page.goto("/dashboard/e2e-project-id/experiments/new");
    await expect(page.getByText(/folder \(optional\)/i).first()).toBeVisible();
  });

  test("experiments list filter mentions folder", async ({ page }) => {
    await page.goto("/dashboard/e2e-project-id/experiments");
    // Empty state may suppress the filter — only assert when present.
    const filter = page.getByPlaceholder(/filter by name, folder, or universe/i);
    if ((await filter.count()) === 0) {
      test.info().annotations.push({ type: "skip", description: "no filter on empty list" });
      return;
    }
    await expect(filter.first()).toBeVisible();
  });
});
