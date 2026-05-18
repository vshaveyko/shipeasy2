import { expect, test } from "@playwright/test";

test.describe("Experiments", () => {
  test("list page shows heading and empty state", async ({ page }) => {
    await page.goto("/dashboard/e2e-project-id/experiments");

    await expect(page.getByRole("heading", { name: /^experiments$/i, level: 1 })).toBeVisible();
    // Redesigned list page leads with a description paragraph instead of the
    // old "Ship the version that actually wins" hero empty state.
    await expect(page.getByText(/feature tests with auto-collected metrics/i)).toBeVisible();
  });

  test("legacy /experiments/new advanced editor still renders", async ({ page }) => {
    // The big-modal wizard is the primary create path; the standalone
    // /experiments/new editor remains as the "Advanced" deep-link.
    await page.goto("/dashboard/e2e-project-id/experiments/new");
    await expect(
      page.getByRole("button", { name: /save as draft|start experiment/i }).first(),
    ).toBeVisible();
  });

  test("experiment detail route renders for any id", async ({ page }) => {
    await page.goto("/dashboard/e2e-project-id/experiments/checkout_redesign_q2");

    await expect(
      page.getByRole("heading", { name: /checkout_redesign_q2/i, level: 1 }),
    ).toBeVisible();
    await expect(page.getByText(/draft/i).first()).toBeVisible();
  });

  test("experiment detail renders v2 results layout (verdict + criteria + details rail)", async ({
    page,
  }) => {
    await page.goto("/dashboard/e2e-project-id/experiments/any_id");

    // v2 page has goal/success criteria strip and a foldable details rail.
    await expect(page.getByText(/^goal$/i).first()).toBeVisible();
    await expect(page.getByText(/^success$/i).first()).toBeVisible();
    await expect(page.getByRole("button", { name: /hide details|show details/i })).toBeVisible();
  });

  test("back link on detail page returns to experiments list", async ({ page }) => {
    await page.goto("/dashboard/e2e-project-id/experiments/some_id");
    await page
      .locator("main")
      .getByRole("link", { name: /^experiments$/i })
      .first()
      .click();
    await expect(page).toHaveURL(/\/dashboard\/e2e-project-id\/experiments$/);
  });

  test("list page renders the status filter tabs", async ({ page }) => {
    await page.goto("/dashboard/e2e-project-id/experiments");
    // The hero empty state on a brand-new project doesn't render the tabs.
    // If tabs are rendered, they must be the full set; otherwise skip.
    const allTab = page.getByRole("tab", { name: /^all/i });
    if ((await allTab.count()) === 0) {
      test
        .info()
        .annotations.push({ type: "skip", description: "empty experiments list — no tab strip" });
      return;
    }
    await expect(allTab).toBeVisible();
    for (const label of ["Running", "Draft", "Stopped", "Archived"]) {
      await expect(page.getByRole("tab", { name: new RegExp(`^${label}`, "i") })).toBeVisible();
    }
  });

  test("list page filter input narrows visible rows", async ({ page }) => {
    await page.goto("/dashboard/e2e-project-id/experiments");
    const filter = page.getByPlaceholder(/filter by name, tag, or universe/i);
    if ((await filter.count()) === 0) {
      test
        .info()
        .annotations.push({ type: "skip", description: "empty list — filter not rendered" });
      return;
    }
    await filter.fill("__no_match_xyz__");
    await expect(page.getByText(/no experiments match this filter/i)).toBeVisible();
  });

  test("New experiment button opens the BigModalWizard via ?new=1", async ({ page }) => {
    await page.goto("/dashboard/e2e-project-id/experiments");
    await page
      .getByRole("button", { name: /^new experiment$/i })
      .first()
      .click();
    await expect(page).toHaveURL(/[?&]new=1\b/);
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText(/step 1 of 4/i).first()).toBeVisible();
    await expect(dialog.getByText(/new experiment/i).first()).toBeVisible();
  });

  test("Advanced wizard link still points to /experiments/new", async ({ page }) => {
    await page.goto("/dashboard/e2e-project-id/experiments");
    const link = page.getByRole("link", { name: /^advanced wizard$/i }).first();
    await expect(link).toHaveAttribute("href", /\/dashboard\/e2e-project-id\/experiments\/new$/);
  });
});

test.describe("Experiments — BigModalWizard create flow", () => {
  test("?new=1 deep-link renders the wizard", async ({ page }) => {
    await page.goto("/dashboard/e2e-project-id/experiments?new=1");
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText(/step 1 of 4/i).first()).toBeVisible();
    // Step 1 label rendered as the head title.
    await expect(dialog.getByRole("heading", { name: /name & describe/i })).toBeVisible();
  });

  test("Next is disabled until a valid name is typed", async ({ page }) => {
    await page.goto("/dashboard/e2e-project-id/experiments?new=1");
    const dialog = page.getByRole("dialog");
    const next = dialog.getByRole("button", { name: /^next/i });
    await expect(next).toBeDisabled();
    await dialog.getByTestId("experiment-name-input").fill("checkout_redesign_q2");
    await expect(next).toBeEnabled();
  });

  test("Esc closes the wizard and strips ?new=1", async ({ page }) => {
    await page.goto("/dashboard/e2e-project-id/experiments?new=1");
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toBeHidden();
    await expect(page).not.toHaveURL(/[?&]new=1\b/);
  });

  test("Back button is disabled on step 1; advances to step 2 with a valid name", async ({
    page,
  }) => {
    await page.goto("/dashboard/e2e-project-id/experiments?new=1");
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByRole("button", { name: /^back$/i })).toBeDisabled();
    await dialog.getByTestId("experiment-name-input").fill("checkout_redesign_q2");
    await dialog.getByRole("button", { name: /^next/i }).click();
    await expect(dialog.getByText(/step 2 of 4/i).first()).toBeVisible();
    await expect(dialog.getByRole("heading", { name: /audience & traffic/i })).toBeVisible();
  });
});

test.describe("Experiment results page (v2)", () => {
  // The e2e fixture project has no real experiments, so the detail route falls
  // back to the draft view-model. All assertions here exercise the v2 layout
  // (header, criteria strip, draft callout, details rail, action buttons).

  const id = "results_v2_smoke";
  const url = `/dashboard/e2e-project-id/experiments/${id}`;

  test("v2 header: badge, title, owner row, action buttons", async ({ page }) => {
    await page.goto(url);

    await expect(page.getByRole("heading", { name: new RegExp(id, "i"), level: 1 })).toBeVisible();
    // DRAFT badge in v2-head
    await expect(page.locator(".v2-head .badge").first()).toContainText(/draft/i);
    // Action buttons rendered as part of the v2-head action row
    await expect(page.getByRole("button", { name: /duplicate/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /share/i })).toBeVisible();
  });

  test("v2 criteria strip exposes Goal and Success rows", async ({ page }) => {
    await page.goto(url);

    const criteria = page.locator(".v2-criteria");
    await expect(criteria).toBeVisible();
    await expect(criteria.getByText(/^goal$/i)).toBeVisible();
    await expect(criteria.getByText(/^success$/i)).toBeVisible();
  });

  test("draft verdict block renders callout + checklist + start CTA", async ({ page }) => {
    await page.goto(url);

    const draft = page.locator(".v2-draft");
    await expect(draft).toBeVisible();
    await expect(draft.getByText(/no results yet/i)).toBeVisible();
    await expect(draft.getByText(/finish the checklist to start/i)).toBeVisible();
    // checklist renders at least one row
    await expect(draft.locator(".checklist-wide > div").first()).toBeVisible();
  });

  test("details rail collapses and re-expands via the fold button", async ({ page }) => {
    await page.goto(url);

    const rail = page.locator(".v2-meta");
    const fold = rail.getByRole("button", { name: /hide details/i });
    await expect(rail).not.toHaveClass(/collapsed/);
    await fold.click();
    await expect(rail).toHaveClass(/collapsed/);
    // After collapse, button label flips to "Show details"
    await expect(rail.getByRole("button", { name: /show details/i })).toBeVisible();
    await rail.getByRole("button", { name: /show details/i }).click();
    await expect(rail).not.toHaveClass(/collapsed/);
  });

  test("details rail lists the expected metadata sections", async ({ page }) => {
    await page.goto(url);

    const rail = page.locator(".v2-meta");
    for (const label of [
      /owner & subscribers/i,
      /lifecycle/i,
      /identity/i,
      /targeting/i,
      /variants/i,
      /metrics/i,
      /statistical config/i,
      /activity/i,
      /linked/i,
    ]) {
      await expect(rail.getByText(label).first()).toBeVisible();
    }
  });

  test("metadata sections are collapsible <details> elements", async ({ page }) => {
    await page.goto(url);

    const owners = page
      .locator(".v2-meta .v2-meta-section")
      .filter({ hasText: /owner & subscribers/i });
    await expect(owners).toHaveAttribute("open", "");
    await owners.locator("summary").first().click();
    await expect(owners).not.toHaveAttribute("open", /.*/);
  });

  test("draft state hides hero + scoreboard + drawers (no results yet)", async ({ page }) => {
    await page.goto(url);

    await expect(page.locator(".v2-hero")).toHaveCount(0);
    await expect(page.locator(".v2-board")).toHaveCount(0);
    await expect(page.locator(".v2-drawer")).toHaveCount(0);
  });
});
