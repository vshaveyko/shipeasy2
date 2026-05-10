import { expect, test, type Page } from "@playwright/test";
import { adminList } from "../admin-list";

const RUN = Date.now();

function gateRow(page: Page, name: string) {
  // The row is a CSS grid with className containing "grid"; walk up from the
  // gate-name link until we reach that container.
  return page
    .getByRole("link", { name, exact: true })
    .locator("xpath=ancestor::div[contains(@class,'grid')][1]");
}

test.describe("Gate editor page", () => {
  test.describe.configure({ mode: "serial" });

  const key = `e2g_editor_${RUN}`;

  test("create a gate so we have one to edit", async ({ page }) => {
    await page.goto("/dashboard/e2e-project-id/gates/new");
    await page.locator("#gate-key").fill(key);
    await page.getByRole("button", { name: /^create gate$/i }).click();
    // Server action now redirects directly into the new gatekeeper editor.
    await expect(page).toHaveURL(/\/dashboard\/e2e-project-id\/gates\/[^/]+$/);
    // Land back on the list to confirm the row exists.
    await page.goto("/dashboard/e2e-project-id/gates");
    await expect(gateRow(page, key).getByText(/^ENABLED$/i)).toBeVisible();
  });

  test("clicking the gate name navigates to the editor", async ({ page }) => {
    await page.goto("/dashboard/e2e-project-id/gates");
    await page.getByRole("link", { name: key }).click();
    await expect(page).toHaveURL(/\/dashboard\/e2e-project-id\/gates\/[^/]+$/);

    // The new gatekeeper editor is a 3-step wizard.
    await expect(page.getByText(/where does this gatekeeper live/i).first()).toBeVisible();
    await expect(page.getByText(/stack the gates/i).first()).toBeVisible();
    await expect(page.getByText(/review and integrate/i).first()).toBeVisible();
  });

  // TODO: Rules builder (Add rule, IF row, Save changes) was replaced by the
  // gatekeeper-stack editor. Re-enable once we have stable selectors.
  test.skip("Add rule + Save persists the rule via admin API", async () => {});

  test("Back link returns to the gates list", async ({ page }) => {
    await page.goto("/dashboard/e2e-project-id/gates");
    await page.getByRole("link", { name: key }).click();
    await page
      .getByRole("link", { name: /^gates$/i })
      .first()
      .click();
    await expect(page).toHaveURL(/\/dashboard\/e2e-project-id\/gates$/);
  });

  test("cleanup: delete gate", async ({ page }) => {
    await page.goto("/dashboard/e2e-project-id/gates");
    await page.getByRole("button", { name: new RegExp(`Actions for ${key}`) }).click();
    await page.getByRole("menuitem", { name: /^delete( gate)?$/i }).click();
    const dialog = page.getByRole("dialog");
    await dialog.waitFor({ state: "visible" });
    await dialog.getByRole("button", { name: /^delete( gate)?$/i }).click();
    await dialog.waitFor({ state: "hidden" });
    await expect(page.getByText(key, { exact: true })).not.toBeVisible();
  });
});
