import path from "node:path";
import { expect, test, type Page } from "@playwright/test";

const AUTH_FILE = path.join(__dirname, "../.auth/user.json");
const RUN = Date.now();

// ── Helpers ───────────────────────────────────────────────────────────────────

function expRow(page: Page, name: string) {
  return page.getByText(name, { exact: true }).locator("..").locator("..");
}

async function getExperimentId(page: Page, name: string): Promise<string> {
  const resp = await page.request.get("/api/admin/experiments");
  const exps = await resp.json();
  const exp = exps.find((e: { name: string }) => e.name === name);
  if (!exp) throw new Error(`Experiment '${name}' not found`);
  return exp.id;
}

// ── Statistical power calculator ─────────────────────────────────────────────
// The power card is already rendered on the new-experiment form; it shows
// "—" values until metric + MDE inputs are provided.

test.describe("Statistical power calculator — new experiment form", () => {
  test("power card renders with Daily users, Days needed, Power stat rows", async ({ page }) => {
    await page.goto("/dashboard/experiments/new");
    await expect(page.getByText(/statistical power/i)).toBeVisible();
    await expect(page.getByText(/daily users/i)).toBeVisible();
    await expect(page.getByText(/days needed/i)).toBeVisible();
    await expect(page.getByText(/power/i)).toBeVisible();
  });

  test("power card shows '—' placeholder before metric and MDE are set", async ({ page }) => {
    await page.goto("/dashboard/experiments/new");
    await expect(page.getByText("—").first()).toBeVisible();
  });

  test("80% power bar is rendered", async ({ page }) => {
    await page.goto("/dashboard/experiments/new");
    // The power explanation note is visible
    await expect(page.getByText(/80%/i).or(page.getByText(/5%.*significance/i))).toBeVisible();
  });

  test("daily users input updates power estimate when filled", async ({ page }) => {
    await page.goto("/dashboard/experiments/new");
    const dailyUsersInput = page.locator("#pc-daily-users").or(page.getByLabel(/daily users/i));
    expect(
      await dailyUsersInput.count(),
      "Power calculator inputs not yet wired up",
    ).toBeGreaterThan(0);
    await dailyUsersInput.fill("1000");
    // Days needed should update from "—" to a number
    await expect(page.getByText("—").first()).not.toBeVisible();
  });
});

// ── Experiment params schema ──────────────────────────────────────────────────
// params schema lets each group carry typed key-value pairs exposed via the SDK
// (e.g. { button_color: "string", discount_pct: "number" }).

test.describe("Experiment params schema editor", () => {
  test("new experiment form shows params section", async ({ page }) => {
    await page.goto("/dashboard/experiments/new");
    await expect(
      page.getByText(/params/i).or(page.getByRole("heading", { name: /params/i })),
    ).toBeVisible();
  });

  test("Add param button adds a param row with name and type fields", async ({ page }) => {
    await page.goto("/dashboard/experiments/new");
    const addParamBtn = page.getByRole("button", { name: /add param/i });
    expect(await addParamBtn.count(), "Params editor not yet implemented").toBeGreaterThan(0);
    await addParamBtn.click();
    await expect(
      page.locator('input[name^="param_name"]').or(page.getByPlaceholder(/param.*name/i)),
    ).toBeVisible();
    await expect(
      page.locator('select[name^="param_type"]').or(page.getByLabel(/param.*type/i)),
    ).toBeVisible();
  });

  test("param with name and type is saved in the experiment", async ({ page }) => {
    await page.goto("/dashboard/experiments/new");
    const addParamBtn = page.getByRole("button", { name: /add param/i });
    expect(await addParamBtn.count(), "Params editor not yet implemented").toBeGreaterThan(0);

    await addParamBtn.click();
    const nameInput = page
      .locator('input[name="param_name_0"]')
      .or(page.getByPlaceholder(/param.*name/i).first());
    await nameInput.fill("button_color");

    const typeSelect = page
      .locator('select[name="param_type_0"]')
      .or(page.getByLabel(/param.*type/i).first());
    await typeSelect.selectOption("string");

    const expKey = `e2exp_param_${RUN}`;
    await page.locator("#exp-key").fill(expKey);
    await page.getByRole("button", { name: /^save draft$/i }).click();
    await expect(page).toHaveURL(/\/dashboard\/experiments$/);

    const resp = await page.request.get("/api/admin/experiments");
    const exps = await resp.json();
    const exp = exps.find((e: { name: string }) => e.name === expKey);
    expect(exp).toBeDefined();
    expect(exp.params?.button_color ?? exp.params?.["button_color"]).toBeDefined();

    // Cleanup
    await expRow(page, expKey)
      .getByRole("button", { name: /^delete$/i })
      .click();
  });
});

// ── Targeting gate ────────────────────────────────────────────────────────────
// An experiment can be scoped to users who pass a specific gate.

test.describe("Experiment — targeting gate selector", () => {
  test.describe.configure({ mode: "serial" });

  const gateKey = `e2expgate_${RUN}`;
  const expKey = `e2exp_gated_${RUN}`;

  test.beforeAll(async ({ browser }) => {
    const ctx = await browser.newContext({ storageState: AUTH_FILE });
    const p = await ctx.newPage();
    await p.goto("/dashboard/configs/gates/new");
    await p.locator("#gate-key").fill(gateKey);
    await p.getByRole("button", { name: /^create gate$/i }).click();
    await expect(p).toHaveURL(/\/dashboard\/configs\/gates$/);
    await ctx.close();
  });

  test.afterAll(async ({ browser }) => {
    const ctx = await browser.newContext({ storageState: AUTH_FILE });
    const p = await ctx.newPage();
    // Delete experiment (if exists)
    const resp = await p.request.get("/api/admin/experiments");
    const exps = await resp.json();
    const exp = exps.find((e: { name: string }) => e.name === expKey);
    if (exp) {
      await p.goto("/dashboard/experiments");
      const row = p.getByText(expKey, { exact: true }).locator("..").locator("..");
      if ((await row.count()) > 0) await row.getByRole("button", { name: /^delete$/i }).click();
    }
    // Delete gate
    await p.goto("/dashboard/configs/gates");
    const gRow = p.getByText(gateKey, { exact: true }).locator("..").locator("..");
    if ((await gRow.count()) > 0) await gRow.getByRole("button", { name: /^delete$/i }).click();
    await ctx.close();
  });

  test("targeting gate selector is present on new experiment form", async ({ page }) => {
    await page.goto("/dashboard/experiments/new");
    await page.reload(); // force DB refresh for gate list
    const gateSel = page
      .locator("#exp-gate")
      .or(page.getByLabel(/targeting gate/i))
      .or(page.getByLabel(/gate/i));
    expect(await gateSel.count(), "Targeting gate selector not yet implemented").toBeGreaterThan(0);
    await expect(gateSel).toBeVisible();
  });

  test("selecting a gate and saving stores gate reference in experiment", async ({ page }) => {
    await page.goto("/dashboard/experiments/new");
    await page.reload();
    const gateSel = page.locator("#exp-gate").or(page.getByLabel(/targeting gate/i));
    expect(await gateSel.count(), "Targeting gate selector not yet implemented").toBeGreaterThan(0);

    await gateSel.selectOption({ value: gateKey });
    await page.locator("#exp-key").fill(expKey);
    await page.getByRole("button", { name: /^save draft$/i }).click();
    await expect(page).toHaveURL(/\/dashboard\/experiments$/);

    const resp = await page.request.get("/api/admin/experiments");
    const exps = await resp.json();
    const exp = exps.find((e: { name: string }) => e.name === expKey);
    expect(exp).toBeDefined();
    expect(exp.gate ?? exp.targetingGate).toBe(gateKey);
  });
});

// ── Statistical configuration ─────────────────────────────────────────────────
// Per-experiment controls: significance_threshold, min_runtime_days, min_sample_size.

test.describe("Experiment — statistical config fields", () => {
  test("new experiment form shows statistical config section", async ({ page }) => {
    await page.goto("/dashboard/experiments/new");
    await expect(
      page
        .getByText(/statistical config/i)
        .or(page.getByText(/significance.*threshold/i))
        .or(page.getByText(/min.*runtime/i)),
    ).toBeVisible();
  });

  test("significance threshold input accepts a decimal value", async ({ page }) => {
    await page.goto("/dashboard/experiments/new");
    const thresholdInput = page
      .locator("#exp-sig-threshold")
      .or(page.getByLabel(/significance.*threshold/i));
    expect(
      await thresholdInput.count(),
      "Statistical config fields not yet implemented",
    ).toBeGreaterThan(0);
    await thresholdInput.fill("0.01");
    await expect(thresholdInput).toHaveValue("0.01");
  });

  test("min runtime days input accepts an integer", async ({ page }) => {
    await page.goto("/dashboard/experiments/new");
    const minDaysInput = page.locator("#exp-min-days").or(page.getByLabel(/min.*runtime.*days/i));
    expect(
      await minDaysInput.count(),
      "min_runtime_days field not yet implemented",
    ).toBeGreaterThan(0);
    await minDaysInput.fill("7");
    await expect(minDaysInput).toHaveValue("7");
  });

  test("min sample size input accepts an integer", async ({ page }) => {
    await page.goto("/dashboard/experiments/new");
    const minSampleInput = page.locator("#exp-min-sample").or(page.getByLabel(/min.*sample/i));
    expect(
      await minSampleInput.count(),
      "min_sample_size field not yet implemented",
    ).toBeGreaterThan(0);
    await minSampleInput.fill("500");
    await expect(minSampleInput).toHaveValue("500");
  });
});

// ── Metric attachment (goal / guardrail / secondary) ─────────────────────────
// After creating an experiment, metrics can be attached with a role.

test.describe("Experiment — metric attachment", () => {
  test.describe.configure({ mode: "serial" });

  const expKey = `e2exp_metrics_${RUN}`;
  const metricName = `e2m_attach_${RUN}`;

  test.beforeAll(async ({ browser }) => {
    const ctx = await browser.newContext({ storageState: AUTH_FILE });
    const p = await ctx.newPage();

    // Create a metric to attach
    await p.goto("/dashboard/experiments/metrics");
    await p.locator("#metric-name").fill(metricName);
    await p.locator("#metric-event").fill("e2e_event");
    await p.getByRole("button", { name: /^new metric$/i }).click();
    await expect(p).toHaveURL(/\/dashboard\/experiments\/metrics/);

    // Create the experiment
    await p.goto("/dashboard/experiments/new");
    await p.locator("#exp-key").fill(expKey);
    await p.getByRole("button", { name: /^save draft$/i }).click();
    await expect(p).toHaveURL(/\/dashboard\/experiments$/);

    await ctx.close();
  });

  test.afterAll(async ({ browser }) => {
    const ctx = await browser.newContext({ storageState: AUTH_FILE });
    const p = await ctx.newPage();

    await p.goto("/dashboard/experiments");
    const row = p.getByText(expKey, { exact: true }).locator("..").locator("..");
    if ((await row.count()) > 0) await row.getByRole("button", { name: /^delete$/i }).click();

    await p.goto("/dashboard/experiments/metrics");
    const mRow = p.getByText(metricName, { exact: true }).locator("..").locator("..");
    if ((await mRow.count()) > 0) await mRow.getByRole("button", { name: /^delete$/i }).click();

    await ctx.close();
  });

  test("experiment detail page shows Add metric CTA or metrics section", async ({ page }) => {
    const id = await getExperimentId(page, expKey);
    await page.goto(`/dashboard/experiments/${id}`);
    // The detail page should have some affordance for adding guardrail/secondary metrics
    await expect(
      page
        .getByText(/add.*metric/i)
        .or(page.getByText(/guardrail/i))
        .or(page.getByRole("button", { name: /add.*metric/i })),
    ).toBeVisible();
  });

  test("attaching metric as guardrail shows it in the Guardrails section", async ({ page }) => {
    const id = await getExperimentId(page, expKey);
    await page.goto(`/dashboard/experiments/${id}`);

    const addGuardrailBtn = page.getByRole("button", { name: /add.*guardrail/i });
    expect(
      await addGuardrailBtn.count(),
      "Metric attachment UI not yet implemented",
    ).toBeGreaterThan(0);

    await addGuardrailBtn.click();
    const metricSel = page.locator("#attach-metric").or(page.getByLabel(/metric/i).first());
    await metricSel.selectOption({ label: metricName });

    const roleInput = page.locator("#attach-role").or(page.getByLabel(/role/i).first());
    if ((await roleInput.count()) > 0) {
      await roleInput.selectOption("guardrail");
    }

    await page
      .getByRole("button", { name: /attach|add/i })
      .last()
      .click();
    await expect(page.getByText(metricName)).toBeVisible();
  });

  test("attaching metric as secondary shows it in Secondary metrics section", async ({ page }) => {
    const id = await getExperimentId(page, expKey);
    await page.goto(`/dashboard/experiments/${id}`);

    const addSecondaryBtn = page.getByRole("button", { name: /add.*secondary/i });
    expect(
      await addSecondaryBtn.count(),
      "Secondary metric attachment UI not yet implemented",
    ).toBeGreaterThan(0);

    await addSecondaryBtn.click();
    const metricSel = page.locator("#attach-metric").or(page.getByLabel(/metric/i).first());
    await metricSel.selectOption({ label: metricName });

    await page
      .getByRole("button", { name: /attach|add/i })
      .last()
      .click();
    await expect(page.getByText(/secondary/i)).toBeVisible();
    await expect(page.getByText(metricName)).toBeVisible();
  });
});
