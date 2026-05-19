import { expect, test, type APIRequestContext, type Page } from "@playwright/test";
import { adminList } from "../admin-list";
import { setProjectPlan } from "../seed-fixtures";

const RUN = Date.now();

async function deleteGateIfExists(request: APIRequestContext, name: string) {
  try {
    const gates = await adminList<{ id: string; name: string }>(request, "/api/admin/gates");
    const g = gates.find((x) => x.name === name);
    if (g) await request.delete(`/api/admin/gates/${g.id}`).catch(() => {});
  } catch {
    /* best-effort */
  }
}

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

// ── Admin API gate variants (replaces legacy /gates/new skipped specs) ───────

test.describe("Gate variants — admin API CRUD", () => {
  test.describe.configure({ mode: "serial" });

  test.beforeAll(() => setProjectPlan("paid"));
  test.afterAll(async ({ request }) => {
    setProjectPlan("free");
    // Best-effort cleanup in case any test failed before its inline delete.
    for (const suffix of ["50", "100", "beta", "patch", "bad"]) {
      await deleteGateIfExists(request, `e2g_api_${suffix}_${RUN}`);
    }
  });

  test("create at 50% rollout — rolloutPct=5000, enabled=1", async ({ request }) => {
    const name = `e2g_api_50_${RUN}`;
    const create = await request.post("/api/admin/gates", {
      data: { name, enabled: true, rollout_pct: 5000 },
    });
    expect(create.ok(), await create.text()).toBe(true);
    const gates = await adminList<{
      id: string;
      name: string;
      rolloutPct: number;
      enabled: number;
    }>(request, "/api/admin/gates");
    const g = gates.find((x) => x.name === name)!;
    expect(g.rolloutPct).toBe(5000);
    expect(g.enabled).toBe(1);
    await request.delete(`/api/admin/gates/${g.id}`);
  });

  test("create at 100% — rolloutPct=10000", async ({ request }) => {
    const name = `e2g_api_100_${RUN}`;
    const create = await request.post("/api/admin/gates", {
      data: { name, enabled: true, rollout_pct: 10000 },
    });
    expect(create.ok()).toBe(true);
    const gates = await adminList<{ id: string; name: string; rolloutPct: number }>(
      request,
      "/api/admin/gates",
    );
    const g = gates.find((x) => x.name === name)!;
    expect(g.rolloutPct).toBe(10000);
    await request.delete(`/api/admin/gates/${g.id}`);
  });

  test("create at 0% (Beta-style) then PATCH to disabled", async ({ request }) => {
    const name = `e2g_api_beta_${RUN}`;
    // createGate hardcodes enabled=1; disabled state must be reached via PATCH.
    const create = await request.post("/api/admin/gates", {
      data: { name, rollout_pct: 0 },
    });
    expect(create.ok()).toBe(true);
    const created = (await create.json()) as { id: string };
    const patch = await request.patch(`/api/admin/gates/${created.id}`, {
      data: { enabled: false },
    });
    expect(patch.ok(), await patch.text()).toBe(true);
    const gates = await adminList<{
      id: string;
      name: string;
      rolloutPct: number;
      enabled: number;
    }>(request, "/api/admin/gates");
    const g = gates.find((x) => x.name === name)!;
    expect(g.rolloutPct).toBe(0);
    expect(g.enabled).toBe(0);
    await request.delete(`/api/admin/gates/${created.id}`);
  });

  test("PATCH rollout 10% → 75% via admin API", async ({ request }) => {
    const name = `e2g_api_patch_${RUN}`;
    const create = await request.post("/api/admin/gates", {
      data: { name, enabled: true, rollout_pct: 1000 },
    });
    expect(create.ok()).toBe(true);
    const created = (await create.json()) as { id: string };
    const patch = await request.patch(`/api/admin/gates/${created.id}`, {
      data: { rollout_pct: 7500 },
    });
    expect(patch.ok(), await patch.text()).toBe(true);
    const gates = await adminList<{ id: string; name: string; rolloutPct: number }>(
      request,
      "/api/admin/gates",
    );
    expect(gates.find((g) => g.name === name)!.rolloutPct).toBe(7500);
    await request.delete(`/api/admin/gates/${created.id}`);
  });

  test("PATCH rollout out-of-range (>10000) rejected", async ({ request }) => {
    const name = `e2g_api_bad_${RUN}`;
    const create = await request.post("/api/admin/gates", {
      data: { name, enabled: false, rollout_pct: 0 },
    });
    const created = (await create.json()) as { id: string };
    const patch = await request.patch(`/api/admin/gates/${created.id}`, {
      data: { rollout_pct: 99999 },
    });
    expect(patch.status()).toBeGreaterThanOrEqual(400);
    expect(patch.status()).toBeLessThan(500);
    await request.delete(`/api/admin/gates/${created.id}`);
  });
});

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

// ── UnifiedList shell: fold + detail + ESC ────────────────────────────────────
//
// Phase 3a: the gates list page now renders through `<UnifiedList>` — closed
// table folds to a 280px rail and a detail pane slides in. Selection lifts
// to the URL via `?open=<id>`. These tests seed a gate through the admin
// API, drive the fold/detail/ESC + filter interactions, and clean up.

test.describe("Gates list — UnifiedList chrome", () => {
  test.describe.configure({ mode: "serial" });

  const key = `e2g_fold_${RUN}`;
  let gateId: string | null = null;

  test.beforeAll(async ({ request }) => {
    const res = await request.post("/api/admin/gates", {
      // Schema expects `rollout_pct` (snake_case) and parses booleans for
      // `enabled`. Unknown keys would be stripped, so use the canonical shape.
      data: { name: key, rollout_pct: 5000, rules: [], enabled: true },
    });
    expect(res.ok(), `seed gate failed: ${await res.text().catch(() => "")}`).toBeTruthy();
    const body = (await res.json()) as { id?: string };
    gateId = body.id ?? null;
  });

  test.afterAll(async ({ request }) => {
    if (!gateId) {
      const gates = await adminList<{ id: string; name: string }>(request, "/api/admin/gates");
      gateId = gates.find((g) => g.name === key)?.id ?? null;
    }
    if (gateId) {
      await request.delete(`/api/admin/gates/${gateId}`).catch(() => {});
    }
  });

  test("row click folds list, embeds editor, ESC closes", async ({ page }) => {
    await page.goto("/dashboard/e2e-project-id/gates");

    // The closed-table layer contains the gate name inside a TR. Scope the
    // click to the closed-table pane so we don't accidentally click rail or
    // detail copy after a previous test left them open.
    const closedTable = page.locator('[data-slot="pane-full"]');
    await closedTable.getByText(key, { exact: true }).click();

    // Selection deep-links into the URL.
    await expect(page).toHaveURL(/\?open=[^&]+/);

    // Detail header shows the gate name in the UnifiedList back-bar.
    const detailPane = page.locator('[data-slot="detail-pane"]');
    await expect(detailPane.getByText(key, { exact: true }).first()).toBeVisible();

    // The full gatekeeper editor renders embedded — its stepper exposes the
    // "Stack the gates" step label that doesn't appear anywhere else on the
    // page.
    await expect(detailPane.getByText(/stack the gates/i)).toBeVisible();

    // "Open standalone" link points at the deep-link editor route so users
    // can pop the editor out into its own tab/page.
    const openStandalone = detailPane.locator('[data-testid="gate-detail-standalone-link"]');
    await expect(openStandalone).toBeVisible();
    await expect(openStandalone).toHaveAttribute("href", new RegExp(`/gates/${gateId}$`));

    // ESC closes — UnifiedList listens at window level and our onSelect(null)
    // strips the `?open` param via router.replace.
    await page.keyboard.press("Escape");
    await expect(page).toHaveURL(/\/gates$/);
    await expect(detailPane.getByText(/stack the gates/i)).toBeHidden();
  });

  test("filter input narrows the closed table", async ({ page }) => {
    await page.goto("/dashboard/e2e-project-id/gates");
    const closedTable = page.locator('[data-slot="pane-full"]');

    await page.getByPlaceholder("Filter gates").fill("__no_such_gate__");
    await expect(closedTable.getByText(key, { exact: true })).toHaveCount(0);

    await page.getByPlaceholder("Filter gates").fill("");
    await expect(closedTable.getByText(key, { exact: true })).toBeVisible();
  });
});

// ── BigModalWizard: gate creation ─────────────────────────────────────────────
//
// Phase 3a remaining: /gates/new no longer renders its own page chrome — it
// redirects into /gates?new=1, which opens a BigModalWizard. The "New gate"
// button on the gates header also opens the wizard. Submitting lands on
// /gates/<id> (the full editor) via the same createGateAction Server Action.

test.describe("Gates — BigModalWizard create flow", () => {
  test.describe.configure({ mode: "serial" });

  const key = `e2g_wizard_${RUN}`;
  const seedKey = `e2g_wizard_seed_${RUN}`;
  let seedId: string | null = null;

  // Seed at least one gate so the list page renders the toolbar (with the
  // "New gate" button) instead of the empty-state hero. The wizard surface
  // is the same in both branches, but the trigger we exercise lives in the
  // populated list header.
  test.beforeAll(async ({ request }) => {
    const res = await request.post("/api/admin/gates", {
      data: { name: seedKey, rollout_pct: 0, rules: [], enabled: false },
    });
    expect(res.ok(), `seed gate failed: ${await res.text().catch(() => "")}`).toBeTruthy();
    const body = (await res.json()) as { id?: string };
    seedId = body.id ?? null;
  });

  test.afterAll(async ({ request }) => {
    const gates = await adminList<{ id: string; name: string }>(request, "/api/admin/gates");
    const id = gates.find((g) => g.name === key)?.id;
    if (id) await request.delete(`/api/admin/gates/${id}`).catch(() => {});
    if (seedId) await request.delete(`/api/admin/gates/${seedId}`).catch(() => {});
  });

  test("legacy /gates/new redirects into the wizard", async ({ page }) => {
    await page.goto("/dashboard/e2e-project-id/gates/new");
    await expect(page).toHaveURL(/\/gates\?new=1$/);
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    // BigModalWizard eyebrow reads "Step 1 of N · New Gate" — match the
    // "New Gate" substring instead of an exact text-node assertion.
    await expect(dialog.getByText(/New Gate/)).toBeVisible();
  });

  test('"New gate" button opens the wizard, full flow lands on the editor', async ({ page }) => {
    await page.goto("/dashboard/e2e-project-id/gates");
    await page.getByRole("button", { name: /^new gate$/i }).click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(page).toHaveURL(/\?new=1/);

    // Step 1 — Details. Next is disabled until the key matches the pattern.
    await expect(dialog.getByRole("button", { name: /^next\b/i })).toBeDisabled();
    await dialog.locator("#new-gate-key").fill(key);
    await dialog.getByRole("button", { name: /^next\b/i }).click();

    // Step 2 — Targeting (stack editor). Skip with defaults (empty stack +
    // locked public floor) — the wizard only requires a valid key.
    await expect(dialog.getByText(/Step 2 of 4/i).first()).toBeVisible();
    await dialog.getByRole("button", { name: /^next\b/i }).click();

    // Step 3 — Preview. The key is echoed verbatim in the summary tile.
    await expect(dialog.getByText(/Step 3 of 4/i).first()).toBeVisible();
    await expect(dialog.getByText(key, { exact: true })).toBeVisible();
    await dialog.getByRole("button", { name: /^next\b/i }).click();

    // Step 4 — Integrate.
    await expect(dialog.getByText(/Step 4 of 4/i).first()).toBeVisible();
    await dialog.getByRole("button", { name: /create gate/i }).click();

    // createGateAction redirects to /gates/<id> (the full editor).
    await expect(page).toHaveURL(/\/dashboard\/e2e-project-id\/gates\/[^/?#]+$/i);

    // And the gate is actually in the admin API at 0% (initial rollout from wizard).
    const gates = await adminList<{ name: string; rolloutPct: number; enabled: number }>(
      page.request,
      "/api/admin/gates",
    );
    const gate = gates.find((g) => g.name === key);
    expect(gate).toBeDefined();
    expect(gate!.rolloutPct).toBe(0);
  });

  test("Esc closes the wizard and strips ?new=1", async ({ page }) => {
    await page.goto("/dashboard/e2e-project-id/gates?new=1");
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await expect(page).toHaveURL(/\/gates$/);
  });

  test("invalid gate key keeps Next disabled — uppercase, dots, leading dash", async ({ page }) => {
    await page.goto("/dashboard/e2e-project-id/gates?new=1");
    const dialog = page.getByRole("dialog");
    const next = dialog.getByRole("button", { name: /^next\b/i });
    const keyInput = dialog.locator("#new-gate-key");

    // Empty → disabled
    await expect(next).toBeDisabled();

    // Uppercase → disabled
    await keyInput.fill("My_Gate");
    await expect(next).toBeDisabled();

    // Dot → disabled
    await keyInput.fill("my.gate");
    await expect(next).toBeDisabled();

    // Leading dash → disabled (pattern requires [a-z0-9] start)
    await keyInput.fill("-leading");
    await expect(next).toBeDisabled();

    // Whitespace → disabled
    await keyInput.fill("with space");
    await expect(next).toBeDisabled();

    // Valid → enabled
    await keyInput.fill("valid_gate-name");
    await expect(next).toBeEnabled();
  });

  test("admin API rejects gate POST with invalid name", async ({ request }) => {
    const resp = await request.post("/api/admin/gates", {
      data: { name: "Bad.Name", enabled: false, rollout_pct: 0 },
    });
    expect(resp.status()).toBeGreaterThanOrEqual(400);
    expect(resp.status()).toBeLessThan(500);
  });
});

// ── Embedded gate editor in the detail pane ───────────────────────────────────
//
// Phase 3a final: the rail-detail pane mounts <GateEditorBody> inline via the
// embedded-gate-editor loader instead of linking out. A sticky strip on top
// hosts the chrome the editor itself doesn't own (status badge, enable/disable
// toggle, snippet button, "Open standalone", delete). These tests seed gates
// through the admin API so each scenario starts from a known state, then drive
// the detail-pane interactions.

test.describe("Gates detail pane — embedded editor", () => {
  test.describe.configure({ mode: "serial" });

  const key = `e2g_embed_${RUN}`;
  let gateId: string | null = null;

  test.beforeAll(async ({ request }) => {
    const res = await request.post("/api/admin/gates", {
      data: { name: key, rollout_pct: 2500, rules: [], enabled: true },
    });
    expect(res.ok(), `seed gate failed: ${await res.text().catch(() => "")}`).toBeTruthy();
    const body = (await res.json()) as { id?: string };
    gateId = body.id ?? null;
  });

  test.afterAll(async ({ request }) => {
    if (!gateId) {
      const gates = await adminList<{ id: string; name: string }>(request, "/api/admin/gates");
      gateId = gates.find((g) => g.name === key)?.id ?? null;
    }
    if (gateId) {
      await request.delete(`/api/admin/gates/${gateId}`).catch(() => {});
    }
  });

  async function openDetail(page: Page) {
    await page.goto(`/dashboard/e2e-project-id/gates?open=${gateId}`);
    const detailPane = page.locator('[data-slot="detail-pane"]');
    // Wait for embedded editor (its stepper labels are unique to the editor).
    await expect(detailPane.getByText(/stack the gates/i)).toBeVisible();
    return detailPane;
  }

  test("editor stepper exposes all three steps", async ({ page }) => {
    const detailPane = await openDetail(page);
    for (const label of [
      /where does this gatekeeper live\?/i,
      /stack the gates/i,
      /review and integrate/i,
    ]) {
      await expect(detailPane.getByText(label).first()).toBeVisible();
    }
  });

  test("sticky toggle disables/enables the gate; admin API reflects both writes", async ({
    page,
    request,
  }) => {
    const detailPane = await openDetail(page);

    // Start state: seeded as enabled=true.
    const disableBtn = detailPane.getByRole("button", { name: /^disable gate$/i });
    await expect(disableBtn).toBeVisible();
    await disableBtn.click();

    // Sticky strip flips the StatusBadge to DISABLED and the button to "Enable gate".
    await expect(detailPane.getByText(/^disabled$/i).first()).toBeVisible();
    const enableBtn = detailPane.getByRole("button", { name: /^enable gate$/i });
    await expect(enableBtn).toBeVisible();

    // Server-side commit. enableGateAction runs inside a transition + SWR
    // re-fetch — poll the admin API until the row reflects the write.
    await expect
      .poll(async () => {
        const gs = await adminList<{ id: string; enabled: number }>(request, "/api/admin/gates");
        return gs.find((g) => g.id === gateId)?.enabled;
      })
      .toBe(0);

    // Flip back so the next test starts from a known-enabled state.
    await enableBtn.click();
    await expect(detailPane.getByText(/^enabled$/i).first()).toBeVisible();
    await expect
      .poll(async () => {
        const gs = await adminList<{ id: string; enabled: number }>(request, "/api/admin/gates");
        return gs.find((g) => g.id === gateId)?.enabled;
      })
      .toBe(1);
  });

  test('"Open standalone" link navigates to the deep-link editor route', async ({ page }) => {
    const detailPane = await openDetail(page);
    await detailPane.locator('[data-testid="gate-detail-standalone-link"]').click();
    await expect(page).toHaveURL(new RegExp(`/dashboard/e2e-project-id/gates/${gateId}$`));
    // The standalone page renders the same editor body, so the stepper labels
    // still appear (but now outside the detail pane).
    await expect(page.getByText(/stack the gates/i)).toBeVisible();
  });

  test("detail-pane delete removes the gate and closes the pane", async ({ page, request }) => {
    const detailPane = await openDetail(page);
    await detailPane.getByRole("button", { name: /delete gate from detail pane/i }).click();

    // ConfirmDelete dialog opens at the page level (Dialog is portaled).
    const confirm = page.getByRole("dialog");
    await expect(confirm).toBeVisible();
    await confirm.getByRole("button", { name: /^delete gate$/i }).click();
    await expect(confirm).toBeHidden();

    // Detail pane collapses (UnifiedList strips ?open on successful delete).
    await expect(page).toHaveURL(/\/gates$/);

    // Admin API confirms.
    const gates = await adminList<{ id: string; name: string }>(request, "/api/admin/gates");
    expect(gates.find((g) => g.name === key)).toBeUndefined();

    // Already cleaned up — null out so afterAll skips the redundant DELETE.
    gateId = null;
  });
});
