import { expect, test, type Page } from "@playwright/test";

const RUN = Date.now();

// ── Helpers ───────────────────────────────────────────────────────────────────

function evRow(page: Page, name: string) {
  return page.getByText(name, { exact: true }).locator("..").locator("..");
}

// ── Form UI ───────────────────────────────────────────────────────────────────

test.describe("Events form UI", () => {
  test("renders name and description fields with Add event button", async ({ page }) => {
    await page.goto("/dashboard/experiments/events");
    await expect(page.locator("#event-name")).toBeVisible();
    await expect(page.locator("#event-description")).toBeVisible();
    await expect(page.getByRole("button", { name: /^add event$/i })).toBeEnabled();
  });

  test("auto-discover explainer copy is visible", async ({ page }) => {
    await page.goto("/dashboard/experiments/events");
    // The page description mentions auto-discover and pending approval
    await expect(page.getByText(/auto-discover/i)).toBeVisible();
  });
});

// ── Create with name only ─────────────────────────────────────────────────────

test.describe("Event — name only, no description", () => {
  test.describe.configure({ mode: "serial" });

  const name = `e2ev_noesc_${RUN}`;

  test("create event → approved badge, no Approve button", async ({ page }) => {
    await page.goto("/dashboard/experiments/events");
    await page.locator("#event-name").fill(name);
    await page.getByRole("button", { name: /^add event$/i }).click();

    await expect(page).toHaveURL(/\/dashboard\/experiments\/events$/);
    await expect(evRow(page, name).getByText(/^approved$/i)).toBeVisible();
    await expect(evRow(page, name).getByRole("button", { name: /^approve$/i })).not.toBeVisible();
  });

  test("cleanup: delete name-only event", async ({ page }) => {
    await page.goto("/dashboard/experiments/events");
    await evRow(page, name)
      .getByRole("button", { name: /^delete$/i })
      .click();
    await expect(page.getByText(name, { exact: true })).not.toBeVisible();
  });
});

// ── Create with name + description ───────────────────────────────────────────

test.describe("Event — name + description", () => {
  test.describe.configure({ mode: "serial" });

  const name = `e2ev_desc_${RUN}`;
  const description = "User completed the checkout flow";

  test("create event with description → both visible in list", async ({ page }) => {
    await page.goto("/dashboard/experiments/events");
    await page.locator("#event-name").fill(name);
    await page.locator("#event-description").fill(description);
    await page.getByRole("button", { name: /^add event$/i }).click();

    await expect(page).toHaveURL(/\/dashboard\/experiments\/events$/);
    await expect(evRow(page, name).getByText(/^approved$/i)).toBeVisible();
    await expect(page.getByText(description)).toBeVisible();
  });

  test("cleanup: delete event with description", async ({ page }) => {
    await page.goto("/dashboard/experiments/events");
    await evRow(page, name)
      .getByRole("button", { name: /^delete$/i })
      .click();
    await expect(page.getByText(name, { exact: true })).not.toBeVisible();
  });
});

// ── Seeded e2e_event fixture ──────────────────────────────────────────────────

test.describe("Seeded e2e_event", () => {
  test("appears as approved in the list", async ({ page }) => {
    await page.goto("/dashboard/experiments/events");
    await expect(evRow(page, "e2e_event").getByText(/^approved$/i)).toBeVisible();
  });

  test("has no Approve button", async ({ page }) => {
    await page.goto("/dashboard/experiments/events");
    await expect(
      evRow(page, "e2e_event").getByRole("button", { name: /^approve$/i }),
    ).not.toBeVisible();
  });

  test("has a Delete button", async ({ page }) => {
    await page.goto("/dashboard/experiments/events");
    await expect(evRow(page, "e2e_event").getByRole("button", { name: /^delete$/i })).toBeVisible();
  });
});

// ── Pending event approval workflow ──────────────────────────────────────────
// Auto-discovered events arrive via the edge worker /collect endpoint with
// pending=1. Once seeded they wait for manual approval in the dashboard.

test.describe("Pending event — approval workflow", () => {
  test.describe.configure({ mode: "serial" });

  const name = `e2ev_pend_${RUN}`;

  // We need a pending event to test the approve flow.
  // This scenario requires the event to be inserted with pending=1 via
  // auth.setup.ts or a direct DB seed. The test skips gracefully when none exist.

  test("pending event shows 'pending' badge and Approve + Delete buttons", async ({ page }) => {
    await page.goto("/dashboard/experiments/events");
    const pendingBadge = page.getByText(/^pending$/i).first();
    if ((await pendingBadge.count()) === 0) {
      test.skip(true, "No seeded pending events — seed one via /collect to exercise this path");
      return;
    }
    const row = pendingBadge.locator("..").locator("..");
    await expect(row.getByRole("button", { name: /^approve$/i })).toBeVisible();
    await expect(row.getByRole("button", { name: /^delete$/i })).toBeVisible();
  });

  test("approving a pending event → badge changes to approved", async ({ page }) => {
    await page.goto("/dashboard/experiments/events");
    const pendingBadge = page.getByText(/^pending$/i).first();
    if ((await pendingBadge.count()) === 0) {
      test.skip(true, "No pending events to approve");
      return;
    }
    const row = pendingBadge.locator("..").locator("..");
    await row.getByRole("button", { name: /^approve$/i }).click();

    await expect(page).toHaveURL(/\/dashboard\/experiments\/events$/);
    // Approve button should be gone now
    await expect(row.getByRole("button", { name: /^approve$/i })).not.toBeVisible();
  });

  // Verify that events created via the form (not auto-discovered) are approved immediately
  test("manually-registered event is immediately approved (not pending)", async ({ page }) => {
    await page.goto("/dashboard/experiments/events");
    await page.locator("#event-name").fill(name);
    await page.getByRole("button", { name: /^add event$/i }).click();
    await expect(page).toHaveURL(/\/dashboard\/experiments\/events$/);
    await expect(evRow(page, name).getByText(/^approved$/i)).toBeVisible();
    await expect(evRow(page, name).getByText(/^pending$/i)).not.toBeVisible();

    // Cleanup
    await evRow(page, name)
      .getByRole("button", { name: /^delete$/i })
      .click();
  });
});
