import { expect, test } from "@playwright/test";

test.describe("Combined feedback page", () => {
  test("renders both tabs and a connectors trigger", async ({ page }) => {
    await page.goto("/dashboard/e2e-project-id/feedback");
    await expect(page.getByRole("heading", { name: /^feedback$/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /^bugs/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /feature requests/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /^connectors$/i })).toBeVisible();
  });

  test("tab switch updates URL and content", async ({ page }) => {
    await page.goto("/dashboard/e2e-project-id/feedback");
    await page
      .getByRole("link", { name: /feature requests/i })
      .first()
      .click();
    await expect(page).toHaveURL(/tab=requests/);
  });
});

test.describe("Connectors wizard modal", () => {
  test("opens from feedback page and walks the new-connector wizard", async ({ page }) => {
    await page.goto("/dashboard/e2e-project-id/feedback");
    await page.getByRole("button", { name: /^connectors$/i }).click();

    // Modal heading + empty state are visible.
    await expect(page.getByRole("heading", { name: /^connectors$/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /new connector/i })).toBeVisible();

    // Step into the new-connector wizard view.
    await page.getByRole("button", { name: /new connector/i }).click();
    await expect(page.getByRole("heading", { name: /new connector/i })).toBeVisible();
    await expect(page.getByLabel(/google sheets/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /continue with google/i })).toBeVisible();

    // Back button returns to the list view.
    await page.getByRole("button", { name: /^back$/i }).click();
    await expect(page.getByRole("button", { name: /new connector/i })).toBeVisible();
  });

  test("auto-opens when ?connectors=open is present", async ({ page }) => {
    await page.goto("/dashboard/e2e-project-id/feedback?connectors=open");
    await expect(page.getByRole("heading", { name: /^connectors$/i })).toBeVisible();
  });
});
