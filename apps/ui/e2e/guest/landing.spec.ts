import { test, expect } from "@playwright/test";

test.describe("Landing page", () => {
  test("renders hero, primary CTAs, and core sections", async ({ page }) => {
    await page.goto("/");

    // Headline ("Tell Claude to {verb} it. Shipeasy ships it.")
    await expect(page.getByRole("heading", { level: 1 })).toContainText(/Tell Claude to/i);
    await expect(page.getByRole("heading", { level: 1 })).toContainText(/Shipeasy/i);

    // Hero CTAs — there are multiple "Install with Claude" links (nav + hero +
    // bottom CTA), so just assert at least one points to /auth/signin.
    const installLinks = page.getByRole("link", { name: /install with claude/i });
    await expect(installLinks.first()).toHaveAttribute("href", "/auth/signin");

    // Subhead mentions all four primitives.
    const body = page.locator("body");
    await expect(body).toContainText(/Killswitches/i);
    await expect(body).toContainText(/configs/i);
    await expect(body).toContainText(/experiments/i);
    await expect(body).toContainText(/metrics/i);

    // Section anchors render.
    await expect(page.locator("#features")).toBeVisible();
    await expect(page.locator("#how")).toBeVisible();
    await expect(page.locator("#pricing")).toBeVisible();
  });

  test("nav sign-in link goes to /auth/signin when signed out", async ({ page }) => {
    await page.goto("/");

    const signIn = page.getByRole("link", { name: /^sign in$/i });
    await expect(signIn).toBeVisible();
    await signIn.click();

    await expect(page).toHaveURL(/\/auth\/signin$/);
  });

  test("pricing tiers are listed", async ({ page }) => {
    await page.goto("/");
    const body = page.locator("body");
    await expect(body).toContainText(/Hobby/);
    await expect(body).toContainText(/Team/);
    await expect(body).toContainText(/Enterprise/);
  });
});
