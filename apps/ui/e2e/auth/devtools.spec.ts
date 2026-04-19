import { test, expect, type Page } from "@playwright/test";

// ── Mock data ─────────────────────────────────────────────────────────────────

const GATES = [
  {
    id: "g1",
    name: "dark-mode",
    enabled: true,
    killswitch: false,
    rolloutPct: 100,
    updatedAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "g2",
    name: "beta-checkout",
    enabled: false,
    killswitch: false,
    rolloutPct: 0,
    updatedAt: "2024-01-01T00:00:00Z",
  },
];

const CONFIGS = [
  { id: "c1", name: "items-per-page", valueJson: 25, updatedAt: "2024-01-01T00:00:00Z" },
  { id: "c2", name: "theme-color", valueJson: "#7c3aed", updatedAt: "2024-01-01T00:00:00Z" },
];

const EXPERIMENTS = [
  {
    id: "e1",
    name: "checkout-flow",
    status: "running" as const,
    groups: [
      { name: "variant-a", weight: 50 },
      { name: "variant-b", weight: 50 },
    ],
    updatedAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "e2",
    name: "homepage-hero",
    status: "draft" as const,
    groups: [{ name: "variant-a", weight: 100 }],
    updatedAt: "2024-01-01T00:00:00Z",
  },
];

const PROFILES = [
  { id: "p1", name: "en", createdAt: "2024-01-01T00:00:00Z" },
  { id: "p2", name: "fr", createdAt: "2024-01-01T00:00:00Z" },
];

const DRAFTS = [
  {
    id: "d1",
    name: "Spring release",
    profileId: "p1",
    status: "draft",
    createdAt: "2024-01-01T00:00:00Z",
  },
];

const UNIVERSES = [
  {
    id: "u1",
    name: "web-users",
    unitType: "user_id",
    holdoutRange: null,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "u2",
    name: "beta-cohort",
    unitType: "device_id",
    holdoutRange: [0, 10] as [number, number],
    createdAt: "2024-01-01T00:00:00Z",
  },
];

const KEYS = [
  {
    id: "k1",
    key: "common.save",
    value: "Save",
    profileId: "p1",
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "k2",
    key: "common.cancel",
    value: "Cancel",
    profileId: "p1",
    createdAt: "2024-01-01T00:00:00Z",
  },
  { id: "k3", key: "nav.home", value: "Home", profileId: "p1", createdAt: "2024-01-01T00:00:00Z" },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

const MOCK_SESSION = { token: "mock-devtools-token", projectId: "e2e-project-id" };

/**
 * Pre-populate the devtools auth session and mock all admin API responses.
 * Must be called before page.goto().
 */
async function setup(page: Page): Promise<void> {
  // addInitScript runs before any page scripts — sessionStorage is ready when
  // se-devtools.js calls loadSession().
  await page.addInitScript((s: typeof MOCK_SESSION) => {
    sessionStorage.setItem("se_dt_session", JSON.stringify(s));
  }, MOCK_SESSION);

  // Intercept admin API calls made by the devtools panels.
  // Use glob patterns to match any origin — devtools calls https://app.shipeasy.dev by default.
  await page.route("**/api/admin/gates", (r) => r.fulfill({ json: GATES }));
  await page.route("**/api/admin/configs", (r) => r.fulfill({ json: CONFIGS }));
  await page.route("**/api/admin/experiments", (r) => r.fulfill({ json: EXPERIMENTS }));
  await page.route("**/api/admin/universes", (r) => r.fulfill({ json: UNIVERSES }));
  await page.route("**/api/admin/i18n/profiles", (r) => r.fulfill({ json: PROFILES }));
  await page.route("**/api/admin/i18n/drafts", (r) => r.fulfill({ json: DRAFTS }));
  await page.route("**/api/admin/i18n/keys**", (r) => r.fulfill({ json: KEYS }));
}

/** Wait for the devtools shadow host to appear in the DOM. */
async function waitForOverlay(page: Page): Promise<void> {
  await expect(page.locator("#shipeasy-devtools")).toBeAttached({ timeout: 8000 });
}

/** Click a toolbar button and wait for the panel slide animation. */
async function openPanel(page: Page, panelTitle: string): Promise<void> {
  await page.getByTitle(panelTitle).click();
  await page.waitForTimeout(300); // CSS transition
}

// ── Activation ────────────────────────────────────────────────────────────────

test.describe("DevTools — activation", () => {
  test("toolbar mounts via ?se-devtools URL param", async ({ page }) => {
    await setup(page);
    await page.goto("/dashboard?se-devtools");
    await waitForOverlay(page);

    // All four toolbar icons are present
    for (const label of ["Gates", "Configs", "Experiments", "i18n"]) {
      await expect(page.getByTitle(label)).toBeVisible();
    }
  });

  test("toolbar mounts on Shift+Alt+S hotkey", async ({ page }) => {
    await setup(page);
    await page.goto("/dashboard");
    // Script loaded, but overlay not yet mounted
    await expect(page.locator("#shipeasy-devtools")).not.toBeAttached({ timeout: 2000 });

    // Wait for se-devtools.js to finish executing before pressing hotkey
    await page.waitForFunction(
      () => (window as unknown as { __se_devtools_ready?: boolean }).__se_devtools_ready === true,
      { timeout: 8000 },
    );
    await page.keyboard.press("Shift+Alt+S");
    await waitForOverlay(page);
    await expect(page.getByTitle("Gates")).toBeVisible();
  });

  test("second Shift+Alt+S press removes the overlay", async ({ page }) => {
    await setup(page);
    await page.goto("/dashboard?se-devtools");
    await waitForOverlay(page);

    await page.keyboard.press("Shift+Alt+S");
    await expect(page.locator("#shipeasy-devtools")).not.toBeAttached({ timeout: 4000 });
  });
});

// ── Auth prompt ───────────────────────────────────────────────────────────────

test.describe("DevTools — auth prompt", () => {
  test("shows connect prompt when no session is stored", async ({ page }) => {
    // No addInitScript — session is absent
    await page.route("**/api/admin/gates", (r) => r.fulfill({ json: GATES }));
    await page.goto("/dashboard?se-devtools");
    await waitForOverlay(page);

    await openPanel(page, "Gates");
    await expect(page.getByText("Connect to ShipEasy")).toBeVisible();
    await expect(page.getByText(/sign in to inspect and override/i)).toBeVisible();
    await expect(page.locator("button#se-connect")).toBeVisible();
    // Signed-out auth prompt uses centred auth-mode body and has no footer
    await expect(page.locator(".panel-body.auth-mode")).toBeVisible();
    await expect(page.getByText("Sign out")).toBeHidden();
    await expect(page.getByText("Clear overrides")).toBeHidden();
  });
});

// ── Gates panel ───────────────────────────────────────────────────────────────

test.describe("DevTools — Gates panel", () => {
  test("lists gates with live status badges", async ({ page }) => {
    await setup(page);
    await page.goto("/dashboard?se-devtools");
    await waitForOverlay(page);
    await openPanel(page, "Gates");

    await expect(page.getByText("dark-mode")).toBeVisible();
    await expect(page.getByText("beta-checkout")).toBeVisible();

    // dark-mode is enabled → ON badge; beta-checkout is disabled → OFF badge
    await expect(page.locator(".badge-on").first()).toBeVisible();
    await expect(page.locator(".badge-off").first()).toBeVisible();
  });

  test("Force ON toggle writes override to sessionStorage", async ({ page }) => {
    await setup(page);
    await page.goto("/dashboard?se-devtools");
    await waitForOverlay(page);
    await openPanel(page, "Gates");

    await page.locator('.tog[data-gate="beta-checkout"] [data-v="on"]').click();

    expect(await page.evaluate(() => sessionStorage.getItem("se_gate_beta-checkout"))).toBe("true");
  });

  test("Force OFF toggle writes override to sessionStorage", async ({ page }) => {
    await setup(page);
    await page.goto("/dashboard?se-devtools");
    await waitForOverlay(page);
    await openPanel(page, "Gates");

    await page.locator('.tog[data-gate="dark-mode"] [data-v="off"]').click();

    expect(await page.evaluate(() => sessionStorage.getItem("se_gate_dark-mode"))).toBe("false");
  });

  test("default toggle clears the gate override", async ({ page }) => {
    await setup(page);
    // Pre-set an override via URL param
    await page.goto("/dashboard?se-devtools&se-gate-dark-mode=false");
    await waitForOverlay(page);
    await openPanel(page, "Gates");

    await page.locator('.tog[data-gate="dark-mode"] [data-v="default"]').click();

    expect(await page.evaluate(() => sessionStorage.getItem("se_gate_dark-mode"))).toBeNull();
  });
});

// ── Configs panel ─────────────────────────────────────────────────────────────

test.describe("DevTools — Configs panel", () => {
  test("lists configs with current values", async ({ page }) => {
    await setup(page);
    await page.goto("/dashboard?se-devtools");
    await waitForOverlay(page);
    await openPanel(page, "Configs");

    await expect(page.getByText("items-per-page")).toBeVisible();
    await expect(page.getByText("theme-color")).toBeVisible();
    // Current values visible as monospace display
    await expect(page.getByText("25")).toBeVisible();
  });

  test("inline editor saves session override to sessionStorage", async ({ page }) => {
    await setup(page);
    await page.goto("/dashboard?se-devtools");
    await waitForOverlay(page);
    await openPanel(page, "Configs");

    await page.locator('.edit-btn[data-name="items-per-page"]').click();

    const editor = page.locator('textarea[data-name="items-per-page"]');
    await expect(editor).toBeVisible();
    await editor.fill("100");

    await page.locator('.save-session[data-name="items-per-page"]').click();

    expect(await page.evaluate(() => sessionStorage.getItem("se_config_items-per-page"))).toBe(
      "100",
    );
  });

  test("inline editor saves local override to localStorage", async ({ page }) => {
    await setup(page);
    await page.goto("/dashboard?se-devtools");
    await waitForOverlay(page);
    await openPanel(page, "Configs");

    await page.locator('.edit-btn[data-name="theme-color"]').click();

    const editor = page.locator('textarea[data-name="theme-color"]');
    await editor.fill('"#ff0000"');

    await page.locator('.save-local[data-name="theme-color"]').click();

    expect(await page.evaluate(() => localStorage.getItem("se_l_config_theme-color"))).toBe(
      '"#ff0000"',
    );
  });

  test("cancel edit hides the editor without saving", async ({ page }) => {
    await setup(page);
    await page.goto("/dashboard?se-devtools");
    await waitForOverlay(page);
    await openPanel(page, "Configs");

    await page.locator('.edit-btn[data-name="items-per-page"]').click();
    await expect(page.locator('textarea[data-name="items-per-page"]')).toBeVisible();

    await page.locator('.cancel-edit[data-name="items-per-page"]').click();
    await expect(page.locator('textarea[data-name="items-per-page"]')).not.toBeVisible();

    expect(
      await page.evaluate(() => sessionStorage.getItem("se_config_items-per-page")),
    ).toBeNull();
  });
});

// ── Experiments panel ─────────────────────────────────────────────────────────

test.describe("DevTools — Experiments panel", () => {
  test("lists running and draft experiments in separate sections", async ({ page }) => {
    await setup(page);
    await page.goto("/dashboard?se-devtools");
    await waitForOverlay(page);
    await openPanel(page, "Experiments");
    // Experiments tab is active by default
    await expect(page.locator(".sec-head", { hasText: "Running" })).toBeVisible();
    await expect(page.locator(".sec-head", { hasText: "Other" })).toBeVisible();
    await expect(page.getByText("checkout-flow")).toBeVisible();
    await expect(page.getByText("homepage-hero")).toBeVisible();
  });

  test("running experiment shows live variant badge and force-variant select", async ({ page }) => {
    await setup(page);
    await page.goto("/dashboard?se-devtools");
    await waitForOverlay(page);
    await openPanel(page, "Experiments");

    const sel = page.locator('select.exp-sel[data-name="checkout-flow"]');
    await expect(sel).toBeVisible();
    await expect(sel).toHaveValue("");
  });

  test("selecting a variant writes override to sessionStorage", async ({ page }) => {
    await setup(page);
    await page.goto("/dashboard?se-devtools");
    await waitForOverlay(page);
    await openPanel(page, "Experiments");

    await page.locator('select.exp-sel[data-name="checkout-flow"]').selectOption("variant-a");

    expect(await page.evaluate(() => sessionStorage.getItem("se_exp_checkout-flow"))).toBe(
      "variant-a",
    );
  });

  test("selecting default option clears the override", async ({ page }) => {
    await setup(page);
    await page.goto("/dashboard?se-devtools&se-exp-checkout-flow=variant-b");
    await waitForOverlay(page);
    await openPanel(page, "Experiments");

    await page.locator('select.exp-sel[data-name="checkout-flow"]').selectOption("");

    expect(await page.evaluate(() => sessionStorage.getItem("se_exp_checkout-flow"))).toBeNull();
  });

  test("Universes tab lists universes", async ({ page }) => {
    await setup(page);
    await page.goto("/dashboard?se-devtools");
    await waitForOverlay(page);
    await openPanel(page, "Experiments");

    await page.locator('.tab[data-tab="universes"]').click();
    await expect(page.getByText("web-users")).toBeVisible();
    await expect(page.getByText("beta-cohort")).toBeVisible();
  });
});

// ── i18n panel ────────────────────────────────────────────────────────────────

test.describe("DevTools — i18n panel", () => {
  test("Labels tab shows in-place editing toggle, profile switcher, and drafts", async ({
    page,
  }) => {
    await setup(page);
    await page.goto("/dashboard?se-devtools");
    await waitForOverlay(page);
    await openPanel(page, "i18n");
    // Labels tab is active by default

    await expect(page.getByText("Edit labels in page")).toBeVisible();

    const sel = page.locator("select#se-profile-sel");
    await expect(sel).toBeVisible();
    await expect(sel.locator('option[value="p1"]')).toHaveCount(1);
    await expect(sel.locator('option[value="p2"]')).toHaveCount(1);

    await expect(page.getByText("Spring release")).toBeVisible();
  });

  test("profile override writes to sessionStorage", async ({ page }) => {
    await setup(page);
    await page.goto("/dashboard?se-devtools");
    await waitForOverlay(page);
    await openPanel(page, "i18n");

    await page.locator("select#se-profile-sel").selectOption("p2");

    expect(await page.evaluate(() => sessionStorage.getItem("se_i18n_profile"))).toBe("p2");
  });

  test("in-place editing toggle adds highlight style to [data-label] elements", async ({
    page,
  }) => {
    await setup(page);
    await page.goto("/dashboard?se-devtools");
    await waitForOverlay(page);
    await openPanel(page, "i18n");

    await page.locator("#se-inplace-sw").click();

    const styleExists = await page.evaluate(
      () => document.getElementById("__se_inplace_style") !== null,
    );
    expect(styleExists).toBe(true);

    await page.locator("#se-inplace-sw").click();
    const styleGone = await page.evaluate(
      () => document.getElementById("__se_inplace_style") === null,
    );
    expect(styleGone).toBe(true);
  });

  test("Chunks tab lists translation keys grouped by namespace", async ({ page }) => {
    await setup(page);
    await page.goto("/dashboard?se-devtools");
    await waitForOverlay(page);
    await openPanel(page, "i18n");

    await page.locator('.tab[data-tab="chunks"]').click();

    // Namespace section headers
    await expect(page.locator(".sec-head", { hasText: "common" })).toBeVisible();
    await expect(page.locator(".sec-head", { hasText: "nav" })).toBeVisible();
    // Individual keys
    await expect(page.getByText("common.save")).toBeVisible();
    await expect(page.getByText("common.cancel")).toBeVisible();
    await expect(page.getByText("nav.home")).toBeVisible();
  });
});

// ── URL param overrides ───────────────────────────────────────────────────────

test.describe("DevTools — URL param overrides", () => {
  test("?se-gate-X captures gate override into sessionStorage", async ({ page }) => {
    await setup(page);
    await page.goto("/dashboard?se-devtools&se-gate-dark-mode=false");
    await waitForOverlay(page);

    expect(await page.evaluate(() => sessionStorage.getItem("se_gate_dark-mode"))).toBe("false");
  });

  test("?se-config-X captures config override into sessionStorage", async ({ page }) => {
    await setup(page);
    await page.goto("/dashboard?se-devtools&se-config-items-per-page=99");
    await waitForOverlay(page);

    expect(await page.evaluate(() => sessionStorage.getItem("se_config_items-per-page"))).toBe(
      "99",
    );
  });

  test("?se-exp-X captures experiment override into sessionStorage", async ({ page }) => {
    await setup(page);
    await page.goto("/dashboard?se-devtools&se-exp-checkout-flow=variant-b");
    await waitForOverlay(page);

    expect(await page.evaluate(() => sessionStorage.getItem("se_exp_checkout-flow"))).toBe(
      "variant-b",
    );
  });
});

// ── Clear all overrides ───────────────────────────────────────────────────────

test.describe("DevTools — clear all overrides", () => {
  test("Clear overrides button removes all se_* keys from storage", async ({ page }) => {
    await setup(page);
    await page.goto(
      "/dashboard?se-devtools&se-gate-dark-mode=false&se-config-items-per-page=99&se-exp-checkout-flow=variant-b",
    );
    await waitForOverlay(page);
    await openPanel(page, "Gates");

    // All three overrides should be present
    const before = await page.evaluate(() => ({
      gate: sessionStorage.getItem("se_gate_dark-mode"),
      config: sessionStorage.getItem("se_config_items-per-page"),
      exp: sessionStorage.getItem("se_exp_checkout-flow"),
    }));
    expect(before.gate).toBe("false");
    expect(before.config).toBe("99");
    expect(before.exp).toBe("variant-b");

    await page.getByText("Clear overrides").click();

    const after = await page.evaluate(() => ({
      gate: sessionStorage.getItem("se_gate_dark-mode"),
      config: sessionStorage.getItem("se_config_items-per-page"),
      exp: sessionStorage.getItem("se_exp_checkout-flow"),
    }));
    expect(after.gate).toBeNull();
    expect(after.config).toBeNull();
    expect(after.exp).toBeNull();
  });
});

// ── Screenshot ────────────────────────────────────────────────────────────────

test("screenshot: gates panel open with one override active", async ({ page }) => {
  await setup(page);
  await page.goto("/dashboard?se-devtools");
  await waitForOverlay(page);
  await openPanel(page, "Gates");

  // Wait for async panel render to complete
  await expect(page.getByText("dark-mode")).toBeVisible();
  await expect(page.getByText("beta-checkout")).toBeVisible();

  // Force beta-checkout ON so the screenshot shows an active override
  await page.locator('.tog[data-gate="beta-checkout"] [data-v="on"]').click();
  // Selection is synchronous — badge re-renders immediately

  await expect(page).toHaveScreenshot("devtools-gates-panel.png");
});
