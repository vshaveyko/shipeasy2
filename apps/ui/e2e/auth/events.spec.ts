import { expect, test } from "@playwright/test";

test("events page renders empty state", async ({ page }) => {
  await page.goto("/dashboard/experiments/events");

  await expect(page.getByRole("heading", { name: /^events$/i, level: 1 })).toBeVisible();
  await expect(page.getByText(/no events yet/i)).toBeVisible();
  await expect(page.getByRole("button", { name: /^new event$/i })).toBeDisabled();
});
