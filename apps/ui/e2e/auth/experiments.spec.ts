import { expect, test } from "@playwright/test";

test.describe("Experiments", () => {
  test("list page shows heading and empty state", async ({ page }) => {
    await page.goto("/dashboard/experiments");

    await expect(page.getByRole("heading", { name: /^experiments$/i, level: 1 })).toBeVisible();
    await expect(page.getByText(/no experiments yet/i)).toBeVisible();
  });

  test("new-experiment form renders profile cards and fields", async ({ page }) => {
    await page.goto("/dashboard/experiments/new");

    await expect(page.getByRole("heading", { name: /^new experiment$/i, level: 1 })).toBeVisible();

    for (const profile of [
      /^conversion\b/i,
      /^revenue\b/i,
      /^retention\b/i,
      /^performance\b/i,
      /^onboarding\b/i,
    ]) {
      await expect(page.getByRole("button", { name: profile })).toBeVisible();
    }

    await expect(page.getByLabel(/^name$/i)).toBeVisible();
    await expect(page.getByLabel(/hypothesis \/ question/i)).toBeVisible();
    await expect(page.getByLabel(/success definition/i)).toBeVisible();
    await expect(page.getByLabel(/^universe$/i)).toBeVisible();
    await expect(page.getByLabel(/allocation/i)).toBeVisible();
  });

  test("filling basics updates inputs; submit button is enabled", async ({ page }) => {
    await page.goto("/dashboard/experiments/new");

    const name = page.getByLabel(/^name$/i);
    await name.fill("checkout_redesign_q2");
    await expect(name).toHaveValue("checkout_redesign_q2");

    await expect(page.getByRole("button", { name: /^save draft$/i })).toBeEnabled();
  });

  test("experiment detail route renders for any id", async ({ page }) => {
    await page.goto("/dashboard/experiments/checkout_redesign_q2");

    await expect(
      page.getByRole("heading", { name: /checkout_redesign_q2/i, level: 1 }),
    ).toBeVisible();
    await expect(page.getByText(/goal metric/i)).toBeVisible();
    await expect(page.getByText(/guardrails/i)).toBeVisible();
    await expect(page.getByText(/draft/i).first()).toBeVisible();
  });

  test("experiment detail shows stat cards: status, users, days, verdict", async ({ page }) => {
    await page.goto("/dashboard/experiments/any_id");

    await expect(page.getByText(/^status$/i)).toBeVisible();
    await expect(page.getByText(/^users \/ group$/i)).toBeVisible();
    await expect(page.getByText(/^days running$/i)).toBeVisible();
    await expect(page.getByText(/^verdict$/i)).toBeVisible();
  });

  test("back link on detail page returns to experiments list", async ({ page }) => {
    await page.goto("/dashboard/experiments/some_id");
    await page
      .locator("main")
      .getByRole("link", { name: /^experiments$/i })
      .first()
      .click();
    await expect(page).toHaveURL(/\/dashboard\/experiments$/);
  });
});
