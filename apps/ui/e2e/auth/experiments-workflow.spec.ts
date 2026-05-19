import path from "node:path";
import { expect, test, type APIRequestContext, type Page } from "@playwright/test";
import { adminList } from "../admin-list";
import { setProjectPlan } from "../seed-fixtures";

const RUN = Date.now();
const PROJECT = "e2e-project-id";
const GOAL_EVENT = `e2exp_wf_event_${RUN}`;
const GOAL_METRIC = `e2exp_wf_goal_${RUN}`;

// Free plan caps experiments at 1; this spec exercises multiple full
// lifecycles. Bump to paid for the whole spec.
test.beforeAll(async ({ request }) => {
  setProjectPlan("paid");
  await seedGoalMetric(request);
});
test.afterAll(async ({ request }) => {
  await cleanupGoalMetric(request);
  setProjectPlan("free");
});

// ── Seed helpers ─────────────────────────────────────────────────────────────

async function seedGoalMetric(request: APIRequestContext): Promise<void> {
  // Best-effort — repeated calls return 409 which is fine.
  await request.post("/api/admin/events", { data: { name: GOAL_EVENT } }).catch(() => {});
  await request
    .post("/api/admin/metrics", {
      data: {
        name: GOAL_METRIC,
        event_name: GOAL_EVENT,
        aggregation: "count_users",
        winsorize_pct: 99,
      },
    })
    .catch(() => {});
}

async function cleanupGoalMetric(request: APIRequestContext): Promise<void> {
  const metrics = await adminList<{ id: string; name: string }>(
    request,
    "/api/admin/metrics",
  ).catch(() => [] as { id: string; name: string }[]);
  const m = metrics.find((x) => x.name === GOAL_METRIC);
  if (m) await request.delete(`/api/admin/metrics/${m.id}`).catch(() => {});
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function expRow(page: Page, name: string) {
  return page
    .locator('[data-slot="pane-full"]')
    .getByText(name, { exact: true })
    .locator("xpath=ancestor::tr[1]");
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
 * Drive the BigModalWizard (`?new=1`) through all 5 steps (Basics → Audience
 * → Variants → Metrics → Integrate) and save as draft. The goal metric is
 * seeded in `beforeAll` so it appears in the step-4 combobox.
 */
async function createViaWizard(
  page: Page,
  name: string,
  opts: {
    hypothesis?: string;
    tag?: string;
    extraVariants?: number;
  } = {},
) {
  await cleanupExperiment(page.request, name);
  await page.goto(`/dashboard/${PROJECT}/experiments?new=1`);
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();

  // Step 1 — Basics
  await dialog.getByTestId("experiment-name-input").fill(name);
  if (opts.hypothesis !== undefined) {
    await dialog.locator("#experiment-description").fill(opts.hypothesis);
  }
  if (opts.tag !== undefined) {
    await dialog.locator("#experiment-tag").fill(opts.tag);
  }
  const next = dialog.getByRole("button", { name: /^next/i });
  await expect(next).toBeEnabled();
  await next.click();

  // Step 2 — Audience & allocation (keep defaults: default universe, 100%)
  await expect(dialog.locator('[data-slot="dialog-title"]')).toHaveText("Universe & allocation");
  await dialog.getByRole("button", { name: /^next/i }).click();

  // Step 3 — Variants & weights
  await expect(dialog.locator('[data-slot="dialog-title"]')).toHaveText("Variants & weights");
  for (let i = 0; i < (opts.extraVariants ?? 0); i++) {
    await dialog.getByRole("button", { name: /^add variant$/i }).click();
  }
  await dialog.getByRole("button", { name: /^next/i }).click();

  // Step 4 — Goal & guardrails — pick the seeded goal metric.
  await expect(dialog.locator('[data-slot="dialog-title"]')).toHaveText("Goal & guardrails");
  await dialog.locator("#experiment-goal-metric").click();
  await page.keyboard.type(GOAL_METRIC, { delay: 10 });
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Enter");
  await expect(dialog.locator("#experiment-goal-metric")).toContainText(GOAL_METRIC);
  await dialog.getByRole("button", { name: /^next/i }).click();

  // Step 5 — Integrate. Uncheck "Start immediately" so the experiment lands as
  // draft (matches the legacy behaviour this helper guarantees).
  await expect(dialog.locator('[data-slot="dialog-title"]')).toHaveText("Wire it up");
  await dialog.getByLabel(/start experiment immediately/i).uncheck();
  await dialog.getByRole("button", { name: /save as draft/i }).click();

  // Wizard closes once the action returns ok; URL strips ?new=1.
  await expect(page.getByRole("dialog")).toBeHidden({ timeout: 15_000 });
  await expect(page).not.toHaveURL(/[?&]new=1\b/);
  await expect(
    page.locator('[data-slot="pane-full"]').getByText(name, { exact: true }),
  ).toBeVisible({ timeout: 15_000 });
}

// ── Wizard UI surface (BigModalWizard) ──────────────────────────────────────

test.describe("New experiment wizard — BigModalWizard UI", () => {
  test("renders the 5-step stepper", async ({ page }) => {
    await page.goto(`/dashboard/${PROJECT}/experiments?new=1`);
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText(/step 1 of 5 · experiment/i)).toBeVisible();
    await expect(dialog.locator('[data-slot="dialog-title"]')).toHaveText("Hypothesis & basics");
  });

  test("Next is disabled until a valid slug is entered", async ({ page }) => {
    await page.goto(`/dashboard/${PROJECT}/experiments?new=1`);
    const dialog = page.getByRole("dialog");
    const next = dialog.getByRole("button", { name: /^next/i });
    await expect(next).toBeDisabled();
    await dialog.getByTestId("experiment-name-input").fill("checkout_v3");
    await expect(next).toBeEnabled();
  });

  test("step 3 starts with control + treatment variants and an Add variant button", async ({
    page,
  }) => {
    await page.goto(`/dashboard/${PROJECT}/experiments?new=1`);
    const dialog = page.getByRole("dialog");
    await dialog.getByTestId("experiment-name-input").fill("two_variants");
    await dialog.getByRole("button", { name: /^next/i }).click();
    await dialog.getByRole("button", { name: /^next/i }).click();

    await expect(dialog.getByTestId("variant-name-0")).toHaveValue("control");
    await expect(dialog.getByTestId("variant-name-1")).toHaveValue("treatment");
    await expect(dialog.getByRole("button", { name: /^add variant$/i })).toBeVisible();
  });

  test("Add variant button adds a third variant row and rebalances weights", async ({ page }) => {
    await page.goto(`/dashboard/${PROJECT}/experiments?new=1`);
    const dialog = page.getByRole("dialog");
    await dialog.getByTestId("experiment-name-input").fill("three_variants");
    await dialog.getByRole("button", { name: /^next/i }).click();
    await dialog.getByRole("button", { name: /^next/i }).click();
    await dialog.getByRole("button", { name: /^add variant$/i }).click();

    await expect(dialog.getByTestId("variant-name-2")).toBeVisible();
    // After rebalance, weights are 34/33/33 — at least one 33% chip renders.
    await expect(dialog.getByText(/\b33%\b/).first()).toBeVisible();
  });

  test("Esc closes the wizard and strips ?new=1", async ({ page }) => {
    await page.goto(`/dashboard/${PROJECT}/experiments?new=1`);
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toBeHidden();
    await expect(page).not.toHaveURL(/[?&]new=1\b/);
  });

  test("Integrate step exposes SDK snippets + Start immediately toggle", async ({ page }) => {
    await page.goto(`/dashboard/${PROJECT}/experiments?new=1`);
    const dialog = page.getByRole("dialog");
    await dialog.getByTestId("experiment-name-input").fill("integrate_demo");
    for (let i = 0; i < 4; i += 1) {
      // Step 4 needs a goal metric to advance — pick it before clicking Next.
      if (i === 3) {
        await dialog.locator("#experiment-goal-metric").click();
        await page.keyboard.type(GOAL_METRIC, { delay: 10 });
        await page.keyboard.press("ArrowDown");
        await page.keyboard.press("Enter");
      }
      await dialog.getByRole("button", { name: /^next/i }).click();
    }

    await expect(dialog.locator('[data-slot="dialog-title"]')).toHaveText("Wire it up");
    await expect(dialog.getByRole("tab", { name: /typescript/i })).toBeVisible();
    await expect(dialog.getByLabel(/start experiment immediately/i)).toBeChecked();
    // Default CTA is "Start experiment"; toggle drops it to "Save as draft".
    await expect(dialog.getByRole("button", { name: /start experiment/i })).toBeVisible();
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
    expect(exp!.groups[1].name).toBe("treatment");
    expect(exp!.status).toBe("draft");
    expect(exp!.description).toContain("Two variants");
  });

  test("start experiment from list → 'running' badge appears", async ({ page }) => {
    await page.goto(`/dashboard/${PROJECT}/experiments`);
    await expRow(page, name)
      .getByRole("button", { name: /start experiment/i })
      .click();

    await expect(expRow(page, name).getByText(/^running$/i)).toBeVisible();
  });

  test("stop experiment from list → 'stopped' badge", async ({ page }) => {
    await page.goto(`/dashboard/${PROJECT}/experiments`);
    await expRow(page, name)
      .getByRole("button", { name: /stop experiment/i })
      .click();

    await expect(expRow(page, name).getByText(/^stopped$/i)).toBeVisible();
  });

  test("delete stopped experiment via row action → vanishes from list", async ({ page }) => {
    await page.goto(`/dashboard/${PROJECT}/experiments`);
    await expRow(page, name)
      .getByRole("button", { name: /delete experiment/i })
      .click();

    // Scope to pane-full to avoid the rail-pane mirror of the same name.
    await expect(
      page.locator('[data-slot="pane-full"]').getByText(name, { exact: true }),
    ).not.toBeVisible({ timeout: 15_000 });

    await expect
      .poll(async () => {
        const exps = await adminList<{ name: string }>(page.request, "/api/admin/experiments");
        return exps.find((e) => e.name === name);
      })
      .toBeUndefined();
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
    await page.goto(`/dashboard/${PROJECT}/experiments/${id}`);

    // Standalone v2 detail tags the first variant with "· baseline" inside
    // the same <span>, so /^control$/ as text-content matches the parent;
    // pin via the meta-variant container instead.
    await expect(page.locator(".meta-variant.ctrl").getByText("control")).toBeVisible();
    await expect(page.getByText(/^treatment$/)).toBeVisible();
    await expect(page.getByText(/^variant_2$/)).toBeVisible();
  });

  test("cleanup: delete multi-variant experiment", async ({ page }) => {
    await page.goto(`/dashboard/${PROJECT}/experiments`);
    await expRow(page, name)
      .getByRole("button", { name: /delete experiment/i })
      .click();
    await expect(
      page.locator('[data-slot="pane-full"]').getByText(name, { exact: true }),
    ).not.toBeVisible({ timeout: 15_000 });
  });
});

// ── Embedded detail pane (UnifiedList) ───────────────────────────────────────

test.describe("Experiments detail pane — embedded summary", () => {
  test.describe.configure({ mode: "serial" });

  const name = `e2exp_detail_${RUN}`;

  test.beforeAll(async ({ browser }) => {
    const ctx = await browser.newContext({
      storageState: path.join(__dirname, "../.auth/user.json"),
    });
    const p = await ctx.newPage();
    await createViaWizard(p, name);
    await ctx.close();
  });

  test.afterAll(async ({ request }) => {
    await cleanupExperiment(request, name);
  });

  test("row click adds ?open=<id> and renders the embedded summary", async ({ page }) => {
    const id = await getExperimentId(page, name);
    await page.goto(`/dashboard/${PROJECT}/experiments`);

    await expRow(page, name).click();
    await expect(page).toHaveURL(new RegExp(`[?&]open=${id}\\b`));

    const detail = page.locator('[data-slot="detail-pane"]');
    await expect(detail).toBeVisible();
    await expect(detail.getByText(/draft/i).first()).toBeVisible();
    await expect(detail.getByText(/allocation/i).first()).toBeVisible();
    await expect(detail.getByText(/variants/i).first()).toBeVisible();
  });

  test("'Open full view' link points at the standalone detail page", async ({ page }) => {
    const id = await getExperimentId(page, name);
    await page.goto(`/dashboard/${PROJECT}/experiments?open=${id}`);
    const link = page.getByTestId("experiment-detail-fullview-link");
    await expect(link).toHaveAttribute(
      "href",
      new RegExp(`/dashboard/${PROJECT}/experiments/${id}$`),
    );
  });

  test("Esc strips ?open and collapses the detail pane", async ({ page }) => {
    const id = await getExperimentId(page, name);
    await page.goto(`/dashboard/${PROJECT}/experiments?open=${id}`);
    await expect(page.locator('[data-slot="detail-pane"]')).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page).not.toHaveURL(/[?&]open=/);
  });
});
