import { expect, test } from "@playwright/test";

// Plan display + plan-config copy used to live on /settings; product call
// (2026-05-18) made /dashboard/billing the permanent home. Those assertions now
// live in billing.spec.ts. This file keeps the plan-gated UI-side checks that
// target other product surfaces (i18n keys page) and the system-health banner.

// ── Plan-gated features ───────────────────────────────────────────────────────

test.describe("Plans — gated feature display", () => {
  test("'Translate with AI' button on i18n keys page is disabled on free plan", async ({
    page,
  }) => {
    await page.goto("/dashboard/e2e-project-id/i18n/keys");
    const btn = page.getByRole("button", { name: /translate with ai/i });
    await expect(btn).toBeVisible();
    await expect(btn).toBeDisabled();
  });
});

// ── System health banner ──────────────────────────────────────────────────────
// The dashboard shows a staleness banner when last_fired_at > 26h ago,
// meaning the analysis cron has not run recently.

test.describe("System health — analysis staleness banner", () => {
  test("dashboard does not show staleness banner when analysis is fresh", async ({ page }) => {
    await page.goto("/dashboard");
    // No staleness banner should appear when the system is healthy
    await expect(page.getByText(/analysis stalled/i)).not.toBeVisible();
    await expect(page.getByText(/cron.*stalled/i)).not.toBeVisible();
  });

  test("staleness banner renders with correct copy when analysis is overdue", async ({ page }) => {
    // This test requires seeding the system_health table with a stale last_fired_at.
    // When the banner IS shown it should contain "analysis" and a CTA.
    // Skipping until stale-health seeding is added to auth.setup.ts.
    await page.goto("/dashboard");
    const banner = page.getByRole("alert").filter({ hasText: /analysis/i });
    if ((await banner.count()) > 0) {
      await expect(banner).toBeVisible();
      await expect(banner.getByText(/stalled|overdue/i)).toBeVisible();
    } else {
      test.skip(true, "No stale system_health row seeded — this path requires a stale DB entry");
    }
  });
});
