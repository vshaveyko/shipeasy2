import { expect, test, type Page } from "@playwright/test";

// Ensure at least one key exists so the populated layout renders (the empty
// state hero pre-empts the rest of the page).
async function ensurePopulated(page: Page) {
  await page.goto("/dashboard/e2e-project-id/keys");
  const cta = page.getByRole("button", { name: /create your first key/i });
  if (await cta.count()) {
    await cta.click();
    await page.waitForSelector("#key-type");
    return;
  }
  if ((await page.getByRole("button", { name: /^revoke$/i }).count()) === 0) {
    await page.locator("#key-type").selectOption("server");
    await page.getByRole("button", { name: /^create key$/i }).click();
    await page.waitForSelector("#key-type");
  }
}

test.describe("SDK Keys — polished layout", () => {
  test("header surfaces active-key counter kicker", async ({ page }) => {
    await ensurePopulated(page);
    // Kicker line sits above the h1: "<n> active … shown once at create-time".
    await expect(page.getByText(/\d+\s*active.*shown once at create-time/i)).toBeVisible();
  });

  test("header renders server / client / admin stat block", async ({ page }) => {
    await ensurePopulated(page);
    for (const label of [/^server$/i, /^client$/i, /^admin$/i]) {
      await expect(
        page.locator("span").filter({ hasText: label }).first(),
      ).toBeVisible();
    }
  });

  test("table head renders all column captions", async ({ page }) => {
    await ensurePopulated(page);
    for (const caption of [/^key$/i, /^type$/i, /^created$/i, /^expires$/i, /^status$/i]) {
      await expect(
        page.locator("span").filter({ hasText: caption }).first(),
      ).toBeVisible();
    }
  });

  test("inline create form lives in table head with Type select + Create key button", async ({
    page,
  }) => {
    await ensurePopulated(page);
    const select = page.locator("#key-type");
    await expect(select).toBeVisible();
    await expect(select.locator("option")).toHaveCount(3);
    await expect(page.getByRole("button", { name: /^create key$/i })).toBeEnabled();
  });

  test("active row shows the lowercase ACTIVE badge alongside the Revoke button", async ({
    page,
  }) => {
    await ensurePopulated(page);
    await expect(
      page.locator("span.se-badge.se-badge-live").filter({ hasText: /^active$/i }).first(),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: /^revoke$/i }).first()).toBeVisible();
  });

  test("new-key banner renders after creation and exposes Copy", async ({ page }) => {
    await page.goto("/dashboard/e2e-project-id/keys");
    // Make sure we land on the populated form so #key-type is available.
    const cta = page.getByRole("button", { name: /create your first key/i });
    if (await cta.count()) {
      await cta.click();
      await page.waitForSelector("#key-type");
    }
    await page.locator("#key-type").selectOption("server");
    await page.getByRole("button", { name: /^create key$/i }).click();

    await expect(page.getByText(/new key created/i)).toBeVisible();
    await expect(page.getByText(/copy it now/i)).toBeVisible();
    await expect(page.getByText(/secret manager/i).first()).toBeVisible();
    await expect(page.getByRole("button", { name: /copy key/i })).toBeVisible();

    // Cleanup so other specs see a deterministic baseline. Reload without the
    // ?new_key param so the banner doesn't intercept the row's Revoke click.
    await page.goto("/dashboard/e2e-project-id/keys");
    await page
      .getByRole("button", { name: /^revoke$/i })
      .first()
      .click();
  });

  test("install snippet card renders Quick install with @shipeasy/sdk", async ({ page }) => {
    await ensurePopulated(page);
    await expect(page.getByText(/quick install/i)).toBeVisible();
    await expect(page.getByText(/npm install @shipeasy\/sdk/)).toBeVisible();
  });

  test("security & rotation card renders the three hints", async ({ page }) => {
    await ensurePopulated(page);
    await expect(page.getByText(/security & rotation/i)).toBeVisible();
    await expect(page.getByText(/rotate on suspicion/i).first()).toBeVisible();
    await expect(page.getByText(/never commit keys/i).first()).toBeVisible();
    await expect(page.getByText(/right key, right surface/i).first()).toBeVisible();
  });

  test("key types reference card lists all three labels with descriptions", async ({ page }) => {
    await ensurePopulated(page);
    await expect(page.getByText(/^key types$/i)).toBeVisible();
    // Labels rendered as badge text.
    for (const label of [/^server$/i, /^client$/i, /^admin$/i]) {
      await expect(
        page.locator(".se-badge").filter({ hasText: label }).first(),
      ).toBeVisible();
    }
  });
});
