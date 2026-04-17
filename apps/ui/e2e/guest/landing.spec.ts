import { test, expect } from "@playwright/test";

test.describe("Landing page", () => {
  test("renders hero and primary CTAs", async ({ page }) => {
    await page.goto("/");

    await expect(
      page.getByRole("heading", { name: /ship faster with the tools you need/i }),
    ).toBeVisible();

    await expect(page.getByText(/now in beta/i)).toBeVisible();

    await expect(page.getByRole("link", { name: /get started free/i })).toHaveAttribute(
      "href",
      "/auth/signin",
    );

    await expect(page.getByRole("link", { name: /read the docs/i })).toHaveAttribute(
      "href",
      "https://docs.shipeasy.ai",
    );
  });

  test("nav sign-in link goes to /auth/signin when signed out", async ({ page }) => {
    await page.goto("/");

    const signIn = page.getByRole("link", { name: /^sign in$/i });
    await expect(signIn).toBeVisible();
    await signIn.click();

    await expect(page).toHaveURL(/\/auth\/signin$/);
  });

  test("hero copy mentions the three products", async ({ page }) => {
    await page.goto("/");

    const body = page.locator("body");
    await expect(body).toContainText(/configs/i);
    await expect(body).toContainText(/experiments/i);
    await expect(body).toContainText(/string manager/i);
  });
});
