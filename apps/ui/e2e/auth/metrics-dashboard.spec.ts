import { expect, test, type Page } from "@playwright/test";

const ROUTE = "/dashboard/e2e-project-id/metrics";

async function openDetail(page: Page, name: string) {
  await page.goto(`${ROUTE}?demo=1`);
  await page.locator('[data-slot="pane-full"]').getByText(name, { exact: true }).first().click();
  await expect(page).toHaveURL(new RegExp(`[?&]open=${name}`));
}

test.describe("Metrics page — empty state", () => {
  test("hero copy + paired CTA buttons render", async ({ page }) => {
    await page.goto(ROUTE);

    await expect(page.getByText(/track anything you ship/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /start in 60 seconds/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /skip to demo data/i })).toBeVisible();
  });

  test('"skip to demo data" flips to list view with the events table', async ({ page }) => {
    await page.goto(ROUTE);

    await page.getByRole("button", { name: /skip to demo data/i }).click();
    await expect(page).toHaveURL(/[?&]demo=1/);
    await expect(page.getByRole("heading", { name: /^metrics$/i, level: 1 })).toBeVisible();

    const pane = page.locator('[data-slot="pane-full"]');
    await expect(pane.getByText("user_checkout").first()).toBeVisible();
    await expect(pane.getByText("plan_upgrade").first()).toBeVisible();
  });

  test('"Start in 60 seconds" CTA opens the BigModalWizard at step 1', async ({ page }) => {
    await page.goto(ROUTE);

    await page.getByRole("button", { name: /start in 60 seconds/i }).click();
    await expect(page).toHaveURL(/[?&]setup=1/);

    const wizard = page.getByRole("dialog");
    await expect(wizard).toBeVisible();
    await expect(wizard.getByText(/what are you shipping from\?/i)).toBeVisible();
    await expect(wizard.getByText(/Step 1 of 5/i).first()).toBeVisible();
  });
});

test.describe("Metrics page — list view (UnifiedList)", () => {
  test("?demo=1 deep-links into the list view with header kicker", async ({ page }) => {
    await page.goto(`${ROUTE}?demo=1`);

    await expect(page.getByRole("heading", { name: /^metrics$/i, level: 1 })).toBeVisible();
    await expect(page.getByText(/\d+ custom events? · \d+ conversions/i)).toBeVisible();

    const pane = page.locator('[data-slot="pane-full"]');
    await expect(pane.getByText("user_checkout").first()).toBeVisible();
  });

  test("closed-table renders sparkline svg + numeric-delta chip per row", async ({ page }) => {
    await page.goto(`${ROUTE}?demo=1`);
    const pane = page.locator('[data-slot="pane-full"]');

    // Sparkline (SVG with aria-label="Sparkline") present at least once per visible row.
    await expect(pane.locator('svg[aria-label="Sparkline"]').first()).toBeVisible();
    // NumericDelta chip — positive (e.g. user_checkout +22.6%) lands as data-good="true"
    await expect(
      pane.locator('[data-slot="numeric-delta"][data-good="true"]').first(),
    ).toBeVisible();
    // cart_abandoned is -4.1 → negative delta surfaces
    await expect(
      pane.locator('[data-slot="numeric-delta"][data-good="false"]').first(),
    ).toBeVisible();
  });

  test("status badges expose per-kind tones (conversion/funnel/event)", async ({ page }) => {
    await page.goto(`${ROUTE}?demo=1`);
    const pane = page.locator('[data-slot="pane-full"]');

    await expect(pane.locator('[data-tone="live"]').first()).toBeVisible(); // conversion
    await expect(pane.locator('[data-tone="completed"]').first()).toBeVisible(); // funnel
    await expect(pane.locator('[data-tone="neutral"]').first()).toBeVisible(); // event
  });

  test("filter input narrows the table and restores on clear", async ({ page }) => {
    await page.goto(`${ROUTE}?demo=1`);

    const filter = page.getByLabel(/filter events/i);
    const pane = page.locator('[data-slot="pane-full"]');

    await expect(pane.getByText("user_checkout").first()).toBeVisible();
    await filter.fill("plan");
    await expect(pane.getByText("user_checkout")).toHaveCount(0);
    await expect(pane.getByText("plan_upgrade").first()).toBeVisible();

    await filter.fill("");
    await expect(pane.getByText("user_checkout").first()).toBeVisible();
  });

  test("header Setup guide + Register event buttons both open the wizard", async ({ page }) => {
    await page.goto(`${ROUTE}?demo=1`);

    await page.getByRole("button", { name: /setup guide/i }).click();
    await expect(page).toHaveURL(/[?&]setup=1/);
    await expect(page.getByRole("dialog")).toBeVisible();

    // Close, then verify Register event also opens the wizard
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toHaveCount(0);

    await page.getByRole("button", { name: /register event/i }).click();
    await expect(page).toHaveURL(/[?&]setup=1/);
    await expect(page.getByRole("dialog")).toBeVisible();
  });
});

test.describe("Metrics page — embedded event detail", () => {
  test("row click opens detail pane + back button collapses URL", async ({ page }) => {
    await openDetail(page, "user_checkout");

    const detail = page.locator('[data-slot="detail-pane"]');
    await expect(detail.getByRole("heading", { name: "user_checkout" })).toBeVisible();
    await expect(detail.getByText(/sdk call/i)).toBeVisible();
    await expect(detail.getByText(/properties/i).first()).toBeVisible();

    await detail.getByRole("button", { name: /show full table/i }).click();
    await expect(page).not.toHaveURL(/[?&]open=/);
  });

  test("?open=<name> deep-links straight into the detail pane", async ({ page }) => {
    await page.goto(`${ROUTE}?demo=1&open=plan_upgrade`);

    const detail = page.locator('[data-slot="detail-pane"]');
    await expect(detail.getByRole("heading", { name: "plan_upgrade" })).toBeVisible();
    await expect(detail.getByText("first seen", { exact: false })).toBeVisible();
  });

  test("detail pane SDK Tabs switch between TS / Python / Go / cURL", async ({ page }) => {
    await openDetail(page, "user_checkout");
    const detail = page.locator('[data-slot="detail-pane"]');

    // TypeScript (default) — log() import
    await expect(detail.getByText(/import \{ log \} from '@shipeasy\/sdk'/)).toBeVisible();

    await detail.getByRole("tab", { name: /python/i }).click();
    await expect(detail.getByText(/from shipeasy import log/i)).toBeVisible();

    await detail.getByRole("tab", { name: /go/i }).click();
    await expect(detail.getByText(/shipeasy\.Log\("user_checkout"/)).toBeVisible();

    await detail.getByRole("tab", { name: /curl/i }).click();
    await expect(detail.getByText(/curl -X POST/)).toBeVisible();
  });

  test("rail row switches the detail to a different event", async ({ page }) => {
    await openDetail(page, "user_checkout");
    const detail = page.locator('[data-slot="detail-pane"]');
    await expect(detail.getByRole("heading", { name: "user_checkout" })).toBeVisible();

    const rail = page.locator('[data-slot="pane-rail"]');
    await rail.getByText("cart_abandoned", { exact: true }).click();

    await expect(page).toHaveURL(/[?&]open=cart_abandoned/);
    await expect(detail.getByRole("heading", { name: "cart_abandoned" })).toBeVisible();
    // cart_abandoned is -4.1% vs prev → danger sparkline intent on the trend tile
    await expect(detail.locator('svg[aria-label="Sparkline"]').first()).toBeVisible();
  });

  test("Esc key from list closes detail and strips ?open from URL", async ({ page }) => {
    await openDetail(page, "video_played");

    await page.keyboard.press("Escape");
    await expect(page).not.toHaveURL(/[?&]open=/);
    await expect(
      page.locator('[data-slot="detail-pane"]').getByRole("heading", { name: "video_played" }),
    ).toHaveCount(0);
  });
});

test.describe("Metrics page — full dashboard view", () => {
  test('"Show full dashboard" toggle renders the legacy dashboard chrome', async ({ page }) => {
    await page.goto(`${ROUTE}?demo=1`);
    await page.getByRole("button", { name: /show full dashboard/i }).click();
    await expect(page).toHaveURL(/[?&]view=dashboard/);

    await expect(page.getByText(/events over time/i)).toBeVisible();
    await expect(page.getByText(/checkout funnel/i)).toBeVisible();
    await expect(page.getByText(/auto-collected health/i)).toBeVisible();
    await expect(page.getByText(/live event stream/i)).toBeVisible();

    const snippet = page.getByTestId("auto-collect-enable-snippet");
    await expect(snippet).toBeVisible();
    await expect(snippet).toContainText(/autoCollect: true/);
  });

  test("?view=dashboard deep-link bypasses the list view", async ({ page }) => {
    await page.goto(`${ROUTE}?view=dashboard`);

    await expect(page.getByText(/events over time/i)).toBeVisible();
    await expect(page.getByText(/custom events/i).first()).toBeVisible();
  });

  test('"Show events list" returns to the UnifiedList', async ({ page }) => {
    await page.goto(`${ROUTE}?view=dashboard`);

    await page.getByRole("button", { name: /show events list/i }).click();
    await expect(page).not.toHaveURL(/[?&]view=dashboard/);

    const pane = page.locator('[data-slot="pane-full"]');
    await expect(pane.getByText("user_checkout").first()).toBeVisible();
  });

  test("dashboard row click flips to list with detail open", async ({ page }) => {
    await page.goto(`${ROUTE}?view=dashboard`);

    // Click the user_checkout row inside the dashboard's "Custom events" table.
    // `.met-ev-row` is the row container; locate the one whose name cell has user_checkout.
    const row = page.locator(".met-ev-row").filter({ hasText: "user_checkout" }).first();
    await row.click();

    await expect(page).toHaveURL(/[?&]open=user_checkout/);
    await expect(page).not.toHaveURL(/[?&]view=dashboard/);
    await expect(
      page.locator('[data-slot="detail-pane"]').getByRole("heading", { name: "user_checkout" }),
    ).toBeVisible();
  });

  test("dashboard Register event button opens the BigModalWizard", async ({ page }) => {
    await page.goto(`${ROUTE}?view=dashboard`);

    // The page-header "Register event" lives outside the dashboard card.
    await page
      .getByRole("button", { name: /^register event$/i, exact: false })
      .first()
      .click();
    await expect(page).toHaveURL(/[?&]setup=1/);
    await expect(page.getByRole("dialog")).toBeVisible();
  });
});

test.describe("Metrics page — BigModalWizard", () => {
  test("step 3 gates Next until the simulated ping arrives", async ({ page }) => {
    await page.goto(`${ROUTE}?setup=1`);
    const wizard = page.getByRole("dialog");

    await wizard.getByRole("button", { name: /^next/i }).click(); // → Initialize
    await wizard.getByRole("button", { name: /^next/i }).click(); // → Send first event
    await expect(wizard.getByRole("heading", { name: /send your first event/i })).toBeVisible();

    // Next is disabled while the detector is still listening.
    await expect(wizard.getByRole("button", { name: /^next/i })).toBeDisabled();

    await wizard.getByRole("button", { name: /simulate it/i }).click();
    await expect(wizard.getByText(/event received/i)).toBeVisible();
    await expect(wizard.getByRole("button", { name: /^next/i })).toBeEnabled();
  });

  test("Back walks the wizard backwards step by step", async ({ page }) => {
    await page.goto(`${ROUTE}?setup=1`);
    const wizard = page.getByRole("dialog");

    await wizard.getByRole("button", { name: /^next/i }).click(); // → Initialize
    await expect(
      wizard.getByRole("heading", { name: /initialize once, anywhere in your bootstrap/i }),
    ).toBeVisible();

    await wizard.getByRole("button", { name: /^back/i }).click();
    await expect(
      wizard.getByRole("heading", { name: /what are you shipping from\?/i }),
    ).toBeVisible();
    await expect(wizard.getByText(/Step 1 of 5/i).first()).toBeVisible();
  });

  test("close button in eyebrow strips ?setup=1 and dismisses wizard", async ({ page }) => {
    await page.goto(`${ROUTE}?setup=1`);
    await expect(page.getByRole("dialog")).toBeVisible();

    await page.getByRole("button", { name: /^close$/i }).click();

    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(page).not.toHaveURL(/[?&]setup=1/);
  });

  test("happy-path: walks all 5 steps, submit lands on ?demo=1 list", async ({ page }) => {
    await page.goto(`${ROUTE}?setup=1`);
    const wizard = page.getByRole("dialog");

    await wizard.getByRole("button", { name: /^next/i }).click();
    await expect(
      wizard.getByRole("heading", { name: /initialize once, anywhere in your bootstrap/i }),
    ).toBeVisible();

    await wizard.getByRole("button", { name: /^next/i }).click();
    await wizard.getByRole("button", { name: /simulate it/i }).click();
    await expect(wizard.getByText(/event received/i)).toBeVisible();

    await wizard.getByRole("button", { name: /^next/i }).click();
    await expect(
      wizard.getByRole("heading", { name: /pick events you want to track/i }),
    ).toBeVisible();

    await wizard.getByRole("button", { name: /^next/i }).click();
    await expect(wizard.getByRole("heading", { name: /you're all set/i })).toBeVisible();

    await wizard.getByRole("button", { name: /open dashboard/i }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(page).toHaveURL(/[?&]demo=1/);
    await expect(page).not.toHaveURL(/[?&]setup=1/);
  });
});

test.describe("Metrics page — navigation", () => {
  test("sidebar Metrics nav item links to /dashboard/<project>/metrics", async ({ page }) => {
    await page.goto("/dashboard");
    const nav = page.getByRole("navigation").getByRole("link", { name: /^metrics$/i });
    await expect(nav).toBeVisible();
    await expect(nav).toHaveAttribute("href", /\/dashboard\/[^/]+\/metrics$/);
  });
});
