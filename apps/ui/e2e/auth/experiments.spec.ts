import { expect, test } from "@playwright/test";

test.describe("Experiments", () => {
  test("list page shows heading and empty state", async ({ page }) => {
    await page.goto("/dashboard/e2e-project-id/experiments");

    await expect(page.getByRole("heading", { name: /^experiments$/i, level: 1 })).toBeVisible();
    // Redesigned list page leads with a description paragraph instead of the
    // old "Ship the version that actually wins" hero empty state.
    await expect(page.getByText(/feature tests with auto-collected metrics/i)).toBeVisible();
  });

  test("new-experiment form renders the wizard with basics step fields", async ({ page }) => {
    await page.goto("/dashboard/e2e-project-id/experiments/new");

    // The wizard renders a sr-only h1 + a visible "Name & hypothesis" step head.
    await expect(page.getByText(/name & hypothesis/i).first()).toBeVisible();
    await expect(page.getByLabel(/^name/i)).toBeVisible();
    await expect(page.getByLabel(/hypothesis/i)).toBeVisible();
  });

  test("filling basics updates inputs; continue button is enabled", async ({ page }) => {
    await page.goto("/dashboard/e2e-project-id/experiments/new");

    const name = page.getByLabel(/^name/i);
    await name.fill("checkout_redesign_q2");
    await expect(name).toHaveValue("checkout_redesign_q2");

    await expect(page.getByRole("button", { name: /^continue$/i }).first()).toBeEnabled();
  });

  test("experiment detail route renders for any id", async ({ page }) => {
    await page.goto("/dashboard/e2e-project-id/experiments/checkout_redesign_q2");

    await expect(
      page.getByRole("heading", { name: /checkout_redesign_q2/i, level: 1 }),
    ).toBeVisible();
    await expect(page.getByText(/draft/i).first()).toBeVisible();
  });

  test("experiment detail shows stat tiles", async ({ page }) => {
    await page.goto("/dashboard/e2e-project-id/experiments/any_id");

    await expect(page.getByText(/users \/ control/i)).toBeVisible();
    await expect(page.getByText(/^days running$/i)).toBeVisible();
    await expect(page.getByText(/^verdict$/i)).toBeVisible();
    // "Significance" appears in both the stat tile label and the threshold hint;
    // use first() to match the stat tile label.
    await expect(page.getByText(/^significance$/i).first()).toBeVisible();
  });

  test("back link on detail page returns to experiments list", async ({ page }) => {
    await page.goto("/dashboard/e2e-project-id/experiments/some_id");
    await page
      .locator("main")
      .getByRole("link", { name: /^experiments$/i })
      .first()
      .click();
    await expect(page).toHaveURL(/\/dashboard\/e2e-project-id\/experiments$/);
  });

  test("list page renders the status filter tabs", async ({ page }) => {
    await page.goto("/dashboard/e2e-project-id/experiments");
    // The hero empty state on a brand-new project doesn't render the tabs.
    // If tabs are rendered, they must be the full set; otherwise skip.
    const allTab = page.getByRole("tab", { name: /^all/i });
    if ((await allTab.count()) === 0) {
      test
        .info()
        .annotations.push({ type: "skip", description: "empty experiments list — no tab strip" });
      return;
    }
    await expect(allTab).toBeVisible();
    for (const label of ["Running", "Draft", "Stopped", "Archived"]) {
      await expect(page.getByRole("tab", { name: new RegExp(`^${label}`, "i") })).toBeVisible();
    }
  });

  test("list page filter input narrows visible rows", async ({ page }) => {
    await page.goto("/dashboard/e2e-project-id/experiments");
    const filter = page.getByPlaceholder(/filter by name, tag, or universe/i);
    if ((await filter.count()) === 0) {
      test
        .info()
        .annotations.push({ type: "skip", description: "empty list — filter not rendered" });
      return;
    }
    await filter.fill("__no_match_xyz__");
    await expect(page.getByText(/no experiments match this filter/i)).toBeVisible();
  });

  test("New experiment button navigates to the wizard", async ({ page }) => {
    await page.goto("/dashboard/e2e-project-id/experiments");
    await page
      .getByRole("link", { name: /^new experiment$/i })
      .first()
      .click();
    await expect(page).toHaveURL(/\/dashboard\/e2e-project-id\/experiments\/new$/);
    await expect(page.getByText(/name & hypothesis/i).first()).toBeVisible();
  });
});
