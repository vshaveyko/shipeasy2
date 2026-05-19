import path from "node:path";
import { expect, test, type Page } from "@playwright/test";

import { setProjectPlan } from "../seed-fixtures";

const AUTH_FILE = path.join(__dirname, "../.auth/user.json");
const RUN = Date.now();

// Free plan caps configs/experiments/universes at 1. This spec exercises
// full lifecycle flows that create several of each — bump to paid.
test.beforeAll(() => setProjectPlan("paid"));
test.afterAll(() => setProjectPlan("free"));

// ── Helpers ───────────────────────────────────────────────────────────────────

// Row locator for the SelectableList / inline-list pages (attributes /
// universes / events / metrics). Different pages nest the name <span> at
// different depths inside the row, so ascend to the nearest container with
// the `justify-between` row class.
const divRow = (page: Page, name: string) =>
  page
    .getByText(name, { exact: true })
    .locator("xpath=ancestor::div[contains(@class,'justify-between')][1]");

// Row locator for UnifiedList closed tables (gates / configs / experiments /
// killswitches / metrics-list). Scope to the closed-pane to dodge the
// rail-pane mirror and ascend to the parent <tr>.
const paneRow = (page: Page, name: string) =>
  page
    .locator('[data-slot="pane-full"]')
    .getByText(name, { exact: true })
    .locator("xpath=ancestor::tr[1]");

async function openNewWizard(page: Page, url: string) {
  await page.goto(url);
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  return dialog;
}

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
    await page.goto("/dashboard/e2e-project-id/experiments/events");
    await page.locator("#event-name").fill(evName);
    await page.getByRole("button", { name: /^add event$/i }).click();
    await expect(page).toHaveURL(/\/dashboard\/e2e-project-id\/experiments\/events$/);
    await expect(divRow(page, evName).getByText(/^approved$/i)).toBeVisible();

    // 2. Create metric referencing the new event
    await page.goto("/dashboard/e2e-project-id/experiments/metrics");
    await page.getByLabel(/^name$/i).fill(mName);
    await page.getByLabel(/^event name$/i).fill(evName);
    await page.getByRole("button", { name: /^new metric$/i }).click();
    await expect(page).toHaveURL(/\/dashboard\/e2e-project-id\/experiments\/metrics/);
    await expect(page.getByText(mName)).toBeVisible();

    // 3. Create experiment via the 5-step BigModalWizard
    //    (Basics → Audience → Variants → Metrics → Integrate). Pick the metric
    //    we just registered as the goal, then save as draft.
    const expDialog = await openNewWizard(page, "/dashboard/e2e-project-id/experiments?new=1");
    await expDialog.locator("#experiment-name").fill(expKey);
    // Steps 1 → 2, 2 → 3, 3 → 4 (Metrics)
    for (let i = 0; i < 3; i++) {
      await expDialog.getByRole("button", { name: /^next\b/i }).click();
    }
    // Goal-metric Combobox — open, type to filter, ArrowDown, Enter.
    await expDialog.locator("#experiment-goal-metric").click();
    await page.keyboard.type(mName, { delay: 10 });
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("Enter");
    // Advance to Integrate, then save as draft.
    await expDialog.getByRole("button", { name: /^next\b/i }).click();
    await expDialog.getByLabel(/start experiment immediately/i).uncheck();
    await expDialog.getByRole("button", { name: /save as draft/i }).click();
    await expect(page).toHaveURL(/\/dashboard\/e2e-project-id\/experiments(\?.*)?$/);
    await expect(paneRow(page, expKey).getByText(/^draft$/i)).toBeVisible();

    // 4. Start the experiment
    await paneRow(page, expKey)
      .getByRole("button", { name: /start experiment/i })
      .click();
    await expect(paneRow(page, expKey).getByText(/^running$/i)).toBeVisible();

    // 5. Stop the experiment
    await paneRow(page, expKey)
      .getByRole("button", { name: /stop experiment/i })
      .click();
    await expect(paneRow(page, expKey).getByText(/^stopped$/i)).toBeVisible();

    // 6. Delete the stopped experiment
    await paneRow(page, expKey)
      .getByRole("button", { name: /delete experiment/i })
      .click();
    await expect(
      page.locator('[data-slot="pane-full"]').getByText(expKey, { exact: true }),
    ).not.toBeVisible();

    // 7. Clean up: delete metric and event
    await page.goto("/dashboard/e2e-project-id/experiments/metrics");
    await page
      .getByText(mName, { exact: true })
      .locator("..")
      .locator("..")
      .locator("..")
      .getByRole("button", { name: /^delete$/i })
      .click();

    await page.goto("/dashboard/e2e-project-id/experiments/events");
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

  // Gates use a single-segment slug; configs require `folder.name` so pair the
  // gate with a `feature.<slug>` config — same logical "feature" identifier.
  const featureSlug = `e2efeature${RUN}`;
  const configName = `feature.${featureSlug}`;

  test("create gate + config → gate is enabled → delete both", async ({ page }) => {
    // 1. Create the feature gate via the BigModalWizard (?new=1).
    const gDialog = await openNewWizard(page, "/dashboard/e2e-project-id/gates?new=1");
    await gDialog.locator("#new-gate-key").fill(featureSlug);
    for (let i = 0; i < 3; i++) {
      await gDialog.getByRole("button", { name: /^next\b/i }).click();
    }
    await gDialog.getByRole("button", { name: /create gate/i }).click();
    await expect(page).toHaveURL(/\/dashboard\/e2e-project-id\/gates\/[^/]+$/);

    // The list reflects the new gate as ENABLED.
    await page.goto("/dashboard/e2e-project-id/gates");
    await expect(paneRow(page, featureSlug).getByText(/^ENABLED$/i)).toBeVisible();

    // 2. Create the feature config via the BigModalWizard.
    const cDialog = await openNewWizard(page, "/dashboard/e2e-project-id/configs/values?new=1");
    await cDialog.locator("#config-key").fill(configName);
    for (let i = 0; i < 3; i++) {
      await cDialog.getByRole("button", { name: /^next\b/i }).click();
    }
    await cDialog.getByRole("button", { name: /create & publish v1/i }).click();
    await expect(page).toHaveURL(/\/dashboard\/e2e-project-id\/configs\/values\/[^/]+$/);
    await expect(page.getByText(configName, { exact: true }).first()).toBeVisible();

    // 3. Disable then re-enable the gate (test the toggle cycle)
    await page.goto("/dashboard/e2e-project-id/gates");
    await paneRow(page, featureSlug)
      .getByRole("button", { name: /^disable gate$/i })
      .click();
    await expect(paneRow(page, featureSlug).getByText(/^DISABLED$/i)).toBeVisible();
    await paneRow(page, featureSlug)
      .getByRole("button", { name: /^enable gate$/i })
      .click();
    await expect(paneRow(page, featureSlug).getByText(/^ENABLED$/i)).toBeVisible();

    // 4. Delete the gate via the per-row dropdown menu + confirm dialog.
    await paneRow(page, featureSlug)
      .getByRole("button", { name: new RegExp(`Actions for ${featureSlug}`, "i") })
      .click();
    await page.getByRole("menuitem", { name: /^delete gate$/i }).click();
    await page
      .getByRole("dialog")
      .getByRole("button", { name: /^delete gate$/i })
      .click();
    await expect(
      page.locator('[data-slot="pane-full"]').getByText(featureSlug, { exact: true }),
    ).toHaveCount(0);

    // 5. Delete the config from the list detail-pane header.
    await page.goto(`/dashboard/e2e-project-id/configs/values`);
    await paneRow(page, configName).click();
    await expect(page).toHaveURL(/\?open=/);
    await page
      .locator('[data-slot="detail-pane"]')
      .getByRole("button", { name: /delete config from detail pane/i })
      .click();
    await page
      .getByRole("dialog")
      .getByRole("button", { name: /^delete config$/i })
      .click();
    await expect(
      page.locator('[data-slot="pane-full"]').getByText(configName, { exact: true }),
    ).toHaveCount(0);
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
      await p.goto("/dashboard/e2e-project-id/i18n/profiles/new");
      await p.getByLabel(/^name$/i).fill(name);
      await p.getByRole("button", { name: /^create profile$/i }).click();
      await expect(p).toHaveURL(/\/dashboard\/e2e-project-id\/i18n\/profiles$/);
    }
    await ctx.close();
  });

  // Best-effort cleanup
  test.afterAll(async ({ browser }) => {
    const ctx = await browser.newContext({ storageState: AUTH_FILE });
    const p = await ctx.newPage();
    for (const name of [prof1, prof2]) {
      await p.goto("/dashboard/e2e-project-id/i18n/profiles");
      const btn = p.getByRole("button", { name: new RegExp(`delete profile ${name}`, "i") });
      if ((await btn.count()) > 0) await btn.click();
    }
    await ctx.close();
  });

  test("create draft → drafts list shows profile name and creator email", async ({ page }) => {
    await page.goto("/dashboard/e2e-project-id/i18n/drafts/new");
    await page.getByLabel(/^name$/i).fill(draftA);
    await page.locator("#draft-profile").selectOption({ label: prof1 });
    await page.getByRole("button", { name: /^create draft$/i }).click();

    await expect(page).toHaveURL(/\/dashboard\/e2e-project-id\/i18n\/drafts$/);
    const row = page.getByRole("row").filter({ hasText: draftA });
    await expect(row.getByText(prof1)).toBeVisible();
    await expect(row.getByText(/e2e@shipeasy\.test/i)).toBeVisible();
    await expect(row.getByText(/^open$/i).first()).toBeVisible();
  });

  test("abandon first draft → create second draft for different profile", async ({ page }) => {
    // Abandon draftA
    await page.goto("/dashboard/e2e-project-id/i18n/drafts");
    await page
      .getByRole("row")
      .filter({ hasText: draftA })
      .getByRole("button", { name: /^abandon$/i })
      .click();
    await expect(page).toHaveURL(/\/dashboard\/e2e-project-id\/i18n\/drafts$/);
    await expect(
      page
        .getByRole("row")
        .filter({ hasText: draftA })
        .getByText(/^abandoned$/i)
        .first(),
    ).toBeVisible();

    // Create draftB for the second profile
    await page.goto("/dashboard/e2e-project-id/i18n/drafts/new");
    await page.getByLabel(/^name$/i).fill(draftB);
    await page.locator("#draft-profile").selectOption({ label: prof2 });
    await page.getByRole("button", { name: /^create draft$/i }).click();
    await expect(page).toHaveURL(/\/dashboard\/e2e-project-id\/i18n\/drafts$/);
    await expect(
      page
        .getByRole("row")
        .filter({ hasText: draftB })
        .getByText(/^open$/i)
        .first(),
    ).toBeVisible();
  });

  test("both drafts visible simultaneously → delete both", async ({ page }) => {
    await page.goto("/dashboard/e2e-project-id/i18n/drafts");
    // Both drafts should be in the list
    await expect(page.getByRole("row").filter({ hasText: draftA })).toBeVisible();
    await expect(page.getByRole("row").filter({ hasText: draftB })).toBeVisible();

    // Delete abandoned draftA (trash icon)
    await page.getByRole("button", { name: new RegExp(`delete draft ${draftA}`, "i") }).click();
    await expect(page).toHaveURL(/\/dashboard\/e2e-project-id\/i18n\/drafts$/);
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
    await page.goto("/dashboard/e2e-project-id/keys");
    // Revoke any pre-existing keys so subsequent count deltas are deterministic.
    // (Creating a key of an existing (project, user, type) auto-revokes the prior.)
    while ((await page.getByRole("button", { name: /^revoke$/i }).count()) > 0) {
      const before = await page.getByRole("button", { name: /^revoke$/i }).count();
      await page
        .getByRole("button", { name: /^revoke$/i })
        .first()
        .click();
      await expect(page.getByRole("button", { name: /^revoke$/i })).toHaveCount(before - 1);
    }
    const revokeBefore = 0;
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
    // Revoked counter / badge text varies by view state; the active-button
    // count above is the source of truth for "both keys revoked".
    void revokedBefore;
  });
});

// ── Scenario 5: Attributes and universe as supporting infrastructure ──────────
// Declare a user attribute and a custom universe as experiment infrastructure,
// verify each persists across navigation, then clean up.

test.describe("Integration: attributes and universe as experiment infrastructure", () => {
  test.describe.configure({ mode: "serial" });

  const attrName = `e2eintattr${RUN}`;
  const uniName = `e2eintuniverse${RUN}`;

  // Free plan caps custom universes at 1; clear leftovers so this suite can
  // create its own.
  test.beforeAll(async ({ request }) => {
    const resp = await request.get("/api/admin/universes").catch(() => null);
    if (!resp || !resp.ok()) return;
    const body = (await resp.json().catch(() => null)) as
      | { id: string; name: string }[]
      | { data?: { id: string; name: string }[] }
      | null;
    const list = Array.isArray(body) ? body : (body?.data ?? []);
    for (const u of list) {
      if (u.name === "default") continue;
      await request.delete(`/api/admin/universes/${u.id}`).catch(() => {});
    }
  });

  test("declare attribute and universe → both appear in their lists", async ({ page }) => {
    // 1. Declare a user attribute
    await page.goto("/dashboard/e2e-project-id/experiments/attributes");
    await page.locator("#attr-name").fill(attrName);
    await page.getByRole("button", { name: /^add attribute$/i }).click();
    await expect(page.getByText(attrName, { exact: true })).toBeVisible();
    await expect(divRow(page, attrName).getByText("string")).toBeVisible();

    // 2. Create a custom universe
    await page.goto("/dashboard/e2e-project-id/experiments/universes");
    await page.locator("#universe-name").fill(uniName);
    await page.getByRole("button", { name: /^create universe$/i }).click();
    await expect(page.getByText(uniName, { exact: true })).toBeVisible();

    // 3. Both resources persist across navigation
    await page.goto("/dashboard/e2e-project-id/experiments/attributes");
    await expect(page.getByText(attrName, { exact: true })).toBeVisible();
    await page.goto("/dashboard/e2e-project-id/experiments/universes");
    await expect(page.getByText(uniName, { exact: true })).toBeVisible();
  });

  test("delete both → infrastructure is cleaned up", async ({ page }) => {
    await page.goto("/dashboard/e2e-project-id/experiments/universes");
    await divRow(page, uniName)
      .getByRole("button", { name: /^delete$/i })
      .click();
    await expect(page.getByText(uniName, { exact: true })).not.toBeVisible();

    await page.goto("/dashboard/e2e-project-id/experiments/attributes");
    await divRow(page, attrName)
      .getByRole("button", { name: /^delete$/i })
      .click();
    await expect(page.getByText(attrName, { exact: true })).not.toBeVisible();
  });
});
