import { execSync } from "node:child_process";
import { readdirSync } from "node:fs";
import path from "node:path";

import { expect, test, type Page, type Locator } from "@playwright/test";
import { adminList } from "../admin-list";

const PROJECT = "e2e-project-id";
const RUN = Date.now();

// ── plan helpers ──────────────────────────────────────────────────────────────
// Free-plan max_configs=1 / max_flags=3 chokes a CRUD spec that creates several
// killswitches. Bump to `paid` for the duration of the spec via a direct sqlite
// UPDATE on the miniflare D1 file, then restore to `free` afterwards so other
// specs that lean on free-plan UX (billing.spec.ts) aren't affected.
function locateD1(): string | null {
  const dir = path.join(__dirname, "../../.wrangler/state/v3/d1/miniflare-D1DatabaseObject");
  let files: string[];
  try {
    files = readdirSync(dir).filter((f) => f.endsWith(".sqlite") && !f.includes("metadata"));
  } catch {
    return null;
  }
  if (files.length === 0) return null;
  return path.join(dir, files[0]);
}

function setProjectPlan(plan: "free" | "paid"): void {
  const db = locateD1();
  if (!db) return;
  try {
    execSync(`sqlite3 "${db}" "UPDATE projects SET plan='${plan}' WHERE id='${PROJECT}'"`);
  } catch {
    // ignore — best-effort; if D1 isn't there the API calls will surface their own errors.
  }
}

type EnvKey = "dev" | "staging" | "prod";
type KillswitchRow = {
  id: string;
  name: string;
  description: string | null;
  envs: Partial<
    Record<
      EnvKey,
      { value: boolean; switches?: Record<string, boolean>; version: number; publishedAt: string }
    >
  >;
};

// ── helpers ───────────────────────────────────────────────────────────────────

async function listKillswitches(page: Page): Promise<KillswitchRow[]> {
  return adminList<KillswitchRow>(page.request, "/api/admin/killswitches");
}

async function findKs(page: Page, fullName: string): Promise<KillswitchRow | undefined> {
  const all = await listKillswitches(page);
  return all.find((k) => k.name === fullName);
}

function killswitchRow(page: Page, fullName: string): Locator {
  return page.locator(`[data-killswitch-row="${fullName}"]`);
}

async function openNewModal(page: Page): Promise<void> {
  await page.goto(`/dashboard/${PROJECT}/killswitches`);
  await page
    .getByRole("button", { name: /^(new|create) killswitch$/i })
    .first()
    .click();
  await expect(page.getByRole("dialog")).toBeVisible();
}

async function fillFolderName(page: Page, folder: string, leaf: string): Promise<void> {
  await page.getByRole("dialog").getByLabel("Folder").fill(folder);
  await page.getByRole("dialog").getByLabel("Name").fill(leaf);
}

async function setDefaultValue(page: Page, on: boolean): Promise<void> {
  const toggle = page.getByRole("dialog").getByRole("button", { name: "Default value" });
  const pressed = (await toggle.getAttribute("aria-pressed")) === "true";
  if (pressed !== on) await toggle.click();
}

async function addSwitch(page: Page, key: string, on: boolean): Promise<void> {
  await page
    .getByRole("dialog")
    .getByRole("button", { name: /add switch/i })
    .click();
  // The newly-added row's key input is the last "Switch key N" by ordinal.
  const dialog = page.getByRole("dialog");
  const inputs = dialog.getByLabel(/^Switch key \d+$/);
  const last = inputs.last();
  await last.fill(key);

  // Match the corresponding toggle by index.
  const toggles = dialog.getByRole("button", { name: /^Switch (\d+ value|value for )/ });
  const toggle = toggles.last();
  const pressed = (await toggle.getAttribute("aria-pressed")) === "true";
  if (pressed !== on) await toggle.click();
}

async function clickRowAction(
  page: Page,
  fullName: string,
  action: "Edit" | "Preview snippets" | "Delete",
): Promise<void> {
  const row = killswitchRow(page, fullName);
  await row.getByRole("button", { name: /row actions/i }).click();
  await page.getByRole("menuitem", { name: action }).click();
}

test.beforeAll(() => setProjectPlan("paid"));
test.afterAll(() => setProjectPlan("free"));

// ── 0. Smoke ──────────────────────────────────────────────────────────────────

test.describe("Killswitches — page shell", () => {
  test("page header + sidebar nav link render", async ({ page }) => {
    await page.goto(`/dashboard/${PROJECT}/killswitches`);
    await expect(page.getByRole("heading", { name: /^killswitches$/i, level: 1 })).toBeVisible();
    await expect(page.getByRole("link", { name: /^killswitches$/i })).toBeVisible();
  });

  test("New killswitch button opens the modal", async ({ page }) => {
    await openNewModal(page);
    await expect(
      page.getByRole("dialog").getByRole("heading", { name: /new killswitch/i }),
    ).toBeVisible();
    await expect(page.getByRole("dialog").getByLabel("Folder")).toBeVisible();
    await expect(page.getByRole("dialog").getByLabel("Name")).toBeVisible();
  });

  test("validation rejects empty folder/name segments", async ({ page }) => {
    await openNewModal(page);
    await page
      .getByRole("dialog")
      .getByRole("button", { name: /^create$/i })
      .click();
    await expect(page.getByRole("dialog").getByText(/lowercase, no dots/i)).toBeVisible();
  });

  test("validation rejects duplicate switch keys", async ({ page }) => {
    await openNewModal(page);
    await fillFolderName(page, "e2e_smoke", `dupe_${RUN}`);
    await addSwitch(page, "alpha", true);
    await addSwitch(page, "alpha", false);
    await page
      .getByRole("dialog")
      .getByRole("button", { name: /^create$/i })
      .click();
    await expect(page.getByRole("dialog").getByText(/duplicated/i)).toBeVisible();
  });
});

// ── 1. Full CRUD via the dashboard UI ─────────────────────────────────────────

test.describe("Killswitches — UI CRUD", () => {
  test.describe.configure({ mode: "serial" });

  const folder = "e2e_ks";
  const leaf = `simple_${RUN}`;
  const fullName = `${folder}.${leaf}`;

  // Always tear the row down — even if a test fails — so `max_configs=1` on the
  // free plan doesn't choke the per-switch / snippets describes that follow.
  test.afterAll(async ({ request }) => {
    const all = await adminList<KillswitchRow>(request, "/api/admin/killswitches").catch(
      () => null,
    );
    if (!all) return;
    const stale = all.find((k) => k.name === fullName);
    if (stale) await request.delete(`/api/admin/killswitches/${stale.id}`).catch(() => {});
  });

  test("CREATE — modal submit produces the killswitch via admin API", async ({ page }) => {
    await openNewModal(page);
    await fillFolderName(page, folder, leaf);
    await page.getByRole("dialog").getByLabel("Description").fill("created from e2e");
    await setDefaultValue(page, true);
    await addSwitch(page, "eu_only", false);
    await page
      .getByRole("dialog")
      .getByRole("button", { name: /^create$/i })
      .click();

    // Modal closes; killswitch appears in the list.
    await expect(page.getByRole("dialog")).toHaveCount(0, { timeout: 5000 });
    await expect(killswitchRow(page, fullName)).toBeVisible();

    const ks = await findKs(page, fullName);
    expect(ks, "admin API has the new killswitch").toBeDefined();
    expect(ks!.description).toBe("created from e2e");
    // Same value applied to every env at create.
    for (const envKey of ["dev", "staging", "prod"] as EnvKey[]) {
      expect(ks!.envs[envKey]?.value).toBe(true);
      expect(ks!.envs[envKey]?.switches).toEqual({ eu_only: false });
    }
  });

  test("READ — row renders with default + switch counts", async ({ page }) => {
    await page.goto(`/dashboard/${PROJECT}/killswitches`);
    const row = killswitchRow(page, fullName);
    await expect(row).toBeVisible();
    // Default badge reads ON.
    await expect(row.getByText(/^ON$/)).toBeVisible();
    // Switch count column reads "1 switch".
    await expect(row.getByText(/1 switch(es)?/i)).toBeVisible();
  });

  test("UPDATE — flipping default value via modal persists via admin API", async ({ page }) => {
    await page.goto(`/dashboard/${PROJECT}/killswitches`);
    await clickRowAction(page, fullName, "Edit");
    await expect(
      page.getByRole("dialog").getByRole("heading", { name: /edit killswitch/i }),
    ).toBeVisible();
    // Folder + name are locked in edit mode.
    await expect(page.getByRole("dialog").getByLabel("Folder")).toBeDisabled();

    await setDefaultValue(page, false);
    await page.getByRole("dialog").getByLabel("Description").fill("updated from e2e");
    await page
      .getByRole("dialog")
      .getByRole("button", { name: /^save$/i })
      .click();
    await expect(page.getByRole("dialog")).toHaveCount(0, { timeout: 5000 });

    const ks = await findKs(page, fullName);
    expect(ks).toBeDefined();
    expect(ks!.description).toBe("updated from e2e");
    expect(ks!.envs.prod?.value).toBe(false);
    // Switches are written wholesale, so the existing eu_only=false survives.
    expect(ks!.envs.prod?.switches).toEqual({ eu_only: false });
  });

  test("UPDATE — adding a second switch row in the modal persists", async ({ page }) => {
    await page.goto(`/dashboard/${PROJECT}/killswitches`);
    await clickRowAction(page, fullName, "Edit");
    await addSwitch(page, "us_only", true);
    await page
      .getByRole("dialog")
      .getByRole("button", { name: /^save$/i })
      .click();
    await expect(page.getByRole("dialog")).toHaveCount(0, { timeout: 5000 });

    const ks = await findKs(page, fullName);
    expect(ks!.envs.prod?.switches).toEqual({ eu_only: false, us_only: true });
  });

  test("DELETE — row dropdown removes the killswitch from list + admin API", async ({ page }) => {
    await page.goto(`/dashboard/${PROJECT}/killswitches`);
    page.once("dialog", (d) => d.accept());
    await clickRowAction(page, fullName, "Delete");

    await expect(killswitchRow(page, fullName)).toHaveCount(0, { timeout: 5000 });
    const ks = await findKs(page, fullName);
    expect(ks, "admin API no longer returns the deleted killswitch").toBeUndefined();
  });
});

// ── 2. Per-switch admin endpoints (PUT / DELETE /switch) ──────────────────────

test.describe("Killswitches — per-switch endpoints", () => {
  test.describe.configure({ mode: "serial" });

  const folder = "e2e_ks";
  const leaf = `swendpoints_${RUN}`;
  const fullName = `${folder}.${leaf}`;
  let ksId = "";

  test.afterAll(async ({ request }) => {
    if (ksId) await request.delete(`/api/admin/killswitches/${ksId}`).catch(() => {});
  });

  test("seed: create killswitch with no switches", async ({ page }) => {
    const resp = await page.request.post("/api/admin/killswitches", {
      data: { name: fullName, value: true },
    });
    expect(resp.ok()).toBe(true);
    const body = (await resp.json()) as { id: string };
    ksId = body.id;
  });

  test("PUT /switch — adds an entry on prod only", async ({ page }) => {
    const resp = await page.request.put(`/api/admin/killswitches/${ksId}/switch`, {
      data: { env: "prod", switchKey: "eu_only", value: false },
    });
    expect(resp.ok()).toBe(true);

    const ks = await findKs(page, fullName);
    expect(ks!.envs.prod?.switches).toEqual({ eu_only: false });
    // Other envs untouched (no switches map).
    expect(ks!.envs.dev?.switches).toBeUndefined();
  });

  test("PUT /switch — overwrites the same entry's value", async ({ page }) => {
    const resp = await page.request.put(`/api/admin/killswitches/${ksId}/switch`, {
      data: { env: "prod", switchKey: "eu_only", value: true },
    });
    expect(resp.ok()).toBe(true);

    const ks = await findKs(page, fullName);
    expect(ks!.envs.prod?.switches).toEqual({ eu_only: true });
  });

  test("DELETE /switch — removes one entry, leaves others intact", async ({ page }) => {
    // Add a second entry first.
    await page.request.put(`/api/admin/killswitches/${ksId}/switch`, {
      data: { env: "prod", switchKey: "us_only", value: true },
    });
    // Now remove the first.
    const resp = await page.request.delete(`/api/admin/killswitches/${ksId}/switch`, {
      data: { env: "prod", switchKey: "eu_only" },
    });
    expect(resp.ok()).toBe(true);

    const ks = await findKs(page, fullName);
    expect(ks!.envs.prod?.switches).toEqual({ us_only: true });
  });

  test("DELETE /switch — unknown key is a graceful no-op", async ({ page }) => {
    const resp = await page.request.delete(`/api/admin/killswitches/${ksId}/switch`, {
      data: { env: "prod", switchKey: "ghost_key" },
    });
    expect(resp.ok()).toBe(true);
    const body = (await resp.json()) as { removed: boolean };
    expect(body.removed).toBe(false);
  });

  test("validation — rejects bad switch key (uppercase / dot)", async ({ page }) => {
    const resp = await page.request.put(`/api/admin/killswitches/${ksId}/switch`, {
      data: { env: "prod", switchKey: "Bad.Key", value: true },
    });
    // 400 if the handler rejects, 422 if the zod parser hits the http wrapper.
    expect([400, 422]).toContain(resp.status());
  });

  test("validation — strict folder.name on create", async ({ page }) => {
    const resp = await page.request.post("/api/admin/killswitches", {
      data: { name: "single_segment", value: false },
    });
    expect([400, 422]).toContain(resp.status());
  });

  test("404 — killswitch endpoints reject regular config ids", async ({ page }) => {
    // Create a plain config and confirm /killswitches/<id> 404s.
    const cfgResp = await page.request.post("/api/admin/configs", {
      data: {
        name: `e2e_cfg.is_${RUN}_not_a_ks`,
        schema: { type: "object", properties: {}, additionalProperties: true },
        value: {},
      },
    });
    expect(cfgResp.ok()).toBe(true);
    const cfg = (await cfgResp.json()) as { id: string };

    const ksResp = await page.request.get(`/api/admin/killswitches/${cfg.id}`);
    expect(ksResp.status()).toBe(404);

    // Cleanup.
    await page.request.delete(`/api/admin/configs/${cfg.id}`);
  });
});

// ── 3. Snippets dialog ────────────────────────────────────────────────────────

test.describe("Killswitches — snippets dialog", () => {
  test.describe.configure({ mode: "serial" });

  const fullName = `e2e_ks.snippets_${RUN}`;
  let ksId = "";

  test.afterAll(async ({ request }) => {
    if (ksId) await request.delete(`/api/admin/killswitches/${ksId}`).catch(() => {});
  });

  test("seed via API", async ({ page }) => {
    const resp = await page.request.post("/api/admin/killswitches", {
      data: { name: fullName, value: false },
    });
    expect(resp.ok()).toBe(true);
    ksId = ((await resp.json()) as { id: string }).id;
  });

  test("opens dialog with the killswitch name and a default TS snippet", async ({ page }) => {
    await page.goto(`/dashboard/${PROJECT}/killswitches`);
    await clickRowAction(page, fullName, "Preview snippets");

    const dialog = page.getByRole("dialog");
    await expect(dialog.getByRole("heading", { name: /integrate this killswitch/i })).toBeVisible();
    await expect(dialog).toContainText(fullName);

    // Default tab is TypeScript; code should reference @shipeasy/sdk/client.
    await expect(dialog.locator("pre")).toContainText("@shipeasy/sdk/client");
    await expect(dialog.locator("pre")).toContainText(`"${fullName}"`);
  });

  test("language switcher swaps the snippet body", async ({ page }) => {
    await page.goto(`/dashboard/${PROJECT}/killswitches`);
    await clickRowAction(page, fullName, "Preview snippets");

    await page.getByRole("dialog").getByRole("button", { name: "Python" }).click();
    await expect(page.getByRole("dialog").locator("pre")).toContainText(
      "from shipeasy import Shipeasy",
    );

    await page.getByRole("dialog").getByRole("button", { name: "Go" }).click();
    await expect(page.getByRole("dialog").locator("pre")).toContainText("shipeasy.New(");
  });
});
