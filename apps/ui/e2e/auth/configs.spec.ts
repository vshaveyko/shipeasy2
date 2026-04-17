import { expect, test } from "@playwright/test";

test.describe("Configs product", () => {
  test("overview page shows gates + values empty states", async ({ page }) => {
    await page.goto("/dashboard/configs");

    await expect(page.getByRole("heading", { name: /^configs$/i, level: 1 })).toBeVisible();
    await expect(page.getByText(/no gates yet/i)).toBeVisible();
    await expect(page.getByText(/no configs yet/i)).toBeVisible();
  });

  test("gates listing renders empty state with create CTA", async ({ page }) => {
    await page.goto("/dashboard/configs/gates");

    await expect(page.getByRole("heading", { name: /^gates$/i, level: 1 })).toBeVisible();
    await expect(page.getByText(/no gates yet/i)).toBeVisible();
  });

  test("values listing renders empty state with create CTA", async ({ page }) => {
    await page.goto("/dashboard/configs/values");

    await expect(page.getByRole("heading", { name: /^dynamic configs$/i, level: 1 })).toBeVisible();
    await expect(page.getByText(/no configs yet/i)).toBeVisible();
  });

  test("new-gate form renders the required fields", async ({ page }) => {
    await page.goto("/dashboard/configs/gates/new");

    await expect(page.getByRole("heading", { name: /^new gate$/i, level: 1 })).toBeVisible();

    await expect(page.getByLabel(/^key$/i)).toBeVisible();
    await expect(page.getByLabel(/^description$/i)).toBeVisible();
    await expect(page.getByLabel(/default state/i)).toBeVisible();
    await expect(page.getByLabel(/^environment$/i)).toBeVisible();
  });

  test("typing into the key field updates the input", async ({ page }) => {
    await page.goto("/dashboard/configs/gates/new");

    const key = page.getByLabel(/^key$/i);
    await key.fill("new_checkout_flow");
    await expect(key).toHaveValue("new_checkout_flow");
  });

  test("cancel link returns to the gates list", async ({ page }) => {
    await page.goto("/dashboard/configs/gates/new");
    await page
      .getByRole("link", { name: /^cancel$/i })
      .first()
      .click();
    await expect(page).toHaveURL(/\/dashboard\/configs\/gates$/);
  });

  test("submit button is disabled until the form is wired", async ({ page }) => {
    await page.goto("/dashboard/configs/gates/new");
    await expect(page.getByRole("button", { name: /^create gate$/i })).toBeDisabled();
  });

  test("new-config form renders and cancels back to values list", async ({ page }) => {
    await page.goto("/dashboard/configs/values/new");

    await expect(
      page.getByRole("heading", { name: /^new dynamic config$/i, level: 1 }),
    ).toBeVisible();
    await expect(page.getByLabel(/^key$/i)).toBeVisible();

    await page
      .getByRole("link", { name: /^cancel$/i })
      .first()
      .click();
    await expect(page).toHaveURL(/\/dashboard\/configs\/values$/);
  });
});
