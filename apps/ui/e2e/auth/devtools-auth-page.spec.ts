import { test, expect } from "@playwright/test";

test.describe("/devtools-auth", () => {
  test("missing origin parameter shows a helpful message", async ({ page }) => {
    await page.goto("/devtools-auth");
    await expect(page.getByText(/missing .*origin.* parameter/i)).toBeVisible();
  });

  test("invalid origin parameter is rejected", async ({ page }) => {
    await page.goto("/devtools-auth?origin=not-a-url");
    await expect(page.getByText("Invalid origin parameter.")).toBeVisible();
  });

  test("signed-in user sees approval UI with requesting host", async ({ page }) => {
    const origin = "https://customer.example.com";
    await page.goto(`/devtools-auth?origin=${encodeURIComponent(origin)}`);

    await expect(page.getByText("Authorize DevTools access")).toBeVisible();
    await expect(page.getByText("customer.example.com")).toBeVisible();
    await expect(page.getByRole("button", { name: /Approve as/i })).toBeVisible();
  });
});
