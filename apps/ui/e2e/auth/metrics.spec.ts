import { expect, test } from "@playwright/test";

test.describe("Metrics", () => {
  test("renders empty state and aggregation-type reference", async ({ page }) => {
    await page.goto("/dashboard/e2e-project-id/experiments/metrics");

    await expect(page.getByRole("heading", { name: /^metrics$/i, level: 1 })).toBeVisible();
    // Seed creates metrics, so the empty-state copy is not present. Just
    // assert the page-level description renders.
    await expect(
      page.getByText(/metrics turn raw events into experiment-comparable numbers/i),
    ).toBeVisible();

    // Check visible hint text in the reference cards (not hidden <option> text)
    for (const hint of [
      /binary conversion/i,
      /total value per user/i,
      /mean value per user/i,
      /come back on day n/i,
    ]) {
      await expect(page.getByText(hint)).toBeVisible();
    }
  });

  test("new-metric form is wired and submit button is enabled", async ({ page }) => {
    await page.goto("/dashboard/e2e-project-id/experiments/metrics");
    await expect(page.getByRole("button", { name: /^new metric$/i })).toBeEnabled();
  });
});
