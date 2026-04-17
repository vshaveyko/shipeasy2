import path from "node:path";
import { expect, test, type Page } from "@playwright/test";

const AUTH_FILE = path.join(__dirname, "../.auth/user.json");
const RUN = Date.now();

// ── Helpers ───────────────────────────────────────────────────────────────────

// Find a div-row by the exact text of its name span (2 levels up from span)
const divRow = (page: Page, name: string) =>
  page.getByText(name, { exact: true }).locator("..").locator("..");

// ── Scenario 1: Full experiment lifecycle ─────────────────────────────────────
// Register an event → create a metric → create an experiment → start → stop → delete.
// Exercises: events, metrics, experiments all in one flow.

test.describe("Integration: full experiment lifecycle", () => {
  test.describe.configure({ mode: "serial" });

  const evName = `e2eintev${RUN}`;
  const mName = `e2eintm${RUN}`;
  const expKey = `e2eintexp${RUN}`;

  test("create event → create metric referencing it → create experiment → start → stop → delete", async ({
    page,
  }) => {
    // 1. Register event
    await page.goto("/dashboard/experiments/events");
    await page.locator("#event-name").fill(evName);
    await page.getByRole("button", { name: /^add event$/i }).click();
    await expect(page).toHaveURL(/\/dashboard\/experiments\/events$/);
    await expect(divRow(page, evName).getByText(/^approved$/i)).toBeVisible();

    // 2. Create metric referencing the new event
    await page.goto("/dashboard/experiments/metrics");
    await page.getByLabel(/^name$/i).fill(mName);
    await page.getByLabel(/^event name$/i).fill(evName);
    await page.getByRole("button", { name: /^new metric$/i }).click();
    await expect(page).toHaveURL(/\/dashboard\/experiments\/metrics/);
    await expect(page.getByText(mName)).toBeVisible();

    // 3. Create experiment (uses seeded default universe)
    await page.goto("/dashboard/experiments/new");
    await page.locator("#exp-key").fill(expKey);
    await page.getByRole("button", { name: /^save draft$/i }).click();
    await expect(page).toHaveURL(/\/dashboard\/experiments$/);
    await expect(divRow(page, expKey).getByText(/^draft$/i)).toBeVisible();

    // 4. Start the experiment
    await divRow(page, expKey)
      .getByRole("button", { name: /^start$/i })
      .click();
    await expect(page).toHaveURL(/\/dashboard\/experiments$/);
    await expect(divRow(page, expKey).getByText(/^running$/i)).toBeVisible();

    // 5. Stop the experiment
    await divRow(page, expKey)
      .getByRole("button", { name: /^stop$/i })
      .click();
    await expect(page).toHaveURL(/\/dashboard\/experiments$/);
    await expect(divRow(page, expKey).getByText(/^stopped$/i)).toBeVisible();

    // 6. Delete the stopped experiment
    await divRow(page, expKey)
      .getByRole("button", { name: /^delete$/i })
      .click();
    await expect(page).toHaveURL(/\/dashboard\/experiments$/);
    await expect(page.getByText(expKey, { exact: true })).not.toBeVisible();

    // 7. Clean up: delete metric and event
    await page.goto("/dashboard/experiments/metrics");
    await page
      .getByText(mName, { exact: true })
      .locator("..")
      .locator("..")
      .getByRole("button", { name: /^delete$/i })
      .click();

    await page.goto("/dashboard/experiments/events");
    await divRow(page, evName)
      .getByRole("button", { name: /^delete$/i })
      .click();
  });
});

// ── Scenario 2: Gate + Config for the same feature ───────────────────────────
// Create both a gate and a config key for a feature, toggle the gate, delete both.
// Exercises: gates and configs together.

test.describe("Integration: gate and config for the same feature", () => {
  test.describe.configure({ mode: "serial" });

  const featureSlug = `e2efeature${RUN}`;

  test("create gate + config → gate is enabled → delete both", async ({ page }) => {
    // 1. Create the feature gate
    await page.goto("/dashboard/configs/gates/new");
    await page.locator("#gate-key").fill(featureSlug);
    await page.getByRole("button", { name: /^create gate$/i }).click();
    await expect(page).toHaveURL(/\/dashboard\/configs\/gates$/);
    await expect(divRow(page, featureSlug).getByText("enabled")).toBeVisible();

    // 2. Create the feature config
    await page.goto("/dashboard/configs/values/new");
    await page.locator("#config-key").fill(featureSlug);
    await page.getByRole("button", { name: /^create config$/i }).click();
    await expect(page).toHaveURL(/\/dashboard\/configs\/values$/);
    await expect(page.getByText(featureSlug, { exact: true })).toBeVisible();

    // 3. Disable then re-enable the gate (test the toggle cycle)
    await page.goto("/dashboard/configs/gates");
    await divRow(page, featureSlug)
      .getByRole("button", { name: /^disable$/i })
      .click();
    await expect(divRow(page, featureSlug).getByText("disabled")).toBeVisible();
    await divRow(page, featureSlug)
      .getByRole("button", { name: /^enable$/i })
      .click();
    await expect(divRow(page, featureSlug).getByText("enabled")).toBeVisible();

    // 4. Delete the gate
    await divRow(page, featureSlug)
      .getByRole("button", { name: /^delete$/i })
      .click();
    await expect(page.getByText(featureSlug, { exact: true })).not.toBeVisible();

    // 5. Delete the config
    await page.goto("/dashboard/configs/values");
    await page
      .getByText(featureSlug, { exact: true })
      .locator("..")
      .getByRole("button", { name: /^delete$/i })
      .click();
    await expect(page.getByText(featureSlug, { exact: true })).not.toBeVisible();
  });
});

// ── Scenario 3: i18n profile → draft lifecycle ───────────────────────────────
// Create two profiles → create a draft linked to the first → abandon it →
// create a second draft linked to the second profile → delete it → clean up.
// Exercises: profiles and drafts in combination.

test.describe("Integration: i18n profile and draft lifecycle", () => {
  test.describe.configure({ mode: "serial" });

  const prof1 = `e2eint${RUN}pa`;
  const prof2 = `e2eint${RUN}pb`;
  const draftA = `e2eint${RUN}da`;
  const draftB = `e2eint${RUN}db`;

  // Set up both profiles before any test runs
  test.beforeAll(async ({ browser }) => {
    const ctx = await browser.newContext({ storageState: AUTH_FILE });
    const p = await ctx.newPage();
    for (const name of [prof1, prof2]) {
      await p.goto("/dashboard/i18n/profiles/new");
      await p.getByLabel(/^name$/i).fill(name);
      await p.getByRole("button", { name: /^create profile$/i }).click();
      await expect(p).toHaveURL(/\/dashboard\/i18n\/profiles$/);
    }
    await ctx.close();
  });

  // Best-effort cleanup
  test.afterAll(async ({ browser }) => {
    const ctx = await browser.newContext({ storageState: AUTH_FILE });
    const p = await ctx.newPage();
    for (const name of [prof1, prof2]) {
      await p.goto("/dashboard/i18n/profiles");
      const btn = p.getByRole("button", { name: new RegExp(`delete profile ${name}`, "i") });
      if ((await btn.count()) > 0) await btn.click();
    }
    await ctx.close();
  });

  test("create draft → drafts list shows profile name and creator email", async ({ page }) => {
    await page.goto("/dashboard/i18n/drafts/new");
    await page.getByLabel(/^name$/i).fill(draftA);
    await page.locator("#draft-profile").selectOption({ label: prof1 });
    await page.getByRole("button", { name: /^create draft$/i }).click();

    await expect(page).toHaveURL(/\/dashboard\/i18n\/drafts$/);
    const row = page.getByRole("row").filter({ hasText: draftA });
    await expect(row.getByText(prof1)).toBeVisible();
    await expect(row.getByText(/e2e@shipeasy\.test/i)).toBeVisible();
    await expect(row.getByText(/^open$/i).first()).toBeVisible();
  });

  test("abandon first draft → create second draft for different profile", async ({ page }) => {
    // Abandon draftA
    await page.goto("/dashboard/i18n/drafts");
    await page
      .getByRole("row")
      .filter({ hasText: draftA })
      .getByRole("button", { name: /^abandon$/i })
      .click();
    await expect(page).toHaveURL(/\/dashboard\/i18n\/drafts$/);
    await expect(
      page
        .getByRole("row")
        .filter({ hasText: draftA })
        .getByText(/^abandoned$/i)
        .first(),
    ).toBeVisible();

    // Create draftB for the second profile
    await page.goto("/dashboard/i18n/drafts/new");
    await page.getByLabel(/^name$/i).fill(draftB);
    await page.locator("#draft-profile").selectOption({ label: prof2 });
    await page.getByRole("button", { name: /^create draft$/i }).click();
    await expect(page).toHaveURL(/\/dashboard\/i18n\/drafts$/);
    await expect(
      page
        .getByRole("row")
        .filter({ hasText: draftB })
        .getByText(/^open$/i)
        .first(),
    ).toBeVisible();
  });

  test("both drafts visible simultaneously → delete both", async ({ page }) => {
    await page.goto("/dashboard/i18n/drafts");
    // Both drafts should be in the list
    await expect(page.getByRole("row").filter({ hasText: draftA })).toBeVisible();
    await expect(page.getByRole("row").filter({ hasText: draftB })).toBeVisible();

    // Delete abandoned draftA (trash icon)
    await page.getByRole("button", { name: new RegExp(`delete draft ${draftA}`, "i") }).click();
    await expect(page).toHaveURL(/\/dashboard\/i18n\/drafts$/);
    await expect(page.getByRole("row").filter({ hasText: draftA })).toHaveCount(0);

    // Abandon then delete draftB
    await page
      .getByRole("row")
      .filter({ hasText: draftB })
      .getByRole("button", { name: /^abandon$/i })
      .click();
    await page.getByRole("button", { name: new RegExp(`delete draft ${draftB}`, "i") }).click();
    await expect(page.getByRole("row").filter({ hasText: draftB })).toHaveCount(0);
  });
});

// ── Scenario 4: SDK key rotation ─────────────────────────────────────────────
// Create server + client keys, verify both appear, revoke both.
// Exercises: creating keys of different types and the revoke flow.

test.describe("Integration: SDK key rotation", () => {
  test.describe.configure({ mode: "serial" });

  test("create server and client keys → revoke both", async ({ page }) => {
    await page.goto("/dashboard/keys");
    const revokeBefore = await page.getByRole("button", { name: /^revoke$/i }).count();
    const revokedBefore = await page.getByText("revoked").count();

    // Create a server key
    await page.locator("#key-type").selectOption("server");
    await page.getByRole("button", { name: /^create key$/i }).click();
    await expect(page.getByRole("button", { name: /^revoke$/i })).toHaveCount(revokeBefore + 1);

    // Create a client key
    await page.locator("#key-type").selectOption("client");
    await page.getByRole("button", { name: /^create key$/i }).click();
    await expect(page.getByRole("button", { name: /^revoke$/i })).toHaveCount(revokeBefore + 2);

    // Revoke both — wait for the button count to drop after each revoke
    await page
      .getByRole("button", { name: /^revoke$/i })
      .first()
      .click();
    await expect(page.getByRole("button", { name: /^revoke$/i })).toHaveCount(revokeBefore + 1);

    await page
      .getByRole("button", { name: /^revoke$/i })
      .first()
      .click();
    await expect(page.getByRole("button", { name: /^revoke$/i })).toHaveCount(revokeBefore);

    await expect(page.getByText("revoked")).toHaveCount(revokedBefore + 2);
  });
});

// ── Scenario 5: Attributes and universe as supporting infrastructure ──────────
// Declare a user attribute and a custom universe as experiment infrastructure,
// verify each persists across navigation, then clean up.

test.describe("Integration: attributes and universe as experiment infrastructure", () => {
  test.describe.configure({ mode: "serial" });

  const attrName = `e2eintattr${RUN}`;
  const uniName = `e2eintuniverse${RUN}`;

  test("declare attribute and universe → both appear in their lists", async ({ page }) => {
    // 1. Declare a user attribute
    await page.goto("/dashboard/experiments/attributes");
    await page.locator("#attr-name").fill(attrName);
    await page.getByRole("button", { name: /^add attribute$/i }).click();
    await expect(page.getByText(attrName, { exact: true })).toBeVisible();
    await expect(divRow(page, attrName).getByText("string")).toBeVisible();

    // 2. Create a custom universe
    await page.goto("/dashboard/experiments/universes");
    await page.locator("#universe-name").fill(uniName);
    await page.getByRole("button", { name: /^create universe$/i }).click();
    await expect(page.getByText(uniName, { exact: true })).toBeVisible();

    // 3. Both resources persist across navigation
    await page.goto("/dashboard/experiments/attributes");
    await expect(page.getByText(attrName, { exact: true })).toBeVisible();
    await page.goto("/dashboard/experiments/universes");
    await expect(page.getByText(uniName, { exact: true })).toBeVisible();
  });

  test("delete both → infrastructure is cleaned up", async ({ page }) => {
    await page.goto("/dashboard/experiments/universes");
    await divRow(page, uniName)
      .getByRole("button", { name: /^delete$/i })
      .click();
    await expect(page.getByText(uniName, { exact: true })).not.toBeVisible();

    await page.goto("/dashboard/experiments/attributes");
    await divRow(page, attrName)
      .getByRole("button", { name: /^delete$/i })
      .click();
    await expect(page.getByText(attrName, { exact: true })).not.toBeVisible();
  });
});
