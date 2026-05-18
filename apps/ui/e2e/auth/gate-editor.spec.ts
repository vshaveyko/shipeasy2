import { expect, test, type Page } from "@playwright/test";
import { adminList } from "../admin-list";

const RUN = Date.now();

function gateRow(page: Page, name: string) {
  // Gates list is now a <UnifiedList> closed table — scope to the closed-pane
  // to dodge the rail-pane mirror and ascend to the parent <tr>.
  return page
    .locator('[data-slot="pane-full"]')
    .getByText(name, { exact: true })
    .locator("xpath=ancestor::tr[1]");
}

test.describe("Gate editor page", () => {
  test.describe.configure({ mode: "serial" });

  const key = `e2g_editor_${RUN}`;

  test("create a gate so we have one to edit", async ({ page }) => {
    await page.goto("/dashboard/e2e-project-id/gates?new=1");
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await dialog.locator("#new-gate-key").fill(key);
    for (let i = 0; i < 3; i++) {
      await dialog.getByRole("button", { name: /^next\b/i }).click();
    }
    await dialog.getByRole("button", { name: /create gate/i }).click();
    await expect(page).toHaveURL(/\/dashboard\/e2e-project-id\/gates\/[^/]+$/);
    await page.goto("/dashboard/e2e-project-id/gates");
    await expect(gateRow(page, key).getByText(/^ENABLED$/i)).toBeVisible();
  });

  test("clicking the gate name opens the embedded editor in the detail pane", async ({ page }) => {
    await page.goto("/dashboard/e2e-project-id/gates");
    await gateRow(page, key).click();
    await expect(page).toHaveURL(/\?open=/);
    await expect(page.getByText(/stack the gates/i).first()).toBeVisible();
  });

  // TODO: Rules builder (Add rule, IF row, Save changes) was replaced by the
  // gatekeeper-stack editor. Re-enable once we have stable selectors.
  test.skip("Add rule + Save persists the rule via admin API", async () => {});

  test("ESC closes the detail pane and returns to the list", async ({ page }) => {
    await page.goto("/dashboard/e2e-project-id/gates");
    await gateRow(page, key).click();
    await expect(page).toHaveURL(/\?open=/);
    await page.keyboard.press("Escape");
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
