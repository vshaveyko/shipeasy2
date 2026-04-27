import { test, expect, type Page } from "@playwright/test";

// ── Mock fixtures ─────────────────────────────────────────────────────────────

const GATES = [
  {
    id: "g1",
    name: "dark-mode",
    enabled: true,
    killswitch: false,
    rolloutPct: 10000,
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
  {
    id: "g3",
    name: "kill-payments",
    enabled: true,
    killswitch: true,
    rolloutPct: 0,
    updatedAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "g4",
    name: "new-onboarding",
    enabled: true,
    killswitch: false,
    rolloutPct: 5000,
    updatedAt: "2024-01-01T00:00:00Z",
  },
];

const CONFIGS = [
  { id: "c1", name: "items-per-page", valueJson: 25, updatedAt: "2024-01-01T00:00:00Z" },
  { id: "c2", name: "theme-color", valueJson: "#7c3aed", updatedAt: "2024-01-01T00:00:00Z" },
  {
    id: "c3",
    name: "feature-flags",
    valueJson: { a: true, b: false },
    updatedAt: "2024-01-01T00:00:00Z",
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
];

const EXPERIMENTS = [
  {
    id: "e1",
    name: "checkout-flow",
    universe: "web-users",
    status: "running",
    groups: [
      { name: "control", weight: 5000 },
      { name: "variant-a", weight: 5000 },
    ],
    updatedAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "e2",
    name: "homepage-hero",
    universe: "web-users",
    status: "running",
    groups: [
      { name: "a", weight: 3300 },
      { name: "b", weight: 3300 },
      { name: "c", weight: 3400 },
    ],
    updatedAt: "2024-01-01T00:00:00Z",
  },
];

const PROFILES = [
  { id: "p1", name: "en", createdAt: "2024-01-01T00:00:00Z" },
  { id: "p2", name: "fr", createdAt: "2024-01-01T00:00:00Z" },
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
  {
    id: "k3",
    key: "nav.home",
    value: "Home",
    profileId: "p1",
    createdAt: "2024-01-01T00:00:00Z",
  },
];

const MOCK_SESSION = { token: "mock-devtools-token", projectId: "e2e-project-id" };

// ── Helpers ───────────────────────────────────────────────────────────────────

async function setup(page: Page): Promise<void> {
  // Persist a mock devtools session and a fake [data-label] target so they
  // survive the full-page navigations the overlay triggers via location.assign.
  await page.addInitScript((s: typeof MOCK_SESSION) => {
    sessionStorage.setItem("se_dt_session", JSON.stringify(s));
  }, MOCK_SESSION);
  await page.addInitScript(() => {
    const ensure = () => {
      if (document.getElementById("fake-label")) return;
      const el = document.createElement("span");
      el.id = "fake-label";
      el.setAttribute("data-label", "common.save");
      el.textContent = "Save";
      el.style.cssText = "position:fixed;top:40px;left:40px;padding:4px 8px;background:#eee";
      document.body.appendChild(el);
    };
    if (document.body) ensure();
    else document.addEventListener("DOMContentLoaded", ensure);
  });

  await page.route("**/api/admin/gates", (r) => r.fulfill({ json: GATES }));
  await page.route("**/api/admin/configs", (r) => r.fulfill({ json: CONFIGS }));
  await page.route("**/api/admin/experiments", (r) => r.fulfill({ json: EXPERIMENTS }));
  await page.route("**/api/admin/universes", (r) => r.fulfill({ json: UNIVERSES }));
  await page.route("**/api/admin/i18n/profiles", (r) => r.fulfill({ json: PROFILES }));
  await page.route("**/api/admin/i18n/drafts", (r) => r.fulfill({ json: [] }));
  await page.route("**/api/admin/i18n/keys**", (r) => r.fulfill({ json: KEYS }));
  await page.route("**/api/admin/bugs", (r) => r.fulfill({ json: [] }));
  await page.route("**/api/admin/feature-requests", (r) => r.fulfill({ json: [] }));
}

async function waitForOverlay(page: Page): Promise<void> {
  await expect(page.locator("#shipeasy-devtools")).toBeAttached({ timeout: 8000 });
  await page.waitForFunction(
    () => (window as unknown as { __se_devtools_ready?: boolean }).__se_devtools_ready === true,
    { timeout: 8000 },
  );
}

async function openPanel(page: Page, panelTitle: string): Promise<void> {
  await page.getByTitle(panelTitle, { exact: true }).click();
  // Allow the panel slide animation + async content fetch.
  await page.waitForTimeout(400);
}

/** Read the current ?se_*= overrides from the URL bar. Reads page.url() so it
 *  survives full-page navigations (the overlay applies overrides via
 *  `location.assign`, not pushState). */
function urlOverrides(page: Page): Record<string, string> {
  const out: Record<string, string> = {};
  try {
    for (const [k, v] of new URL(page.url()).searchParams) {
      if (k.startsWith("se_")) out[k] = v;
    }
  } catch {
    // page.url() can be "about:blank" briefly during navigation
  }
  return out;
}

// ── Toolbar layout ────────────────────────────────────────────────────────────

test.describe("DevTools — toolbar layout", () => {
  test("toolbar shows all six panel buttons", async ({ page }) => {
    await setup(page);
    await page.goto("/dashboard?se-devtools");
    await waitForOverlay(page);

    for (const label of [
      "Gates",
      "Configs",
      "Experiments",
      "Translations",
      "Bugs",
      "Feature requests",
    ]) {
      await expect(page.getByTitle(label, { exact: true })).toBeVisible();
    }
  });
});

// ── Rendering ─────────────────────────────────────────────────────────────────

test.describe("DevTools — Gates panel rendering", () => {
  test("renders rolloutPct in basis points as a normal percent", async ({ page }) => {
    // API ships rolloutPct as basis points (10000 = 100%, 5000 = 50%).
    // The panel's row sub-label must scale the bp down — not display the raw value.
    await setup(page);
    await page.goto("/dashboard?se-devtools");
    await waitForOverlay(page);
    await openPanel(page, "Gates");

    const root = page.locator("#shipeasy-devtools");
    await expect(root.getByText("100% rollout")).toBeVisible(); // dark-mode (10000bp)
    await expect(root.getByText("50% rollout")).toBeVisible(); // new-onboarding (5000bp)
    await expect(root.getByText("0% rollout").first()).toBeVisible(); // beta-checkout

    // Regression guard: the raw bp value must never be shown.
    await expect(root.getByText("10000% rollout")).toHaveCount(0);
    await expect(root.getByText("5000% rollout")).toHaveCount(0);
  });
});

// ── Override storage mechanism ────────────────────────────────────────────────

test.describe("DevTools — overrides persist as URL params", () => {
  test("forcing a gate ON writes ?se_ks_<name>=true to the address bar", async ({ page }) => {
    await setup(page);
    await page.goto("/dashboard?se-devtools");
    await waitForOverlay(page);
    await openPanel(page, "Gates");

    await page.locator('.tog[data-gate="beta-checkout"] [data-v="on"]').click();
    await expect.poll(() => urlOverrides(page)["se_ks_beta-checkout"]).toBe("true");
  });

  test("forcing a gate OFF writes ?se_ks_<name>=false", async ({ page }) => {
    await setup(page);
    await page.goto("/dashboard?se-devtools");
    await waitForOverlay(page);
    await openPanel(page, "Gates");

    await page.locator('.tog[data-gate="dark-mode"] [data-v="off"]').click();
    await expect.poll(() => urlOverrides(page)["se_ks_dark-mode"]).toBe("false");
  });

  test("default toggle clears the gate URL param", async ({ page }) => {
    await setup(page);
    await page.goto("/dashboard?se-devtools&se_ks_dark-mode=false");
    await waitForOverlay(page);
    await openPanel(page, "Gates");

    await page.locator('.tog[data-gate="dark-mode"] [data-v="default"]').click();
    await expect.poll(() => urlOverrides(page)["se_ks_dark-mode"]).toBeUndefined();
  });

  test("config save-session writes ?se_config_<name>=b64:<base64-json>", async ({ page }) => {
    await setup(page);
    await page.goto("/dashboard?se-devtools");
    await waitForOverlay(page);
    await openPanel(page, "Configs");

    await page.locator('.edit-btn[data-name="theme-color"]').click();
    await page.locator('textarea[data-name="theme-color"]').fill('"#ff0000"');
    await page.locator('.save-session[data-name="theme-color"]').click();

    // Strings/objects are base64-encoded, primitives are stored raw — accept either.
    await expect
      .poll(() => urlOverrides(page)["se_config_theme-color"])
      .toMatch(/^(b64:|"#ff0000")/);
  });

  test("forcing an experiment variant writes ?se_exp_<name>=<variant>", async ({ page }) => {
    await setup(page);
    await page.goto("/dashboard?se-devtools");
    await waitForOverlay(page);
    await openPanel(page, "Experiments");

    await page.locator('select.exp-sel[data-name="checkout-flow"]').selectOption("variant-a");
    await expect.poll(() => urlOverrides(page)["se_exp_checkout-flow"]).toBe("variant-a");
  });

  test("clearing experiment override removes the URL param", async ({ page }) => {
    await setup(page);
    await page.goto("/dashboard?se-devtools&se_exp_checkout-flow=control");
    await waitForOverlay(page);
    await openPanel(page, "Experiments");

    await page.locator('select.exp-sel[data-name="checkout-flow"]').selectOption("");
    await expect.poll(() => urlOverrides(page)["se_exp_checkout-flow"]).toBeUndefined();
  });
});

// ── Multi-override workflow ───────────────────────────────────────────────────

test.describe("DevTools — combined overrides workflow", () => {
  test("preserves prior overrides when adding a new one (URL accumulates)", async ({ page }) => {
    // Boot with two overrides already in the URL, then flip one more from the
    // panel. The new override must be added without dropping the existing two.
    await setup(page);
    await page.goto("/dashboard?se-devtools&se_ks_dark-mode=false&se_config_items-per-page=200");
    await waitForOverlay(page);
    await openPanel(page, "Experiments");

    await page.locator('select.exp-sel[data-name="checkout-flow"]').selectOption("variant-a");

    await expect
      .poll(() => urlOverrides(page))
      .toMatchObject({
        "se_ks_dark-mode": "false",
        "se_config_items-per-page": "200",
        "se_exp_checkout-flow": "variant-a",
      });
  });

  test("Clear overrides wipes every se_* URL param", async ({ page }) => {
    await setup(page);
    await page.goto(
      "/dashboard?se-devtools" +
        "&se_ks_dark-mode=false" +
        "&se_ks_beta-checkout=true" +
        "&se_config_items-per-page=99" +
        "&se_exp_checkout-flow=variant-a",
    );
    await waitForOverlay(page);
    await openPanel(page, "Gates");

    expect(Object.keys(urlOverrides(page)).length).toBeGreaterThan(0);

    await page.getByRole("button", { name: "Clear overrides" }).click();

    await expect.poll(() => urlOverrides(page)).toEqual({});
  });
});

// ── Footer actions ────────────────────────────────────────────────────────────

test.describe("DevTools — footer", () => {
  test("footer exposes Share URL, Apply via URL, Sign out, Clear overrides when signed in", async ({
    page,
  }) => {
    await setup(page);
    await page.goto("/dashboard?se-devtools");
    await waitForOverlay(page);
    await openPanel(page, "Gates");

    for (const label of ["Share URL", "Apply via URL", "Sign out", "Clear overrides"]) {
      await expect(page.getByRole("button", { name: label })).toBeVisible();
    }
  });

  test("Share URL copies a self-contained shareable link to the clipboard", async ({
    page,
    context,
  }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await setup(page);
    await page.goto("/dashboard?se-devtools&se_ks_dark-mode=false");
    await waitForOverlay(page);
    await openPanel(page, "Gates");

    await page.getByRole("button", { name: "Share URL" }).click();

    // Button label flips to "Copied ✓" briefly.
    await expect(page.getByRole("button", { name: /Copied/ })).toBeVisible({ timeout: 2000 });

    const clipboard = await page.evaluate(() => navigator.clipboard.readText());
    expect(clipboard).toContain("se_ks_dark-mode=false");
    expect(clipboard).toContain("se=1");
  });

  test("Sign out clears se_dt_session and brings back the Connect prompt", async ({ page }) => {
    await setup(page);
    await page.goto("/dashboard?se-devtools");
    await waitForOverlay(page);
    await openPanel(page, "Gates");

    await page.getByRole("button", { name: "Sign out" }).click();

    await expect(page.getByText("Connect to ShipEasy")).toBeVisible();
    expect(await page.evaluate(() => sessionStorage.getItem("se_dt_session"))).toBeNull();
  });
});

// ── Bugs panel ────────────────────────────────────────────────────────────────

test.describe("DevTools — Bugs panel", () => {
  test("opens with a File-a-bug CTA and an empty state", async ({ page }) => {
    await setup(page);
    await page.goto("/dashboard?se-devtools");
    await waitForOverlay(page);
    await openPanel(page, "Bugs");

    await expect(page.getByRole("button", { name: /File a bug/ })).toBeVisible();
    await expect(page.getByText(/No bugs filed yet/i)).toBeVisible();
  });
});

// ── Feature requests panel ────────────────────────────────────────────────────

test.describe("DevTools — Feature requests panel", () => {
  test("opens with a Request-a-feature CTA and an empty state", async ({ page }) => {
    await setup(page);
    await page.goto("/dashboard?se-devtools");
    await waitForOverlay(page);
    await openPanel(page, "Feature requests");

    await expect(page.getByRole("button", { name: /Request a feature/ })).toBeVisible();
    await expect(page.getByText(/No feature requests yet/i)).toBeVisible();
  });
});

// ── Translations panel (renamed from i18n) ────────────────────────────────────

test.describe("DevTools — Translations panel", () => {
  test("toolbar button is now titled 'Translations'", async ({ page }) => {
    await setup(page);
    await page.goto("/dashboard?se-devtools");
    await waitForOverlay(page);

    await expect(page.getByTitle("Translations", { exact: true })).toBeVisible();
    await expect(page.getByTitle("i18n", { exact: true })).toHaveCount(0);
  });

  test("label override flows through ?se_i18n_label_<key>=<value>", async ({ page }) => {
    await setup(page);
    await page.goto("/dashboard?se-devtools");
    await waitForOverlay(page);

    // #fake-label is injected by setup() via addInitScript so it survives
    // the navigation triggered when the overlay applies the override.
    await openPanel(page, "Translations");
    await page.locator("#se-edit-toggle").click();
    await page.locator("#fake-label").click();
    await page.locator(".label-popper .lp-input").fill("Submit");
    await page.locator('.label-popper [data-action="save"]').click();

    await expect.poll(() => urlOverrides(page)["se_i18n_label_common.save"]).toBe("Submit");
  });
});
