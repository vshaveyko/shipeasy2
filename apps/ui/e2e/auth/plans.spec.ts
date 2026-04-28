import { expect, test } from "@playwright/test";

// ── Plan display on Settings ──────────────────────────────────────────────────

test.describe("Plans — settings page display", () => {
  test("current plan is shown in the Plan section", async ({ page }) => {
    await page.goto("/dashboard/settings");
    await expect(page.getByText(/^plan$/i).first()).toBeVisible();
    await expect(page.getByText(/^current$/i)).toBeVisible();
    // Plan name should be one of: free, paid
    await expect(
      page.getByText(/\bfree\b/i).or(page.getByText(/\bpaid\b/i)),
    ).toBeVisible();
  });

  test("Manage billing link is visible in Plan section", async ({ page }) => {
    await page.goto("/dashboard/settings");
    await expect(page.getByRole("link", { name: /manage billing/i })).toBeVisible();
  });

  test("plan section shows poll interval setting", async ({ page }) => {
    await page.goto("/dashboard/settings");
    // Poll interval is a plan-level knob surfaced to the user
    await expect(page.getByText(/poll.*interval/i).or(page.getByText(/polling/i))).toBeVisible();
  });

  test("plan section shows resource limits (gates, configs, experiments)", async ({ page }) => {
    await page.goto("/dashboard/settings");
    // Plans have per-resource limits shown on the settings page
    await expect(
      page
        .getByText(/gates/i)
        .or(page.getByText(/experiments/i))
        .or(page.getByText(/keys/i)),
    ).toBeVisible();
  });
});

// ── Plan-gated features ───────────────────────────────────────────────────────

test.describe("Plans — gated feature display", () => {
  test("'Translate with AI' button on i18n keys page is disabled on free plan", async ({
    page,
  }) => {
    await page.goto("/dashboard/i18n/keys");
    const btn = page.getByRole("button", { name: /translate with ai/i });
    await expect(btn).toBeVisible();
    await expect(btn).toBeDisabled();
  });

  test("sequential testing note shown on experiment results page for free plan", async ({
    page,
  }) => {
    await page.goto("/dashboard/experiments/any_id");
    await expect(
      page
        .getByText(/sequential testing.*available/i)
        .or(page.getByText(/sequential testing.*pro/i))
        .or(page.getByText(/msprt.*pro/i)),
    ).toBeVisible();
  });

  test("CUPED note visible on experiment results page", async ({ page }) => {
    await page.goto("/dashboard/experiments/any_id");
    // CUPED is available from Pro plan. For free plan, it may show an upgrade note.
    await expect(page.getByText(/cuped/i).or(page.getByText(/variance reduction/i))).toBeVisible();
  });
});

// ── Plan limits ───────────────────────────────────────────────────────────────

test.describe("Plans — plan config values (plans.yaml)", () => {
  test("free plan poll_interval shown as the default on the settings page", async ({ page }) => {
    await page.goto("/dashboard/settings");
    // Free plan has a longer poll interval — it should be surfaced to the user
    await expect(page.getByText(/poll.*interval/i).or(page.getByText(/\d+s/i))).toBeVisible();
  });

  test("ae_retention_days shown or implied in settings", async ({ page }) => {
    await page.goto("/dashboard/settings");
    // Analytics retention is a plan feature visible in settings
    await expect(page.getByText(/retention/i).or(page.getByText(/analytics/i))).toBeVisible();
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
