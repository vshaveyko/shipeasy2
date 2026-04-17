import { expect, test } from "@playwright/test";

const RUN = Date.now();

// ── Key-type reference section ────────────────────────────────────────────────

test.describe("SDK Keys — reference section", () => {
  test("server key description is visible", async ({ page }) => {
    await page.goto("/dashboard/keys");
    await expect(page.getByText(/full read of flags/i)).toBeVisible();
  });

  test("client key description is visible", async ({ page }) => {
    await page.goto("/dashboard/keys");
    await expect(page.getByText(/evaluate-only\. safe to include/i)).toBeVisible();
  });

  test("admin key description is visible", async ({ page }) => {
    await page.goto("/dashboard/keys");
    await expect(page.getByText(/scoped to admin rest/i)).toBeVisible();
  });
});

// ── Key-type selector ─────────────────────────────────────────────────────────

test.describe("SDK Keys — type selector", () => {
  test("selector has server, client, admin options", async ({ page }) => {
    await page.goto("/dashboard/keys");
    const sel = page.locator("#key-type");
    await expect(sel.locator("option[value='server']")).toHaveCount(1);
    await expect(sel.locator("option[value='client']")).toHaveCount(1);
    await expect(sel.locator("option[value='admin']")).toHaveCount(1);
  });
});

// ── Server key ────────────────────────────────────────────────────────────────

test.describe("Server key — create and revoke", () => {
  test.describe.configure({ mode: "serial" });

  test("create server key → server type badge visible", async ({ page }) => {
    await page.goto("/dashboard/keys");
    const revokeBefore = await page.getByRole("button", { name: /^revoke$/i }).count();

    await page.locator("#key-type").selectOption("server");
    await page.getByRole("button", { name: /^create key$/i }).click();

    await expect(page).toHaveURL(/\/dashboard\/keys/);
    await expect(page.getByRole("button", { name: /^revoke$/i })).toHaveCount(revokeBefore + 1);
    await expect(
      page
        .locator("span")
        .filter({ hasText: /^server$/i })
        .first(),
    ).toBeVisible();
  });

  test("revoke the newly created server key → revoked badge count +1", async ({ page }) => {
    await page.goto("/dashboard/keys");
    const revokeBefore = await page.getByRole("button", { name: /^revoke$/i }).count();
    const revokedBefore = await page.getByText("revoked").count();

    await page
      .getByRole("button", { name: /^revoke$/i })
      .first()
      .click();
    await expect(page.getByRole("button", { name: /^revoke$/i })).toHaveCount(revokeBefore - 1);
    await expect(page.getByText("revoked")).toHaveCount(revokedBefore + 1);
  });
});

// ── Client key ────────────────────────────────────────────────────────────────

test.describe("Client key — create and revoke", () => {
  test.describe.configure({ mode: "serial" });

  test("create client key → client type badge visible", async ({ page }) => {
    await page.goto("/dashboard/keys");
    const revokeBefore = await page.getByRole("button", { name: /^revoke$/i }).count();

    await page.locator("#key-type").selectOption("client");
    await page.getByRole("button", { name: /^create key$/i }).click();

    await expect(page).toHaveURL(/\/dashboard\/keys/);
    await expect(page.getByRole("button", { name: /^revoke$/i })).toHaveCount(revokeBefore + 1);
    await expect(
      page
        .locator("span")
        .filter({ hasText: /^client$/i })
        .first(),
    ).toBeVisible();
  });

  test("revoke the client key", async ({ page }) => {
    await page.goto("/dashboard/keys");
    const revokeBefore = await page.getByRole("button", { name: /^revoke$/i }).count();
    if (revokeBefore === 0) return; // already cleaned up

    await page
      .getByRole("button", { name: /^revoke$/i })
      .first()
      .click();
    await expect(page.getByRole("button", { name: /^revoke$/i })).toHaveCount(revokeBefore - 1);
  });
});

// ── Admin key ─────────────────────────────────────────────────────────────────

test.describe("Admin key — create and revoke", () => {
  test.describe.configure({ mode: "serial" });

  test("create admin key → admin type badge visible", async ({ page }) => {
    await page.goto("/dashboard/keys");
    const revokeBefore = await page.getByRole("button", { name: /^revoke$/i }).count();

    await page.locator("#key-type").selectOption("admin");
    await page.getByRole("button", { name: /^create key$/i }).click();

    await expect(page).toHaveURL(/\/dashboard\/keys/);
    await expect(page.getByRole("button", { name: /^revoke$/i })).toHaveCount(revokeBefore + 1);
    await expect(
      page
        .locator("span")
        .filter({ hasText: /^admin$/i })
        .first(),
    ).toBeVisible();
  });

  test("admin key shows expiry date (90-day expiry)", async ({ page }) => {
    await page.goto("/dashboard/keys");
    // Admin keys are scoped to the CLI and expire in 90 days — expiry should be shown
    await expect(page.getByText(/expires|expir/i).first()).toBeVisible();
  });

  test("revoke the admin key", async ({ page }) => {
    await page.goto("/dashboard/keys");
    const revokeBefore = await page.getByRole("button", { name: /^revoke$/i }).count();
    if (revokeBefore === 0) return;

    await page
      .getByRole("button", { name: /^revoke$/i })
      .first()
      .click();
    await expect(page.getByRole("button", { name: /^revoke$/i })).toHaveCount(revokeBefore - 1);
  });
});

// ── Key shown once on creation ────────────────────────────────────────────────

test.describe("Key raw value — shown once on creation", () => {
  test("raw key value is displayed immediately after creation", async ({ page }) => {
    await page.goto("/dashboard/keys");
    await page.locator("#key-type").selectOption("server");
    await page.getByRole("button", { name: /^create key$/i }).click();

    await expect(page).toHaveURL(/\/dashboard\/keys/);
    // Raw key shown once — prefixed with "sk_" (server), "ck_" (client), or "ak_" (admin)
    await expect(
      page
        .getByText(/^sk_|^ck_|^ak_/)
        .first()
        .or(page.getByText(/copy.*key|key.*copied/i)),
    ).toBeVisible();

    // Cleanup: revoke
    await page
      .getByRole("button", { name: /^revoke$/i })
      .first()
      .click();
  });
});
