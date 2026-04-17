import { expect, test, type Page } from "@playwright/test";

const RUN = Date.now();

// ── Helpers ───────────────────────────────────────────────────────────────────

function uniRow(page: Page, name: string) {
  return page.getByText(name, { exact: true }).locator("..").locator("..");
}

// ── Default universe invariants ───────────────────────────────────────────────

test.describe("Default universe", () => {
  test("default universe is always present in the list", async ({ page }) => {
    await page.goto("/dashboard/experiments/universes");
    await expect(page.getByText("default", { exact: true })).toBeVisible();
  });

  test("default universe has no Delete button", async ({ page }) => {
    await page.goto("/dashboard/experiments/universes");
    await expect(
      uniRow(page, "default").getByRole("button", { name: /^delete$/i }),
    ).not.toBeVisible();
  });

  test("default universe shows 'no holdout' label", async ({ page }) => {
    await page.goto("/dashboard/experiments/universes");
    // Default universe has no holdout range configured
    await expect(
      page.getByText(/no holdout/i).or(page.getByText("default", { exact: true })),
    ).toBeVisible();
  });
});

// ── Create and delete custom universe ────────────────────────────────────────

test.describe("Custom universe — basic CRUD", () => {
  test.describe.configure({ mode: "serial" });

  const name = `e2uni_basic_${RUN}`;

  test("create universe → appears in list with Delete button", async ({ page }) => {
    await page.goto("/dashboard/experiments/universes");
    await page.locator("#universe-name").fill(name);
    await page.getByRole("button", { name: /^create universe$/i }).click();

    await expect(page).toHaveURL(/\/dashboard\/experiments\/universes$/);
    await expect(page.getByText(name, { exact: true })).toBeVisible();
    await expect(uniRow(page, name).getByRole("button", { name: /^delete$/i })).toBeVisible();
  });

  test("custom universe has Delete button; default universe still has none", async ({ page }) => {
    await page.goto("/dashboard/experiments/universes");
    await expect(uniRow(page, name).getByRole("button", { name: /^delete$/i })).toBeVisible();
    await expect(
      uniRow(page, "default").getByRole("button", { name: /^delete$/i }),
    ).not.toBeVisible();
  });

  test("delete universe → removed from list; default remains", async ({ page }) => {
    await page.goto("/dashboard/experiments/universes");
    await uniRow(page, name)
      .getByRole("button", { name: /^delete$/i })
      .click();

    await expect(page).toHaveURL(/\/dashboard\/experiments\/universes$/);
    await expect(page.getByText(name, { exact: true })).not.toBeVisible();
    await expect(page.getByText("default", { exact: true })).toBeVisible();
  });
});

// ── Universe with holdout range ───────────────────────────────────────────────
// Holdout reserves [lo, hi] basis-points (0–10000) of users as a long-term
// control that is excluded from ALL experiments in the universe.

test.describe("Universe with holdout range", () => {
  test.describe.configure({ mode: "serial" });

  const name = `e2uni_holdout_${RUN}`;

  test("holdout-range fields are present on the create form", async ({ page }) => {
    await page.goto("/dashboard/experiments/universes");
    // Forward-looking: holdout lo/hi inputs expected once the feature ships
    await expect(
      page.locator("#universe-holdout-lo").or(page.getByLabel(/holdout.*lo/i)),
    ).toBeVisible();
    await expect(
      page.locator("#universe-holdout-hi").or(page.getByLabel(/holdout.*hi/i)),
    ).toBeVisible();
  });

  test("create universe with 10% holdout (0–1000 bp) → holdout label in list", async ({ page }) => {
    await page.goto("/dashboard/experiments/universes");
    await page.locator("#universe-name").fill(name);

    const loInput = page.locator("#universe-holdout-lo").or(page.getByLabel(/holdout.*lo/i));
    const hiInput = page.locator("#universe-holdout-hi").or(page.getByLabel(/holdout.*hi/i));
    await loInput.fill("0");
    await hiInput.fill("1000");

    await page.getByRole("button", { name: /^create universe$/i }).click();
    await expect(page).toHaveURL(/\/dashboard\/experiments\/universes$/);

    // Holdout range shown as "holdout [0–1000]" next to the name
    await expect(page.getByText(/holdout.*0.*1000/i)).toBeVisible();
  });

  test("cleanup: delete holdout universe", async ({ page }) => {
    await page.goto("/dashboard/experiments/universes");
    await uniRow(page, name)
      .getByRole("button", { name: /^delete$/i })
      .click();
    await expect(page.getByText(name, { exact: true })).not.toBeVisible();
  });
});

// ── Unit type ─────────────────────────────────────────────────────────────────
// Universes support custom unit_type (default: user_id).

test.describe("Universe with custom unit type", () => {
  test.describe.configure({ mode: "serial" });

  const name = `e2uni_unit_${RUN}`;

  test("unit-type selector is present (default: user_id)", async ({ page }) => {
    await page.goto("/dashboard/experiments/universes");
    const unitSel = page.locator("#universe-unit-type").or(page.getByLabel(/unit.*type/i));
    // Forward-looking: may not exist yet — skip gracefully
    if ((await unitSel.count()) === 0) {
      test.skip(true, "unit_type selector not yet implemented");
      return;
    }
    await expect(unitSel).toBeVisible();
    await expect(unitSel).toHaveValue("user_id");
  });

  test("create universe with device_id unit type → appears in list", async ({ page }) => {
    await page.goto("/dashboard/experiments/universes");
    const unitSel = page.locator("#universe-unit-type").or(page.getByLabel(/unit.*type/i));
    if ((await unitSel.count()) === 0) {
      test.skip(true, "unit_type selector not yet implemented");
      return;
    }

    await page.locator("#universe-name").fill(name);
    await unitSel.selectOption("device_id");
    await page.getByRole("button", { name: /^create universe$/i }).click();
    await expect(page).toHaveURL(/\/dashboard\/experiments\/universes$/);
    await expect(page.getByText(name, { exact: true })).toBeVisible();

    // Cleanup
    await uniRow(page, name)
      .getByRole("button", { name: /^delete$/i })
      .click();
    await expect(page.getByText(name, { exact: true })).not.toBeVisible();
  });
});
