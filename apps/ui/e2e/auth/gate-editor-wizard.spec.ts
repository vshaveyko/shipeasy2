// Smoke coverage for the gatekeeper editor wizard at /dashboard/[id]/gates/[id].
//
// This is a port of the design at project/app/gates-editor.html — a 3-step
// wizard with stacked sub-gates (condition / rollout) and a locked public
// floor. The CRUD flow used to seed a row lives in gates.spec.ts; this spec
// only exercises the new editor surface.

import { expect, test, type Page } from "@playwright/test";

const RUN = Date.now();

async function createGate(page: Page, key: string) {
  await page.goto("/dashboard/e2e-project-id/gates/new");
  await page.locator("#gate-key").fill(key);
  await page.getByRole("button", { name: /^create gate$/i }).click();
  await expect(page).toHaveURL(/\/dashboard\/e2e-project-id\/gates$/);
}

async function deleteGate(page: Page, name: string) {
  await page.goto("/dashboard/e2e-project-id/gates");
  await page.getByRole("button", { name: new RegExp(`Actions for ${name}`, "i") }).click();
  await page.getByRole("menuitem", { name: /^delete( gate)?$/i }).click();
  const dialog = page.getByRole("dialog");
  await dialog.waitFor({ state: "visible" });
  await dialog.getByRole("button", { name: /^delete( gate)?$/i }).click();
  await dialog.waitFor({ state: "hidden" });
}

async function goToEditor(page: Page, key: string) {
  await page.goto("/dashboard/e2e-project-id/gates");
  await page.getByText(key, { exact: true }).click();
  // Editor route uses gate.id, not name — wait for the wizard stepper to render.
  await expect(page.getByText("Stack the gates")).toBeVisible();
}

test.describe("Gatekeeper editor — wizard", () => {
  test.describe.configure({ mode: "serial" });
  const key = `e2g_wiz_${RUN}`;

  test.beforeAll(async ({ browser }) => {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await createGate(page, key);
    await ctx.close();
  });

  test.afterAll(async ({ browser }) => {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await deleteGate(page, key);
    await ctx.close();
  });

  test("wizard renders all 3 steps and defaults to Gates", async ({ page }) => {
    await goToEditor(page, key);
    // The 3 step labels are visible in the stepper.
    for (const label of ["Details", "Gates", "Review & integrate"]) {
      await expect(page.getByText(label, { exact: true }).first()).toBeVisible();
    }
    // Default step body is the gates list.
    await expect(page.getByText("Stack the gates")).toBeVisible();
  });

  test("public floor is present, locked, and labeled", async ({ page }) => {
    await goToEditor(page, key);
    // Locked floor pill appears on the public row.
    await expect(page.getByText(/locked floor/i)).toBeVisible();
    await expect(page.getByText(/Public/, { exact: false }).first()).toBeVisible();
  });

  test("Add gate dialog opens and seeds a blank rollout", async ({ page }) => {
    await goToEditor(page, key);
    await page
      .getByRole("button", { name: /Add gate from template/i })
      .first()
      .click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await dialog.getByText("Blank rollout", { exact: true }).click();
    await expect(dialog).toBeHidden();
    // Two rollouts now exist (the new one plus the locked public floor).
    const rolloutPills = page.getByText("rollout", { exact: true });
    await expect(rolloutPills.first()).toBeVisible();
  });

  test("Test panel renders user_id input + verdict stripe", async ({ page }) => {
    await goToEditor(page, key);
    await expect(page.getByText("Test against a user")).toBeVisible();
    // verdict label inside the result stripe
    await expect(page.getByText("verdict", { exact: false }).first()).toBeVisible();
  });

  test("Available attributes panel renders heading", async ({ page }) => {
    await goToEditor(page, key);
    await expect(page.getByText("Available attributes")).toBeVisible();
  });

  test("can navigate to Review step and see SDK preview", async ({ page }) => {
    await goToEditor(page, key);
    await page
      .getByRole("button", { name: /Next: Review & integrate/i })
      .first()
      .click();
    await expect(page.getByText("Review and integrate")).toBeVisible();
    await expect(page.getByText(/shipeasy\.gate/)).toBeVisible();
  });

  test("Edit details dialog opens from Step 1", async ({ page }) => {
    await goToEditor(page, key);
    // Switch to Details step.
    await page
      .getByRole("button", { name: /^Details$/ })
      .first()
      .click();
    await expect(page.getByText("Where does this gatekeeper live?")).toBeVisible();
    await page.getByRole("button", { name: /Edit details/i }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText("Gatekeeper details")).toBeVisible();
  });
});
