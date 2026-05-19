import { test, expect } from "@playwright/test";

test.describe("Design system showcase", () => {
  test("renders every section anchor", async ({ page }) => {
    await page.goto("/design-system");

    await expect(page.getByRole("heading", { level: 1 })).toContainText(/Calm surfaces/);

    for (const id of [
      "tokens",
      "buttons",
      "badges",
      "fields",
      "inputs",
      "choice",
      "segmented",
      "slider",
      "tags",
      "upload",
      "stats",
      "code",
      "dialogs",
      "empty",
    ]) {
      await expect(page.locator(`section[data-section="${id}"]`)).toBeVisible();
    }
  });

  test("status badges render with each tone", async ({ page }) => {
    await page.goto("/design-system#badges");
    const badges = page.locator('section[data-section="badges"] [data-slot="status-badge"]');
    await expect(badges).toHaveCount(5);
    await expect(badges.filter({ hasText: "Live" })).toHaveAttribute("data-tone", "live");
    await expect(badges.filter({ hasText: "Killed" })).toHaveAttribute("data-tone", "killed");
  });

  test("destructive confirm dialog opens, cancel closes it, confirm completes", async ({
    page,
  }) => {
    await page.goto("/design-system#dialogs");

    await page.getByRole("button", { name: /Delete experiment…/ }).click();

    const dialog = page.getByRole("alertdialog");
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText(/Delete experiment\?/);

    await dialog.getByRole("button", { name: /Cancel/ }).click();
    await expect(dialog).toBeHidden();

    // Re-open and confirm.
    await page.getByRole("button", { name: /Delete experiment…/ }).click();
    const dialog2 = page.getByRole("alertdialog");
    await expect(dialog2).toBeVisible();
    await dialog2.getByRole("button", { name: /Delete forever/ }).click();
    await expect(dialog2).toBeHidden({ timeout: 3000 });
  });

  test("prompt dialog blocks invalid input and surfaces the value on confirm", async ({ page }) => {
    await page.goto("/design-system#dialogs");

    await page.getByRole("button", { name: /^Rename…$/ }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();

    const input = dialog.getByRole("textbox");
    await input.fill("Bad Value!");
    await dialog.getByRole("button", { name: /^Save$/ }).click();
    // Validation error keeps it open.
    await expect(dialog).toContainText(/lowercase letters/i);

    await input.fill("checkout_v4");
    await dialog.getByRole("button", { name: /^Save$/ }).click();
    await expect(dialog).toBeHidden();

    await expect(page.locator("text=Last value:")).toContainText("checkout_v4");
  });

  test("alert dialog renders and closes", async ({ page }) => {
    await page.goto("/design-system#dialogs");
    await page.getByRole("button", { name: /Show alert/ }).click();
    const dialog = page.getByRole("alertdialog");
    await expect(dialog).toBeVisible();
    await dialog.getByRole("button", { name: /Got it/ }).click();
    await expect(dialog).toBeHidden();
  });
});
