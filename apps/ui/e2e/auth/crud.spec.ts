import path from "node:path";
import { expect, test, type Page } from "@playwright/test";

const AUTH_FILE = path.join(__dirname, "../.auth/user.json");

// Unique per-run prefix so repeated runs don't collide in the shared local DB.
const RUN = Date.now();

// ── i18n Profiles ─────────────────────────────────────────────────────────────

test.describe("i18n Profiles CRUD", () => {
  test.describe.configure({ mode: "serial" });

  const pName = `e2e-${RUN}-p`;

  test("create profile → appears in list", async ({ page }) => {
    await page.goto("/dashboard/i18n/profiles/new");
    await page.getByLabel(/^name$/i).fill(pName);
    await page.getByRole("button", { name: /^create profile$/i }).click();

    await expect(page).toHaveURL(/\/dashboard\/i18n\/profiles$/);
    await expect(page.getByRole("cell", { name: pName, exact: true })).toBeVisible();
  });

  test("profile row shows 0 keys and a Browse keys link", async ({ page }) => {
    await page.goto("/dashboard/i18n/profiles");
    const row = page.getByRole("row").filter({ hasText: pName });
    await expect(row.getByRole("cell", { name: "0", exact: true })).toBeVisible();
    await expect(row.getByRole("link", { name: /browse keys/i })).toBeVisible();
  });

  test("delete profile → removed from list", async ({ page }) => {
    await page.goto("/dashboard/i18n/profiles");
    await page.getByRole("button", { name: new RegExp(`delete profile ${pName}`, "i") }).click();

    await expect(page).toHaveURL(/\/dashboard\/i18n\/profiles$/);
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
    await p.goto("/dashboard/i18n/profiles/new");
    await p.getByLabel(/^name$/i).fill(pName);
    await p.getByRole("button", { name: /^create profile$/i }).click();
    await expect(p).toHaveURL(/\/dashboard\/i18n\/profiles$/);
    await ctx.close();
  });

  // Best-effort cleanup: delete the profile (drafts are orphaned, which is fine).
  test.afterAll(async ({ browser }) => {
    const ctx = await browser.newContext({ storageState: AUTH_FILE });
    const p = await ctx.newPage();
    await p.goto("/dashboard/i18n/profiles");
    const btn = p.getByRole("button", { name: new RegExp(`delete profile ${pName}`, "i") });
    if ((await btn.count()) > 0) await btn.click();
    await ctx.close();
  });

  test("create draft → appears in list with Open status", async ({ page }) => {
    await page.goto("/dashboard/i18n/drafts/new");
    await page.getByLabel(/^name$/i).fill(dName);
    await page.locator("#draft-profile").selectOption({ label: pName });
    await page.getByRole("button", { name: /^create draft$/i }).click();

    await expect(page).toHaveURL(/\/dashboard\/i18n\/drafts$/);
    const row = page.getByRole("row").filter({ hasText: dName });
    await expect(row.getByText(/^open$/i).first()).toBeVisible();
  });

  test("draft row shows creator email and profile name", async ({ page }) => {
    await page.goto("/dashboard/i18n/drafts");
    const row = page.getByRole("row").filter({ hasText: dName });
    await expect(row.getByText(pName)).toBeVisible();
    await expect(row.getByText(/e2e@shipeasy\.test/i)).toBeVisible();
  });

  test("abandon draft → status changes to Abandoned", async ({ page }) => {
    await page.goto("/dashboard/i18n/drafts");
    const row = page.getByRole("row").filter({ hasText: dName });
    await row.getByRole("button", { name: /^abandon$/i }).click();

    await expect(page).toHaveURL(/\/dashboard\/i18n\/drafts$/);
    const updated = page.getByRole("row").filter({ hasText: dName });
    await expect(updated.getByText(/^abandoned$/i).first()).toBeVisible();
    // Abandon button gone, trash icon now present
    await expect(updated.getByRole("button", { name: /^abandon$/i })).not.toBeVisible();
    await expect(
      page.getByRole("button", { name: new RegExp(`delete draft ${dName}`, "i") }),
    ).toBeVisible();
  });

  test("delete abandoned draft → removed from list", async ({ page }) => {
    await page.goto("/dashboard/i18n/drafts");
    await page.getByRole("button", { name: new RegExp(`delete draft ${dName}`, "i") }).click();

    await expect(page).toHaveURL(/\/dashboard\/i18n\/drafts$/);
    await expect(page.getByRole("row").filter({ hasText: dName })).toHaveCount(0);
  });
});

// ── SDK Keys ──────────────────────────────────────────────────────────────────

test.describe("SDK Keys CRUD", () => {
  test.describe.configure({ mode: "serial" });

  test("create server key → Revoke button count increases by one", async ({ page }) => {
    await page.goto("/dashboard/keys");
    const before = await page.getByRole("button", { name: /^revoke$/i }).count();

    await page.locator("#key-type").selectOption("server");
    await page.getByRole("button", { name: /^create key$/i }).click();

    await expect(page).toHaveURL(/\/dashboard\/keys/);
    await expect(page.getByRole("button", { name: /^revoke$/i })).toHaveCount(before + 1);
  });

  test("new key entry shows server type badge", async ({ page }) => {
    await page.goto("/dashboard/keys");
    // The keys list renders type badges as <span> elements; at least one 'server' badge should be visible.
    await expect(
      page
        .locator("span")
        .filter({ hasText: /^server$/i })
        .first(),
    ).toBeVisible();
  });

  test("revoke key → revoked badge appears, Revoke button disappears", async ({ page }) => {
    await page.goto("/dashboard/keys");
    const revokesBefore = await page.getByRole("button", { name: /^revoke$/i }).count();
    const revokedBefore = await page.getByText("revoked").count();

    expect(revokesBefore).toBeGreaterThan(0);
    await page
      .getByRole("button", { name: /^revoke$/i })
      .first()
      .click();

    await expect(page).toHaveURL(/\/dashboard\/keys/);
    await expect(page.getByRole("button", { name: /^revoke$/i })).toHaveCount(revokesBefore - 1);
    await expect(page.getByText("revoked")).toHaveCount(revokedBefore + 1);
  });
});

// ── Metrics ───────────────────────────────────────────────────────────────────

test.describe("Metrics CRUD", () => {
  test.describe.configure({ mode: "serial" });

  const mName = `e2e${RUN}m`;

  test("create metric → appears in list", async ({ page }) => {
    await page.goto("/dashboard/experiments/metrics");
    await page.getByLabel(/^name$/i).fill(mName);
    await page.getByLabel(/^event name$/i).fill("e2e_event");
    // Aggregation defaults to count_users — leave as-is.
    await page.getByRole("button", { name: /^new metric$/i }).click();

    await expect(page).toHaveURL(/\/dashboard\/experiments\/metrics/);
    await expect(page.getByText(mName)).toBeVisible();
  });

  test("metric row shows aggregation type and event name", async ({ page }) => {
    await page.goto("/dashboard/experiments/metrics");
    const row = page
      .getByText(mName, { exact: true })
      .locator("..") // div.flex.items-center.gap-3
      .locator(".."); // div.flex.items-center.justify-between (row)
    await expect(row.getByText(/count_users on e2e_event/i)).toBeVisible();
  });

  test("delete metric → removed from list", async ({ page }) => {
    await page.goto("/dashboard/experiments/metrics");
    await page
      .getByText(mName, { exact: true })
      .locator("..")
      .locator("..")
      .getByRole("button", { name: /^delete$/i })
      .click();

    await expect(page).toHaveURL(/\/dashboard\/experiments\/metrics/);
    await expect(page.getByText(mName)).not.toBeVisible();
  });
});

// ── Feature Gates ─────────────────────────────────────────────────────────────

test.describe("Feature Gates CRUD", () => {
  test.describe.configure({ mode: "serial" });

  const gKey = `e2egate${RUN}`;
  // Helper: finds the row div containing gKey (span → inner div → outer justify-between div)
  const gRow = (page: Page) => page.getByText(gKey, { exact: true }).locator("..").locator("..");

  test("create gate → appears in list with enabled badge", async ({ page }) => {
    await page.goto("/dashboard/gates/new");
    await page.locator("#gate-key").fill(gKey);
    await page.getByRole("button", { name: /^create gate$/i }).click();

    await expect(page).toHaveURL(/\/dashboard\/gates$/);
    await expect(gRow(page).getByText("enabled")).toBeVisible();
  });

  test("disable gate → badge changes to disabled, button changes to Enable", async ({ page }) => {
    await page.goto("/dashboard/gates");
    await gRow(page)
      .getByRole("button", { name: /^disable$/i })
      .click();

    await expect(page).toHaveURL(/\/dashboard\/gates$/);
    await expect(gRow(page).getByText("disabled")).toBeVisible();
    await expect(gRow(page).getByRole("button", { name: /^enable$/i })).toBeVisible();
  });

  test("enable gate → badge changes back to enabled", async ({ page }) => {
    await page.goto("/dashboard/gates");
    await gRow(page)
      .getByRole("button", { name: /^enable$/i })
      .click();

    await expect(page).toHaveURL(/\/dashboard\/gates$/);
    await expect(gRow(page).getByText("enabled")).toBeVisible();
  });

  test("delete gate → removed from list", async ({ page }) => {
    await page.goto("/dashboard/gates");
    await gRow(page)
      .getByRole("button", { name: /^delete$/i })
      .click();

    await expect(page).toHaveURL(/\/dashboard\/gates$/);
    await expect(page.getByText(gKey, { exact: true })).not.toBeVisible();
  });
});

// ── Configs ───────────────────────────────────────────────────────────────────

test.describe("Configs CRUD", () => {
  test.describe.configure({ mode: "serial" });

  const cKey = `e2ecfg${RUN}`;
  // Configs: span is a direct child of the justify-between row div (1 level up)
  const cRow = (page: Page) => page.getByText(cKey, { exact: true }).locator("..");

  test("create config → appears in list", async ({ page }) => {
    await page.goto("/dashboard/configs/values/new");
    await page.locator("#config-key").fill(cKey);
    await page.getByRole("button", { name: /^create config$/i }).click();

    await expect(page).toHaveURL(/\/dashboard\/configs\/values$/);
    await expect(page.getByText(cKey, { exact: true })).toBeVisible();
  });

  test("delete config → removed from list", async ({ page }) => {
    await page.goto("/dashboard/configs/values");
    await cRow(page)
      .getByRole("button", { name: /^delete$/i })
      .click();

    await expect(page).toHaveURL(/\/dashboard\/configs\/values$/);
    await expect(page.getByText(cKey, { exact: true })).not.toBeVisible();
  });
});

// ── Events ────────────────────────────────────────────────────────────────────

test.describe("Events CRUD", () => {
  test.describe.configure({ mode: "serial" });

  const evName = `e2eev${RUN}`;
  // Events: span → inner flex div → outer justify-between div (2 levels up)
  const evRow = (page: Page) => page.getByText(evName, { exact: true }).locator("..").locator("..");

  test("create event via form → appears in list as approved", async ({ page }) => {
    await page.goto("/dashboard/experiments/events");
    await page.locator("#event-name").fill(evName);
    await page.getByRole("button", { name: /^add event$/i }).click();

    await expect(page).toHaveURL(/\/dashboard\/experiments\/events$/);
    // Events created manually via the form start as approved (pending=0)
    await expect(evRow(page).getByText(/^approved$/i)).toBeVisible();
    await expect(evRow(page).getByRole("button", { name: /^approve$/i })).not.toBeVisible();
  });

  test("delete event → removed from list", async ({ page }) => {
    await page.goto("/dashboard/experiments/events");
    await evRow(page)
      .getByRole("button", { name: /^delete$/i })
      .click();

    await expect(page).toHaveURL(/\/dashboard\/experiments\/events$/);
    await expect(page.getByText(evName, { exact: true })).not.toBeVisible();
  });
});

// ── Attributes ────────────────────────────────────────────────────────────────

test.describe("Attributes CRUD", () => {
  test.describe.configure({ mode: "serial" });

  const aName = `e2eattr${RUN}`;
  // Attributes: span → inner flex div → outer justify-between div (2 levels up)
  const aRow = (page: Page) => page.getByText(aName, { exact: true }).locator("..").locator("..");

  test("create attribute → appears in list with string type", async ({ page }) => {
    await page.goto("/dashboard/experiments/attributes");
    await page.locator("#attr-name").fill(aName);
    await page.getByRole("button", { name: /^add attribute$/i }).click();

    await expect(page).toHaveURL(/\/dashboard\/experiments\/attributes$/);
    await expect(aRow(page).getByText("string")).toBeVisible();
  });

  test("delete attribute → removed from list", async ({ page }) => {
    await page.goto("/dashboard/experiments/attributes");
    await aRow(page)
      .getByRole("button", { name: /^delete$/i })
      .click();

    await expect(page).toHaveURL(/\/dashboard\/experiments\/attributes$/);
    await expect(page.getByText(aName, { exact: true })).not.toBeVisible();
  });
});

// ── Universes ─────────────────────────────────────────────────────────────────

test.describe("Universes CRUD", () => {
  test.describe.configure({ mode: "serial" });

  const uName = `e2euni${RUN}`;
  // Universes: span → inner div → outer justify-between div (2 levels up)
  const uRow = (page: Page) => page.getByText(uName, { exact: true }).locator("..").locator("..");

  test("create universe → appears in list", async ({ page }) => {
    await page.goto("/dashboard/experiments/universes");
    await page.locator("#universe-name").fill(uName);
    await page.getByRole("button", { name: /^create universe$/i }).click();

    await expect(page).toHaveURL(/\/dashboard\/experiments\/universes$/);
    await expect(page.getByText(uName, { exact: true })).toBeVisible();
  });

  test("delete universe → removed from list", async ({ page }) => {
    await page.goto("/dashboard/experiments/universes");
    await uRow(page)
      .getByRole("button", { name: /^delete$/i })
      .click();

    await expect(page).toHaveURL(/\/dashboard\/experiments\/universes$/);
    await expect(page.getByText(uName, { exact: true })).not.toBeVisible();
  });
});

// ── Experiments ───────────────────────────────────────────────────────────────

test.describe("Experiments CRUD", () => {
  test.describe.configure({ mode: "serial" });

  const expKey = `e2eexp${RUN}`;
  // Experiments: span → inner flex div → outer justify-between div (2 levels up)
  const expRow = (page: Page) =>
    page.getByText(expKey, { exact: true }).locator("..").locator("..");

  test("create experiment draft → appears in list with draft badge", async ({ page }) => {
    await page.goto("/dashboard/experiments/new");
    await page.locator("#exp-key").fill(expKey);
    await page.getByRole("button", { name: /^save draft$/i }).click();

    await expect(page).toHaveURL(/\/dashboard\/experiments$/);
    await expect(expRow(page).getByText(/^draft$/i)).toBeVisible();
  });

  test("start experiment → status changes to running", async ({ page }) => {
    await page.goto("/dashboard/experiments");
    await expRow(page)
      .getByRole("button", { name: /^start$/i })
      .click();

    await expect(page).toHaveURL(/\/dashboard\/experiments$/);
    await expect(expRow(page).getByText(/^running$/i)).toBeVisible();
  });

  test("stop experiment → status changes to stopped", async ({ page }) => {
    await page.goto("/dashboard/experiments");
    await expRow(page)
      .getByRole("button", { name: /^stop$/i })
      .click();

    await expect(page).toHaveURL(/\/dashboard\/experiments$/);
    await expect(expRow(page).getByText(/^stopped$/i)).toBeVisible();
  });

  test("delete stopped experiment → removed from list", async ({ page }) => {
    await page.goto("/dashboard/experiments");
    await expRow(page)
      .getByRole("button", { name: /^delete$/i })
      .click();

    await expect(page).toHaveURL(/\/dashboard\/experiments$/);
    await expect(page.getByText(expKey, { exact: true })).not.toBeVisible();
  });
});

// ── Settings ──────────────────────────────────────────────────────────────────

test.describe("Settings CRUD", () => {
  test.describe.configure({ mode: "serial" });

  const newName = `E2E Project ${RUN}`;

  test("update project name → reflected on settings page", async ({ page }) => {
    await page.goto("/dashboard/settings");
    const input = page.locator("#project-name");
    await input.fill(newName);
    await page.getByRole("button", { name: /^save$/i }).click();

    await expect(page).toHaveURL(/\/dashboard\/settings$/);
    await expect(page.locator("#project-name")).toHaveValue(newName);
  });

  test("restore original project name", async ({ page }) => {
    await page.goto("/dashboard/settings");
    await page.locator("#project-name").fill("E2E Test Project");
    await page.getByRole("button", { name: /^save$/i }).click();

    await expect(page).toHaveURL(/\/dashboard\/settings$/);
    await expect(page.locator("#project-name")).toHaveValue("E2E Test Project");
  });
});
