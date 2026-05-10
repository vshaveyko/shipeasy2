import { expect, test, type APIRequestContext, type Page } from "@playwright/test";
import { adminList } from "../admin-list";
import { setProjectPlan } from "../seed-fixtures";

const RUN = Date.now();

// Free plan caps experiments at 1; this spec exercises multiple full
// lifecycles. Bump to paid for the whole spec.
test.beforeAll(() => setProjectPlan("paid"));
test.afterAll(() => setProjectPlan("free"));

// ── Helpers ───────────────────────────────────────────────────────────────────

function expRow(page: Page, name: string) {
  // Row layout: grid > [icon, min-w-0 > flex > a(name), status, ...].
  // Walk up: a → flex → min-w-0 → grid (the row).
  return page
    .getByText(name, { exact: true })
    .locator("..")
    .locator("..")
    .locator("..")
    .locator("..");
}

async function cleanupExperiment(request: APIRequestContext, name: string) {
  try {
    const exps = await adminList<{ id: string; name: string; status: string }>(
      request,
      "/api/admin/experiments",
    ).catch(() => null);
    if (!exps) return;
    const exp = exps.find((e) => e.name === name);
    if (!exp) return;
    if (exp.status === "running") {
      await request.post(`/api/admin/experiments/${exp.id}/status`, {
        data: { status: "stopped" },
      });
    }
    await request.delete(`/api/admin/experiments/${exp.id}`);
  } catch {
    // best-effort cleanup
  }
}

async function getExperimentId(page: Page, name: string): Promise<string> {
  const exps = await adminList<{ id: string; name: string }>(
    page.request,
    "/api/admin/experiments",
  );
  const exp = exps.find((e) => e.name === name);
  if (!exp) throw new Error(`Experiment '${name}' not found in admin API`);
  return exp.id;
}

/**
 * Drive the 4-step wizard from a clean /experiments/new page through to
 * Create. By default takes the happy-path defaults at every step.
 */
async function createViaWizard(
  page: Page,
  name: string,
  opts: {
    hypothesis?: string;
    tag?: string;
    extraVariants?: number;
    /** Allocation 1..100 (default 100) */
    allocation?: number;
  } = {},
) {
  await page.goto("/dashboard/e2e-project-id/experiments/new");

  // Step 1 — Basics
  await page.locator("#exp-name").fill(name);
  if (opts.hypothesis !== undefined) {
    await page.locator("#exp-hypothesis").fill(opts.hypothesis);
  }
  if (opts.tag !== undefined) {
    await page.locator("#exp-tag").selectOption(opts.tag);
  }
  await page.getByRole("button", { name: /^continue$/i }).click();

  // Step 2 — Variants
  for (let i = 0; i < (opts.extraVariants ?? 0); i++) {
    await page.getByRole("button", { name: /^add variant$/i }).click();
  }
  if (opts.allocation !== undefined && opts.allocation !== 100) {
    const slider = page.locator("input#alloc[type=range]");
    await slider.evaluate((el, value) => {
      Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")!.set!.call(
        el,
        String(value),
      );
      el.dispatchEvent(new Event("input", { bubbles: true }));
    }, opts.allocation);
  }
  await page.getByRole("button", { name: /^continue$/i }).click();

  // Step 3 — Audience & sizing (defaults)
  await page.getByRole("button", { name: /^continue$/i }).click();

  // Step 4 — Review → publish
  await page.getByRole("button", { name: /^create experiment$/i }).click();
  await expect(page).toHaveURL(/\/dashboard\/e2e-project-id\/experiments$/);
}

// ── Wizard UI surface ────────────────────────────────────────────────────────

test.describe("New experiment wizard — UI", () => {
  test("renders the 4-step stepper", async ({ page }) => {
    await page.goto("/dashboard/e2e-project-id/experiments/new");
    for (const label of ["Basics", "Variants", "Audience & sizing", "Review"]) {
      await expect(page.getByRole("tab", { name: new RegExp(label, "i") })).toBeVisible();
    }
  });

  test("Continue is disabled until a valid name is entered", async ({ page }) => {
    await page.goto("/dashboard/e2e-project-id/experiments/new");
    const continueBtn = page.getByRole("button", { name: /^continue$/i }).first();
    await expect(continueBtn).toBeDisabled();
    await page.locator("#exp-name").fill("checkout_v3");
    await expect(continueBtn).toBeEnabled();
  });

  test("step 2 starts with control + test variants and an Add variant button", async ({ page }) => {
    await page.goto("/dashboard/e2e-project-id/experiments/new");
    await page.locator("#exp-name").fill("two_variants");
    await page.getByRole("button", { name: /^continue$/i }).click();

    // The first two variant input fields default to control / test.
    const inputs = page.locator("input[value='control'], input[value='test']");
    await expect(inputs).toHaveCount(2);
    await expect(page.getByRole("button", { name: /^add variant$/i })).toBeVisible();
  });

  test("Add variant button adds a third variant row and rebalances weights", async ({ page }) => {
    await page.goto("/dashboard/e2e-project-id/experiments/new");
    await page.locator("#exp-name").fill("three_variants");
    await page.getByRole("button", { name: /^continue$/i }).click();
    await page.getByRole("button", { name: /^add variant$/i }).click();

    // Third variant input shows up with its default name.
    await expect(page.locator("input[value='variant_2']")).toBeVisible();
    // After rebalance, two variants should show 33% (one shows 34%).
    await expect(page.getByText(/33%/).first()).toBeVisible();
  });

  test("allocation slider drives the allocation %", async ({ page }) => {
    await page.goto("/dashboard/e2e-project-id/experiments/new");
    await page.locator("#exp-name").fill("alloc_test");
    await page.getByRole("button", { name: /^continue$/i }).click();

    const slider = page.locator("input#alloc[type=range]");
    await slider.evaluate((el) => {
      Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")!.set!.call(
        el,
        "60",
      );
      el.dispatchEvent(new Event("input", { bubbles: true }));
    });
    await expect(page.getByText("60%").first()).toBeVisible();
  });

  test("Cancel link returns to the experiments list", async ({ page }) => {
    await page.goto("/dashboard/e2e-project-id/experiments/new");
    await page
      .getByRole("link", { name: /^cancel$/i })
      .first()
      .click();
    await expect(page).toHaveURL(/\/dashboard\/e2e-project-id\/experiments$/);
  });

  test("Review step shows summary and SDK snippet preview", async ({ page }) => {
    await page.goto("/dashboard/e2e-project-id/experiments/new");
    await page.locator("#exp-name").fill("review_demo");
    await page.getByRole("button", { name: /^continue$/i }).click();
    await page.getByRole("button", { name: /^continue$/i }).click();
    await page.getByRole("button", { name: /^continue$/i }).click();

    await expect(page.getByText(/^summary$/i)).toBeVisible();
    await expect(page.getByText(/^SDK snippet$/i)).toBeVisible();
    await expect(page.getByText(/shipeasy\./)).toBeVisible();
    await expect(page.getByRole("button", { name: /^create experiment$/i })).toBeVisible();
  });
});

// ── Conversion experiment — full lifecycle ────────────────────────────────────

test.describe("Two-variant experiment — full lifecycle", () => {
  test.describe.configure({ mode: "serial" });

  const name = `e2exp_two_${RUN}`;

  test.afterAll(async ({ request }) => {
    await cleanupExperiment(request, name);
  });

  test("create draft via wizard → appears in list with 'draft' badge", async ({ page }) => {
    await createViaWizard(page, name, {
      hypothesis: "Two variants. Default split.",
    });
    await expect(expRow(page, name).getByText(/^draft$/i)).toBeVisible();
  });

  test("admin API stores name, hypothesis, 2 groups, draft status", async ({ page }) => {
    const exps = await adminList<{
      name: string;
      status: string;
      description: string | null;
      groups: { name: string; weight: number }[];
    }>(page.request, "/api/admin/experiments");
    const exp = exps.find((e) => e.name === name);
    expect(exp).toBeDefined();
    expect(exp!.groups).toHaveLength(2);
    expect(exp!.groups[0].name).toBe("control");
    expect(exp!.groups[1].name).toBe("test");
    expect(exp!.status).toBe("draft");
    expect(exp!.description).toContain("Two variants");
  });

  test("detail page: header shows DRAFT badge, hypothesis, and stat tiles", async ({ page }) => {
    const id = await getExperimentId(page, name);
    await page.goto(`/dashboard/e2e-project-id/experiments/${id}`);

    await expect(page.getByText(/^DRAFT$/)).toBeVisible();
    await expect(page.getByText(/Two variants\. Default split\./).first()).toBeVisible();
    await expect(page.getByText(/^users \/ control$/i)).toBeVisible();
    await expect(page.getByText(/^days running$/i)).toBeVisible();
    await expect(page.getByText(/^verdict$/i)).toBeVisible();
    await expect(page.getByText(/^no results yet/i)).toBeVisible();
  });

  test("detail page: variants card shows control + test rows", async ({ page }) => {
    const id = await getExperimentId(page, name);
    await page.goto(`/dashboard/e2e-project-id/experiments/${id}`);

    await expect(page.getByRole("heading", { name: /^variants$/i })).toBeVisible();
    await expect(page.getByText(/baseline/i)).toBeVisible();
    await expect(page.getByText(/^control$/)).toBeVisible();
  });

  test("start experiment from list → 'running' badge appears", async ({ page }) => {
    await page.goto("/dashboard/e2e-project-id/experiments");
    await expRow(page, name)
      .getByRole("button", { name: /start experiment/i })
      .click();

    await expect(expRow(page, name).getByText(/^running$/i)).toBeVisible();
  });

  test("detail page after start: badge is LIVE, days-running stat is 0", async ({ page }) => {
    const id = await getExperimentId(page, name);
    await page.goto(`/dashboard/e2e-project-id/experiments/${id}`);

    await expect(page.getByText(/^LIVE/)).toBeVisible();
    // Days running stat tile shows '0' on the day of start.
    await expect(page.getByText("0").first()).toBeVisible();
  });

  test("stop experiment from list → 'stopped' badge", async ({ page }) => {
    await page.goto("/dashboard/e2e-project-id/experiments");
    await expRow(page, name)
      .getByRole("button", { name: /stop experiment/i })
      .click();

    await expect(expRow(page, name).getByText(/^stopped$/i)).toBeVisible();
  });

  test("delete stopped experiment via row action → vanishes from list", async ({ page }) => {
    await page.goto("/dashboard/e2e-project-id/experiments");
    await expRow(page, name)
      .getByRole("button", { name: /delete experiment/i })
      .click();

    await expect(page.getByText(name, { exact: true })).not.toBeVisible();

    const exps = await adminList<{ name: string }>(page.request, "/api/admin/experiments");
    expect(exps.find((e) => e.name === name)).toBeUndefined();
  });
});

// ── Multi-variant experiment (3 groups) ───────────────────────────────────────

test.describe("Multi-variant experiment — 3 groups via wizard", () => {
  test.describe.configure({ mode: "serial" });

  const name = `e2exp_mv_${RUN}`;

  test.afterAll(async ({ request }) => {
    await cleanupExperiment(request, name);
  });

  test("create with 3 groups → admin API stores 3 groups, weights sum to 10000", async ({
    page,
  }) => {
    await createViaWizard(page, name, { extraVariants: 1 });

    const exps = await adminList<{
      name: string;
      groups: { name: string; weight: number }[];
    }>(page.request, "/api/admin/experiments");
    const exp = exps.find((e) => e.name === name);
    expect(exp).toBeDefined();
    expect(exp!.groups).toHaveLength(3);
    const sum = exp!.groups.reduce((acc, g) => acc + g.weight, 0);
    expect(sum).toBe(10000);
  });

  test("detail page: variants card lists all 3 group names", async ({ page }) => {
    const id = await getExperimentId(page, name);
    await page.goto(`/dashboard/e2e-project-id/experiments/${id}`);

    await expect(page.getByText(/^control$/)).toBeVisible();
    await expect(page.getByText(/^test$/)).toBeVisible();
    await expect(page.getByText(/^variant_2$/)).toBeVisible();
  });

  test("cleanup: delete multi-variant experiment", async ({ page }) => {
    await page.goto("/dashboard/e2e-project-id/experiments");
    await expRow(page, name)
      .getByRole("button", { name: /delete experiment/i })
      .click();
    await expect(page.getByText(name, { exact: true })).not.toBeVisible();
  });
});

// ── Partial-allocation experiment ─────────────────────────────────────────────

test.describe("Partial-allocation experiment — 60%", () => {
  test.describe.configure({ mode: "serial" });

  const name = `e2exp_alloc_${RUN}`;

  test.afterAll(async ({ request }) => {
    await cleanupExperiment(request, name);
  });

  test("wizard with 60% allocation → admin API allocation_pct=6000", async ({ page }) => {
    await createViaWizard(page, name, { allocation: 60 });

    const exps = await adminList<{ name: string; allocationPct: number }>(
      page.request,
      "/api/admin/experiments",
    );
    const exp = exps.find((e) => e.name === name);
    expect(exp).toBeDefined();
    expect(exp!.allocationPct).toBe(6000);
  });

  test("detail page header shows the 60% allocation chip", async ({ page }) => {
    const id = await getExperimentId(page, name);
    await page.goto(`/dashboard/e2e-project-id/experiments/${id}`);

    // "2 variants · 60% allocation" appears in the header runtime line.
    await expect(page.getByText(/60% allocation/i)).toBeVisible();
  });

  test("cleanup: delete partial-allocation experiment", async ({ page }) => {
    await page.goto("/dashboard/e2e-project-id/experiments");
    await expRow(page, name)
      .getByRole("button", { name: /delete experiment/i })
      .click();
    await expect(page.getByText(name, { exact: true })).not.toBeVisible();
  });
});
