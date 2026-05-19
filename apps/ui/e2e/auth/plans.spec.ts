import { expect, test } from "@playwright/test";

// ── Plan display on Settings ──────────────────────────────────────────────────

// TODO(redesign-followup): the redesigned Settings page no longer surfaces the
// plan card with copy these tests target. Plan info moved to /dashboard/billing.
// Re-target each test against the new surface or drop the obsolete ones.
test.describe("Plans — settings page display", () => {
  test.skip("current plan is shown in the Plan section", async ({ page }) => {
    await page.goto("/dashboard/e2e-project-id/settings");
    const main = page.getByRole("main");
    await expect(main.getByText(/^plan$/i).first()).toBeVisible();
    await expect(main.getByText(/^current$/i)).toBeVisible();
    // Plan name should be one of: free, paid
    await expect(main.getByText(/\bfree\b/i).or(main.getByText(/\bpaid\b/i))).toBeVisible();
  });

  test.skip("Manage billing link is visible in Plan section", async ({ page }) => {
    await page.goto("/dashboard/e2e-project-id/settings");
    await expect(page.getByRole("link", { name: /manage billing/i })).toBeVisible();
  });

  test.skip("plan section shows poll interval setting", async ({ page }) => {
    await page.goto("/dashboard/e2e-project-id/settings");
    // Poll interval is a plan-level knob surfaced to the user
    await expect(page.getByText(/poll.*interval/i).or(page.getByText(/polling/i))).toBeVisible();
  });

  test("plan section shows resource limits (gates, configs, experiments)", async ({ page }) => {
    await page.goto("/dashboard/e2e-project-id/settings");
    const main = page.getByRole("main");
    // Plans have per-resource limits shown on the settings page
    await expect(
      main
        .getByText(/gates/i)
        .or(main.getByText(/experiments/i))
        .or(main.getByText(/keys/i))
        .first(),
    ).toBeVisible();
  });
});

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

  // TODO(redesign-followup): v2 results-client.tsx no longer surfaces the
  // sequential-testing/mSPRT gating copy.
  test.skip("sequential testing note shown on experiment results page for free plan", async ({
    page,
  }) => {
    await page.goto("/dashboard/e2e-project-id/experiments/any_id");
    await expect(
      page
        .getByText(/sequential testing.*available/i)
        .or(page.getByText(/sequential testing.*pro/i))
        .or(page.getByText(/msprt.*pro/i))
        .first(),
    ).toBeVisible();
  });

  // TODO: The redesigned experiment detail page no longer surfaces a CUPED /
  // variance-reduction note in the activity panel. Re-enable when the gated
  // copy is reintroduced (or replaced by an equivalent upgrade hint).
  test.skip("CUPED note visible on experiment results page", async ({ page }) => {
    await page.goto("/dashboard/e2e-project-id/experiments/any_id");
    await expect(page.getByText(/cuped/i).or(page.getByText(/variance reduction/i))).toBeVisible();
  });
});

// ── Plan limits ───────────────────────────────────────────────────────────────

test.describe("Plans — plan config values (plans.yaml)", () => {
  test.skip("free plan poll_interval shown as the default on the settings page", async ({
    page,
  }) => {
    await page.goto("/dashboard/e2e-project-id/settings");
    await expect(page.getByText(/poll.*interval/i).or(page.getByText(/\d+s/i))).toBeVisible();
  });

  test.skip("ae_retention_days shown or implied in settings", async ({ page }) => {
    await page.goto("/dashboard/e2e-project-id/settings");
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
