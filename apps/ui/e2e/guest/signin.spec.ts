import { test, expect } from "@playwright/test";

test.describe("Sign-in page", () => {
  test("renders OAuth options", async ({ page }) => {
    await page.goto("/auth/signin");

    await expect(page.getByText(/welcome back/i)).toBeVisible();
    await expect(page.getByText(/sign in to your account to continue/i)).toBeVisible();

    await expect(page.getByRole("button", { name: /continue with google/i })).toBeVisible();

    await expect(page.getByRole("button", { name: /continue with github/i })).toBeVisible();

    await expect(page.getByRole("link", { name: /terms of service/i })).toHaveAttribute(
      "href",
      "https://docs.shipeasy.ai/terms",
    );
  });

  test("logo links back to landing page", async ({ page }) => {
    await page.goto("/auth/signin");

    await page.getByRole("link", { name: "ShipEasy", exact: true }).click();

    await expect(page).toHaveURL(/\/$/);
  });

  test("relative ?callbackUrl is forwarded to the OAuth provider", async ({ page }) => {
    // Intercept the /api/auth/signin/* POST that next-auth issues before the
    // OAuth redirect. The callbackUrl we put in the query string must round-
    // trip into that request body, otherwise the user lands on /dashboard
    // regardless of where they came from (bug that broke the devtools popup).
    const target = "/devtools-auth?origin=https%3A%2F%2Fexample.com";
    await page.goto(`/auth/signin?callbackUrl=${encodeURIComponent(target)}`);

    const signInRequest = page.waitForRequest(
      (req) => req.url().includes("/api/auth/signin/") && req.method() === "POST",
      { timeout: 5000 },
    );
    await page.getByRole("button", { name: /continue with google/i }).click();
    const req = await signInRequest;
    const body = req.postData() ?? "";
    expect(decodeURIComponent(body)).toContain(`callbackUrl=${target}`);
  });

  test("absolute ?callbackUrl (open redirect attempt) falls back to /dashboard", async ({
    page,
  }) => {
    await page.goto(`/auth/signin?callbackUrl=${encodeURIComponent("https://evil.example.com/x")}`);
    const signInRequest = page.waitForRequest(
      (req) => req.url().includes("/api/auth/signin/") && req.method() === "POST",
      { timeout: 5000 },
    );
    await page.getByRole("button", { name: /continue with google/i }).click();
    const req = await signInRequest;
    const body = decodeURIComponent(req.postData() ?? "");
    expect(body).toContain("callbackUrl=/dashboard");
    expect(body).not.toContain("evil.example.com");
  });
});
