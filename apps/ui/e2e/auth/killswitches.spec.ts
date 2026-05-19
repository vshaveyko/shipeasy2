import { execSync } from "node:child_process";
import { readdirSync } from "node:fs";
import path from "node:path";

import { expect, test, type Page } from "@playwright/test";
import { adminList } from "../admin-list";

const PROJECT = "e2e-project-id";
const RUN = Date.now();

// ── plan helpers ──────────────────────────────────────────────────────────────
// Free-plan max_configs=1 / max_flags=3 chokes specs that create several
// killswitches. Bump to `paid` for the duration of the spec via a direct sqlite
// UPDATE on the miniflare D1 file, then restore to `free` afterwards.
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
    // ignore — best-effort
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

async function listKillswitches(page: Page): Promise<KillswitchRow[]> {
  return adminList<KillswitchRow>(page.request, "/api/admin/killswitches");
}

async function findKs(page: Page, fullName: string): Promise<KillswitchRow | undefined> {
  const all = await listKillswitches(page);
  return all.find((k) => k.name === fullName);
}

test.beforeAll(() => setProjectPlan("paid"));
test.afterAll(() => setProjectPlan("free"));

// ── 0. Page shell ─────────────────────────────────────────────────────────────

test.describe("Killswitches — page shell", () => {
  test("page header + sidebar nav link render", async ({ page }) => {
    await page.goto(`/dashboard/${PROJECT}/killswitches`);
    await expect(page.getByRole("heading", { name: /^killswitches$/i, level: 1 })).toBeVisible();
    await expect(page.getByRole("link", { name: /^killswitches$/i })).toBeVisible();
  });
});

// ── 1. BigModalWizard create flow ─────────────────────────────────────────────

test.describe("Killswitches — BigModalWizard create flow", () => {
  test.describe.configure({ mode: "serial" });

  const folder = "e2e_ks";
  const leaf = `wizard_${RUN}`;
  const fullName = `${folder}.${leaf}`;

  test.afterAll(async ({ request }) => {
    const all = await adminList<KillswitchRow>(request, "/api/admin/killswitches").catch(
      () => null,
    );
    if (!all) return;
    const stale = all.find((k) => k.name === fullName);
    if (stale) await request.delete(`/api/admin/killswitches/${stale.id}`).catch(() => {});
  });

  test("?new=1 deep-link renders the 3-step wizard", async ({ page }) => {
    await page.goto(`/dashboard/${PROJECT}/killswitches?new=1`);
    // BigModalWizard's accessible name is the current step.label (not the
    // wizard `title` prop). Match the dialog without a name and assert
    // killswitch chrome via the eyebrow.
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog.locator('[data-slot="dialog-title"]')).toHaveText(
      "Identify the killswitch",
    );
    await expect(dialog.getByText(/Step 1 of 3 · killswitch/i)).toBeVisible();
  });

  test("wizard happy path: Details → Scope & fallback → Integrate → create", async ({ page }) => {
    await page.goto(`/dashboard/${PROJECT}/killswitches`);
    // Header CTA on populated list ("New killswitch") or empty-state CTA ("Create killswitch").
    await page
      .getByRole("button", { name: /^(new|create) killswitch$/i })
      .first()
      .click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();

    // Step 1 — Details
    await dialog.getByLabel("Folder").fill(folder);
    await dialog.getByLabel("Name").fill(leaf);
    await dialog.getByLabel("Description").fill("created via wizard");
    await dialog.getByRole("button", { name: /^next/i }).click();

    // Step 2 — Default value + switches
    await expect(dialog.getByText(/Step 2 of 3/i).first()).toBeVisible();
    // Flip default to ON (button label changes from "OFF · feature live" to "ON · killswitch active").
    await dialog.getByRole("button", { name: "Default value" }).click();
    await dialog.getByRole("button", { name: /add switch/i }).click();
    await dialog.getByLabel(/^Switch key 1$/).fill("eu_only");
    await dialog.getByRole("button", { name: /^next/i }).click();

    // Step 3 — Integrate (CodeBlock tabs)
    await expect(dialog.getByText(/Step 3 of 3/i).first()).toBeVisible();
    await expect(dialog.getByRole("tab", { name: /typescript/i })).toBeVisible();
    await expect(dialog.locator('pre[data-slot="code-block"]')).toContainText(fullName);

    // Canonical submit CTA — `Arm killswitch`.
    await dialog.getByRole("button", { name: /arm killswitch/i }).click();
    await expect(dialog).toHaveCount(0, { timeout: 5000 });

    // URL strips ?new=1; killswitch present via admin API.
    await expect.poll(async () => (await findKs(page, fullName)) !== undefined).toBe(true);
    const ks = await findKs(page, fullName);
    expect(ks?.envs.prod?.value).toBe(true);
    expect(ks?.envs.prod?.switches).toEqual({ eu_only: true });
    expect(ks?.description).toBe("created via wizard");
  });

  test("ESC on ?new=1 closes the wizard and strips the param", async ({ page }) => {
    await page.goto(`/dashboard/${PROJECT}/killswitches?new=1`);
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);
    await expect(page).toHaveURL(new RegExp(`/dashboard/${PROJECT}/killswitches$`));
  });

  test("validation: Folder + name fail on uppercase / dots", async ({ page }) => {
    await page.goto(`/dashboard/${PROJECT}/killswitches?new=1`);
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("Folder").fill("Bad.Folder");
    await dialog.getByLabel("Name").fill("ok");
    // Inline error message renders only after the user typed something.
    await expect(dialog.getByText(/must be lowercase/i)).toBeVisible();
    // Next is disabled until both fields are valid.
    await expect(dialog.getByRole("button", { name: /^next/i })).toBeDisabled();
  });
});

// ── 2. UnifiedList chrome + detail pane embed ────────────────────────────────

test.describe("Killswitches list — UnifiedList + embedded editor", () => {
  test.describe.configure({ mode: "serial" });

  const fullName = `e2e_ks.list_${RUN}`;
  let ksId = "";

  test.beforeAll(async ({ request }) => {
    const resp = await request.post("/api/admin/killswitches", {
      data: {
        name: fullName,
        description: "seeded for list spec",
        value: false,
        switches: { eu_only: true },
      },
    });
    expect(resp.ok()).toBe(true);
    ksId = ((await resp.json()) as { id: string }).id;
  });

  test.afterAll(async ({ request }) => {
    if (ksId) await request.delete(`/api/admin/killswitches/${ksId}`).catch(() => {});
  });

  test("row appears with default badge + switch count", async ({ page }) => {
    await page.goto(`/dashboard/${PROJECT}/killswitches`);
    const fullPane = page.locator('[data-slot="pane-full"]');
    await expect(fullPane.getByText(fullName).first()).toBeVisible();
    await expect(fullPane.getByText(/^OFF$/).first()).toBeVisible();
    await expect(fullPane.getByText(/1 switch(es)?/i).first()).toBeVisible();
  });

  test("row click adds ?open=<id>, opens detail pane with embedded editor", async ({ page }) => {
    await page.goto(`/dashboard/${PROJECT}/killswitches`);
    await page.locator('[data-slot="pane-full"]').getByText(fullName).click();

    await expect(page).toHaveURL(new RegExp(`open=${ksId}`));
    const detail = page.locator('[data-slot="detail-pane"]');
    await expect(detail.getByText(fullName)).toBeVisible();
    // Env tabs render
    await expect(detail.getByRole("tab", { name: "prod" })).toBeVisible();
    await expect(detail.getByRole("tab", { name: "staging" })).toBeVisible();
    await expect(detail.getByRole("tab", { name: "dev" })).toBeVisible();
    // Embedded editor shows the description seed
    await expect(detail.getByLabel("Description")).toHaveValue("seeded for list spec");
    // Standalone link is exposed for tests
    await expect(detail.getByTestId("killswitch-detail-standalone-link")).toHaveAttribute(
      "href",
      `/dashboard/${PROJECT}/killswitches/${ksId}`,
    );
  });

  test("ESC strips ?open=<id> and collapses detail pane", async ({ page }) => {
    await page.goto(`/dashboard/${PROJECT}/killswitches?open=${ksId}`);
    await expect(page.locator('[data-slot="detail-pane"]').getByText(fullName)).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page).toHaveURL(new RegExp(`/dashboard/${PROJECT}/killswitches$`));
  });

  test("embedded editor: flipping default + saving persists via admin API", async ({ page }) => {
    await page.goto(`/dashboard/${PROJECT}/killswitches?open=${ksId}`);
    const detail = page.locator('[data-slot="detail-pane"]');

    // Flip default to ON (label changes once toggle flips).
    await detail.getByRole("button", { name: "Default value" }).click();
    await detail.getByRole("button", { name: /^save killswitch$/i }).click();

    await expect
      .poll(async () => (await findKs(page, fullName))?.envs.prod?.value, { timeout: 5000 })
      .toBe(true);
  });

  test("filter input narrows the closed table to matching rows", async ({ page }) => {
    await page.goto(`/dashboard/${PROJECT}/killswitches`);
    const filter = page.getByPlaceholder(/filter folder.name/i);
    await filter.fill(`zzz_no_match_${RUN}`);
    await expect(page.locator('[data-slot="pane-full"]').getByText(fullName)).toHaveCount(0);
    await filter.fill("");
    await expect(page.locator('[data-slot="pane-full"]').getByText(fullName)).toBeVisible();
  });

  test("delete from detail pane removes row + admin API entry", async ({ page }) => {
    await page.goto(`/dashboard/${PROJECT}/killswitches?open=${ksId}`);
    const detail = page.locator('[data-slot="detail-pane"]');
    await detail.getByRole("button", { name: /delete killswitch from detail pane/i }).click();

    const confirmDialog = page.getByRole("dialog", { name: /delete killswitch\?/i });
    await confirmDialog.getByRole("button", { name: /^delete killswitch$/i }).click();

    await expect.poll(async () => (await findKs(page, fullName)) === undefined).toBe(true);
    ksId = ""; // afterAll won't try to delete again
  });
});

// ── 3. Per-switch admin endpoints (API only — unchanged by Phase 3b chrome) ──

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
    await page.request.put(`/api/admin/killswitches/${ksId}/switch`, {
      data: { env: "prod", switchKey: "us_only", value: true },
    });
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
    expect([400, 422]).toContain(resp.status());
  });

  test("validation — strict folder.name on create", async ({ page }) => {
    const resp = await page.request.post("/api/admin/killswitches", {
      data: { name: "single_segment", value: false },
    });
    expect([400, 422]).toContain(resp.status());
  });

  test("404 — killswitch endpoints reject regular config ids", async ({ page }) => {
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

    await page.request.delete(`/api/admin/configs/${cfg.id}`);
  });
});
