import path from "node:path";
import { expect, test, type Page } from "@playwright/test";

const AUTH_FILE = path.join(__dirname, "../.auth/user.json");
const RUN = Date.now();

// ── Helpers ───────────────────────────────────────────────────────────────────

function gateRow(page: Page, name: string) {
  return page.getByText(name, { exact: true }).locator("..").locator("..");
}

// ── Targeting rules are edited on the gate detail/edit page after creation.
// The new-gate form shows a placeholder: "Rules builder is wired up once the gate is saved."
// These tests cover the full rules UI once it is implemented.

// ── New gate form — rules placeholder ────────────────────────────────────────

test.describe("New gate form — targeting rules section", () => {
  test("shows targeting-rules card with placeholder", async ({ page }) => {
    await page.goto("/dashboard/configs/gates/new");
    await expect(page.getByRole("heading", { name: /targeting rules/i })).toBeVisible();
    await expect(page.getByText(/rules builder/i)).toBeVisible();
  });
});

// ── Gate detail page — rules builder ─────────────────────────────────────────
// Once a gate is saved, its detail page renders the live rules builder UI.

test.describe("Gate detail — rules builder UI", () => {
  test.describe.configure({ mode: "serial" });

  const key = `e2grules_${RUN}`;

  // Create the gate to test against
  test.beforeAll(async ({ browser }) => {
    const ctx = await browser.newContext({ storageState: AUTH_FILE });
    const p = await ctx.newPage();
    await p.goto("/dashboard/configs/gates/new");
    await p.locator("#gate-key").fill(key);
    await p.getByRole("button", { name: /^create gate$/i }).click();
    await expect(p).toHaveURL(/\/dashboard\/configs\/gates$/);
    await ctx.close();
  });

  test.afterAll(async ({ browser }) => {
    const ctx = await browser.newContext({ storageState: AUTH_FILE });
    const p = await ctx.newPage();
    await p.goto("/dashboard/configs/gates");
    await gateRow(p, key)
      .getByRole("button", { name: /^delete$/i })
      .click();
    await ctx.close();
  });

  test("gate detail page renders 'Add rule' button", async ({ page }) => {
    await page.goto("/dashboard/configs/gates");
    // Navigate to gate detail (via Edit or detail link)
    const editLink = gateRow(page, key).getByRole("link", { name: /edit/i });
    if ((await editLink.count()) > 0) {
      await editLink.click();
    } else {
      await gateRow(page, key).getByText(key, { exact: true }).click();
    }
    await expect(page.getByRole("button", { name: /add rule/i })).toBeVisible();
  });

  test("adding a rule shows a rule row with attribute, operator, value fields", async ({
    page,
  }) => {
    await page.goto("/dashboard/configs/gates");
    const editLink = gateRow(page, key).getByRole("link", { name: /edit/i });
    if ((await editLink.count()) > 0) {
      await editLink.click();
    } else {
      await gateRow(page, key).getByText(key, { exact: true }).click();
    }

    await page.getByRole("button", { name: /add rule/i }).click();

    // A rule row should appear with attribute selector, operator selector, value input
    await expect(
      page.locator("#rule-attr-0").or(page.getByLabel(/attribute/i).first()),
    ).toBeVisible();
    await expect(page.locator("#rule-op-0").or(page.getByLabel(/operator/i).first())).toBeVisible();
    await expect(page.locator("#rule-value-0").or(page.getByLabel(/value/i).first())).toBeVisible();
  });

  test("removing a rule clears the rule row", async ({ page }) => {
    await page.goto("/dashboard/configs/gates");
    const editLink = gateRow(page, key).getByRole("link", { name: /edit/i });
    if ((await editLink.count()) > 0) {
      await editLink.click();
    } else {
      await gateRow(page, key).getByText(key, { exact: true }).click();
    }

    await page.getByRole("button", { name: /add rule/i }).click();
    const removeBtn = page
      .getByRole("button", { name: /remove rule/i })
      .or(page.getByTitle(/remove/i));
    await expect(removeBtn).toBeVisible();
    await removeBtn.click();

    // Rule row should be gone
    await expect(
      page.locator("#rule-attr-0").or(page.getByLabel(/attribute/i).first()),
    ).not.toBeVisible();
  });
});

// ── Gate with saved targeting rule ───────────────────────────────────────────

test.describe("Gate — full rules workflow", () => {
  test.describe.configure({ mode: "serial" });

  const attrName = `e2grattr_${RUN}`;
  const key = `e2grfull_${RUN}`;

  // Seed attribute and gate before rules tests
  test.beforeAll(async ({ browser }) => {
    const ctx = await browser.newContext({ storageState: AUTH_FILE });
    const p = await ctx.newPage();

    // Create attribute to use in rule
    await p.goto("/dashboard/experiments/attributes");
    await p.locator("#attr-name").fill(attrName);
    await p.locator("#attr-type").selectOption("string");
    await p.getByRole("button", { name: /^add attribute$/i }).click();
    await expect(p).toHaveURL(/\/dashboard\/experiments\/attributes$/);

    // Create gate
    await p.goto("/dashboard/configs/gates/new");
    await p.locator("#gate-key").fill(key);
    await p.getByRole("button", { name: /^create gate$/i }).click();
    await expect(p).toHaveURL(/\/dashboard\/configs\/gates$/);

    await ctx.close();
  });

  test.afterAll(async ({ browser }) => {
    const ctx = await browser.newContext({ storageState: AUTH_FILE });
    const p = await ctx.newPage();

    await p.goto("/dashboard/configs/gates");
    const delBtn = gateRow(p, key).getByRole("button", { name: /^delete$/i });
    if ((await delBtn.count()) > 0) await delBtn.click();

    await p.goto("/dashboard/experiments/attributes");
    const attrDelBtn = p
      .getByText(attrName, { exact: true })
      .locator("..")
      .locator("..")
      .getByRole("button", { name: /^delete$/i });
    if ((await attrDelBtn.count()) > 0) await attrDelBtn.click();

    await ctx.close();
  });

  test("save a rule targeting the registered attribute → rule persists on reload", async ({
    page,
  }) => {
    await page.goto("/dashboard/configs/gates");
    const editLink = gateRow(page, key).getByRole("link", { name: /edit/i });
    expect(await editLink.count(), "Gate detail/edit page not yet implemented").toBeGreaterThan(0);
    await editLink.click();

    // Add a rule
    await page.getByRole("button", { name: /add rule/i }).click();

    // Select attribute
    const attrSel = page.locator("#rule-attr-0").or(page.getByLabel(/attribute/i).first());
    await attrSel.selectOption({ label: attrName });

    // Select operator (eq / equals)
    const opSel = page.locator("#rule-op-0").or(page.getByLabel(/operator/i).first());
    await opSel.selectOption({ label: "eq" });

    // Enter value
    const valInput = page.locator("#rule-value-0").or(page.getByLabel(/value/i).first());
    await valInput.fill("beta");

    // Save
    await page.getByRole("button", { name: /save.*rules|save/i }).click();
    await expect(page).toHaveURL(/\/dashboard\/configs\/gates/);

    // Reload and confirm rule persists
    await page.goto("/dashboard/configs/gates");
    await editLink.click();
    await expect(valInput).toHaveValue("beta");
  });
});
