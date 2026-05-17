import { expect, test } from "@playwright/test";

// Gates product chrome is covered end-to-end by gates.spec.ts (UnifiedList +
// BigModalWizard). Keep this file focused on the Configs surface.

test.describe("Configs product", () => {
  test("values landing renders the unified-list shell with header", async ({ page }) => {
    await page.goto("/dashboard/e2e-project-id/configs/values");

    await expect(page.getByRole("heading", { name: /^configs$/i, level: 1 })).toBeVisible();
    // Either the HeroEmptyState (no configs) or the closed-table (some configs)
    // is rendered. Both paths expose the "New config" CTA.
    const newButton = page.getByRole("button", { name: /^new config$/i });
    const heroLink = page.getByRole("link", { name: /define your first config/i });
    await expect(newButton.or(heroLink).first()).toBeVisible();
  });

  test("/configs/values/new redirects into the ?new=1 wizard", async ({ page }) => {
    await page.goto("/dashboard/e2e-project-id/configs/values/new");

    await expect(page).toHaveURL(/\/dashboard\/e2e-project-id\/configs\/values\?new=1$/);
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog.getByTestId("config-key-input")).toBeVisible();
  });
});
