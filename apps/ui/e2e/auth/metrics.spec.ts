import { expect, test } from "@playwright/test";

test.describe("Metrics", () => {
  test("renders empty state and aggregation-type reference", async ({ page }) => {
    await page.goto("/dashboard/experiments/metrics");

    await expect(page.getByRole("heading", { name: /^metrics$/i, level: 1 })).toBeVisible();
    await expect(page.getByText(/no metrics yet/i)).toBeVisible();

    for (const agg of ["count_users", "sum", "avg", "retention_Nd"]) {
      await expect(page.getByText(agg).first()).toBeVisible();
    }
  });

  test("new-metric button is disabled until the form is wired", async ({ page }) => {
    await page.goto("/dashboard/experiments/metrics");
    await expect(page.getByRole("button", { name: /^new metric$/i })).toBeDisabled();
  });
});
