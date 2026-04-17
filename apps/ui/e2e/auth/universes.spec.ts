import { expect, test } from "@playwright/test";

test("universes page renders default-universe explainer", async ({ page }) => {
  await page.goto("/dashboard/experiments/universes");

  await expect(page.getByRole("heading", { name: /^universes$/i, level: 1 })).toBeVisible();
  await expect(page.getByText(/one default universe/i)).toBeVisible();
  await expect(page.getByRole("button", { name: /^new universe$/i })).toBeDisabled();
});
