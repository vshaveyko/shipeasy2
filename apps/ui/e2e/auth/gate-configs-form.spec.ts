import { expect, test, type Page } from "@playwright/test";

const RUN = Date.now();

// ── Helpers ───────────────────────────────────────────────────────────────────

function gateRow(page: Page, name: string) {
  return page.getByText(name, { exact: true }).locator("..").locator("..");
}

// ── New-gate form at /dashboard/configs/gates/new ─────────────────────────────
// This is the structured form (not the profile/slider form at /dashboard/gates/new).

test.describe("Configs gate form UI", () => {
  test("renders heading, key and description fields", async ({ page }) => {
    await page.goto("/dashboard/configs/gates/new");
    await expect(page.getByRole("heading", { name: /^new gate$/i, level: 1 })).toBeVisible();
    await expect(page.locator("#gate-key")).toBeVisible();
    await expect(page.locator("#gate-description")).toBeVisible();
  });

  test("default state selector has Off and On options", async ({ page }) => {
    await page.goto("/dashboard/configs/gates/new");
    const sel = page.locator("#gate-default");
    await expect(sel).toBeVisible();
    await expect(sel.locator("option[value='off']")).toHaveCount(1);
    await expect(sel.locator("option[value='on']")).toHaveCount(1);
  });

  test("default state defaults to Off", async ({ page }) => {
    await page.goto("/dashboard/configs/gates/new");
    await expect(page.locator("#gate-default")).toHaveValue("off");
  });

  test("environment selector has Development, Staging, Production", async ({ page }) => {
    await page.goto("/dashboard/configs/gates/new");
    const sel = page.locator("#gate-env");
    await expect(sel).toBeVisible();
    await expect(sel.locator("option[value='development']")).toHaveCount(1);
    await expect(sel.locator("option[value='staging']")).toHaveCount(1);
    await expect(sel.locator("option[value='production']")).toHaveCount(1);
  });

  test("environment defaults to production", async ({ page }) => {
    await page.goto("/dashboard/configs/gates/new");
    await expect(page.locator("#gate-env")).toHaveValue("production");
  });

  test("targeting rules section shows placeholder text", async ({ page }) => {
    await page.goto("/dashboard/configs/gates/new");
    await expect(page.getByText(/rules builder/i)).toBeVisible();
  });

  test("Create gate button is present and enabled", async ({ page }) => {
    await page.goto("/dashboard/configs/gates/new");
    await expect(page.getByRole("button", { name: /^create gate$/i })).toBeEnabled();
  });

  test("cancel link returns to configs gates list", async ({ page }) => {
    await page.goto("/dashboard/configs/gates/new");
    await page
      .getByRole("link", { name: /^cancel$/i })
      .first()
      .click();
    await expect(page).toHaveURL(/\/dashboard\/configs\/gates$/);
  });
});

// ── Create gate with description ──────────────────────────────────────────────

test.describe("Configs gate — create with description", () => {
  test.describe.configure({ mode: "serial" });

  const key = `e2cg_desc_${RUN}`;
  const description = "Rolls out the new onboarding to beta users";

  test("create gate with description → gate appears in list", async ({ page }) => {
    await page.goto("/dashboard/configs/gates/new");
    await page.locator("#gate-key").fill(key);
    await page.locator("#gate-description").fill(description);
    await page.getByRole("button", { name: /^create gate$/i }).click();

    await expect(page).toHaveURL(/\/dashboard\/configs\/gates$/);
    await expect(page.getByText(key, { exact: true })).toBeVisible();
  });

  test("cleanup: delete gate", async ({ page }) => {
    await page.goto("/dashboard/configs/gates");
    await gateRow(page, key)
      .getByRole("button", { name: /^delete$/i })
      .click();
    await expect(page.getByText(key, { exact: true })).not.toBeVisible();
  });
});

// ── Create gate with On default state ────────────────────────────────────────

test.describe("Configs gate — create with default On", () => {
  test.describe.configure({ mode: "serial" });

  const key = `e2cg_on_${RUN}`;

  test("create gate with On default → gate appears in list", async ({ page }) => {
    await page.goto("/dashboard/configs/gates/new");
    await page.locator("#gate-key").fill(key);
    await page.locator("#gate-default").selectOption("on");
    await page.getByRole("button", { name: /^create gate$/i }).click();

    await expect(page).toHaveURL(/\/dashboard\/configs\/gates$/);
    await expect(page.getByText(key, { exact: true })).toBeVisible();
  });

  test("cleanup: delete On-default gate", async ({ page }) => {
    await page.goto("/dashboard/configs/gates");
    await gateRow(page, key)
      .getByRole("button", { name: /^delete$/i })
      .click();
    await expect(page.getByText(key, { exact: true })).not.toBeVisible();
  });
});

// ── Create gate for staging environment ──────────────────────────────────────

test.describe("Configs gate — staging environment", () => {
  test.describe.configure({ mode: "serial" });

  const key = `e2cg_stg_${RUN}`;

  test("create gate with staging environment → gate appears in list", async ({ page }) => {
    await page.goto("/dashboard/configs/gates/new");
    await page.locator("#gate-key").fill(key);
    await page.locator("#gate-env").selectOption("staging");
    await page.getByRole("button", { name: /^create gate$/i }).click();

    await expect(page).toHaveURL(/\/dashboard\/configs\/gates$/);
    await expect(page.getByText(key, { exact: true })).toBeVisible();
  });

  test("cleanup: delete staging gate", async ({ page }) => {
    await page.goto("/dashboard/configs/gates");
    await gateRow(page, key)
      .getByRole("button", { name: /^delete$/i })
      .click();
    await expect(page.getByText(key, { exact: true })).not.toBeVisible();
  });
});
