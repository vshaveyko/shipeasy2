import { expect, test, type Page } from "@playwright/test";
import { adminList } from "../admin-list";

const RUN = Date.now();

// ── Helpers ───────────────────────────────────────────────────────────────────

function gateRow(page: Page, name: string) {
  // Match the gate name link/text and walk up to the row container that holds
  // the badge, the Disable button, and the actions dropdown trigger.
  return page.getByText(name, { exact: true }).locator("..").locator("..").locator("..");
}

/** Open the per-row "Actions" dropdown and click the Delete item, then
 *  confirm in the destructive-confirm dialog. */
async function deleteGateViaActions(page: Page, name: string) {
  await page.getByRole("button", { name: new RegExp(`Actions for ${name}`, "i") }).click();
  await page.getByRole("menuitem", { name: /^delete( gate)?$/i }).click();
  // Confirm dialog (per fix "require confirm dialog before deleting a gate")
  // Wait for the dialog explicitly so the row-still-visible assertion runs
  // after the row is actually gone, not just after we issued the action.
  const dialog = page.getByRole("dialog");
  await dialog.waitFor({ state: "visible" });
  await dialog.getByRole("button", { name: /^delete( gate)?$/i }).click();
  await dialog.waitFor({ state: "hidden" });
}

// ── Quick-profile UI ──────────────────────────────────────────────────────────

// TODO: New gate form is now a thin "name your gatekeeper" step — quick-setup
// profiles + slider moved into the gatekeeper editor at /gates/[id]. Re-enable
// these once we have stable selectors for the in-editor stack/rollout cards.
test.describe.skip("New gate form UI", () => {
  test("renders all three quick-setup profiles", async ({ page }) => {
    await page.goto("/dashboard/e2e-project-id/gates/new");
    for (const label of ["Rollout", "Targeted", "Beta"]) {
      await expect(page.getByText(label, { exact: true })).toBeVisible();
    }
  });

  test("Rollout profile is selected by default and shows 10%", async ({ page }) => {
    await page.goto("/dashboard/e2e-project-id/gates/new");
    // The percentage display shows 10 for the default Rollout profile
    await expect(page.getByText("10%")).toBeVisible();
  });

  test("selecting Targeted profile sets percentage to 100%", async ({ page }) => {
    await page.goto("/dashboard/e2e-project-id/gates/new");
    await page.getByText("Targeted", { exact: true }).locator("..").click();
    await expect(page.getByText("100%")).toBeVisible();
  });

  test("moving the slider updates the displayed percentage", async ({ page }) => {
    await page.goto("/dashboard/e2e-project-id/gates/new");
    const slider = page.locator("input[type=range]");
    await slider.evaluate((el: HTMLInputElement) => {
      Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")!.set!.call(
        el,
        "75",
      );
      el.dispatchEvent(new Event("input", { bubbles: true }));
    });
    await expect(page.getByText("75%")).toBeVisible();
  });

  test("cancel link returns to the gates list", async ({ page }) => {
    await page.goto("/dashboard/e2e-project-id/gates/new");
    await page
      .getByRole("link", { name: /^cancel$/i })
      .first()
      .click();
    await expect(page).toHaveURL(/\/dashboard\/e2e-project-id\/gates$/);
  });

  test("Create gate button is present and enabled", async ({ page }) => {
    await page.goto("/dashboard/e2e-project-id/gates/new");
    await expect(page.getByRole("button", { name: /^create gate$/i })).toBeEnabled();
  });
});

// ── Rollout gate CRUD ─────────────────────────────────────────────────────────

// TODO: Rollout slider on /gates/new no longer exists; full CRUD must drive
// the gatekeeper editor at /gates/[id]. Re-enable once selectors are updated.
test.describe.skip("Rollout gate — full CRUD", () => {
  test.describe.configure({ mode: "serial" });

  const key = `e2g_rollout_${RUN}`;

  test("create at 50% rollout → appears in list as enabled, propagates to admin API", async ({
    page,
  }) => {
    await page.goto("/dashboard/e2e-project-id/gates/new");

    // Set slider to 50
    const slider = page.locator("input[type=range]");
    await slider.evaluate((el: HTMLInputElement) => {
      Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")!.set!.call(
        el,
        "50",
      );
      el.dispatchEvent(new Event("input", { bubbles: true }));
    });
    await page.locator("#gate-key").fill(key);
    await page.getByRole("button", { name: /^create gate$/i }).click();

    await expect(page).toHaveURL(/\/dashboard\/e2e-project-id\/gates$/);
    await expect(gateRow(page, key).getByText(/^enabled$/i)).toBeVisible();

    // Admin API: gate is present with correct rolloutPct (50% → 5000 in 0-10000 scale)
    const gates = await adminList<{ name: string; rolloutPct: number; enabled: number }>(
      page.request,
      "/api/admin/gates",
    );
    const gate = gates.find((g) => g.name === key);
    expect(gate).toBeDefined();
    expect(gate!.rolloutPct).toBe(5000);
    expect(gate!.enabled).toBe(1);
  });

  test("disable gate → disabled badge; admin API reflects enabled=0", async ({ page }) => {
    await page.goto("/dashboard/e2e-project-id/gates");
    await gateRow(page, key)
      .getByRole("button", { name: /^disable( gate)?$/i })
      .click();

    await expect(page).toHaveURL(/\/dashboard\/e2e-project-id\/gates$/);
    await expect(gateRow(page, key).getByText(/^disabled$/i)).toBeVisible();
    await expect(
      gateRow(page, key).getByRole("button", { name: /^enable( gate)?$/i }),
    ).toBeVisible();

    const gates = await adminList<{ name: string; enabled: number }>(
      page.request,
      "/api/admin/gates",
    );
    const gate = gates.find((g) => g.name === key);
    expect(gate!.enabled).toBe(0);
  });

  test("re-enable gate → enabled badge; admin API reflects enabled=1", async ({ page }) => {
    await page.goto("/dashboard/e2e-project-id/gates");
    await gateRow(page, key)
      .getByRole("button", { name: /^enable( gate)?$/i })
      .click();

    await expect(page).toHaveURL(/\/dashboard\/e2e-project-id\/gates$/);
    await expect(gateRow(page, key).getByText(/^enabled$/i)).toBeVisible();

    const gates = await adminList<{ name: string; enabled: number }>(
      page.request,
      "/api/admin/gates",
    );
    const gate = gates.find((g) => g.name === key);
    expect(gate!.enabled).toBe(1);
  });

  test("delete gate → removed from list and from admin API", async ({ page }) => {
    await page.goto("/dashboard/e2e-project-id/gates");
    await deleteGateViaActions(page, key);

    await expect(page).toHaveURL(/\/dashboard\/e2e-project-id\/gates$/);
    await expect(page.getByText(key, { exact: true })).not.toBeVisible();

    const gates = await adminList<{ name: string }>(page.request, "/api/admin/gates");
    expect(gates.find((g) => g.name === key)).toBeUndefined();
  });
});

// ── Beta gate ─────────────────────────────────────────────────────────────────

// TODO: Beta profile no longer exists on /gates/new (single-step identity form).
test.describe.skip("Beta gate — create and verify 0% default", () => {
  test.describe.configure({ mode: "serial" });

  const key = `e2g_beta_${RUN}`;

  test("create with Beta profile → 0% rollout", async ({ page }) => {
    await page.goto("/dashboard/e2e-project-id/gates/new");
    await page.getByText("Beta", { exact: true }).locator("..").click();
    await page.locator("#gate-key").fill(key);
    await page.getByRole("button", { name: /^create gate$/i }).click();

    await expect(page).toHaveURL(/\/dashboard\/e2e-project-id\/gates$/);

    const gates = await adminList<{ name: string; rolloutPct: number }>(
      page.request,
      "/api/admin/gates",
    );
    const gate = gates.find((g) => g.name === key);
    expect(gate).toBeDefined();
    expect(gate!.rolloutPct).toBe(0);
  });

  test("cleanup: delete beta gate", async ({ page }) => {
    await page.goto("/dashboard/e2e-project-id/gates");
    await deleteGateViaActions(page, key);
    await expect(page.getByText(key, { exact: true })).not.toBeVisible();
  });
});

// ── 100% rollout gate ─────────────────────────────────────────────────────────

// TODO: Targeted profile no longer exists on /gates/new (single-step identity form).
test.describe.skip("Full rollout gate — 100%", () => {
  test.describe.configure({ mode: "serial" });

  const key = `e2g_full_${RUN}`;

  test("create at 100% → rolloutPct=10000 in admin API", async ({ page }) => {
    await page.goto("/dashboard/e2e-project-id/gates/new");
    // Targeted profile defaults to 100%
    await page.getByText("Targeted", { exact: true }).locator("..").click();
    await page.locator("#gate-key").fill(key);
    await page.getByRole("button", { name: /^create gate$/i }).click();

    await expect(page).toHaveURL(/\/dashboard\/e2e-project-id\/gates$/);

    const gates = await adminList<{ name: string; rolloutPct: number }>(
      page.request,
      "/api/admin/gates",
    );
    const gate = gates.find((g) => g.name === key);
    expect(gate).toBeDefined();
    expect(gate!.rolloutPct).toBe(10000);
  });

  test("cleanup: delete full-rollout gate", async ({ page }) => {
    await page.goto("/dashboard/e2e-project-id/gates");
    await deleteGateViaActions(page, key);
    await expect(page.getByText(key, { exact: true })).not.toBeVisible();
  });
});
