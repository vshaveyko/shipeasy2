import { expect, test, type Page } from "@playwright/test";

const RUN = Date.now();

// ── Helpers ───────────────────────────────────────────────────────────────────

function gateRow(page: Page, name: string) {
  return page.getByText(name, { exact: true }).locator("..").locator("..");
}

// ── Quick-profile UI ──────────────────────────────────────────────────────────

test.describe("New gate form UI", () => {
  test("renders all four quick-setup profiles", async ({ page }) => {
    await page.goto("/dashboard/gates/new");
    for (const label of ["Rollout", "Targeted", "Killswitch", "Beta"]) {
      await expect(page.getByText(label, { exact: true })).toBeVisible();
    }
  });

  test("Rollout profile is selected by default and shows 10%", async ({ page }) => {
    await page.goto("/dashboard/gates/new");
    // The percentage display shows 10 for the default Rollout profile
    await expect(page.getByText("10%")).toBeVisible();
  });

  test("selecting Killswitch profile sets percentage to 0%", async ({ page }) => {
    await page.goto("/dashboard/gates/new");
    await page.getByText("Killswitch", { exact: true }).locator("..").click();
    await expect(page.getByText("0%")).toBeVisible();
  });

  test("selecting Targeted profile sets percentage to 100%", async ({ page }) => {
    await page.goto("/dashboard/gates/new");
    await page.getByText("Targeted", { exact: true }).locator("..").click();
    await expect(page.getByText("100%")).toBeVisible();
  });

  test("moving the slider updates the displayed percentage", async ({ page }) => {
    await page.goto("/dashboard/gates/new");
    const slider = page.locator("input[type=range]");
    await slider.evaluate((el) => {
      (el as HTMLInputElement).value = "75";
      el.dispatchEvent(new Event("input", { bubbles: true }));
    });
    await expect(page.getByText("75%")).toBeVisible();
  });

  test("cancel link returns to the gates list", async ({ page }) => {
    await page.goto("/dashboard/gates/new");
    await page
      .getByRole("link", { name: /^cancel$/i })
      .first()
      .click();
    await expect(page).toHaveURL(/\/dashboard\/gates$/);
  });

  test("Create gate button is present and enabled", async ({ page }) => {
    await page.goto("/dashboard/gates/new");
    await expect(page.getByRole("button", { name: /^create gate$/i })).toBeEnabled();
  });
});

// ── Rollout gate CRUD ─────────────────────────────────────────────────────────

test.describe("Rollout gate — full CRUD", () => {
  test.describe.configure({ mode: "serial" });

  const key = `e2g_rollout_${RUN}`;

  test("create at 50% rollout → appears in list as enabled, propagates to admin API", async ({
    page,
  }) => {
    await page.goto("/dashboard/gates/new");

    // Set slider to 50
    const slider = page.locator("input[type=range]");
    await slider.evaluate((el) => {
      (el as HTMLInputElement).value = "50";
      el.dispatchEvent(new Event("input", { bubbles: true }));
    });
    await page.locator("#gate-key").fill(key);
    await page.getByRole("button", { name: /^create gate$/i }).click();

    await expect(page).toHaveURL(/\/dashboard\/gates$/);
    await expect(gateRow(page, key).getByText("enabled")).toBeVisible();

    // Admin API: gate is present with correct rolloutPct (50% → 5000 in 0-10000 scale)
    const resp = await page.request.get("/api/admin/gates");
    expect(resp.ok()).toBe(true);
    const gates = await resp.json();
    const gate = gates.find((g: { name: string }) => g.name === key);
    expect(gate).toBeDefined();
    expect(gate.rolloutPct).toBe(5000);
    expect(gate.killswitch).toBe(0);
    expect(gate.enabled).toBe(1);
  });

  test("disable gate → disabled badge; admin API reflects enabled=0", async ({ page }) => {
    await page.goto("/dashboard/gates");
    await gateRow(page, key)
      .getByRole("button", { name: /^disable$/i })
      .click();

    await expect(page).toHaveURL(/\/dashboard\/gates$/);
    await expect(gateRow(page, key).getByText("disabled")).toBeVisible();
    await expect(gateRow(page, key).getByRole("button", { name: /^enable$/i })).toBeVisible();

    const resp = await page.request.get("/api/admin/gates");
    const gates = await resp.json();
    const gate = gates.find((g: { name: string }) => g.name === key);
    expect(gate.enabled).toBe(0);
  });

  test("re-enable gate → enabled badge; admin API reflects enabled=1", async ({ page }) => {
    await page.goto("/dashboard/gates");
    await gateRow(page, key)
      .getByRole("button", { name: /^enable$/i })
      .click();

    await expect(page).toHaveURL(/\/dashboard\/gates$/);
    await expect(gateRow(page, key).getByText("enabled")).toBeVisible();

    const resp = await page.request.get("/api/admin/gates");
    const gates = await resp.json();
    const gate = gates.find((g: { name: string }) => g.name === key);
    expect(gate.enabled).toBe(1);
  });

  test("delete gate → removed from list and from admin API", async ({ page }) => {
    await page.goto("/dashboard/gates");
    await gateRow(page, key)
      .getByRole("button", { name: /^delete$/i })
      .click();

    await expect(page).toHaveURL(/\/dashboard\/gates$/);
    await expect(page.getByText(key, { exact: true })).not.toBeVisible();

    const resp = await page.request.get("/api/admin/gates");
    const gates = await resp.json();
    const gate = gates.find((g: { name: string }) => g.name === key);
    expect(gate).toBeUndefined();
  });
});

// ── Killswitch gate ───────────────────────────────────────────────────────────

test.describe("Killswitch gate — create with killswitch=true", () => {
  test.describe.configure({ mode: "serial" });

  const key = `e2g_ks_${RUN}`;

  test("create with Killswitch profile → killswitch=1 in admin API", async ({ page }) => {
    await page.goto("/dashboard/gates/new");
    // Select the Killswitch profile card
    await page.getByText("Killswitch", { exact: true }).locator("..").click();
    await expect(page.getByText("0%")).toBeVisible();

    await page.locator("#gate-key").fill(key);
    await page.getByRole("button", { name: /^create gate$/i }).click();

    await expect(page).toHaveURL(/\/dashboard\/gates$/);

    const resp = await page.request.get("/api/admin/gates");
    const gates = await resp.json();
    const gate = gates.find((g: { name: string }) => g.name === key);
    expect(gate).toBeDefined();
    expect(gate.rolloutPct).toBe(0);
    expect(gate.killswitch).toBe(1);
  });

  test("cleanup: delete killswitch gate", async ({ page }) => {
    await page.goto("/dashboard/gates");
    await gateRow(page, key)
      .getByRole("button", { name: /^delete$/i })
      .click();
    await expect(page.getByText(key, { exact: true })).not.toBeVisible();
  });
});

// ── Beta gate ─────────────────────────────────────────────────────────────────

test.describe("Beta gate — create and verify 0% default", () => {
  test.describe.configure({ mode: "serial" });

  const key = `e2g_beta_${RUN}`;

  test("create with Beta profile → 0% rollout, killswitch=0", async ({ page }) => {
    await page.goto("/dashboard/gates/new");
    await page.getByText("Beta", { exact: true }).locator("..").click();
    await page.locator("#gate-key").fill(key);
    await page.getByRole("button", { name: /^create gate$/i }).click();

    await expect(page).toHaveURL(/\/dashboard\/gates$/);

    const resp = await page.request.get("/api/admin/gates");
    const gates = await resp.json();
    const gate = gates.find((g: { name: string }) => g.name === key);
    expect(gate).toBeDefined();
    expect(gate.rolloutPct).toBe(0);
    expect(gate.killswitch).toBe(0);
  });

  test("cleanup: delete beta gate", async ({ page }) => {
    await page.goto("/dashboard/gates");
    await gateRow(page, key)
      .getByRole("button", { name: /^delete$/i })
      .click();
    await expect(page.getByText(key, { exact: true })).not.toBeVisible();
  });
});

// ── 100% rollout gate ─────────────────────────────────────────────────────────

test.describe("Full rollout gate — 100%", () => {
  test.describe.configure({ mode: "serial" });

  const key = `e2g_full_${RUN}`;

  test("create at 100% → rolloutPct=10000 in admin API", async ({ page }) => {
    await page.goto("/dashboard/gates/new");
    // Targeted profile defaults to 100%
    await page.getByText("Targeted", { exact: true }).locator("..").click();
    await page.locator("#gate-key").fill(key);
    await page.getByRole("button", { name: /^create gate$/i }).click();

    await expect(page).toHaveURL(/\/dashboard\/gates$/);

    const resp = await page.request.get("/api/admin/gates");
    const gates = await resp.json();
    const gate = gates.find((g: { name: string }) => g.name === key);
    expect(gate).toBeDefined();
    expect(gate.rolloutPct).toBe(10000);
  });

  test("cleanup: delete full-rollout gate", async ({ page }) => {
    await page.goto("/dashboard/gates");
    await gateRow(page, key)
      .getByRole("button", { name: /^delete$/i })
      .click();
    await expect(page.getByText(key, { exact: true })).not.toBeVisible();
  });
});
