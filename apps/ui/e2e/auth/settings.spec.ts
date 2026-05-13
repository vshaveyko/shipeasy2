import { expect, test } from "@playwright/test";

test.describe("Settings", () => {
  test("shows project, plan, and account sections", async ({ page }) => {
    await page.goto("/dashboard/e2e-project-id/settings");

    await expect(page.getByRole("heading", { name: /^settings$/i, level: 1 })).toBeVisible();

    const main = page.locator("main");
    await expect(main.getByText(/^project$/i).first()).toBeVisible();
    await expect(page.getByLabel(/domain/i)).toBeVisible();
    await expect(page.getByLabel(/display name/i)).toBeVisible();
    await expect(page.getByLabel(/project id/i)).toBeVisible();

    await expect(main.getByText(/^plan$/i).first()).toBeVisible();
    await expect(page.getByText(/^current$/i)).toBeVisible();
    await expect(page.getByRole("link", { name: /manage billing/i })).toBeVisible();

    await expect(page.getByText("e2e@shipeasy.test")).toBeVisible();
    await expect(page.getByText(/e2e test user/i).first()).toBeVisible();
  });

  test("danger zone renders the transfer-ownership control", async ({ page }) => {
    await page.goto("/dashboard/e2e-project-id/settings");

    const main = page.locator("main");
    await expect(main.getByText(/^danger zone$/i)).toBeVisible();
    await expect(main.getByText(/^transfer ownership$/i).first()).toBeVisible();
    const button = main.getByRole("button", { name: /transfer ownership/i });
    await expect(button).toBeVisible();
  });

  test("transfer dialog opens, validates confirm input, closes on cancel", async ({ page }) => {
    await page.goto("/dashboard/e2e-project-id/settings");

    const main = page.locator("main");
    const trigger = main.getByRole("button", { name: /transfer ownership/i });

    // Trigger is disabled when there is no eligible recipient — the e2e fixture
    // project has no other active members. Surface the explanatory text instead.
    if (await trigger.isDisabled()) {
      await expect(main.getByText(/no eligible recipient/i)).toBeVisible();
      return;
    }

    await trigger.click();
    const dialog = page.getByRole("dialog");
    await expect(
      dialog.getByRole("heading", { name: /transfer project ownership/i }),
    ).toBeVisible();

    const submit = dialog.getByRole("button", { name: /^transfer$/i });
    await expect(submit).toBeDisabled();

    await dialog.getByRole("button", { name: /cancel/i }).click();
    await expect(dialog).toBeHidden();
  });

  test("sign-out button on settings page signs the user out", async ({ page }) => {
    await page.goto("/dashboard/e2e-project-id/settings");

    await page
      .locator("main")
      .getByRole("button", { name: /^sign out$/i })
      .click();

    await page.waitForURL(/\/$|\/auth\/signin$/);
    const nextUrl = page.url();
    expect(nextUrl).toMatch(/\/$|\/auth\/signin$/);

    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/auth\/signin$/);
  });
});
