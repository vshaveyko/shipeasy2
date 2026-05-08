import { expect, test } from "@playwright/test";

test("events page renders heading and add button", async ({ page }) => {
  await page.goto("/dashboard/e2e-project-id/experiments/events");

  await expect(page.getByRole("heading", { name: /^events$/i, level: 1 })).toBeVisible();
  await expect(page.getByRole("button", { name: /^add event$/i })).toBeEnabled();
});
