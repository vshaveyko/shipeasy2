import { test, expect } from "@playwright/test";

test.describe("Landing page", () => {
  test("renders hero, primary CTAs, and core sections", async ({ page }) => {
    await page.goto("/");

    // Hero headline mentions Claude.
    await expect(page.getByRole("heading", { level: 1 })).toContainText(/Claude/i);

    // Hero CTA — multiple "Install with Claude" links exist (nav + hero +
    // bottom CTA), so just assert the first points to /auth/signin.
    const installLinks = page.getByRole("link", { name: /install with claude/i });
    await expect(installLinks.first()).toHaveAttribute("href", "/auth/signin");

    // Body mentions all four primitives.
    const body = page.locator("body");
    await expect(body).toContainText(/Killswitches/i);
    await expect(body).toContainText(/Configs/i);
    await expect(body).toContainText(/Experiments/i);
    await expect(body).toContainText(/Metrics/i);

    // Anchored sections render.
    await expect(page.locator("#features")).toBeVisible();
    await expect(page.locator("#how")).toBeVisible();
    await expect(page.locator("#pricing")).toBeVisible();
    await expect(page.locator("#faq")).toBeVisible();
  });

  test("nav sign-in link goes to /auth/signin when signed out", async ({ page }) => {
    await page.goto("/");

    const signIn = page.getByRole("link", { name: /^sign in$/i });
    await expect(signIn).toBeVisible();
    await signIn.click();

    await expect(page).toHaveURL(/\/auth\/signin$/);
  });

  test("pricing tiers + monthly/annual toggle render", async ({ page }) => {
    await page.goto("/");
    const body = page.locator("body");
    await expect(body).toContainText(/Hobby/);
    await expect(body).toContainText(/Team/);
    await expect(body).toContainText(/Enterprise/);
    await expect(page.getByRole("tab", { name: /^monthly$/i })).toBeVisible();
    await expect(page.getByRole("tab", { name: /^annual/i })).toBeVisible();
  });
});
