import path from "node:path";
import { expect, test, type Page } from "@playwright/test";

import { adminList } from "../admin-list";
import { setProjectPlan } from "../seed-fixtures";

const AUTH_FILE = path.join(__dirname, "../.auth/user.json");

// Unique per-run prefix so repeated runs don't collide in the shared local DB.
const RUN = Date.now();

// Free-plan limits (configs:1, gates:3, experiments:1, universes:1, keys:3,
// metrics:5) collide with serial CRUD describe blocks that each create rows.
// Bump to paid for the whole spec.
test.beforeAll(() => setProjectPlan("paid"));
test.afterAll(() => setProjectPlan("free"));

// ── i18n Profiles ─────────────────────────────────────────────────────────────

test.describe("i18n Profiles CRUD", () => {
  test.describe.configure({ mode: "serial" });

  const pName = `e2e-${RUN}-p`;

  test("create profile → appears in list", async ({ page }) => {
    await page.goto("/dashboard/e2e-project-id/i18n/profiles/new");
    await page.getByLabel(/^name$/i).fill(pName);
    await page.getByRole("button", { name: /^create profile$/i }).click();

    await expect(page).toHaveURL(/\/dashboard\/e2e-project-id\/i18n\/profiles$/);
    await expect(page.getByRole("cell", { name: pName, exact: true })).toBeVisible();
  });

  test("profile row shows 0 keys and a Browse keys link", async ({ page }) => {
    await page.goto("/dashboard/e2e-project-id/i18n/profiles");
    const row = page.getByRole("row").filter({ hasText: pName });
    await expect(row.getByRole("cell", { name: "0", exact: true })).toBeVisible();
    await expect(row.getByRole("link", { name: /browse keys/i })).toBeVisible();
  });

  test("delete profile → removed from list", async ({ page }) => {
    await page.goto("/dashboard/e2e-project-id/i18n/profiles");
    await page.getByRole("button", { name: new RegExp(`delete profile ${pName}`, "i") }).click();

    await expect(page).toHaveURL(/\/dashboard\/e2e-project-id\/i18n\/profiles$/);
    await expect(page.getByRole("cell", { name: pName, exact: true })).not.toBeVisible();
  });
});

// ── i18n Drafts ───────────────────────────────────────────────────────────────

test.describe("i18n Drafts CRUD", () => {
  test.describe.configure({ mode: "serial" });

  const pName = `e2e-${RUN}-dp`;
  const dName = `e2e-${RUN}-d`;

  // Create the prerequisite profile before any draft tests run.
  test.beforeAll(async ({ browser }) => {
    const ctx = await browser.newContext({ storageState: AUTH_FILE });
    const p = await ctx.newPage();
    await p.goto("/dashboard/e2e-project-id/i18n/profiles/new");
    await p.getByLabel(/^name$/i).fill(pName);
    await p.getByRole("button", { name: /^create profile$/i }).click();
    await expect(p).toHaveURL(/\/dashboard\/e2e-project-id\/i18n\/profiles$/);
    await ctx.close();
  });

  // Best-effort cleanup: delete the profile (drafts are orphaned, which is fine).
  test.afterAll(async ({ browser }) => {
    const ctx = await browser.newContext({ storageState: AUTH_FILE });
    const p = await ctx.newPage();
    await p.goto("/dashboard/e2e-project-id/i18n/profiles");
    const btn = p.getByRole("button", { name: new RegExp(`delete profile ${pName}`, "i") });
    if ((await btn.count()) > 0) await btn.click();
    await ctx.close();
  });

  test("create draft → appears in list with Open status", async ({ page }) => {
    await page.goto("/dashboard/e2e-project-id/i18n/drafts/new");
    await page.getByLabel(/^name$/i).fill(dName);
    await page.locator("#draft-profile").selectOption({ label: pName });
    await page.getByRole("button", { name: /^create draft$/i }).click();

    await expect(page).toHaveURL(/\/dashboard\/e2e-project-id\/i18n\/drafts$/);
    const row = page.getByRole("row").filter({ hasText: dName });
    await expect(row.getByText(/^open$/i).first()).toBeVisible();
  });

  test("draft row shows creator email and profile name", async ({ page }) => {
    await page.goto("/dashboard/e2e-project-id/i18n/drafts");
    const row = page.getByRole("row").filter({ hasText: dName });
    await expect(row.getByText(pName)).toBeVisible();
    await expect(row.getByText(/e2e@shipeasy\.test/i)).toBeVisible();
  });

  test("abandon draft → status changes to Abandoned", async ({ page }) => {
    await page.goto("/dashboard/e2e-project-id/i18n/drafts");
    const row = page.getByRole("row").filter({ hasText: dName });
    await row.getByRole("button", { name: /^abandon$/i }).click();

    await expect(page).toHaveURL(/\/dashboard\/e2e-project-id\/i18n\/drafts$/);
    const updated = page.getByRole("row").filter({ hasText: dName });
    await expect(updated.getByText(/^abandoned$/i).first()).toBeVisible();
    // Abandon button gone, trash icon now present
    await expect(updated.getByRole("button", { name: /^abandon$/i })).not.toBeVisible();
    await expect(
      page.getByRole("button", { name: new RegExp(`delete draft ${dName}`, "i") }),
    ).toBeVisible();
  });

  test("delete abandoned draft → removed from list", async ({ page }) => {
    await page.goto("/dashboard/e2e-project-id/i18n/drafts");
    await page.getByRole("button", { name: new RegExp(`delete draft ${dName}`, "i") }).click();

    await expect(page).toHaveURL(/\/dashboard\/e2e-project-id\/i18n\/drafts$/);
    await expect(page.getByRole("row").filter({ hasText: dName })).toHaveCount(0);
  });
});

// ── SDK Keys ──────────────────────────────────────────────────────────────────

test.describe("SDK Keys CRUD", () => {
  test.describe.configure({ mode: "serial" });

  test("create server key → server type badge visible", async ({ page }) => {
    await page.goto("/dashboard/e2e-project-id/keys");
    // The page renders an empty-state hero (no #key-type selector) when no
    // keys exist. The hero CTA always creates a server key — use it.
    const cta = page.getByRole("button", { name: /create your first key/i });
    if (await cta.count()) {
      await cta.click();
      await page.waitForSelector("#key-type");
    } else {
      await page.locator("#key-type").selectOption("server");
      await page.getByRole("button", { name: /^create key$/i }).click();
    }

    await expect(page).toHaveURL(/\/dashboard\/e2e-project-id\/keys/);
    // Server keys auto-revoke prior keys of the same type, so we assert on
    // the badge rather than a strict +1 count delta.
    await expect(
      page
        .locator("span")
        .filter({ hasText: /^server$/i })
        .first(),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: /^revoke$/i })).toHaveCount(1);
  });

  test("new key entry shows server type badge", async ({ page }) => {
    await page.goto("/dashboard/e2e-project-id/keys");
    // The keys list renders type badges as <span> elements; at least one 'server' badge should be visible.
    await expect(
      page
        .locator("span")
        .filter({ hasText: /^server$/i })
        .first(),
    ).toBeVisible();
  });

  test("revoke key → revoked badge appears, Revoke button disappears", async ({ page }) => {
    await page.goto("/dashboard/e2e-project-id/keys");
    const revokesBefore = await page.getByRole("button", { name: /^revoke$/i }).count();

    expect(revokesBefore).toBeGreaterThan(0);
    await page
      .getByRole("button", { name: /^revoke$/i })
      .first()
      .click();

    await expect(page).toHaveURL(/\/dashboard\/e2e-project-id\/keys/);
    await expect(page.getByRole("button", { name: /^revoke$/i })).toHaveCount(revokesBefore - 1);
    // Revoked rows are hidden by default; flip the toggle to inspect the badge.
    await page.goto("/dashboard/e2e-project-id/keys?show=revoked");
    await expect(page.getByText("revoked", { exact: true }).first()).toBeVisible();
  });
});

// ── Metrics ───────────────────────────────────────────────────────────────────

test.describe("Metrics CRUD", () => {
  test.describe.configure({ mode: "serial" });

  const mName = `e2e${RUN}m`;

  test("create metric → appears in list", async ({ page }) => {
    await page.goto("/dashboard/e2e-project-id/experiments/metrics");
    await page.getByLabel(/^name$/i).fill(mName);
    await page.getByLabel(/^event name$/i).fill("e2e_event");
    // Aggregation defaults to count_users — leave as-is.
    await page.getByRole("button", { name: /^new metric$/i }).click();

    await expect(page).toHaveURL(/\/dashboard\/e2e-project-id\/experiments\/metrics/);
    await expect(page.getByText(mName)).toBeVisible();
  });

  test("metric row shows aggregation type and event name", async ({ page }) => {
    await page.goto("/dashboard/e2e-project-id/experiments/metrics");
    const row = page
      .getByText(mName, { exact: true })
      .locator("..") // div.flex.items-center.gap-3
      .locator(".."); // div.flex.items-center.justify-between (row)
    await expect(row.getByText(/count_users on e2e_event/i)).toBeVisible();
  });

  test("delete metric → removed from list", async ({ page }) => {
    await page.goto("/dashboard/e2e-project-id/experiments/metrics");
    await page
      .getByText(mName, { exact: true })
      .locator("..")
      .locator("..")
      .locator("..")
      .getByRole("button", { name: /^delete$/i })
      .click();

    await expect(page).toHaveURL(/\/dashboard\/e2e-project-id\/experiments\/metrics/);
    await expect(page.getByText(mName)).not.toBeVisible();
  });
});

// ── Feature Gates ─────────────────────────────────────────────────────────────

test.describe("Feature Gates CRUD", () => {
  test.describe.configure({ mode: "serial" });

  const gKey = `e2egate${RUN}`;
  // Helper: finds the row div containing gKey (span → inner div → outer justify-between div)
  const gRow = (page: Page) =>
    page.getByText(gKey, { exact: true }).locator("..").locator("..").locator("..");

  test("create gate → appears in list with enabled badge", async ({ page }) => {
    // Phase 3a: /gates/new is now a BigModalWizard that opens over the list
    // via ?new=1. The legacy route redirects there, so the entry point still
    // works for deep-links.
    await page.goto("/dashboard/e2e-project-id/gates/new");
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();

    // Step 1 — Details.
    await dialog.locator("#new-gate-key").fill(gKey);
    await dialog.getByRole("button", { name: /^next\b/i }).click();

    // Steps 2, 3, 4 — Targeting / Preview / Integrate (skip with defaults).
    await dialog.getByRole("button", { name: /^next\b/i }).click();
    await dialog.getByRole("button", { name: /^next\b/i }).click();
    await dialog.getByRole("button", { name: /create gate/i }).click();

    // createGateAction redirects into the editor for the new gate.
    await expect(page).toHaveURL(/\/dashboard\/e2e-project-id\/gates\/[^/?#]+$/);

    // The list page reflects the new gate as enabled.
    await page.goto("/dashboard/e2e-project-id/gates");
    await expect(gRow(page).getByText("enabled")).toBeVisible();
  });

  test("disable gate → badge changes to disabled, button changes to Enable", async ({ page }) => {
    await page.goto("/dashboard/e2e-project-id/gates");
    await gRow(page)
      .getByRole("button", { name: /^disable gate$/i })
      .click();

    await expect(page).toHaveURL(/\/dashboard\/e2e-project-id\/gates$/);
    await expect(gRow(page).getByText("disabled")).toBeVisible();
    await expect(gRow(page).getByRole("button", { name: /^enable gate$/i })).toBeVisible();
  });

  test("enable gate → badge changes back to enabled", async ({ page }) => {
    await page.goto("/dashboard/e2e-project-id/gates");
    await gRow(page)
      .getByRole("button", { name: /^enable gate$/i })
      .click();

    await expect(page).toHaveURL(/\/dashboard\/e2e-project-id\/gates$/);
    await expect(gRow(page).getByText("enabled")).toBeVisible();
  });

  test("delete gate → removed from list", async ({ page }) => {
    await page.goto("/dashboard/e2e-project-id/gates");
    // Open the per-row dropdown menu, click "Delete gate", confirm in dialog.
    await gRow(page)
      .getByRole("button", { name: new RegExp(`Actions for ${gKey}`, "i") })
      .click();
    await page.getByRole("menuitem", { name: /^delete gate$/i }).click();
    await page
      .getByRole("dialog")
      .getByRole("button", { name: /^delete gate$/i })
      .click();

    await expect(page).toHaveURL(/\/dashboard\/e2e-project-id\/gates$/);
    // Scope to the gates list link so the closing dialog's name copy doesn't
    // shadow the assertion.
    await expect(page.locator("main").getByRole("link", { name: gKey })).toHaveCount(0);
  });
});

// ── Configs ───────────────────────────────────────────────────────────────────

test.describe("Configs CRUD", () => {
  test.describe.configure({ mode: "serial" });

  const cKey = `e2ecfg.k${RUN}`;
  // Configs: span is a direct child of the justify-between row div (1 level up)
  const cRow = (page: Page) => page.getByText(cKey, { exact: true }).locator("..");

  test("create config → appears in list", async ({ page }) => {
    // Legacy `/configs/values/new` redirects into the ?new=1 wizard.
    await page.goto("/dashboard/e2e-project-id/configs/values/new");
    await expect(page).toHaveURL(/\/configs\/values\?new=1$/);
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();

    await dialog.locator("#config-key").fill(cKey);
    // Walk through the 4-step wizard: Details → Schema → Defaults → Review.
    await dialog.getByRole("button", { name: /next/i }).click();
    await dialog.getByRole("button", { name: /next/i }).click();
    await dialog.getByRole("button", { name: /next/i }).click();
    await dialog.getByRole("button", { name: /create config/i }).click();

    await expect(page).toHaveURL(/\/dashboard\/e2e-project-id\/configs\/values\/[^/?]+$/);
    await expect(page.getByText(cKey, { exact: true }).first()).toBeVisible();
  });

  test("delete config → removed from list", async ({ page }) => {
    // Look up the row in the UnifiedList closed table, open the detail pane
    // via ?open=<id>, and delete from the sticky header.
    const list = await adminList<{ id: string; name: string }>(page.request, "/api/admin/configs");
    const cfg = list.find((c) => c.name === cKey);
    if (!cfg) throw new Error(`could not find config ${cKey}`);

    await page.goto(`/dashboard/e2e-project-id/configs/values?open=${cfg.id}`);
    await page.getByRole("button", { name: /delete config from detail pane/i }).click();
    await page
      .getByRole("dialog")
      .getByRole("button", { name: /^delete config$/i })
      .click();

    await expect(page).toHaveURL(/\/dashboard\/e2e-project-id\/configs\/values\/?$/);
    await expect(page.getByText(cKey, { exact: true })).not.toBeVisible();
  });
});

// ── Events ────────────────────────────────────────────────────────────────────

test.describe("Events CRUD", () => {
  test.describe.configure({ mode: "serial" });

  const evName = `e2eev${RUN}`;
  // Events: span → inner flex div → outer justify-between div (2 levels up)
  const evRow = (page: Page) =>
    page.getByText(evName, { exact: true }).locator("..").locator("..").locator("..");

  test("create event via form → appears in list as approved", async ({ page }) => {
    await page.goto("/dashboard/e2e-project-id/experiments/events");
    await page.locator("#event-name").fill(evName);
    await page.getByRole("button", { name: /^add event$/i }).click();

    await expect(page).toHaveURL(/\/dashboard\/e2e-project-id\/experiments\/events$/);
    // Events created manually via the form start as approved (pending=0)
    await expect(evRow(page).getByText(/^approved$/i)).toBeVisible();
    await expect(evRow(page).getByRole("button", { name: /^approve$/i })).not.toBeVisible();
  });

  test("delete event → removed from list", async ({ page }) => {
    await page.goto("/dashboard/e2e-project-id/experiments/events");
    await evRow(page)
      .getByRole("button", { name: /^delete$/i })
      .click();

    await expect(page).toHaveURL(/\/dashboard\/e2e-project-id\/experiments\/events$/);
    await expect(page.getByText(evName, { exact: true })).not.toBeVisible();
  });
});

// ── Attributes ────────────────────────────────────────────────────────────────

test.describe("Attributes CRUD", () => {
  test.describe.configure({ mode: "serial" });

  const aName = `e2eattr${RUN}`;
  // Attributes: span → inner flex div → outer justify-between div (2 levels up)
  const aRow = (page: Page) =>
    page.getByText(aName, { exact: true }).locator("..").locator("..").locator("..");

  test("create attribute → appears in list with string type", async ({ page }) => {
    await page.goto("/dashboard/e2e-project-id/experiments/attributes");
    await page.locator("#attr-name").fill(aName);
    await page.getByRole("button", { name: /^add attribute$/i }).click();

    await expect(page).toHaveURL(/\/dashboard\/e2e-project-id\/experiments\/attributes$/);
    await expect(aRow(page).getByText("string")).toBeVisible();
  });

  test("delete attribute → removed from list", async ({ page }) => {
    await page.goto("/dashboard/e2e-project-id/experiments/attributes");
    await aRow(page)
      .getByRole("button", { name: /^delete$/i })
      .click();

    await expect(page).toHaveURL(/\/dashboard\/e2e-project-id\/experiments\/attributes$/);
    await expect(page.getByText(aName, { exact: true })).not.toBeVisible();
  });
});

// ── Universes ─────────────────────────────────────────────────────────────────

test.describe("Universes CRUD", () => {
  test.describe.configure({ mode: "serial" });

  const uName = `e2euni${RUN}`;
  // Universes: span → inner div → outer justify-between div (2 levels up)
  const uRow = (page: Page) =>
    page.getByText(uName, { exact: true }).locator("..").locator("..").locator("..");

  test("create universe → appears in list", async ({ page }) => {
    await page.goto("/dashboard/e2e-project-id/experiments/universes");
    await page.locator("#universe-name").fill(uName);
    await page.getByRole("button", { name: /^create universe$/i }).click();

    await expect(page).toHaveURL(/\/dashboard\/e2e-project-id\/experiments\/universes$/);
    await expect(page.getByText(uName, { exact: true })).toBeVisible();
  });

  test("delete universe → removed from list", async ({ page }) => {
    await page.goto("/dashboard/e2e-project-id/experiments/universes");
    await uRow(page)
      .getByRole("button", { name: /^delete$/i })
      .click();

    await expect(page).toHaveURL(/\/dashboard\/e2e-project-id\/experiments\/universes$/);
    await expect(page.getByText(uName, { exact: true })).not.toBeVisible();
  });
});

// ── Experiments ───────────────────────────────────────────────────────────────

test.describe("Experiments CRUD", () => {
  test.describe.configure({ mode: "serial" });

  const uName = `e2euni-exp-${RUN}`;
  const expKey = `e2eexp${RUN}`;
  // Experiments: span → inner flex div → outer justify-between div (2 levels up)
  const expRow = (page: Page) =>
    page.getByText(expKey, { exact: true }).locator("..").locator("..").locator("..");

  // The /experiments/new page is now a single 10-section form (not a 4-step
  // wizard). Drive create-draft via the admin REST API — UI coverage for the
  // form lives in the dedicated experiments specs. Seed the prerequisite
  // universe inline so the experiment can reference it.
  test.beforeAll(async ({ request }) => {
    await request.post("/api/admin/universes", {
      data: { name: uName, identifier: "user_id", description: null },
    });
  });

  test.afterAll(async ({ request }) => {
    await request.delete(`/api/admin/universes/${uName}`).catch(() => {});
  });

  test("create experiment draft → appears in list with draft badge", async ({ page, request }) => {
    const res = await request.post("/api/admin/experiments", {
      data: {
        name: expKey,
        universe: uName,
        groups: [
          { name: "control", weight: 5000 },
          { name: "treatment", weight: 5000 },
        ],
      },
    });
    expect(res.ok(), `experiment seed failed: ${await res.text().catch(() => "")}`).toBeTruthy();

    await page.goto("/dashboard/e2e-project-id/experiments");
    await expect(expRow(page).getByText(/^draft$/i)).toBeVisible();
  });

  test("start experiment → status changes to running", async ({ page }) => {
    await page.goto("/dashboard/e2e-project-id/experiments");
    await expRow(page)
      .getByRole("button", { name: /start experiment/i })
      .click();

    await expect(page).toHaveURL(/\/dashboard\/e2e-project-id\/experiments$/);
    await expect(expRow(page).getByText(/^running$/i)).toBeVisible();
  });

  test("stop experiment → status changes to stopped", async ({ page }) => {
    await page.goto("/dashboard/e2e-project-id/experiments");
    await expRow(page)
      .getByRole("button", { name: /stop experiment/i })
      .click();

    await expect(page).toHaveURL(/\/dashboard\/e2e-project-id\/experiments$/);
    await expect(expRow(page).getByText(/^stopped$/i)).toBeVisible();
  });

  test("delete stopped experiment → removed from list", async ({ page }) => {
    await page.goto("/dashboard/e2e-project-id/experiments");
    await expRow(page)
      .getByRole("button", { name: /delete experiment/i })
      .click();

    await expect(page).toHaveURL(/\/dashboard\/e2e-project-id\/experiments$/);
    await expect(page.getByText(expKey, { exact: true })).not.toBeVisible();
  });
});

// ── Settings ──────────────────────────────────────────────────────────────────

test.describe("Settings CRUD", () => {
  test.describe.configure({ mode: "serial" });

  const newName = `E2E Project ${RUN}`;

  test("update project name → reflected on settings page", async ({ page }) => {
    // Settings page defaults to ?tab=general. The General form renders the
    // project-name input with aria-label "Project name" and a "Save changes"
    // submit button.
    await page.goto("/dashboard/e2e-project-id/settings");
    const input = page.getByLabel("Project name", { exact: true });
    await input.fill(newName);
    await page.getByRole("button", { name: /^save changes$/i }).click();

    await expect(page).toHaveURL(/\/dashboard\/e2e-project-id\/settings/);
    await expect(page.getByLabel("Project name", { exact: true })).toHaveValue(newName);
  });

  test("restore original project name", async ({ page }) => {
    await page.goto("/dashboard/e2e-project-id/settings");
    await page.getByLabel("Project name", { exact: true }).fill("Default project");
    await page.getByRole("button", { name: /^save changes$/i }).click();

    await expect(page).toHaveURL(/\/dashboard\/e2e-project-id\/settings/);
    await expect(page.getByLabel("Project name", { exact: true })).toHaveValue("Default project");
  });
});
