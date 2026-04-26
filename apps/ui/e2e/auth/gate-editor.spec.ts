import { expect, test, type Page } from "@playwright/test";

const RUN = Date.now();

function gateRow(page: Page, name: string) {
  return page.getByText(name, { exact: true }).locator("..").locator("..");
}

test.describe("Gate editor page", () => {
  test.describe.configure({ mode: "serial" });

  const key = `e2g_editor_${RUN}`;

  test("create a gate so we have one to edit", async ({ page }) => {
    await page.goto("/dashboard/gates/new");
    await page.locator("#gate-key").fill(key);
    await page.getByRole("button", { name: /^create gate$/i }).click();
    await expect(page).toHaveURL(/\/dashboard\/gates$/);
    await expect(gateRow(page, key).getByText("enabled", { exact: true })).toBeVisible();
  });

  test("clicking the gate name navigates to the editor and renders the editor surfaces", async ({
    page,
  }) => {
    await page.goto("/dashboard/gates");
    await page.getByRole("link", { name: key }).click();
    await expect(page).toHaveURL(/\/dashboard\/gates\/[^/]+$/);

    // Header
    await expect(page.getByRole("heading", { name: key })).toBeVisible();
    await expect(page.getByText(`gate.${key}`)).toBeVisible();

    // Sections
    await expect(page.getByText(/^Rules · /)).toBeVisible();
    await expect(page.getByText("Test against a user")).toBeVisible();
    await expect(page.getByText("SDK usage")).toBeVisible();
    await expect(page.getByText("Default when no rule matches")).toBeVisible();

    // Empty rules state
    await expect(page.getByText(/No rules yet/)).toBeVisible();
  });

  test("Add rule + Save persists the rule via admin API", async ({ page }) => {
    await page.goto("/dashboard/gates");
    await page.getByRole("link", { name: key }).click();

    await page.getByRole("button", { name: /add rule/i }).click();

    // Expect at least one IF row + a value input
    await expect(page.getByText("IF")).toBeVisible();

    const valueInput = page.locator('input[placeholder="value"]').first();
    await valueInput.fill("us-east");

    await page.getByRole("button", { name: /save changes/i }).click();
    await expect(page.getByRole("button", { name: /save changes/i })).toBeEnabled();

    const resp = await page.request.get("/api/admin/gates");
    expect(resp.ok()).toBe(true);
    const gates = await resp.json();
    const gate = gates.find((g: { name: string }) => g.name === key);
    expect(gate).toBeDefined();
    expect(Array.isArray(gate.rules)).toBe(true);
    expect(gate.rules.length).toBeGreaterThanOrEqual(1);
    expect(gate.rules[0].value).toBe("us-east");
  });

  test("Back link returns to the gates list", async ({ page }) => {
    await page.goto("/dashboard/gates");
    await page.getByRole("link", { name: key }).click();
    await page
      .getByRole("link", { name: /^gates$/i })
      .first()
      .click();
    await expect(page).toHaveURL(/\/dashboard\/gates$/);
  });

  test("cleanup: delete gate", async ({ page }) => {
    await page.goto("/dashboard/gates");
    await gateRow(page, key)
      .getByRole("button", { name: /^delete/i })
      .click();
    await expect(page.getByText(key, { exact: true })).not.toBeVisible();
  });
});
