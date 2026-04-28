import { expect, test } from "@playwright/test";

test.describe("Metrics dashboard (top-level)", () => {
  test("empty state renders the hero copy and CTAs", async ({ page }) => {
    await page.goto("/dashboard/metrics");

    await expect(page.getByText(/track anything you ship\./i)).toBeVisible();
    await expect(page.getByRole("button", { name: /start setup/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /skip to demo data/i })).toBeVisible();
  });

  test('"skip to demo data" reveals the populated dashboard', async ({ page }) => {
    await page.goto("/dashboard/metrics");

    await page.getByRole("button", { name: /skip to demo data/i }).click();

    await expect(page.getByRole("heading", { name: /^metrics$/i, level: 1 })).toBeVisible();
    await expect(page.getByText(/events over time/i)).toBeVisible();
    await expect(page.getByText(/checkout funnel/i)).toBeVisible();
    await expect(page.getByText(/auto-collected health/i)).toBeVisible();
    await expect(page.getByText(/live event stream/i)).toBeVisible();
    await expect(page.getByText(/custom events/i).first()).toBeVisible();
  });

  test("?demo=1 deep-links into the populated dashboard", async ({ page }) => {
    await page.goto("/dashboard/metrics?demo=1");

    await expect(page.getByRole("heading", { name: /^metrics$/i, level: 1 })).toBeVisible();
    await expect(page.getByText(/events over time/i)).toBeVisible();
  });

  test("register-event CTA opens the event drawer with code preview", async ({ page }) => {
    await page.goto("/dashboard/metrics?demo=1");

    await page
      .getByRole("button", { name: /^register event$/i })
      .first()
      .click();

    const drawer = page.getByRole("dialog", { name: /register event/i });
    await expect(drawer).toBeVisible();
    await expect(drawer.getByText(/event name/i).first()).toBeVisible();
    await expect(drawer.getByText(/sdk call/i).first()).toBeVisible();
    await expect(drawer.getByRole("button", { name: /^cancel$/i })).toBeVisible();
  });

  test('"start setup" opens the onboarding wizard', async ({ page }) => {
    await page.goto("/dashboard/metrics");

    await page.getByRole("button", { name: /start setup/i }).click();

    const wizard = page.getByRole("dialog", { name: /metrics onboarding/i });
    await expect(wizard).toBeVisible();
    await expect(wizard.getByText(/what are you shipping from\?/i)).toBeVisible();
    await expect(wizard.getByRole("button", { name: /^continue/i })).toBeVisible();
  });

  test("Metrics nav item appears in the sidebar", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(
      page.getByRole("navigation").getByRole("link", { name: /^metrics$/i }),
    ).toBeVisible();
  });
});
