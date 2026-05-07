import { expect, test } from "@playwright/test";

test.describe("Combined feedback page", () => {
  test("renders both tabs and a connectors link", async ({ page }) => {
    await page.goto("/dashboard/feedback");
    await expect(page.getByRole("heading", { name: /^feedback$/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /^bugs/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /feature requests/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /^connectors$/i })).toBeVisible();
  });

  test("tab switch updates URL and content", async ({ page }) => {
    await page.goto("/dashboard/feedback");
    await page
      .getByRole("link", { name: /feature requests/i })
      .first()
      .click();
    await expect(page).toHaveURL(/tab=requests/);
  });
});

test.describe("Connectors page", () => {
  test("empty-state renders + new connector form is reachable", async ({ page }) => {
    await page.goto("/dashboard/feedback/connectors");
    await expect(page.getByRole("heading", { name: /^connectors$/i })).toBeVisible();
    await page.getByRole("link", { name: /new connector/i }).click();
    await expect(page).toHaveURL(/\/connectors\/new$/);
    // Form has the provider radio + events checkboxes.
    await expect(page.getByLabel(/google sheets/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /continue with google/i })).toBeVisible();
  });
});
